const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  for (const f of fs.readdirSync(__dirname + '/../' + (process.env.DIST || 'dist') + '/labs')) { await p.goto('file://' + path.resolve(__dirname, '../' + (process.env.DIST || 'dist') + '/labs/' + f)); await p.waitForTimeout(1500);
    const a = await p.evaluate(() => { const e = document.activeElement; return e === document.body ? 'body' : e.tagName + ' ' + (e.textContent || '').slice(0, 40); });
    const first = await p.evaluate(() => document.querySelector('#sr-polite').textContent);
    console.log(f.slice(0, 40), '| focus:', a, '| polite:', first.slice(0, 80)); }
  await b.close(); })();
