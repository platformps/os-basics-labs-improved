/* Lab 1.3.12: Windows Task Manager */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '1.3.12', title: 'Lab 1.3.12 Windows Task Manager', onReset: () => location.reload(),
    tasks: [
      { id: 'open', label: 'Open Command Prompt and Microsoft Edge' },
      { id: 'tm', label: 'Open Task Manager and show more details' },
      { id: 'expand', label: 'Expand Windows Command Processor' },
      { id: 'conhost', label: 'Open the Properties of Console Window Host' },
      { id: 'closecmd', label: 'Close Command Prompt and check Task Manager' },
      { id: 'sortmem', label: 'Sort by Memory in both directions' },
      { id: 'mempct', label: 'Show the Memory column as percentages' },
      { id: 'switch', label: 'Switch to Microsoft Edge from Task Manager' },
      { id: 'endedge', label: 'End the Microsoft Edge task' },
      { id: 'services', label: 'Review the Services tab' },
      { id: 'perfcpu', label: 'Read the CPU page of the Performance tab' },
      { id: 'perfmem', label: 'Read the Memory page' },
      { id: 'perfeth', label: 'Read the Ethernet page' },
      { id: 'resmon', label: 'Open Resource Monitor' }
    ]
  });
  Win.S.users.CyberOpsUser = { password: 'Cisco123!', groups: ['Administrators', 'Users'], admin() { return this.groups.includes('Administrators'); } };
  WinApps.baseSystem();

  const has = id => Win.S.windows.some(w => w.appId === id);
  Win.on('window:open', w => { if (has('cmd') && has('edge')) T('open'); });
  Win.on('tm:more', ({ on }) => { if (on) T('tm'); });
  Win.on('window:open', w => { if (w.appId === 'taskmgr' && Win.S.tmStartMore) T('tm'); });
  Win.on('tm:expand', ({ name, on }) => { if (on && /Command Processor/.test(name)) T('expand'); });
  Win.on('tm:props', ({ name }) => { if (name === 'conhost.exe') T('conhost'); });
  Win.on('window:close', w => { if (w.appId === 'cmd' && has('taskmgr')) { T('closecmd'); Lab.announce('Command Prompt closed. Switch to Task Manager to see what changed.'); } });
  const dirs = new Set();
  Win.on('tm:sortmem', ({ dir }) => { dirs.add(dir); if (dirs.size === 2) T('sortmem'); });
  Win.on('tm:mempct', ({ on }) => { if (on) T('mempct'); });
  Win.on('tm:switch', ({ name }) => { if (/Edge/.test(name)) T('switch'); });
  Win.on('tm:endtask', ({ name }) => { if (/Edge/.test(name)) T('endedge'); });
  Win.on('tm:services', () => T('services'));
  Win.on('tm:perf', ({ page }) => { if (page === 'CPU') T('perfcpu'); if (page === 'Memory') T('perfmem'); if (page === 'Ethernet') T('perfeth'); });
  Win.on('resmon:open', () => T('resmon'));

  Win.desktop(document.getElementById('sim'), { computer: 'DESKTOP-OSB01', user: 'CyberOpsUser' });
})();
