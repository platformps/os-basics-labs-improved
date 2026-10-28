const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path');
const AXE = fs.readFileSync(path.join(__dirname, 'node_modules/axe-core/axe.min.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  for (const dark of [false, true]) {
    const p = await (await b.newContext({ colorScheme: dark ? 'dark' : 'light', viewport: { width: 1300, height: 1000 } })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
    await p.getByLabel(/A screen reader/).check();
    await p.addScriptTag({ content: AXE });
    const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(v => [v.impact, v.id, v.nodes.length, v.nodes.slice(0,2).map(n=>n.target.join(' '))]));
    console.log(dark ? 'dark' : 'light', 'axe', JSON.stringify(r), errs);
    await p.screenshot({ path: `hub-${dark ? 'dark' : 'light'}.png`, fullPage: false });
    if (!dark) { await p.locator('#mod-4').scrollIntoViewIfNeeded(); await p.screenshot({ path: 'hub-mobile-mod.png' }); console.log(await p.locator('#lab-4-2-2').evaluate(e => e.closest('article').innerText)); }
    // link check
    const links = await p.locator('a[href^="labs/"]').evaluateAll(a => a.map(x => x.getAttribute('href')));
    console.log('links', links.length, links.filter(l => !fs.existsSync(path.resolve(__dirname, '../dist', l))));
  }
  const p = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../dist/index.html'));
  console.log('phone overflow:', await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  await p.screenshot({ path: 'hub-phone.png' });
  await b.close();
})();
