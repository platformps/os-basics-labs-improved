/* Lab 1.2.11: Process Explorer and Registry Editor */
(() => {
  const { h, announce } = Lab;
  const T = Lab.complete;

  Lab.init({
    id: '1.2.11', title: 'Lab 1.2.11 Exploring Processes, Threads, Handles, and Windows Registry',
    onReset: () => location.reload(),
    tasks: [
      { id: 'download', label: 'Download the Sysinternals Suite in Microsoft Edge' },
      { id: 'extract', label: 'Extract SysinternalsSuite.zip in File Explorer' },
      { id: 'procexp', label: 'Open Process Explorer and accept the license' },
      { id: 'findedge', label: "Use Find Window's Process to find the Microsoft Edge process" },
      { id: 'killedge', label: 'Kill the Microsoft Edge process' },
      { id: 'findcmd', label: 'Open Command Prompt and find cmd.exe in Process Explorer' },
      { id: 'ping', label: 'Run ping and observe the PING.EXE child process' },
      { id: 'vt', label: 'Check conhost.exe with VirusTotal and open the report' },
      { id: 'killcmd', label: 'Kill cmd.exe and observe what happens to conhost.exe' },
      { id: 'threads', label: 'View the threads of conhost.exe' },
      { id: 'handles', label: 'View the handles of conhost.exe in the lower pane' },
      { id: 'regedit', label: 'Open Registry Editor' },
      { id: 'eula', label: 'Find the EulaAccepted value for Process Explorer' },
      { id: 'eula0', label: 'Change EulaAccepted from 1 to 0' },
      { id: 'reopen', label: 'Open Process Explorer again and see the license agreement' }
    ]
  });

  Win.S.users.CyberOpsUser = { password: 'Cisco123!', groups: ['Administrators', 'Users'], admin() { return this.groups.includes('Administrators'); } };
  WinApps.baseSystem();

  /* ---------------- Registry model ---------------- */
  const K = (name, children = [], values = []) => ({ name, children, values });
  const V = (name, type, data) => ({ name, type, data });
  const pe = K('Process Explorer', [], [
    V('(Default)', 'REG_SZ', '(value not set)'), V('ColumnCount', 'REG_DWORD', 7), V('EulaAccepted', 'REG_DWORD', 1), V('FindWindowplacement', 'REG_BINARY', '2c 00 00 00 00 00 00 00'),
    V('HandleSortColumn', 'REG_DWORD', 0), V('HighlightDuration', 'REG_DWORD', 1000), V('ShowLowerpane', 'REG_DWORD', 0), V('TrayCPUHistory', 'REG_DWORD', 0), V('VirusTotalCheck', 'REG_DWORD', 0)]);
  const sysint = K('Sysinternals', []);
  const reg = K('Computer', [
    K('HKEY_CLASSES_ROOT', [K('.txt', [], [V('(Default)', 'REG_SZ', 'txtfile')]), K('.exe', [], [V('(Default)', 'REG_SZ', 'exefile')]), K('txtfile'), K('exefile')]),
    K('HKEY_CURRENT_USER', [K('AppEvents'), K('Console', [], [V('FontSize', 'REG_DWORD', 1048576), V('QuickEdit', 'REG_DWORD', 1)]), K('Control Panel', [K('Desktop', [], [V('Wallpaper', 'REG_SZ', 'C:\\Windows\\web\\wallpaper\\Windows\\img0.jpg')]), K('Mouse')]), K('Environment', [], [V('TEMP', 'REG_EXPAND_SZ', '%USERPROFILE%\\AppData\\Local\\Temp')]), K('Keyboard Layout'), K('Network'),
      K('Software', [K('Classes'), K('Microsoft', [K('Edge'), K('Windows')]), K('Policies'), sysint])]),
    K('HKEY_LOCAL_MACHINE', [K('HARDWARE'), K('SAM'), K('SECURITY'), K('SOFTWARE', [K('Microsoft'), K('Classes')]), K('SYSTEM', [K('CurrentControlSet', [K('Services')])])]),
    K('HKEY_USERS', [K('.DEFAULT'), K('S-1-5-18'), K('S-1-5-21-3623811015-3361044348-30300820-1001')]),
    K('HKEY_CURRENT_CONFIG', [K('Software'), K('System')])
  ]);
  const eulaVal = () => pe.values.find(v => v.name === 'EulaAccepted');
  const peAccepted = () => sysint.children.includes(pe) && eulaVal().data === 1;
  function acceptEula() { if (!sysint.children.includes(pe)) sysint.children.push(pe); eulaVal().data = 1; Win.emit('reg:change', {}); }
  function fmtData(v) {
    if (v.type === 'REG_DWORD') return `0x${v.data.toString(16).padStart(8, '0')} (${v.data})`;
    return String(v.data);
  }

  /* ---------------- Web pages ---------------- */
  const zipFiles = { 'procexp.exe': {}, 'procexp64.exe': {}, 'procmon.exe': {}, 'Autoruns.exe': {}, 'tcpview.exe': {}, 'PsExec.exe': {}, 'Sysmon.exe': {}, 'Eula.txt': { content: 'Sysinternals Software License Terms (summary for this simulation).' } };
  function suitePage(page, w) {
    page.append(h('h4', null, 'Sysinternals Suite'), h('p', null, 'The Sysinternals Troubleshooting Utilities have been rolled up into a single Suite of tools. This file contains the individual troubleshooting tools and help files.'),
      h('button', { type: 'button', onclick: () => {
        Win.fs.write(`C:\\Users\\${Win.S.user}\\Downloads\\SysinternalsSuite.zip`, '', { size: 53000000, zipFiles });
        T('download');
        const show = h('button', { type: 'button', class: 'secondary', onclick: () => Win.openApp('explorer', { path: `C:\\Users\\${Win.S.user}\\Downloads` }) }, 'Show in folder');
        page.append(h('p', { role: 'status' }, 'Download complete: SysinternalsSuite.zip (50.6 MB) was saved to your Downloads folder.'), show);
        show.focus();
      } }, 'Download Sysinternals Suite (50.6 MB)'));
  }
  WinApps.addPage('learn.microsoft.com/sysinternals/downloads/sysinternals-suite', suitePage);
  WinApps.addPage('learn.microsoft.com/en-us/sysinternals/downloads/sysinternals-suite', suitePage);
  WinApps.addPage('technet.microsoft.com/en-us/sysinternals/bb842062.aspx', (p, w, load) => { p.append(h('p', null, 'This old address now redirects to Microsoft Learn.')); setTimeout(() => load('learn.microsoft.com/sysinternals/downloads/sysinternals-suite'), 400); });
  WinApps.addPage('www.virustotal.com/gui/file/conhost', (page) => {
    page.append(h('h4', null, 'VirusTotal: conhost.exe'), h('p', null, h('strong', null, '0 of 74'), ' security vendors flagged this file as malicious.'),
      h('dl', { class: 'kv' }, h('dt', null, 'File name'), h('dd', null, 'conhost.exe'), h('dt', null, 'Signed by'), h('dd', null, 'Microsoft Windows'), h('dt', null, 'File type'), h('dd', null, 'Win32 EXE'), h('dt', null, 'Community score'), h('dd', null, 'No detections')),
      h('p', null, 'Result: the file matches the genuine Microsoft file. In real investigations, also check the file location: a real conhost.exe runs from C:\\Windows\\System32.'));
    T('vt');
  });

  /* ---------------- Process Explorer ---------------- */
  let vtOn = false;
  const handlesFor = p => [
    ['Directory', '\\KnownDlls'], ['Directory', '\\Sessions\\1\\BaseNamedObjects'], ['File', 'C:\\Windows\\System32'], ['File', '\\Device\\ConDrv'], ['File', '\\Device\\CNG'],
    ['Key', 'HKLM\\SYSTEM\\ControlSet001\\Control\\Nls\\Sorting\\Versions'], ['Key', 'HKCU\\Console'], ['Key', 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options'],
    ['Thread', `${p.name}(${p.pid}): ${p.pid + 4}`], ['Thread', `${p.name}(${p.pid}): ${p.pid + 12}`], ['Event', '\\KernelObjects\\MaximumCommitCondition'], ['ALPC Port', '\\RPC Control\\OLE5A1C'],
    ['Mutant', '\\Sessions\\1\\BaseNamedObjects\\SM0:' + p.pid + ':304:WilStaging_02'], ['Section', '\\Sessions\\1\\BaseNamedObjects\\windows_shell_global_counters'], ['WindowStation', '\\Sessions\\1\\Windows\\WindowStations\\WinSta0'], ['Desktop', '\\Default']];
  const threadsFor = p => [[p.pid + 4, '< 0.01', '12,840', `${p.name}+0x1a2b0`], [p.pid + 12, '', '', 'ntdll.dll!TpReleaseCleanupGroupMembers+0x330'], [p.pid + 20, '', '', 'combase.dll!CoGetApartmentType+0x9e0']];

  Win.registerApp('procexp', {
    title: 'Process Explorer', hidden: true, single: true,
    windowTitle: () => `Process Explorer - Sysinternals: www.sysinternals.com [${Win.S.computer}\\${Win.S.user}]`,
    proc: { name: 'procexp64.exe', desc: 'Sysinternals Process Explorer', company: 'Sysinternals - www.sysinternals.com', tmName: 'Process Explorer', mem: 32000, path: `C:\\Users\\CyberOpsUser\\Downloads\\SysinternalsSuite\\procexp64.exe` },
    create(w) {
      let lowerPane = false, lowerView = 'Handles';
      const tree = () => {
        const all = Win.proc.list();
        const byParent = {};
        all.forEach(p => { const par = all.some(x => x.pid === p.parent) ? p.parent : 0; (byParent[par] = byParent[par] || []).push(p); });
        const out = [];
        const walk = (pid, depth) => (byParent[pid] || []).sort((a, b) => a.pid - b.pid).forEach(p => {
          const par = all.find(x => x.pid === p.parent);
          out.push({ id: p.pid, name: p.name, pid: p.pid, cpu: p.name === 'System' ? '0.12' : (p.name === 'PING.EXE' ? '0.02' : ''), priv: Math.round(p.mem * .8).toLocaleString() + ' K', desc: p.desc, company: p.company, _indent: depth, _sr: par ? `, child of ${par.name}` : ', top-level process', ref: p });
          walk(p.pid, depth + 1);
        });
        walk(0, 0);
        return out;
      };
      const cols = () => {
        const c = [{ key: 'name', label: 'Process', sort: false }, { key: 'pid', label: 'PID', sort: false }, { key: 'cpu', label: 'CPU', sort: false }, { key: 'priv', label: 'Private Bytes', sort: false }, { key: 'desc', label: 'Description', sort: false }, { key: 'company', label: 'Company Name', sort: false }];
        if (vtOn) c.push({ key: 'vt', label: 'VirusTotal', sort: false, fmt: r => r.name === 'conhost.exe' || r.name === 'cmd.exe' || r.name === 'explorer.exe' ? h('button', { type: 'button', class: 'link', onclick: () => Win.openApp('edge', { url: 'www.virustotal.com/gui/file/' + r.name.replace('.exe', '') }) }, `0/74, open the VirusTotal report for ${r.name}`) : (r.ref.system ? 'Hash submitted' : '') });
        return c;
      };
      const g = Win.grid({ caption: 'Processes, shown as a tree. Indented processes were started by the process above them.', cols: cols(), rows: tree(), key: 'id', nameKey: 'name', sortable: false, onContext: (r, b) => menu(r, b),
        onSelect: () => drawLower(), rowClass: r => r.ref._new ? 'new-proc' : '' });
      const lower = h('div', { class: 'lower-pane' });
      const actions = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, 'Actions for selected process');
      actions.addEventListener('click', () => { const r = g.selected; if (!r) { announce('Select a process first.'); return; } menu(r, actions); });
      const finder = h('button', { type: 'button' }, "Find Window's Process");
      finder.addEventListener('click', findWindow);
      const mb = Win.menubar([
        { label: 'File', items: [{ label: 'Exit', action: () => w.close() }] },
        { label: 'View', items: () => [{ label: 'Show Lower Pane', checked: lowerPane, action: () => { lowerPane = !lowerPane; drawLower(true); } }, { label: 'Lower Pane View', submenu: [{ label: 'DLLs', checked: lowerPane && lowerView === 'DLLs', action: () => { lowerPane = true; lowerView = 'DLLs'; drawLower(true); } }, { label: 'Handles', checked: lowerPane && lowerView === 'Handles', action: () => { lowerPane = true; lowerView = 'Handles'; drawLower(true); } }] }, { label: 'Refresh Now', action: () => { g.update(tree()); announce('Refreshed.'); } }] },
        { label: 'Process', items: () => { const r = g.selected; return r ? [{ label: 'Properties...', action: () => props(r.ref) }, { label: 'Kill Process', action: () => kill(r.ref) }] : [{ label: 'Select a process first', disabled: true }]; } },
        { label: 'Help', items: [{ label: 'About', action: () => Win.alertBox('About Process Explorer', 'Process Explorer, Sysinternals. Simulated for this lab.') }] }
      ], 'Process Explorer menu bar');
      w.body.append(mb, h('div', { class: 'toolbar' }, finder, actions), g.el, lower);

      function menu(r, b) {
        Win.popMenu(b, [{ label: 'Properties...', action: () => props(r.ref) }, { label: 'Kill Process', action: () => kill(r.ref) }, { label: 'Kill Process Tree', action: () => kill(r.ref, true) }, { label: 'Check VirusTotal', action: () => checkVT(r.ref) }, { label: 'Search Online...', action: () => Win.alertBox('Search Online', 'Online search is not available in this simulation.') }], `Actions for ${r.name}, PID ${r.pid}`);
      }
      async function findWindow() {
        const wins = Win.S.windows.filter(x => x !== w);
        if (!wins.length) { Win.alertBox("Find Window's Process", 'No other windows are open. Open a window first.'); return; }
        let choice = wins[0].n;
        const body = Win.radios('fw', 'Choose the window whose process you want to find', wins.map(x => ({ value: String(x.n), label: x.title })), String(choice), v => { choice = v; });
        const r = await Win.dialog({ title: "Find Window's Process", body, buttons: [{ label: 'Find', value: 'find', primary: true }, { label: 'Cancel', value: 'cancel' }] });
        if (r.value !== 'find') return;
        const target = wins.find(x => String(x.n) === String(choice));
        const p = Win.proc.get(target.pid);
        if (!p) { announce('That window does not have a process in this simulation.'); return; }
        g.select(p.pid); g.focusRow(p.pid);
        const par = Win.proc.get(p.parent);
        const kids = Win.proc.children(p.pid).map(c => c.name);
        announce(`Found ${p.name}, PID ${p.pid}${par ? ', child of ' + par.name : ''}${kids.length ? '. Its child processes: ' + kids.join(', ') : ''}.`);
        if (p.name === 'msedge.exe') T('findedge');
        if (p.name === 'cmd.exe') T('findcmd');
      }
      async function kill(p, treeKill) {
        if (p.protected) { Win.alertBox('Process Explorer', `Error terminating process: Access is denied. ${p.name} is a protected system process.`); return; }
        const ok = await Win.dialog({ title: 'Process Explorer', describedBy: true, body: h('p', null, `Are you sure you want to kill ${p.name}${treeKill ? ' and its descendants' : ''}?`), buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
        if (ok.value !== 'ok') return;
        const kids = Win.proc.children(p.pid).map(c => c.name);
        if (treeKill) { const rec = pid => { Win.proc.children(pid).forEach(c => rec(c.pid)); Win.proc.kill(pid, 'killed'); }; rec(p.pid); }
        else Win.proc.kill(p.pid, 'killed');
        const still = kids.filter(n => Win.proc.byName(n).some(x => x.parent === p.pid));
        announce(`${p.name} was killed.${kids.length ? ' Child processes ' + kids.join(', ') + (still.length ? ' are still running.' : ' have ended too.') : ''}`);
        if (p.name === 'msedge.exe') T('killedge');
        if (p.name === 'cmd.exe' && kids.includes('conhost.exe')) T('killcmd');
        g.update(tree());
      }
      async function checkVT(p) {
        if (!vtOn) {
          const r = await Win.confirmBox('VirusTotal Terms of Service', 'Process Explorer will send file hashes to VirusTotal. Do you agree to the VirusTotal terms of service and privacy policy?', 'Yes', 'No');
          if (!r) return;
          vtOn = true; pe.values.find(v => v.name === 'VirusTotalCheck').data = 1;
        }
        g.setCols(cols()); g.update(tree());
        announce(`VirusTotal column added. The result for ${p.name} is 0 of 74 engines flagged it. Select the result link in the VirusTotal column to open the report.`);
      }
      function props(p) {
        const par = Win.proc.get(p.parent);
        Win.dialog({ title: `${p.name}:${p.pid} Properties`, wide: true, body: Win.tabs({ label: `${p.name} properties`, items: [
          { id: 'img', label: 'Image', render: x => x.append(h('dl', { class: 'kv' }, h('dt', null, 'Description'), h('dd', null, p.desc), h('dt', null, 'Company'), h('dd', null, p.company), h('dt', null, 'Path'), h('dd', null, p.path), h('dt', null, 'Command line'), h('dd', null, p.name === 'conhost.exe' ? '\\??\\C:\\Windows\\system32\\conhost.exe 0xffffffff -ForceV1' : p.path), h('dt', null, 'Parent'), h('dd', null, par ? `${par.name}(${par.pid})` : '<Non-existent Process>'), h('dt', null, 'User'), h('dd', null, `${Win.S.computer}\\${p.user}`))) },
          { id: 'perf', label: 'Performance', render: x => x.append(h('dl', { class: 'kv' }, h('dt', null, 'Priority'), h('dd', null, '8'), h('dt', null, 'Private Bytes'), h('dd', null, Math.round(p.mem * .8).toLocaleString() + ' K'), h('dt', null, 'Working Set'), h('dd', null, p.mem.toLocaleString() + ' K'), h('dt', null, 'Handles'), h('dd', null, String(handlesFor(p).length)), h('dt', null, 'Threads'), h('dd', null, '3'))) },
          { id: 'threads', label: 'Threads', render: x => { const rows = threadsFor(p); x.append(h('p', null, `Count: ${rows.length}`), h('div', { class: 'table-scroll' }, h('table', { class: 'data' }, h('caption', null, `Threads in ${p.name}`), h('thead', null, h('tr', null, ['TID', 'CPU', 'Cycles Delta', 'Start Address'].map(c => h('th', { scope: 'col' }, c)))), h('tbody', null, rows.map(r => h('tr', null, r.map(c => h('td', null, String(c))))))))); if (p.name === 'conhost.exe') T('threads'); } },
          { id: 'tcp', label: 'TCP/IP', render: x => x.append(h('p', null, 'No network connections for this process.')) },
          { id: 'sec', label: 'Security', render: x => x.append(h('dl', { class: 'kv' }, h('dt', null, 'User'), h('dd', null, `${Win.S.computer}\\${p.user}`), h('dt', null, 'Session'), h('dd', null, '1'), h('dt', null, 'Groups'), h('dd', null, 'BUILTIN\\Administrators, BUILTIN\\Users, Everyone, NT AUTHORITY\\INTERACTIVE'))) },
          { id: 'env', label: 'Environment', render: x => x.append(h('dl', { class: 'kv' }, h('dt', null, 'COMPUTERNAME'), h('dd', null, Win.S.computer), h('dt', null, 'USERNAME'), h('dd', null, p.user), h('dt', null, 'windir'), h('dd', null, 'C:\\Windows'), h('dt', null, 'TEMP'), h('dd', null, `C:\\Users\\${p.user}\\AppData\\Local\\Temp`))) },
          { id: 'str', label: 'Strings', render: x => x.append(h('p', null, 'Strings found in the image file: !This program cannot be run in DOS mode., .text, .rdata, KERNEL32.dll, ntdll.dll, Console Window Host.')) }
        ] }).el });
      }
      function drawLower(user) {
        lower.textContent = '';
        if (!lowerPane) { if (user) announce('Lower pane hidden.'); return; }
        const r = g.selected;
        const head = h('h4', { tabindex: '-1' }, `Lower pane: ${lowerView}${r ? ' for ' + r.name + ', PID ' + r.pid : ''}`);
        lower.append(head);
        if (!r) { lower.append(h('p', null, 'Select a process in the list above to see its ' + lowerView.toLowerCase() + '.')); }
        else if (lowerView === 'Handles') {
          const rows = handlesFor(r.ref);
          lower.append(h('div', { class: 'table-scroll' }, h('table', { class: 'data' }, h('caption', null, `${rows.length} handles open in ${r.name}`), h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Type'), h('th', { scope: 'col' }, 'Name'))), h('tbody', null, rows.map(x => h('tr', null, h('td', null, x[0]), h('td', null, x[1])))))));
          if (r.name === 'conhost.exe') T('handles');
        } else {
          lower.append(h('ul', null, ['ntdll.dll', 'KERNEL32.DLL', 'KERNELBASE.dll', 'combase.dll', 'USER32.dll', 'GDI32.dll', 'uxtheme.dll'].map(d => h('li', null, d))));
        }
        if (user) { announce(`Lower pane shows ${lowerView}.`); head.focus(); }
      }
      const onStart = p => {
        g.update(tree());
        const par = Win.proc.get(p.parent);
        if (p.kind !== 'sub') announce(`Process Explorer: new process ${p.name} started${par ? ', child of ' + par.name : ''}.`);
        if (p.name === 'PING.EXE' && par && par.name === 'cmd.exe') T('ping');
      };
      const onExit = p => { g.update(tree()); if (p.kind !== 'sub' && p.why !== 'window closed' && Win.active === w) announce(`Process Explorer: ${p.name} exited.`); drawLower(); };
      Win.on('proc:start', d => { if (w.el.isConnected) onStart(d); });
      Win.on('proc:exit', d => { if (w.el.isConnected) onExit(d); });
      Win.emit('procexp:open', {});
    }
  });

  async function launchProcExp() {
    if (!peAccepted()) {
      const text = h('div', null, h('p', null, 'You must accept the following license terms to use this software.'), h('div', { class: 'note' }, h('p', null, 'SYSINTERNALS SOFTWARE LICENSE TERMS. These license terms are an agreement between Sysinternals (a wholly owned subsidiary of Microsoft Corporation) and you. Please read them. They apply to the software you are downloading. (Shortened for this simulation.)')));
      const r = await Win.dialog({ title: 'Process Explorer License Agreement', body: text, describedBy: true, buttons: [{ label: 'Agree', value: 'agree', primary: true }, { label: 'Decline', value: 'decline' }], cancelValue: 'decline' });
      if (r.value !== 'agree') { announce('You declined the license, so Process Explorer did not start.'); return; }
      const wasReset = sysint.children.includes(pe) && eulaVal().data === 0;
      acceptEula();
      if (wasReset && Lab.isDone('eula0')) T('reopen');
    }
    Win.openApp('procexp');
    T('procexp');
  }

  /* ---------------- Registry Editor ---------------- */
  Win.registerApp('regedit', {
    title: 'Registry Editor', keywords: ['regedit', 'registry'], kind: 'App', single: true, requiresAdmin: true, uacName: 'Registry Editor',
    proc: { name: 'regedit.exe', desc: 'Registry Editor', tmName: 'Registry Editor', mem: 9800, path: 'C:\\Windows\\regedit.exe' },
    create(w) {
      T('regedit');
      let seq = 0;
      const index = {};
      const toNodes = (k, path) => { const id = 'k' + (++seq); index[id] = { k, path }; return { id, label: k.name, children: k.children.map(c => toNodes(c, path + '\\' + c.name)), expanded: k === reg }; };
      const build = () => { seq = 0; Object.keys(index).forEach(x => delete index[x]); return [toNodes(reg, 'Computer')]; };
      const addr = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', value: 'Computer' });
      const vals = h('div', { class: 'pane-main', role: 'region', 'aria-label': 'Values' });
      let cur = null;
      const t = Win.tree({ label: 'Registry keys', nodes: build(), onSelect: n => showKey(index[n.id]) });
      const form = h('form', { class: 'inline-form', onsubmit: e => { e.preventDefault(); go(Lab.normalize(addr.value).text.trim()); } }, Win.field('Address (registry path)', addr, 'For example HKEY_CURRENT_USER\\Software. HKCU also works.'), h('button', { type: 'submit' }, 'Go'));
      w.body.append(Win.menubar([{ label: 'File', items: [{ label: 'Exit', action: () => w.close() }] }, { label: 'Edit', items: () => [{ label: 'Modify...', disabled: !cur || !vg || !vg.selected, action: () => modify(vg.selected.ref) }] }], 'Registry Editor menu bar'), form, h('div', { class: 'two-pane' }, h('div', { class: 'pane-nav' }, t.el), vals));
      let vg = null;
      function showKey(e) {
        cur = e; addr.value = e.path;
        vals.textContent = '';
        vals.append(h('h4', { tabindex: '-1' }, e.path));
        const rows = (e.k.values.length ? e.k.values : [V('(Default)', 'REG_SZ', '(value not set)')]).slice().sort((a, b) => a.name === '(Default)' ? -1 : b.name === '(Default)' ? 1 : a.name.localeCompare(b.name)).map(v => ({ name: v.name, type: v.type, data: fmtData(v), ref: v }));
        vg = Win.grid({ caption: `Values in ${e.k.name}`, cols: [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'data', label: 'Data' }], rows, key: 'name', onOpen: r => modify(r.ref), onContext: (r, b) => Win.popMenu(b, [{ label: 'Modify...', action: () => modify(r.ref) }], `Actions for ${r.name}`) });
        const mod = h('button', { type: 'button', class: 'secondary', onclick: () => { if (!vg.selected) { announce('Select a value first.'); return; } modify(vg.selected.ref); } }, 'Modify selected value');
        vals.append(h('div', { class: 'toolbar' }, mod), vg.el);
        announce(`${e.k.name} key. ${e.k.children.length} subkeys, ${rows.length} values.`);
        if (e.k === pe) {
          T('eula');
          setTimeout(() => announce(`EulaAccepted is ${fmtData(eulaVal())}.`), 900);
        }
      }
      function go(path) {
        const parts = path.replace(/^Computer\\?/i, '').replace(/^HKCU/i, 'HKEY_CURRENT_USER').replace(/^HKLM/i, 'HKEY_LOCAL_MACHINE').split('\\').filter(Boolean);
        let k = reg; const chain = [reg];
        for (const p of parts) { const c = k.children.find(x => x.name.toLowerCase() === p.toLowerCase()); if (!c) { Win.alertBox('Registry Editor', `Registry Editor cannot find the key ${path}. Check the spelling, and note that keys appear only after the app that uses them creates them.`); return; } k = c; chain.push(k); }
        t.rebuild(build());
        const ids = chain.map(c => Object.keys(index).find(id => index[id].k === c));
        ids.slice(0, -1).forEach(id => t.expand(id, true));
        t.select(ids[ids.length - 1]); t.focus(ids[ids.length - 1]);
      }
      async function modify(v) {
        if (v.type !== 'REG_DWORD') { Win.alertBox('Registry Editor', 'Only DWORD values can be edited in this lab.'); return; }
        let base = 'hex';
        const data = h('input', { type: 'text', value: v.data.toString(16), autocomplete: 'off' });
        const body = h('div', null, h('dl', { class: 'kv' }, h('dt', null, 'Value name'), h('dd', null, v.name)), Win.field('Value data', data), Win.radios('base', 'Base', [{ value: 'hex', label: 'Hexadecimal' }, { value: 'dec', label: 'Decimal' }], 'hex', b => { const n = parseInt(data.value || '0', base === 'hex' ? 16 : 10); base = b; data.value = isNaN(n) ? '' : n.toString(b === 'hex' ? 16 : 10); }), h('p', { class: 'dlg-error', role: 'alert' }));
        const r = await Win.dialog({ title: 'Edit DWORD (32-bit) Value', body, buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }],
          validate: () => { const s = data.value.trim(); const ok = base === 'hex' ? /^[0-9a-f]{1,8}$/i.test(s) : /^\d+$/.test(s); return ok ? null : `Enter a ${base === 'hex' ? 'hexadecimal' : 'decimal'} number.`; } });
        if (r.value !== 'ok') return;
        v.data = parseInt(data.value.trim(), base === 'hex' ? 16 : 10);
        showKey(cur);
        vg.select(v.name); vg.focusRow(v.name);
        announce(`${v.name} is now ${fmtData(v)}.`);
        if (v.name === 'EulaAccepted' && v.data === 0) T('eula0');
      }
      showKey(index[Object.keys(index)[0]]);
    }
  });

  /* procexp64.exe opens Process Explorer from File Explorer */
  Win.on('explorer:extract', d => {
    if (/sysinternals/i.test(d.zip)) {
      T('extract');
      ['procexp.exe', 'procexp64.exe'].forEach(n => { const node = Win.fs.get(d.target + '\\' + n); if (node) node.onOpen = () => launchProcExp(); });
      Win.S.apps['procexp-launch'].hidden = false;
    }
  });
  Win.registerApp('procexp-launch', { title: 'Process Explorer (procexp64.exe)', keywords: ['procexp', 'process explorer', 'sysinternals'], kind: 'Downloaded app', hidden: true, launch: () => launchProcExp() });

  /* Desktop */
  Win.desktop(document.getElementById('sim'), { computer: 'DESKTOP-OSB01', user: 'CyberOpsUser' });
})();
