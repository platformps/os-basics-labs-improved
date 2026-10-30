// Finds non-interactive containers that stay focusable and hold other content.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const files = fs.readdirSync('../' + (process.env.DIST || 'dist') + '/labs').filter(f => f.endsWith('.html'));
  let bad = 0;
  for (const f of files.concat(['../index.html'])) {
    const p = await b.newPage(); await p.goto('file://' + require('path').resolve('../' + (process.env.DIST || 'dist') + '/labs', f)); await p.waitForTimeout(400);
    const r = await p.evaluate(() => [...document.querySelectorAll('[tabindex]')].filter(e => {
      const interactive = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|DIALOG)$/.test(e.tagName) || /^(button|tab|switch|menuitem|option|row|gridcell|slider|link|checkbox|radio|treeitem)$/.test(e.getAttribute('role') || '');
      const heading = /^H[1-6]$/.test(e.tagName);
      return !interactive && !heading && !e.closest('[hidden]') && e.children.length > 0 && !e.classList.contains('tabpanel');
    }).map(e => e.tagName + '.' + e.className + ' ' + e.getAttribute('tabindex')));
    if (r.length) { bad++; console.log(f, r); }
    // Back to the lab step: focus lands on list, then tab stop is removed on blur
    const ok = await p.evaluate(() => { const ol = document.querySelector('.lab-col ol.steps'); return !ol || !ol.hasAttribute('tabindex'); });
    if (!ok) { bad++; console.log(f, 'steps list still focusable'); }
    await p.close();
  }
  console.log(bad ? 'PROBLEMS ' + bad : 'No lasting focusable containers in ' + (files.length + 1) + ' pages');
  await b.close();
})();
