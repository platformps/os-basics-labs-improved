/* Tab through pages and report each stop and any stop without a visible focus indicator.
   Usage: node tabwalk.js [dist-relative files...]   (default: index.html) */
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html'];
(async () => { const b = await chromium.launch();
  for (const f of files) for (const dark of [false, true]) {
    const c = await b.newContext({ colorScheme: dark ? 'dark' : 'light' }); const p = await c.newPage();
    await p.goto('file://' + path.resolve(__dirname, '../dist/' + f)); await p.waitForTimeout(300);
    const bad = []; const seen = [];
    for (let i = 0; i < 60; i++) {
      await p.keyboard.press('Tab');
      const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const rect = e.getBoundingClientRect();
        const name = (e.getAttribute('aria-label') || e.textContent || e.value || e.id || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 50);
        return { name, tag: e.tagName, outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, shadow: cs.boxShadow !== 'none', visible: rect.width > 0 && rect.height > 0 }; });
      if (!r) { seen.push('(body)'); continue; }
      seen.push(r.tag + ':' + r.name);
      if (!(r.outline || r.shadow) || !r.visible) bad.push(JSON.stringify(r));
    }
    console.log(`== ${f} ${dark ? 'dark' : 'light'} first stops:`, seen.slice(0, 12).join(' | '));
    console.log('no visible focus:', bad.length ? bad.slice(0, 8) : 'none');
    await c.close(); }
  await b.close(); })();
