const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); let bad = 0;
  for (const [f, n, dark] of [['labs/Lab_2.0.4_Virtual_Machine_Simulation.html', 40, false], ['labs/Lab_2.0.4_Virtual_Machine_Simulation.html', 40, true], ['labs/Lab_4.4.2_Passcode_Locks_Simulation.html', 60, false], ['labs/Lab_2.3.5_Port_Scanner_Simulation.html', 30, true]]) {
    const c = await b.newContext({ colorScheme: dark ? 'dark' : 'light' }); const p = await c.newPage();
    await p.goto('file://' + path.resolve(__dirname, '../dist-improved/' + f)); await p.waitForTimeout(300);
    const seen = []; const nofocus = [];
    for (let i = 0; i < n; i++) { await p.keyboard.press('Tab');
      const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const rect = e.getBoundingClientRect();
        return { name: (e.getAttribute('aria-label') || e.textContent || e.value || e.id || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30), ok: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== 'none', visible: rect.width > 0 && rect.height > 0 }; });
      if (!r) { seen.push('(body)'); continue; } seen.push(r.name); if (!r.ok || !r.visible) nofocus.push(r.name); }
    const trap = seen.length > 6 && new Set(seen.slice(-6)).size === 1;
    if (nofocus.length || trap) bad++;
    console.log(`== ${f.slice(5, 30)} ${dark ? 'dark' : 'light'}: ${seen.slice(0, 10).join(' | ')} ... | no visible focus: ${nofocus.length ? nofocus.join(', ') : 'none'} | trap: ${trap}`);
    await c.close(); }
  console.log(bad ? 'PROBLEMS' : 'tab walk OK'); await b.close(); })();
