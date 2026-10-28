/* Lab 1.3.13: Monitor and Manage System Resources in Windows */
(() => {
  const { h, announce } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '1.3.13', title: 'Lab 1.3.13 Monitor and Manage System Resources in Windows', onReset: () => location.reload(),
    tasks: [
      { id: 'netconn', label: 'Open Network Connections from Network and Sharing Center' },
      { id: 'freeze', label: 'Open Performance Monitor, freeze the display, and clear the graph' },
      { id: 'manual', label: 'Set Routing and Remote Access to Manual and apply' },
      { id: 'unfreeze', label: 'Unfreeze Performance Monitor before starting the service' },
      { id: 'start', label: 'Start the Routing and Remote Access service' },
      { id: 'incoming', label: 'Refresh Network Connections and find Incoming Connections' },
      { id: 'gone', label: 'Stop the service and see Incoming Connections disappear' },
      { id: 'report', label: 'Freeze Performance Monitor and switch to Report view' },
      { id: 'disabled', label: 'Set Routing and Remote Access back to Disabled' },
      { id: 'events', label: 'Read the four Routing and Remote Access events in the System log' },
      { id: 'dcs', label: 'Create the Memory Logs data collector set' },
      { id: 'csvfmt', label: 'Change the log format to Comma Separated and read the example file name' },
      { id: 'run', label: 'Start and then stop the Memory Logs data collector set' },
      { id: 'csv', label: 'Open DataCollector01.csv' },
      { id: 'cleanup', label: 'Delete the Memory Logs set and its log folder' }
    ]
  });
  Win.S.users.CyberOpsUser = { password: 'Cisco123!', groups: ['Administrators', 'Users'], admin() { return this.groups.includes('Administrators'); } };
  WinApps.baseSystem();
  const rras = () => WinApps.services.find(s => s.name === 'RemoteAccess');
  const pad = n => String(n).padStart(2, '0');
  const today = new Date();
  const stamp = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
  const logFolder = `C:\\PerfLogs\\${Win.S.computer}_${stamp}-000001`;

  /* ---------------- Service task tracking ---------------- */
  let recordingAtStart = null;
  Win.on('service:change', ({ s, what, type, status }) => {
    if (s.name !== 'RemoteAccess') return;
    if (what === 'startup' && type === 'Manual') T('manual');
    if (what === 'startup' && type === 'Disabled' && Lab.isDone('start')) T('disabled');
    if (what === 'status' && status === 'Running') { T('start'); recordingAtStart = pm.recording; if (pm.recording) pm.spike = 6; }
  });

  /* ---------------- Network and Sharing Center, Network Connections ---------------- */
  Win.registerApp('netsharing', {
    title: 'Network and Sharing Center', keywords: ['network and sharing center', 'network'], kind: 'Control Panel item', single: true,
    create(w) {
      w.body.append(h('p', null, 'View your basic network information and set up connections.'), h('dl', { class: 'kv' }, h('dt', null, 'Active network'), h('dd', null, 'Network 2, Private network'), h('dt', null, 'Access type'), h('dd', null, 'Internet'), h('dt', null, 'Connections'), h('dd', null, 'Ethernet')),
        h('ul', { class: 'cp-list' }, h('li', null, h('button', { type: 'button', class: 'link', onclick: () => Win.openApp('netconns') }, 'Change adapter settings')), h('li', null, h('button', { type: 'button', class: 'link', onclick: () => Win.alertBox('Network and Sharing Center', 'Not used in this lab.') }, 'Change advanced sharing settings'))));
    }
  });
  let sawIncoming = false;
  Win.registerApp('netconns', {
    title: 'Network Connections', keywords: ['network connections', 'ncpa.cpl', 'adapter'], kind: 'Control Panel item', single: true,
    create(w) {
      const g = Win.grid({ caption: 'Network connections', cols: [{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }, { key: 'device', label: 'Device Name' }], rows: [], key: 'name' });
      const refresh = (user) => {
        const rows = [{ name: 'Ethernet', status: 'Network 2', device: 'Intel(R) PRO/1000 MT Desktop Adapter' }];
        if (rras().status === 'Running') rows.push({ name: 'Incoming Connections', status: 'No clients connected', device: 'Routing and Remote Access' });
        g.update(rows);
        if (user) announce(`Refreshed. ${rows.length} items: ${rows.map(r => r.name).join(', ')}.`);
        if (rows.length === 2) { sawIncoming = true; if (Lab.isDone('start')) T('incoming'); }
        else if (sawIncoming && rras().status !== 'Running') T('gone');
      };
      const btn = h('button', { type: 'button', onclick: () => refresh(true) }, 'Refresh (F5)');
      w.body.append(h('div', { class: 'toolbar' }, btn), g.el);
      w.el.addEventListener('keydown', e => { if (e.key === 'F5') { e.preventDefault(); refresh(true); } });
      refresh(false);
      T('netconn');
    }
  });

  /* ---------------- Performance Monitor ---------------- */
  const pm = { recording: true, samples: [], view: 'line', spike: 0, sets: [], timer: null };
  function sample() {
    if (!pm.recording) return;
    let v = 1 + Math.random() * 4;
    if (pm.spike > 0) { v = 18 + Math.random() * 14; pm.spike--; }
    pm.samples.push(v);
    if (pm.samples.length > 100) pm.samples.shift();
    Win.emit('pm:sample', {});
  }
  pm.timer = setInterval(sample, 1000);
  for (let i = 0; i < 30; i++) pm.samples.push(1 + Math.random() * 4);

  const counterTree = [
    { id: 'Memory', label: 'Memory', children: ['% Committed Bytes In Use', 'Available Bytes', 'Available KBytes', 'Available MBytes', 'Cache Bytes', 'Committed Bytes', 'Page Faults/sec', 'Pages/sec'].map(c => ({ id: 'Memory|' + c, label: c })) },
    { id: 'Processor', label: 'Processor', children: ['% Idle Time', '% Privileged Time', '% Processor Time', '% User Time', 'Interrupts/sec'].map(c => ({ id: 'Processor|' + c, label: c })) },
    { id: 'LogicalDisk', label: 'LogicalDisk', children: ['% Free Space', 'Disk Reads/sec', 'Disk Writes/sec', 'Free Megabytes'].map(c => ({ id: 'LogicalDisk|' + c, label: c })) },
    { id: 'Network Interface', label: 'Network Interface', children: ['Bytes Received/sec', 'Bytes Sent/sec', 'Bytes Total/sec'].map(c => ({ id: 'Network Interface|' + c, label: c })) }
  ];
  async function addCountersDialog(current) {
    const added = current.slice();
    let pick = null;
    const ag = Win.grid({ caption: 'Added counters', cols: [{ key: 'c', label: 'Counter' }, { key: 'parent', label: 'Parent' }, { key: 'inst', label: 'Instance' }, { key: 'comp', label: 'Computer' }], rows: [], key: 'c', sortable: false });
    const redraw = () => ag.update(added.map(c => ({ c, parent: '', inst: '', comp: '\\\\' + Win.S.computer })));
    const tr = Win.tree({ label: 'Available counters. Expand an object, then select a counter.', nodes: JSON.parse(JSON.stringify(counterTree)), onSelect: n => { pick = n.id.includes('|') ? n.id : null; } });
    const add = h('button', { type: 'button', onclick: () => { if (!pick) { announce('Expand an object such as Memory and select a counter first.'); return; } const name = '\\' + pick.replace('|', '\\'); if (!added.includes(name)) added.push(name); redraw(); announce(`Added ${name}.`); } }, 'Add >>');
    const rm = h('button', { type: 'button', class: 'secondary', onclick: () => { const s = ag.selected; if (!s) return; added.splice(added.indexOf(s.c), 1); redraw(); announce(`Removed ${s.c}.`); } }, '<< Remove');
    redraw();
    const r = await Win.dialog({ title: 'Add Counters', wide: true, body: h('div', null, h('p', null, 'Select counters from computer: <Local computer>'), tr.el, h('div', { class: 'toolbar' }, add, rm), ag.el), buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
    return r.value === 'ok' ? added : current;
  }
  async function browseFolder(start) {
    let chosen = start || 'C:\\PerfLogs';
    const nodes = [{ id: 'pc', label: 'This PC', expanded: true, children: [{ id: 'C:\\', label: 'Local Disk (C:)', children: ['PerfLogs', 'Program Files', 'Users', 'Windows'].map(n => ({ id: 'C:\\' + n, label: n })) }] }];
    const tr = Win.tree({ label: 'Folders', nodes, onSelect: n => { if (n.id !== 'pc') chosen = n.id; } });
    const r = await Win.dialog({ title: 'Browse For Folder', body: h('div', null, h('p', null, 'Select a folder. Expand Local Disk (C:) to see its folders.'), tr.el), buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
    return r.value === 'ok' ? chosen : null;
  }
  function newSetWizard(onDone) {
    Win.wizard({
      title: 'Create new Data Collector Set', data: { name: 'New Data Collector Set', mode: 'template', kind: 'logs', perf: false, counters: [], interval: '15', units: 'Seconds', root: '%systemdrive%\\PerfLogs\\Admin\\New Data Collector Set', after: 'save' },
      pages: [
        { title: 'How would you like to create this new data collector set?', render: (b, d) => { const n = h('input', { type: 'text', value: d.name }); n.addEventListener('input', () => { d.name = n.value; d.root = d.root.includes('\\Admin\\') ? '%systemdrive%\\PerfLogs\\Admin\\' + n.value : d.root; }); b.append(Win.field('Name', n), Win.radios('dcs-mode', 'Create', [{ value: 'template', label: 'Create from a template (Recommended)' }, { value: 'manual', label: 'Create manually (Advanced)' }], d.mode, v => { d.mode = v; })); },
          validate: d => !d.name.trim() ? 'Enter a name.' : d.mode !== 'manual' ? 'For this lab, choose Create manually (Advanced).' : null },
        { title: 'What type of data do you want to include?', render: (b, d) => { b.append(Win.radios('dcs-kind', 'Data type', [{ value: 'logs', label: 'Create data logs' }, { value: 'alert', label: 'Performance Counter Alert' }], d.kind, v => { d.kind = v; }), h('fieldset', null, h('legend', null, 'Data logs to create'), Win.checkbox('Performance counter', d.perf, v => { d.perf = v; }), Win.checkbox('Event trace data', false, null), Win.checkbox('System configuration information', false, null))); },
          validate: d => d.kind !== 'logs' ? 'Choose Create data logs.' : !d.perf ? 'Check Performance counter.' : null },
        { title: 'Which performance counters would you like to log?', render: (b, d) => {
            const list = h('ul'); const draw = () => { list.textContent = ''; d.counters.forEach(c => list.append(h('li', null, c))); if (!d.counters.length) list.append(h('li', null, 'No counters added yet.')); };
            draw();
            const iv = h('input', { type: 'number', min: '1', value: d.interval }); iv.addEventListener('input', () => { d.interval = iv.value; });
            b.append(h('h4', null, 'Performance counters'), list, h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: async () => { d.counters = await addCountersDialog(d.counters); draw(); } }, 'Add...')), Win.field('Sample interval', iv), Win.select('Units', ['Seconds', 'Minutes', 'Hours'].map(v => ({ value: v, label: v })), d.units, v => { d.units = v; }));
          },
          validate: d => !d.counters.length ? 'Add at least one counter.' : !(+d.interval > 0) ? 'Enter a sample interval.' : null },
        { title: 'Where would you like the data to be saved?', render: (b, d) => {
            const root = h('input', { type: 'text', value: d.root }); root.addEventListener('input', () => { d.root = root.value; });
            b.append(Win.field('Root directory', root), h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: async () => { const f = await browseFolder(); if (f) { d.root = f; root.value = f; announce(`Root directory set to ${f}.`); } } }, 'Browse...')));
          } },
        { title: 'Create the data collector set?', render: (b, d) => { b.append(h('p', null, 'Run as: <Default>'), Win.radios('dcs-after', 'Select an option', [{ value: 'props', label: 'Open properties for this data collector set' }, { value: 'start', label: 'Start this data collector set now' }, { value: 'save', label: 'Save and close' }], d.after, v => { d.after = v; })); } }
      ],
      onFinish: d => onDone(d)
    });
  }

  Win.registerApp('perfmon', {
    title: 'Performance Monitor', keywords: ['performance monitor', 'perfmon'], kind: 'Windows Tools app', single: true,
    proc: { name: 'mmc.exe', desc: 'Microsoft Management Console', tmName: 'Performance Monitor', mem: 28000 },
    create(w) {
      const right = h('div', { class: 'pane-main', role: 'region', 'aria-label': 'Details pane' });
      const nodes = () => [{ id: 'perf', label: 'Performance', expanded: true, children: [
        { id: 'mt', label: 'Monitoring Tools', expanded: true, children: [{ id: 'pmon', label: 'Performance Monitor' }] },
        { id: 'dcs', label: 'Data Collector Sets', expanded: true, children: [{ id: 'ud', label: 'User Defined', expanded: true, children: pm.sets.map(s => ({ id: 'set:' + s.name, label: s.name })) }, { id: 'sys', label: 'System' }, { id: 'ets', label: 'Event Trace Sessions' }, { id: 'sets', label: 'Startup Event Trace Sessions' }] },
        { id: 'rep', label: 'Reports', children: [{ id: 'rud', label: 'User Defined' }, { id: 'rsys', label: 'System' }] }] }];
      let cur = 'perf';
      const t = Win.tree({ label: 'Console tree', nodes: nodes(), onSelect: n => show(n.id, true) });
      w.body.append(h('div', { class: 'two-pane' }, h('div', { class: 'pane-nav' }, t.el), right));
      const rebuild = (sel) => { t.rebuild(nodes()); if (sel) { t.select(sel); } };
      function show(id, user) {
        cur = id; right.textContent = '';
        const head = h('h4', { tabindex: '-1' });
        right.append(head);
        if (id === 'pmon') { head.textContent = 'Performance Monitor'; monitorView(); }
        else if (id === 'ud') { head.textContent = 'Data Collector Sets: User Defined'; udView(); }
        else if (id.startsWith('set:')) { const s = pm.sets.find(x => 'set:' + x.name === id); head.textContent = s.name; setView(s); }
        else if (id === 'perf') { head.textContent = 'Performance'; right.append(h('p', null, 'Use Performance Monitor to view performance data either in real time or from a log file. Select Performance Monitor under Monitoring Tools to start.'), h('dl', { class: 'kv' }, h('dt', null, 'Memory'), h('dd', null, '1,434 MB in use, 2,560 MB available'), h('dt', null, 'Network'), h('dd', null, '32 Kbps'), h('dt', null, 'Processor'), h('dd', null, '6% total processor time'))); }
        else { head.textContent = (t.selected && t.selected.label) || ''; right.append(h('p', null, 'This item is not used in this lab.')); }
      }
      let mvRefs = null;
      function stats() { const s = pm.samples; const last = s[s.length - 1] || 0; const avg = s.reduce((a, b) => a + b, 0) / (s.length || 1); return { last, avg, min: Math.min(...s), max: Math.max(...s) }; }
      function monitorView() {
        const freezeBtn = h('button', { type: 'button' });
        const graphType = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, 'Change graph type');
        const graphAct = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, 'Graph actions');
        const readout = h('div', { class: 'panel', role: 'region', 'aria-label': 'Graph readings' });
        const legend = h('div', { class: 'table-scroll' }, h('table', { class: 'data' }, h('caption', null, 'Counter list (legend)'), h('thead', null, h('tr', null, ['Show', 'Color', 'Scale', 'Counter', 'Instance', 'Parent', 'Object', 'Computer'].map(c => h('th', { scope: 'col' }, c)))), h('tbody', null, h('tr', null, ['Yes', 'Red line', '1.0', '% Processor Time', '_Total', '---', 'Processor Information', '\\\\' + Win.S.computer].map(c => h('td', null, c))))));
        const drawBtn = () => { freezeBtn.textContent = pm.recording ? 'Freeze Display' : 'Unfreeze Display'; freezeBtn.setAttribute('aria-describedby', 'pm-state'); };
        const state = h('p', { id: 'pm-state' });
        freezeBtn.addEventListener('click', () => {
          pm.recording = !pm.recording; drawBtn(); draw();
          announce(pm.recording ? 'Display unfrozen. Recording.' : 'Display frozen. Recording paused.');
          Win.emit('pm:freeze', { recording: pm.recording });
        });
        graphType.addEventListener('click', () => Win.popMenu(graphType, ['Line', 'Histogram bar', 'Report'].map(v => ({ label: v, checked: pm.view === v.toLowerCase().split(' ')[0], action: () => { pm.view = v.toLowerCase().split(' ')[0]; draw(); announce(`Graph type: ${v}.`); Win.emit('pm:view', { view: pm.view }); } })), 'Graph type'));
        graphAct.addEventListener('click', () => Win.popMenu(graphAct, [{ label: 'Clear', action: () => { pm.samples = []; draw(); announce('Graph cleared.'); Win.emit('pm:clear', {}); } }, { label: 'Add Counters...', action: () => Win.alertBox('Add Counters', 'Adding counters to the live graph is not part of this lab.') }, { label: 'Properties', action: () => Win.alertBox('Performance Monitor Properties', 'Not used in this lab.') }], 'Graph actions'));
        function draw() {
          state.textContent = pm.recording ? 'State: recording (display not frozen).' : 'State: display frozen.';
          readout.textContent = '';
          const st = stats();
          if (pm.view === 'report') {
            readout.append(h('h5', null, 'Report view'), h('table', { class: 'data' }, h('caption', null, 'Report'), h('thead', null, h('tr', null, ['Computer', 'Object', 'Instance', 'Counter', 'Value'].map(c => h('th', { scope: 'col' }, c)))), h('tbody', null, h('tr', null, ['\\\\' + Win.S.computer, 'Processor Information', '_Total', '% Processor Time', pm.samples.length ? st.last.toFixed(3) : '0.000'].map(c => h('td', null, c))))));
          } else {
            readout.append(h('h5', null, pm.view === 'line' ? 'Line graph readings' : 'Histogram readings'),
              pm.samples.length ? h('dl', { class: 'kv' }, h('dt', null, 'Last'), h('dd', null, st.last.toFixed(3)), h('dt', null, 'Average'), h('dd', null, st.avg.toFixed(3)), h('dt', null, 'Minimum'), h('dd', null, st.min.toFixed(3)), h('dt', null, 'Maximum'), h('dd', null, st.max.toFixed(3)), h('dt', null, 'Samples shown'), h('dd', null, String(pm.samples.length))) : h('p', null, 'The graph is empty. Unfreeze the display to start recording again.'));
          }
        }
        drawBtn(); draw();
        right.append(h('div', { class: 'toolbar' }, freezeBtn, graphType, graphAct), state, readout, legend);
        mvRefs = { draw };
        Win.emit('pm:monitor', {});
      }
      Win.on('pm:sample', () => { if (mvRefs && cur === 'pmon' && right.isConnected && Win.active === w && pm.view === 'report') { /* report updates silently */ } });
      function udView() {
        const g = Win.grid({ caption: 'User Defined data collector sets', cols: [{ key: 'name', label: 'Name' }, { key: 'status', label: 'Status' }], rows: pm.sets.map(s => ({ name: s.name, status: s.running ? 'Running' : 'Stopped' })), key: 'name', emptyText: 'There are no items to show in this view.' });
        const act = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, 'Actions for User Defined');
        act.addEventListener('click', () => Win.popMenu(act, [{ label: 'New', submenu: [{ label: 'Data Collector Set', action: () => newSetWizard(createSet) }] }, { label: 'Refresh', action: () => show('ud') }], 'Actions for User Defined'));
        right.append(h('div', { class: 'toolbar' }, act), g.el);
      }
      function createSet(d) {
        if (pm.sets.some(s => s.name.toLowerCase() === d.name.trim().toLowerCase())) { Win.alertBox('Performance Monitor', 'A Data Collector Set with that name already exists.'); return; }
        const s = { name: d.name.trim(), counters: d.counters, interval: +d.interval, units: d.units, root: Lab.normalize(d.root).text.replace(/\\+$/, ''), format: 'Binary', running: false, started: null, edgeDuring: false };
        pm.sets.push(s);
        const okRoot = /^c:\\perflogs$/i.test(s.root);
        const ok = /^memory logs$/i.test(s.name) && s.counters.includes('\\Memory\\Available MBytes') && s.interval === 4 && s.units === 'Seconds' && okRoot;
        if (ok) T('dcs');
        else announce(`Created ${s.name}. Check it against the lab: name Memory Logs, counter Available MBytes, 4 seconds, root directory C:\\PerfLogs.${okRoot ? '' : ' The root directory is ' + s.root + '.'}`);
        rebuild('set:' + s.name);
        if (d.after === 'start') startSet(s);
      }
      function exampleFile(s) { const ext = { 'Binary': 'blg', 'Comma Separated': 'csv', 'Tab Separated': 'tsv', 'SQL': 'sql' }[s.format]; return `${s.root}\\${Win.S.computer}_${stamp}-000001\\DataCollector01.${ext}`; }
      function setView(s) {
        const status = h('p', { class: 'progress-text' }, `Status: ${s.running ? 'Running' : 'Stopped'}`);
        const g = Win.grid({ caption: `Data collectors in ${s.name}`, cols: [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'out', label: 'Output' }], rows: [{ name: 'DataCollector01', type: 'Performance Counter', out: exampleFile(s).replace(/\.\w+$/, '') }], key: 'name',
          onOpen: () => dcProps(s), onContext: (r, b) => Win.popMenu(b, [{ label: 'Properties', action: () => dcProps(s) }], 'Actions for DataCollector01') });
        const act = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, 'Actions for selected data collector');
        act.addEventListener('click', () => { if (!g.selected) { announce('Select DataCollector01 first.'); return; } Win.popMenu(act, [{ label: 'Properties', action: () => dcProps(s) }], 'Actions for DataCollector01'); });
        const setAct = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, `Actions for ${s.name}`);
        setAct.addEventListener('click', () => Win.popMenu(setAct, [{ label: 'Start', disabled: s.running, action: () => startSet(s) }, { label: 'Stop', disabled: !s.running, action: () => stopSet(s) }, { label: 'Delete', action: () => delSet(s) }], `Actions for ${s.name}`));
        const startB = h('button', { type: 'button', disabled: s.running ? true : null, onclick: () => startSet(s) }, 'Start the Data Collector Set');
        const stopB = h('button', { type: 'button', disabled: s.running ? null : true, onclick: () => stopSet(s) }, 'Stop the Data Collector Set');
        right.append(status, h('div', { class: 'toolbar' }, startB, stopB, setAct), h('div', { class: 'toolbar' }, act), g.el);
      }
      async function dcProps(s) {
        let fmt = s.format;
        const ex = h('dd', null, exampleFile(s));
        const tabsEl = Win.tabs({ label: 'DataCollector01 Properties', items: [
          { id: 'pc', label: 'Performance Counters', render: p => { p.append(h('h5', null, 'Performance counters'), h('ul', null, s.counters.map(c => h('li', null, c))), Win.select('Log format', ['Binary', 'Comma Separated', 'Tab Separated', 'SQL'].map(v => ({ value: v, label: v })), fmt, v => { fmt = v; }), h('p', null, `Sample interval: ${s.interval} ${s.units}`)); } },
          { id: 'file', label: 'File', render: p => { const tmp = Object.assign({}, s, { format: fmt }); p.append(h('dl', { class: 'kv' }, h('dt', null, 'Log file name'), h('dd', null, 'DataCollector01'), h('dt', null, 'Example file name'), h('dd', null, exampleFile(tmp)))); if (fmt === 'Comma Separated' && /^memory logs$/i.test(s.name)) { s.format = fmt; T('csvfmt'); } } }] });
        const r = await Win.dialog({ title: 'DataCollector01 Properties', wide: true, body: tabsEl.el, buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }, { label: 'Apply', value: 'apply' }] });
        if (r.value === 'ok' || r.value === 'apply') { s.format = fmt; announce(`Log format is ${fmt}.`); if (fmt === 'Comma Separated' && /^memory logs$/i.test(s.name)) Lab.announce(`Log format is Comma Separated. Example file: ${exampleFile(s)}.`); }
        show('set:' + s.name);
      }
      function startSet(s) {
        s.running = true; s.started = Date.now(); s.edgeDuring = false;
        Win.fs.ensure(`${s.root}\\${Win.S.computer}_${stamp}-000001`);
        announce(`${s.name} started. Status: Running. Data is being collected every ${s.interval} seconds.`);
        Win.emit('pm:set', { s, running: true });
        if (cur === 'set:' + s.name) show(cur);
      }
      function stopSet(s) {
        s.running = false;
        const secs = Math.max(12, Math.round((Date.now() - s.started) / 1000));
        const n = Math.max(3, Math.floor(secs / s.interval));
        const rows = [];
        const t0 = new Date(s.started);
        for (let i = 0; i < n; i++) {
          const t = new Date(t0.getTime() + i * s.interval * 1000);
          const ts = `${pad(t.getMonth() + 1)}/${pad(t.getDate())}/${t.getFullYear()} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}.${String(t.getMilliseconds()).padStart(3, '0')}`;
          let v = 2560 - Math.round(Math.random() * 12);
          if (s.edgeDuring && i >= Math.floor(n / 3) && i < Math.floor(2 * n / 3) + 1) v -= 180 + Math.round(Math.random() * 40);
          rows.push(`"${ts}","${v}"`);
        }
        const ext = s.format === 'Comma Separated' ? 'csv' : s.format === 'Tab Separated' ? 'tsv' : 'blg';
        const content = `"(PDH-CSV 4.0) (Eastern Daylight Time)(240)","\\\\${Win.S.computer}\\Memory\\Available MBytes"\n` + rows.join('\n') + '\n';
        Win.fs.write(`${s.root}\\${Win.S.computer}_${stamp}-000001\\DataCollector01.${ext}`, ext === 'csv' ? content : '(binary log data)', { size: content.length });
        announce(`${s.name} stopped. Status: Stopped. ${n} readings were saved.`);
        Win.emit('pm:set', { s, running: false });
        if (/^memory logs$/i.test(s.name) && ext === 'csv') T('run');
        else if (ext !== 'csv') announce('Note: the log format is not Comma Separated, so the file is a binary .blg file that Notepad cannot read. Change the format in DataCollector01 Properties, then start and stop the set again.');
        if (cur === 'set:' + s.name) show(cur);
      }
      async function delSet(s) {
        if (s.running) { Win.alertBox('Performance Monitor', 'Stop the Data Collector Set before you delete it.'); return; }
        if (!(await Win.confirmBox('Performance Monitor: Confirm Delete', `Are you sure you want to delete "${s.name}"?`))) return;
        pm.sets.splice(pm.sets.indexOf(s), 1);
        pmDeleted = true; checkCleanup();
        rebuild('ud');
        announce(`${s.name} deleted.`);
      }
      Win.on('window:open', ww => { pm.sets.forEach(s => { if (s.running && ww.appId === 'edge') s.edgeDuring = true; }); });
      show('perf');
      w.pmShow = show;
    }
  });
  let pmDeleted = false, folderDeleted = false;
  function checkCleanup() { if (pmDeleted && folderDeleted) T('cleanup'); }
  Win.on('explorer:delete', ({ path }) => { if (path.toLowerCase() === logFolder.toLowerCase()) { folderDeleted = true; checkCleanup(); } });
  Win.on('notepad:open', ({ path }) => { if (path && /DataCollector01\.csv$/i.test(path)) T('csv'); });

  /* Performance Monitor task wiring */
  let frozeOnce = false;
  const reportCheck = () => { if (pm.view === 'report' && !pm.recording && Lab.isDone('start') && rras().status !== 'Running') T('report'); };
  Win.on('pm:freeze', ({ recording }) => {
    if (!recording) frozeOnce = true;
    if (recording && Lab.isDone('manual') && !Lab.isDone('start')) T('unfreeze');
    reportCheck();
  });
  Win.on('pm:clear', () => { if (frozeOnce) T('freeze'); });
  Win.on('pm:view', reportCheck);

  /* Events: the four RRAS events, all read */
  const seen = new Set();
  Win.on('event:view', ({ e }) => {
    if (/Routing and Remote Access/.test(e.msg)) seen.add(e.id);
    const total = WinApps.events.System.filter(x => /Routing and Remote Access/.test(x.msg)).length;
    if (seen.size >= 4 && seen.size >= Math.min(total, 4)) T('events');
  });

  Win.desktop(document.getElementById('sim'), { computer: 'DESKTOP-OSB01', user: 'CyberOpsUser' });
})();
