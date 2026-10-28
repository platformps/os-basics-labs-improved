/* Lab 2.0.4: Install a Virtual Machine on a Personal Computer */
(() => {
  const { h, announce } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '2.0.4', title: 'Lab 2.0.4 Install a Virtual Machine on a Personal Computer', onReset: () => location.reload(),
    tasks: [
      { id: 'dlvbox', label: 'Download VirtualBox for Windows hosts' },
      { id: 'install', label: 'Install VirtualBox' },
      { id: 'dlova', label: 'Download both virtual machine OVA files' },
      { id: 'import1', label: 'Import the CSE-LABVM with new MAC addresses' },
      { id: 'start1', label: 'Start the CSE-LABVM' },
      { id: 'ip', label: 'Run ip address in the CSE-LABVM terminal' },
      { id: 'web', label: 'Open the web browser in the CSE-LABVM' },
      { id: 'close1', label: 'Close the CSE-LABVM and save the machine state' },
      { id: 'import2', label: 'Import the Security Workstation' },
      { id: 'start2', label: 'Start the Security Workstation and log in' },
      { id: 'close2', label: 'Close the Security Workstation and save the machine state' }
    ]
  });
  Win.S.users.CyberOpsUser = { password: 'Cisco123!', groups: ['Administrators', 'Users'], admin() { return this.groups.includes('Administrators'); } };
  WinApps.baseSystem();
  ['terminal', 'scite', 'firefox'].forEach(a => { if (Win.S.apps[a]) Win.S.apps[a].hidden = true; });
  Object.assign(Linux.S, { user: 'cisco', host: 'labvm', home: '/home/cisco', sudoPw: 'password', promptStyle: 'ubuntu' });
  Linux.ensureDir('/home/cisco', { uid: 'cisco', gid: 'cisco' });
  ['Desktop', 'Documents', 'Downloads'].forEach(d => Linux.ensureDir('/home/cisco/' + d, { uid: 'cisco', gid: 'cisco' }));
  const dl = `C:\\Users\\${Win.S.user}\\Downloads`;
  const vms = [];
  const OVA = {
    'CSE-LABVM.ova': { name: 'CSE-LABVM', os: 'Ubuntu (64-bit)', ram: 2048, cpus: 1, adapter: 'NAT', bridged: null, size: 3300000000 },
    'Security_Workstation.ova': { name: 'Security Workstation', os: 'Arch Linux (64-bit)', ram: 1024, cpus: 1, adapter: 'Bridged Adapter', bridged: 'Intel(R) 82579LM Gigabit Network Connection', size: 2000000000 }
  };
  const hostAdapters = ['Intel(R) Wi-Fi 6 AX201 160MHz', 'Realtek PCIe GbE Family Controller'];

  /* ---------------- web pages ---------------- */
  WinApps.addPage('www.virtualbox.org', (p, w, load) => {
    p.append(h('h4', null, 'Oracle VirtualBox'), h('p', null, 'VirtualBox is a powerful x86 and AMD64/Intel64 virtualization product for enterprise as well as home use. It is freely available as Open Source Software.'),
      h('button', { type: 'button', onclick: () => load('www.virtualbox.org/wiki/Downloads') }, 'Download VirtualBox'));
  });
  WinApps.addPage('virtualbox.org', (p, w, load) => load('www.virtualbox.org'));
  WinApps.addPage('www.virtualbox.org/wiki/Downloads', (p) => {
    const msg = h('p', { role: 'status' });
    p.append(h('h4', null, 'Download VirtualBox'), h('p', null, 'VirtualBox platform packages. Choose the package for the operating system of your host computer:'),
      h('ul', { class: 'cp-list' }, ...['Windows hosts', 'macOS / Intel hosts', 'macOS / Apple Silicon hosts', 'Linux distributions'].map(n => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => {
        if (n !== 'Windows hosts') { msg.textContent = `This simulated host computer runs Windows, so choose Windows hosts. ${n} packages are for other operating systems.`; return; }
        const f = 'VirtualBox-7.1.4-165100-Win.exe';
        Win.fs.write(`${dl}\\${f}`, '', { size: 118000000, onOpen: () => runInstaller() });
        msg.textContent = `Download complete: ${f} (113 MB) was saved to your Downloads folder.`;
        T('dlvbox');
      } }, n)))), msg);
  });
  WinApps.addPage('labvms.example/osb', (p) => {
    const msg = h('p', { role: 'status' });
    p.append(h('h4', null, 'Operating Systems Basics: course virtual machines (simulated)'), h('p', null, 'Download both files. Each is an OVA package you import into VirtualBox.'),
      h('ul', { class: 'cp-list' }, ...Object.entries(OVA).map(([f, v]) => h('li', null, h('button', { type: 'button', onclick: () => {
        Win.fs.write(`${dl}\\${f}`, '', { size: v.size, ftype: 'Open Virtualization Format Archive' });
        msg.textContent = `Download complete: ${f} was saved to your Downloads folder.`;
        if (Object.keys(OVA).every(k => Win.fs.get(`${dl}\\${k}`))) T('dlova');
      } }, `Download ${f} (${(v.size / 1e9).toFixed(1)} GB)`)))), msg);
  });

  /* ---------------- installer ---------------- */
  let installed = false;
  function runInstaller() {
    if (installed) { Win.alertBox('Oracle VirtualBox Setup', 'Oracle VirtualBox 7.1.4 is already installed.'); return; }
    let startAfter = true;
    Win.wizard({
      title: 'Oracle VirtualBox 7.1.4 Setup', finishLabel: 'Install',
      pages: [
        { title: 'Welcome to the Oracle VirtualBox 7.1.4 Setup Wizard', render: b => b.append(h('p', null, 'The Setup Wizard will install Oracle VirtualBox 7.1.4 on your computer. Choose Next to continue or Cancel to exit.')) },
        { title: 'Custom Setup', render: b => b.append(h('p', null, 'Select the way you want features to be installed. The default installs: VirtualBox Application, USB Support, Networking (Bridged and Host-Only), and Python Support.'), h('p', null, 'Location: C:\\Program Files\\Oracle\\VirtualBox\\')) },
        { title: 'Warning: Network Interfaces', render: b => b.append(h('p', null, 'Installing the Oracle VirtualBox Networking feature will reset your network connection and temporarily disconnect you from the network. Choose Next to proceed with installation now.')) },
        { title: 'Ready to Install', render: b => b.append(h('p', null, 'The Setup Wizard is ready to begin the installation. Choose Install to begin.')) }
      ],
      onFinish: async () => {
        const ok = await Win.uac('Oracle VirtualBox 7.1.4', 'Oracle America, Inc.');
        if (!ok) { announce('Installation cancelled because you chose No.'); return; }
        const bar = h('progress', { max: '100', value: '0', 'aria-label': 'Installing Oracle VirtualBox' });
        await Win.dialog({ title: 'Oracle VirtualBox 7.1.4 Setup', body: h('div', null, h('p', null, 'Installing Oracle VirtualBox 7.1.4. Please wait.'), bar), buttons: [], onRender: (b, d) => { let v = 0; const t = setInterval(() => { v += 25; bar.value = v; if (v >= 100) { clearInterval(t); d.close(); } }, 300); } });
        installed = true; Win.S.apps.vbox.hidden = false;
        Win.fs.ensure('C:\\Program Files\\Oracle\\VirtualBox');
        const cb = Win.checkbox('Start Oracle VirtualBox after installation', true, v => { startAfter = v; });
        await Win.dialog({ title: 'Oracle VirtualBox 7.1.4 Setup', body: h('div', null, h('p', null, 'Oracle VirtualBox 7.1.4 installation is complete.'), cb), buttons: [{ label: 'Finish', value: 'ok', primary: true }] });
        T('install');
        if (startAfter) Win.openApp('vbox');
      }
    });
  }

  /* ---------------- VirtualBox Manager ---------------- */
  let mgrRefresh = () => {};
  Win.registerApp('vbox', {
    title: 'Oracle VirtualBox', keywords: ['virtualbox', 'virtual machine', 'vm', 'oracle'], kind: 'App', single: true, hidden: true,
    windowTitle: () => 'Oracle VirtualBox Manager',
    proc: { name: 'VirtualBox.exe', desc: 'VirtualBox Manager', tmName: 'Oracle VirtualBox', mem: 60000 },
    create(w) {
      const details = h('div', { class: 'panel', role: 'region', 'aria-label': 'Details of the selected virtual machine' });
      const g = Win.grid({ caption: 'Virtual machine inventory', cols: [{ key: 'name', label: 'Name' }, { key: 'state', label: 'State' }, { key: 'os', label: 'Guest operating system' }], rows: [], key: 'name',
        emptyText: 'No virtual machines yet. Use File, Import Appliance to add one.', onSelect: r => showDetails(r.ref), onOpen: r => startVM(r.ref) });
      const sel = () => { const r = g.selected; if (!r) { announce('Select a virtual machine in the inventory first.'); return null; } return r.ref; };
      const tb = h('div', { class: 'toolbar', role: 'group', 'aria-label': 'VirtualBox toolbar' },
        h('button', { type: 'button', onclick: () => importWizard() }, 'Import'),
        h('button', { type: 'button', class: 'secondary', onclick: () => { const v = sel(); if (v) settings(v); } }, 'Settings'),
        h('button', { type: 'button', onclick: () => { const v = sel(); if (v) startVM(v); } }, 'Start'));
      w.body.append(Win.menubar([
        { label: 'File', items: [{ label: 'Import Appliance...', action: () => importWizard() }, { label: 'Exit', action: () => w.close() }] },
        { label: 'Machine', items: () => [{ label: 'Settings...', action: () => { const v = sel(); if (v) settings(v); } }, { label: 'Start', action: () => { const v = sel(); if (v) startVM(v); } }] },
        { label: 'Help', items: [{ label: 'About VirtualBox', action: () => Win.alertBox('About VirtualBox', 'Oracle VirtualBox 7.1.4 (simulated for this lab).') }] }
      ], 'VirtualBox menu bar'), tb, g.el, details);
      function rows() { return vms.map(v => ({ name: v.name, state: v.state, os: v.os, ref: v })); }
      function showDetails(v) {
        details.textContent = '';
        details.append(h('h4', null, v.name), h('dl', { class: 'kv' }, h('dt', null, 'State'), h('dd', null, v.state), h('dt', null, 'Operating system'), h('dd', null, v.os), h('dt', null, 'Base memory'), h('dd', null, v.ram + ' MB'), h('dt', null, 'Processors'), h('dd', null, String(v.cpus)), h('dt', null, 'Network adapter 1'), h('dd', null, `Intel PRO/1000 MT Desktop (${v.adapter}${v.adapter === 'Bridged Adapter' ? ', ' + v.bridged : ''})`), h('dt', null, 'USB controller'), h('dd', null, v.usb ? 'Enabled' : 'Disabled'), h('dt', null, 'MAC addresses'), h('dd', null, v.newMac ? 'New, generated at import' : 'Same as the original machine')));
      }
      mgrRefresh = () => { const s = g.selected; g.update(rows()); if (s) showDetails(s.ref); };
      g.update(rows());
    }
  });
  function importWizard() {
    const data = { file: '', base: `C:\\Users\\${Win.S.user}\\VirtualBox VMs`, mac: 'nat' };
    Win.wizard({
      title: 'Import Virtual Appliance', finishLabel: 'Import', data,
      pages: [
        { title: 'Appliance to import', render: (b, d) => {
          const f = h('input', { type: 'text', value: d.file, autocomplete: 'off' });
          f.addEventListener('input', () => { d.file = f.value; });
          const browse = h('button', { type: 'button', class: 'secondary', onclick: async () => {
            const files = (Win.fs.list(dl) || []).filter(n => /\.ova$/i.test(n.name));
            if (!files.length) { Win.alertBox('Open File', 'There are no OVA files in your Downloads folder. Download them first.'); return; }
            let pick = files[0].name;
            const r = await Win.dialog({ title: 'Please choose a virtual appliance file to import', body: Win.radios('ova-pick', `Files in ${dl}`, files.map(n => ({ value: n.name, label: n.name })), pick, v => { pick = v; }), buttons: [{ label: 'Open', value: 'open', primary: true }, { label: 'Cancel', value: 'cancel' }] });
            if (r.value === 'open') { d.file = `${dl}\\${pick}`; f.value = d.file; announce(`File: ${pick}.`); }
          } }, 'Browse...');
          b.append(h('p', null, 'Source: Local File System'), Win.field('File', f, 'The path to an .ova file. Use Browse to pick one.'), h('div', { class: 'toolbar' }, browse));
        }, validate: d => { const n = Win.fs.get(Lab.normalize(d.file).text.trim()); return !d.file.trim() ? 'Choose an OVA file to import.' : !n ? 'That file was not found. Use Browse to pick a downloaded OVA file.' : !/\.ova$/i.test(d.file) ? 'Choose a file that ends in .ova.' : null; } },
        { title: 'Appliance settings', render: (b, d) => {
          const v = OVA[d.file.split('\\').pop()];
          b.append(h('p', null, 'These are the virtual machines contained in the appliance and the suggested settings of the imported VirtualBox machines.'),
            h('dl', { class: 'kv' }, h('dt', null, 'Name'), h('dd', null, v.name), h('dt', null, 'Guest OS Type'), h('dd', null, v.os), h('dt', null, 'CPU'), h('dd', null, String(v.cpus)), h('dt', null, 'RAM'), h('dd', null, v.ram + ' MB'), h('dt', null, 'USB Controller'), h('dd', null, 'Enabled'), h('dt', null, 'Network Adapter'), h('dd', null, 'Intel PRO/1000 MT Desktop (82540EM)')),
            Win.select('Machine Base Folder', [{ value: d.base, label: d.base }], d.base, x => { d.base = x; }),
            Win.select('MAC Address Policy', [{ value: 'nat', label: 'Include only NAT network adapter MAC addresses' }, { value: 'all', label: 'Include all network adapter MAC addresses' }, { value: 'new', label: 'Generate new MAC addresses for all network adapters' }], d.mac, x => { d.mac = x; }),
            Win.checkbox('Import hard drives as VDI', true, null));
        } }
      ],
      onFinish: async d => {
        const key = d.file.split('\\').pop();
        const v = Object.assign({ state: 'Powered Off', usb: true, newMac: d.mac === 'new', booted: false, loggedIn: false }, OVA[key]);
        if (vms.some(x => x.name === v.name)) { Win.alertBox('VirtualBox', `A machine named ${v.name} already exists in the inventory.`); return; }
        const bar = h('progress', { max: '100', value: '0', 'aria-label': `Importing ${v.name}` });
        await Win.dialog({ title: 'Importing Appliance', body: h('div', null, h('p', null, `Importing virtual disk image for ${v.name}...`), bar), buttons: [], onRender: (b, dd) => { let x = 0; const t = setInterval(() => { x += 20; bar.value = x; if (x >= 100) { clearInterval(t); dd.close(); } }, 300); } });
        vms.push(v); mgrRefresh();
        announce(`${v.name} was imported and added to the inventory. State: Powered Off.${v.newMac ? '' : ' Note: the lab asks for Generate new MAC addresses for all network adapters, so two copies of a machine never share a MAC address on a network.'}`);
        if (v.name === 'CSE-LABVM' && v.newMac) T('import1');
        if (v.name === 'Security Workstation') T('import2');
      }
    });
  }
  async function settings(v) {
    if (v.state === 'Running') { Win.alertBox('VirtualBox', 'Close the virtual machine before changing these settings.'); return; }
    let adapter = v.adapter, bridged = v.bridged || hostAdapters[0], usb = v.usb;
    const nameWrap = h('div');
    const drawName = () => { nameWrap.textContent = ''; if (adapter === 'Bridged Adapter') nameWrap.append(Win.select('Name', hostAdapters.concat(hostAdapters.includes(v.bridged) || !v.bridged ? [] : [v.bridged + ' (not found on this computer)']).map(n => ({ value: n.replace(' (not found on this computer)', ''), label: n })), bridged, x => { bridged = x; })); };
    const t = Win.tabs({ label: `${v.name} settings`, items: [
      { id: 'net', label: 'Network', render: p => { p.append(h('h5', null, 'Adapter 1'), Win.select('Attached to', ['NAT', 'Bridged Adapter', 'Internal Network', 'Host-only Adapter'].map(x => ({ value: x, label: x })), adapter, x => { adapter = x; drawName(); }), nameWrap); drawName(); } },
      { id: 'usb', label: 'USB', render: p => p.append(Win.checkbox('Enable USB Controller', usb, x => { usb = x; })) },
      { id: 'sys', label: 'System', render: p => p.append(h('dl', { class: 'kv' }, h('dt', null, 'Base Memory'), h('dd', null, v.ram + ' MB'), h('dt', null, 'Processors'), h('dd', null, String(v.cpus)))) }] });
    const r = await Win.dialog({ title: `${v.name} - Settings`, wide: true, body: t.el, buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
    if (r.value === 'ok') { v.adapter = adapter; v.bridged = adapter === 'Bridged Adapter' ? bridged : v.bridged; v.usb = usb; mgrRefresh(); announce(`Settings saved for ${v.name}.`); }
    return r.value === 'ok';
  }
  async function startVM(v) {
    if (v.state === 'Running') { const w = Win.S.windows.find(x => x.opts && x.opts.vm === v); if (w) Win.activate(w); return; }
    if (v.adapter === 'Bridged Adapter' && !hostAdapters.includes(v.bridged)) {
      const r = await Win.dialog({ title: 'VirtualBox - Error', describedBy: true, body: h('div', null, h('p', null, `Could not start the machine ${v.name} because the following physical network interfaces were not found:`), h('p', null, `${v.bridged} (adapter 1)`), h('p', null, 'You can either change the machine\u2019s network settings or stop the machine.')), buttons: [{ label: 'Change Network Settings', value: 'change', primary: true }, { label: 'Close Virtual Machine', value: 'close' }], cancelValue: 'close' });
      if (r.value !== 'change') return;
      const ok = await settings(v);
      if (!ok) return;
      if (!hostAdapters.includes(v.bridged)) { Win.alertBox('VirtualBox', `${v.bridged} is still selected, and this computer does not have it. Open Change Network Settings again and choose an adapter from the Name list, such as ${hostAdapters[0]}.`); return; }
    }
    v.state = 'Running'; mgrRefresh();
    Win.openApp('vmconsole', { vm: v });
  }

  /* ---------------- VM console window ---------------- */
  Win.registerApp('vmconsole', {
    title: 'Virtual machine window', hidden: true,
    windowTitle: o => `${o.vm.name} [Running] - Oracle VirtualBox`,
    proc: o => ({ name: 'VirtualBoxVM.exe', desc: `VirtualBox VM: ${o.vm.name}`, tmName: `${o.vm.name} - VirtualBox`, mem: o.vm.ram * 1024 }),
    create(w, o) {
      const v = o.vm;
      const screen = h('div', { class: 'panel', role: 'region', 'aria-label': `${v.name} screen` });
      const closeDlg = async () => {
        let choice = 'save';
        const r = await Win.dialog({ title: 'Close Virtual Machine', body: Win.radios('vmclose', 'You want to:', [{ value: 'save', label: 'Save the machine state' }, { value: 'shutdown', label: 'Send the shutdown signal' }, { value: 'off', label: 'Power off the machine' }], choice, x => { choice = x; }), buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
        if (r.value !== 'ok') return;
        Win.emit('vm:closeopts', {});
        v.state = choice === 'save' ? 'Saved' : 'Powered Off';
        if (choice !== 'save') { v.booted = false; v.loggedIn = false; }
        mgrRefresh();
        announce(`${v.name}: ${choice === 'save' ? 'machine state saved. Next time it resumes where you left it.' : choice === 'shutdown' ? 'shut down.' : 'powered off, like pulling the plug.'}`);
        if (choice === 'save') T(v.name === 'CSE-LABVM' ? 'close1' : 'close2');
        w.close();
      };
      w.body.append(Win.menubar([{ label: 'File', items: [{ label: 'Close...', action: closeDlg }] }, { label: 'Machine', items: [{ label: 'Settings...', action: () => Win.alertBox('VirtualBox', 'Close the virtual machine before changing its settings.') }] }, { label: 'Input', items: [{ label: 'Keyboard: release (host key, right Ctrl)', action: () => announce('Keyboard and mouse released to the host computer. On a real PC you press the host key: right Ctrl on Windows and Linux, left Command on a Mac.') }] }], `${v.name} window menu bar`),
        h('p', { class: 'win-hint' }, 'This window is the virtual machine\u2019s screen. On a real PC, clicking inside it gives the guest your keyboard and mouse until you press the host key.'), screen);
      w.onClose(() => { if (v.state === 'Running') { v.state = 'Saved'; mgrRefresh(); } });
      const resumed = v.booted;
      screen.append(h('p', { role: 'status' }, resumed ? `Restoring the saved state of ${v.name}...` : `${v.name} is starting. BIOS, then the boot loader, then Linux...`));
      setTimeout(() => {
        v.booted = true;
        screen.textContent = '';
        if (v.name === 'CSE-LABVM') desktopCSE(screen, w); else loginSW(screen, v);
        announce(`${v.name} is ready.`);
      }, resumed ? 400 : 1200);
      if (v.name === 'CSE-LABVM') T('start1');
    }
  });
  function desktopCSE(screen, w) {
    screen.append(h('h4', null, 'CSE-LABVM desktop (logged in automatically as cisco)'));
    const area = h('div');
    const items = [["cisco's Home", 'Opens the home folder of the cisco user.'], ['DPI Scaling', 'Makes text and icons larger on high resolution screens.'], ['Firefox Web Browser', null], ['jcryptool', 'A tool for learning cryptography and cryptanalysis. Used in later courses.'], ['Keyboard', 'Changes the keyboard layout.'], ['Terminal', null], ['Wireshark', 'A packet sniffer and network protocol analyzer. Used in later courses.']];
    const ul = h('ul', { class: 'iconlist', 'aria-label': 'Launcher' });
    items.forEach(([n, desc]) => ul.append(h('li', null, h('button', { type: 'button', class: 'secondary', onclick: () => {
      area.textContent = '';
      if (n === 'Terminal') { openGuestTerminal(area, w); return; }
      if (n === 'Firefox Web Browser') { area.append(h('h5', { tabindex: '-1' }, 'Firefox (inside the CSE-LABVM)'), h('p', null, 'Firefox opened its start page and the search engine loaded. The virtual machine reaches the internet through VirtualBox NAT, which shares the host computer\u2019s connection.')); area.querySelector('h5').focus(); T('web'); return; }
      area.append(h('p', { role: 'status' }, `${n}: ${desc}`));
    } }, n))));
    screen.append(h('p', null, 'Launcher items, top to bottom:'), ul, area);
  }
  function openGuestTerminal(area, w) {
    area.append(h('h5', null, 'Terminal (inside the CSE-LABVM)'));
    let sh;
    const term = new Term.Terminal(area, { name: 'CSE-LABVM terminal', headingLevel: 5, prompt: () => sh ? sh.prompt() : 'cisco@labvm:~$ ', run: (line, io) => sh.run(line, io) });
    sh = new Linux.Shell(term, w); term.updatePrompt();
    w.onClose(() => term.destroy());
    setTimeout(() => term.focus(), 30);
  }
  Linux.on('cmd', ({ words }) => { const x = words[0] || []; if (x[0] === 'ip' && /^a(ddr(ess)?)?$/.test(x[1] || '')) T('ip'); if (x[0] === 'ifconfig') T('ip'); });
  function loginSW(screen, v) {
    if (v.loggedIn) { screen.append(h('h4', null, 'Security Workstation desktop (analyst)'), h('p', null, 'The Arch Linux desktop is ready. You will explore it in later labs.')); return; }
    const pw = h('input', { type: 'password', autocomplete: 'off' });
    const err = h('p', { class: 'dlg-error', role: 'alert' });
    let user = 'analyst';
    const form = h('form', { onsubmit: e => { e.preventDefault(); if (user !== 'analyst' || pw.value !== 'cyberops') { err.textContent = 'Invalid password, please try again.'; pw.value = ''; pw.focus(); return; } v.loggedIn = true; screen.textContent = ''; loginSW(screen, v); announce('Logged in to the Security Workstation as analyst.'); T('start2'); } },
      h('h4', { tabindex: '-1' }, 'Security Workstation login'), Win.select('User', [{ value: 'analyst', label: 'analyst' }], 'analyst', x => { user = x; }), Win.field('Password', pw), err, h('button', { type: 'submit' }, 'Log in'));
    screen.append(form);
    setTimeout(() => pw.focus(), 30);
  }

  /* VirtualBox installer can also be opened from Start once downloaded */
  Win.desktop(document.getElementById('sim'), { computer: 'DESKTOP-OSB01', user: 'CyberOpsUser' });
})();
