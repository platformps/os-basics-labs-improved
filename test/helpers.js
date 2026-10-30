const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const AXE = fs.readFileSync(path.join(__dirname, 'node_modules/axe-core/axe.min.js'), 'utf8');

async function open(file, opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ colorScheme: (opts.dark || process.env.DARK) ? 'dark' : 'light', viewport: { width: opts.width || 1400, height: 1000 } });
  const page = await ctx.newPage();
  if (process.env.AUDIT) await page.addInitScript(() => {
    window.__ann = [];
    const seen = new WeakSet();
    const watch = el => { if (seen.has(el)) return; seen.add(el);
      const live = el.getAttribute('role') === 'log' ? 'log' : (el.getAttribute('aria-live') || el.getAttribute('role'));
      new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => { const t = (n.textContent || '').trim(); if (t) window.__ann.push({ t: performance.now(), src: (el.id || el.className || el.getAttribute('role')) + ':' + live, text: t, live: el.getAttribute('aria-live') }); })); }).observe(el, { childList: true, subtree: el.getAttribute('role') === 'log' ? false : true, characterData: true });
    };
    const scan = () => document.querySelectorAll('[aria-live],[role=log],[role=status],[role=alert]').forEach(watch);
    document.addEventListener('DOMContentLoaded', () => { scan(); new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); });
  });
  if (process.env.FOCUS) await page.addInitScript(() => {
    window.__focus = []; let lastMouse = 0, lastTarget = null;
    document.addEventListener('mousedown', e => { lastMouse = performance.now(); lastTarget = e.target.closest('button,a,input,select,textarea,summary,[tabindex]') || e.target; }, true);
    document.addEventListener('focusin', e => {
      const el = e.target; const where = el === document.body ? 'body' : el.closest('dialog') ? 'dialog' : el.closest('.guide') ? 'panel' : el.closest('#sim') ? 'sim' : el.closest('.sim-col') ? 'simcol' : el.closest('.lab-col') ? 'labtext' : el.closest('header') ? 'header' : 'other';
      const name = (el.getAttribute('aria-label') || el.textContent || el.value || el.id || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
      window.__focus.push({ t: Math.round(performance.now()), where, tag: el.tagName, role: el.getAttribute('role') || '', cls: el.className && el.className.baseVal === undefined ? String(el.className).slice(0, 40) : '', name, user: performance.now() - lastMouse < 40 && el === lastTarget });
    }, true);
  });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../' + (process.env.DIST || 'dist') + '/labs/' + file));
  await page.waitForTimeout(200);
  const sim = page.locator('#sim');
  const H = {
    page, browser, errors, sim,
    async start(q, which) {
      await sim.locator('.start-btn').click();
      await page.fill('#start-q', q);
      await page.waitForTimeout(80);
      const res = page.locator('#start-results button');
      if (which) await page.locator('#start-results').getByRole('button', { name: new RegExp('^' + which + '\\s*,') }).click();
      else await res.first().click();
      await page.waitForTimeout(150);
    },
    win() { return sim.locator('section.win:not([hidden])'); },
    async uacYes() { const d = page.locator('dialog[open]'); await d.getByRole('button', { name: 'Yes', exact: true }).click(); await page.waitForTimeout(100); },
    dlg() { return page.locator('dialog[open]').last(); },
    async dlgBtn(name) { await H.dlg().getByRole('button', { name, exact: true }).click(); await page.waitForTimeout(150); },
    async row(name, scope) { const b = (scope || H.win()).locator('.rowbtn', { hasText: name }).first(); await b.click(); await page.waitForTimeout(60); return b; },
    async rowExact(name, scope) { const b = (scope || H.win()).locator('.rowbtn').filter({ hasText: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(,|$)') }).first(); await b.click(); await page.waitForTimeout(60); return b; },
    async menuItem(name) { await page.locator('.popmenu').getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(150); },
    async actions(label) { await H.win().getByRole('button', { name: label || /^Actions for selected/ }).first().click(); await page.waitForTimeout(60); },
    async term(cmd, wait = 150) { const inp = H.win().locator('.term-input'); await inp.fill(cmd); await inp.press('Enter'); await page.waitForTimeout(wait); },
    async tasks() { return page.evaluate(() => Array.from(document.querySelectorAll('#tasks input')).map(c => [c.id.slice(5), c.checked])); },
    async status() { return page.locator('#status-visible').textContent(); },
    async taskbar(name) { await sim.locator('.tasklist').getByRole('button', { name }).first().click(); await page.waitForTimeout(100); },
    async axe(label) {
      await page.addScriptTag({ content: AXE });
      const r = await page.evaluate(async () => { const res = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }); return res.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, t: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })); });
      console.log(`AXE ${label}: ${r.length} violations`); r.forEach(v => console.log('  ', v.impact, v.id, v.n, v.help, JSON.stringify(v.t)));
      return r;
    },
    async report(name) {
      const t = await H.tasks();
      const missing = t.filter(x => !x[1]).map(x => x[0]);
      console.log(`${name}: ${t.length - missing.length}/${t.length} tasks`, missing.length ? 'MISSING: ' + missing.join(', ') : 'ALL DONE');
      if (errors.length) console.log('ERRORS:', errors.join('\n'));
      if (process.env.FOCUS) { const f = await page.evaluate(() => window.__focus); require('fs').writeFileSync(`focus-${name}.json`, JSON.stringify(f, null, 1)); console.log('focus events:', f.length); }
      if (process.env.AUDIT) { const a = await page.evaluate(() => window.__ann); require('fs').writeFileSync(`ann-${name}.json`, JSON.stringify(a, null, 1)); console.log('announcements:', a.length); }
      return missing;
    }
  };
  return H;
}
module.exports = { open };
