const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const AXE = fs.readFileSync(path.join(__dirname, 'node_modules/axe-core/axe.min.js'), 'utf8');
(async () => {
  const b = await chromium.launch(); let bad = 0;
  const files = fs.readdirSync('../dist-guided/labs').filter(f => f.includes('Simulation'));
  for (const f of files) {
    const p = await b.newPage(); await p.goto('file://' + path.resolve('../dist-guided/labs', f)); await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const G = window.Guided; if (!G) return { err: 'no Guided' };
      const t = document.getElementById('guide-h');
      const lists = document.querySelectorAll('.lab-col ol.steps').length;
      const links = [...document.querySelectorAll('.lab-col .jump')].map(a => a.textContent);
      const dupIds = (() => { const seen = {}, d = []; document.querySelectorAll('[id]').forEach(e => { if (seen[e.id]) d.push(e.id); seen[e.id] = 1; }); return d; })();
      const focusAtLoad = document.activeElement.tagName;
      // Next through all steps
      const titles = []; for (let i = 0; i < G.units.length; i++) { G.show(i, false); titles.push(t.textContent); }
      const guideHasInputs = document.querySelectorAll('.guide textarea, .guide input').length;
      const lastDisabled = document.querySelector('.guide-tools button:nth-child(2)').disabled;
      return { units: G.units.length, lists, links: links.length, badLinks: links.filter(x => !x.startsWith('Do this step')).length, dupIds, focusAtLoad, guideHasInputs, lastDisabled, first: titles[0], last: titles[titles.length - 1] };
    });
    // focus moves to panel title on Next
    await p.evaluate(() => window.Guided.show(0, false));
    await p.click('.guide-tools button:nth-child(2)');
    const fx = await p.evaluate(() => [document.activeElement.id, document.getElementById('sr-polite').textContent]);
    await p.waitForTimeout(250);
    const ann = await p.evaluate(() => document.getElementById('sr-polite').textContent);
    await p.addScriptTag({ content: AXE }); const axe = await p.evaluate(async () => { const res = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }); return { violations: res.violations.map(v => v.id + ':' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join('|')) }; });
    const ok = !r.err && r.units > 0 && r.badLinks === 0 && r.links === r.lists && r.dupIds.length === 0 && r.focusAtLoad === 'BODY' && r.guideHasInputs === 0 && fx[0] === 'guide-h' && axe.violations.length === 0;
    if (!ok) bad++;
    console.log((ok ? 'OK  ' : 'BAD ') + f.slice(0, 44).padEnd(45), `${r.units} steps, ${r.links}/${r.lists} links, dup=${r.dupIds.length}, focus=${r.focusAtLoad}, next->${fx[0]}, "${ann.slice(0, 50)}", axe=${axe.violations.length}`);
    if (!ok) console.log('   ', JSON.stringify(r), axe.violations.map(v => v.id));
    await p.close();
  }
  await b.close(); console.log(bad ? 'FAILED ' + bad : 'All guided pages OK');
})();
