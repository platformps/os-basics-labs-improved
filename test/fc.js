/* Screenshots in Windows High Contrast (forced colors) for visual review.
   Usage: node fc.js [dist-relative files...]   (default: index.html). Writes fc-<n>.png */
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html'];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ forcedColors: 'active', colorScheme: 'dark', viewport: { width: 1300, height: 900 } }); const p = await c.newPage();
  let n = 0; for (const f of files) { await p.goto('file://' + path.resolve(__dirname, '../dist/' + f)); await p.waitForTimeout(400); await p.screenshot({ path: `fc-${++n}.png`, fullPage: false }); console.log(`fc-${n}.png`, f); }
  await b.close(); })();
