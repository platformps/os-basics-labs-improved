/* Lab 1.3.11: Using Windows PowerShell */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '1.3.11', title: 'Lab 1.3.11 Using Windows PowerShell', onReset: () => location.reload(),
    tasks: [
      { id: 'openps', label: 'Open Windows PowerShell' },
      { id: 'opencmd', label: 'Open Command Prompt' },
      { id: 'dirboth', label: 'Run dir in both PowerShell and Command Prompt' },
      { id: 'other', label: 'Run another familiar command, such as ping, cd, or ipconfig, in both windows' },
      { id: 'alias', label: 'Find the cmdlet behind dir with Get-Alias' },
      { id: 'nethelp', label: 'Display the netstat options' },
      { id: 'route', label: 'Display the routing table with netstat -r' },
      { id: 'adminps', label: 'Open PowerShell as an administrator' },
      { id: 'abno', label: 'Run netstat -abno as an administrator' },
      { id: 'tmpid', label: 'Find a netstat PID in Task Manager Details and open its Properties' },
      { id: 'recycle', label: 'Check that the Recycle Bin has items in it' },
      { id: 'clear', label: 'Empty the Recycle Bin with Clear-RecycleBin' },
      { id: 'verify', label: 'Confirm the Recycle Bin is empty' }
    ]
  });
  Win.S.users.CyberOpsUser = { password: 'Cisco123!', groups: ['Administrators', 'Users'], admin() { return this.groups.includes('Administrators'); } };
  Win.S.tmStartMore = true;
  WinApps.baseSystem();
  const home = 'C:\\Users\\CyberOpsUser';
  ['old-notes.txt', 'draft-report.txt', 'screenshot-2026-09-30.png'].forEach((n, i) => Win.recycle.push({ name: n, from: home + (i === 2 ? '\\Pictures' : '\\Documents'), node: { name: n, type: 'file', size: 2048 * (i + 1) }, deleted: '10/4/2026 4:1' + i + ' PM' }));

  const dirSeen = new Set(), otherSeen = new Set();
  const netPids = [756, 4, 636, 548, 304, 440, 1856, 4120];
  Win.on('window:open', w => { if (w.appId === 'powershell') { T('openps'); if (w.opts.elevated) T('adminps'); } if (w.appId === 'cmd') T('opencmd'); });
  Win.on('shell:command', ({ dialect, name, args, ctx }) => {
    if (['dir', 'ls', 'get-childitem', 'gci'].includes(name)) { dirSeen.add(dialect); if (dirSeen.size === 2) T('dirboth'); }
    if (['ping', 'cd', 'chdir', 'set-location', 'ipconfig'].includes(name)) { otherSeen.add(dialect); if (otherSeen.size === 2) T('other'); }
    if (name === 'netstat' && dialect === 'ps') {
      const f = args.join('').replace(/[-/]/g, '').toLowerCase();
      if (f === '?' || f === 'h') T('nethelp');
      if (f === 'r') T('route');
      if (f.includes('a') && f.includes('b') && f.includes('o') && ctx.elevated) T('abno');
    }
  });
  Win.on('ps:alias', ({ names }) => { if (names.includes('dir')) T('alias'); });
  Win.on('tm:props', ({ pid }) => { if (netPids.includes(pid)) T('tmpid'); });
  Win.on('recycle:viewed', ({ count }) => { if (count > 0) T('recycle'); else if (Lab.isDone('clear')) T('verify'); });
  Win.on('recycle:change', d => {
    if (d.emptied && d.via !== 'gui') { T('clear'); if (Win.S.windows.some(w => w.appId === 'recycle')) Lab.announce('The Recycle Bin window now shows that the folder is empty. Switch to it to confirm.'); }
    if (d.via === 'gui') Lab.announce('You emptied the Recycle Bin with the mouse. For this lab, use Clear-RecycleBin in PowerShell. Use Start over to refill the Recycle Bin.');
  });
  Win.on('window:activate', w => { if (w.appId === 'recycle' && !Win.recycle.length && Lab.isDone('clear')) T('verify'); });

  Win.desktop(document.getElementById('sim'), { computer: 'DESKTOP-OSB01', user: 'CyberOpsUser' });
})();
