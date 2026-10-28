const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../dist/' + process.argv[2])); await p.waitForTimeout(300);
  if (process.argv[3]) await p.evaluate(s => eval(s), process.argv[3]);
  await p.waitForTimeout(300);
  console.log(await p.locator(process.argv[4] || 'body').ariaSnapshot()); await b.close(); })();
