const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const files = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const f of files) {
    const p = await (await b.newContext()).newPage();
    await p.goto('file://' + path.resolve(__dirname, '../dist/' + f)); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
      const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map(h => h.tagName[1] + ' ' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 80));
      const jumps = []; let prev = 0; [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).forEach(h => { const l = +h.tagName[1]; if (prev && l > prev + 1) jumps.push(`${prev}->${l}: ${h.textContent.trim().slice(0, 50)}`); prev = l; });
      const lm = [...document.querySelectorAll('header,nav,main,footer,aside,section[aria-label],section[aria-labelledby],[role=region],[role=navigation],[role=main]')].map(e => e.tagName.toLowerCase() + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : ''));
      const links = [...document.querySelectorAll('a[href]')].filter(vis).map(a => a.textContent.trim().replace(/\s+/g, ' '));
      const dup = {}; links.forEach(t => dup[t] = (dup[t] || 0) + 1);
      const imgs = [...document.querySelectorAll('img')].map(i => `alt="${i.alt}" ${i.closest('[aria-hidden=true]') ? '(hidden)' : ''}`);
      const h1 = document.querySelectorAll('h1').length;
      const ids = {}; document.querySelectorAll('[id]').forEach(e => ids[e.id] = (ids[e.id] || 0) + 1);
      const dupIds = Object.entries(ids).filter(([k, v]) => v > 1).map(([k]) => k);
      const unlabeled = [...document.querySelectorAll('input,select,textarea,button')].filter(vis).filter(e => { const n = e.labels && e.labels.length ? e.labels[0].textContent : (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.textContent || e.title); return !n || !n.trim(); }).map(e => e.outerHTML.slice(0, 80));
      return { title: document.title, lang: document.documentElement.lang, h1, heads, jumps, lm, dupLinks: Object.entries(dup).filter(([k, v]) => v > 1), imgs, dupIds, unlabeled };
    });
    console.log('=== ' + f); console.log(JSON.stringify(r, null, 1).slice(0, 6000));
  }
  await b.close();
})();
