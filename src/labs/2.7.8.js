/* Lab 2.7.8: Configure Security Features in Windows and Linux */
(() => {
  const { h, announce } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '2.7.8', title: 'Lab 2.7.8 Configure Security Features in Windows and Linux', onReset: () => location.reload(),
    tasks: [
      { id: 'bridged', label: 'Attach the CSE-LABVM to a bridged adapter that has a network' },
      { id: 'vmip', label: 'Find the CSE-LABVM address with ip address' },
      { id: 'hostip', label: 'Find the Windows address with ipconfig' },
      { id: 'inet', label: 'Ping a website from both computers' },
      { id: 'pingvm', label: 'Ping the CSE-LABVM from Windows' },
      { id: 'pingfail', label: 'Try to ping Windows from the CSE-LABVM' },
      { id: 'wu', label: 'Check for updates and find the active hours' },
      { id: 'aptupd', label: 'Run sudo apt-get update' },
      { id: 'aptupg', label: 'Run sudo apt-get upgrade' },
      { id: 'pwpol', label: 'Set all six password policy values' },
      { id: 'pwtest', label: 'See Windows refuse a password that breaks the policy' },
      { id: 'lockout', label: 'Set the lockout threshold to 5 with 10 minute timers' },
      { id: 'audit', label: 'Read the Explain tab for Audit account logon events' },
      { id: 'fwallow', label: 'Review the apps allowed through the firewall' },
      { id: 'rule', label: 'Create an inbound rule allowing ICMPv4 Echo Request, not on Public' },
      { id: 'pingok', label: 'Ping Windows from the CSE-LABVM and get replies' },
      { id: 'chk', label: 'Install chkrootkit and filter its output for worms' },
      { id: 'key', label: 'Import the CISOfy signing key' },
      { id: 'repo', label: 'Add the Lynis repository' },
      { id: 'lynis', label: 'Install Lynis 3.0.6 and confirm with lynis show version' },
      { id: 'policy', label: 'Check the available versions with apt-cache policy lynis' }
    ]
  });
  Win.S.users.CyberOpsUser = { password: 'Cisco123!', groups: ['Administrators', 'Users'], admin() { return this.groups.includes('Administrators'); } };
  WinApps.baseSystem();
  ['terminal', 'scite', 'firefox'].forEach(a => { if (Win.S.apps[a]) Win.S.apps[a].hidden = true; });
  const L = Linux;
  Object.assign(L.S, { user: 'cisco', host: 'labvm', home: '/home/cisco', sudoPw: 'password', vmName: 'CSE-LABVM', promptStyle: 'ubuntu' });
  L.baseImage();
  const C = { uid: 'cisco', gid: 'cisco' };
  L.ensureDir('/home/cisco', C);
  ['Desktop', 'Documents', 'Downloads'].forEach(d => L.ensureDir('/home/cisco/' + d, C));
  L.ensureDir('/etc/apt/sources.list.d'); L.ensureDir('/etc/apt/trusted.gpg.d'); L.ensureDir('/usr/share/keyrings'); L.ensureDir('/usr/sbin');
  L.put('/etc/apt/sources.list', 'deb http://us.archive.ubuntu.com/ubuntu/ focal main restricted universe multiverse\ndeb http://us.archive.ubuntu.com/ubuntu/ focal-updates main restricted universe multiverse\ndeb http://security.ubuntu.com/ubuntu focal-security main restricted universe multiverse\n');

  /* ---------------- network model ---------------- */
  const HOST_IP = '192.168.1.15', VM_BRIDGED = '192.168.1.31';
  const ADAPTERS = ['Intel(R) Wi-Fi 6 AX201 160MHz', 'Realtek PCIe GbE Family Controller'];
  const vm = { state: 'Powered Off', attach: 'NAT', bridged: ADAPTERS[0], booted: false };
  const vmNet = () => vm.attach === 'NAT' ? 'nat' : vm.attach === 'Bridged Adapter' ? (vm.bridged === ADAPTERS[1] ? 'lan' : 'nolink') : 'none';
  const vmIP = () => ({ nat: '10.0.2.15', lan: VM_BRIDGED }[vmNet()] || null);
  const SITES = { 'www.cisco.com': '23.200.86.153', 'cisco.com': '72.163.4.185', 'www.netacad.com': '104.18.10.30', 'netacad.com': '104.18.10.30', 'www.google.com': '142.250.80.36', 'google.com': '142.250.80.46', '8.8.8.8': '8.8.8.8', 'www.perscholas.org': '141.193.213.10' };
  const fw = { rules: [] };
  const sp = { hist: 0, maxage: 42, minage: 0, minlen: 0, complex: false, reversible: false, threshold: 10, duration: 10, reset: 10, adminLock: true, audit: {} };
  function echoAllowed() {
    return fw.rules.some(r => r.enabled && r.action === 'allow' && r.profiles.includes('Private') && (r.protocol === 'Any' || (r.protocol === 'ICMPv4' && (r.icmp === 'all' || r.icmp.includes('Echo Request')))));
  }
  const done = { inetWin: false, inetVm: false };
  const inet = () => { if (done.inetWin && done.inetVm) T('inet'); };

  /* ---------------- Windows commands ---------------- */
  const origPing = WinApps.cmds.ping;
  WinApps.addCommand(['ping', 'ping.exe'], {
    run(args, io, ctx, line) {
      const host = args.find(a => !a.startsWith('-') && !/^\d+$/.test(a));
      if (host && SITES[host.toLowerCase()]) { done.inetWin = true; inet(); }
      if (!host || !(host === VM_BRIDGED || host === '10.0.2.15' || /^192\.168\.1\.\d+$/.test(host)) || host === HOST_IP || host === '192.168.1.1') return origPing.run(args, io, ctx, line);
      const cont = args.includes('-t');
      const nIdx = args.indexOf('-n');
      const count = nIdx >= 0 ? parseInt(args[nIdx + 1], 10) || 4 : 4;
      const up = host === VM_BRIDGED && vm.state === 'Running' && vmNet() === 'lan';
      io.print(`\nPinging ${host} with 32 bytes of data:`);
      let sent = 0, got = 0;
      const finish = () => {
        io.print(`\nPing statistics for ${host}:\n    Packets: Sent = ${sent}, Received = ${got}, Lost = ${sent - got} (${sent ? Math.round((sent - got) / sent * 100) : 0}% loss),${got ? '\nApproximate round trip times in milli-seconds:\n    Minimum = 0ms, Maximum = 1ms, Average = 0ms' : ''}`);
        if (up && got) T('pingvm');
        else if (!up) io.note(host === '10.0.2.15' ? 'No replies. 10.0.2.15 is the address VirtualBox NAT gives the virtual machine. NAT hides the virtual machine behind the host, so other computers, even the host, cannot reach it at that address. Use Bridged Adapter.' : vm.state !== 'Running' ? 'No replies. The CSE-LABVM is not running.' : vmNet() !== 'lan' ? 'No replies. The CSE-LABVM is not on the same network as Windows. Check its network settings in VirtualBox.' : 'No device answered at that address.');
      };
      return ctx.term.runLong(io, () => {
        sent++;
        if (up) { got++; io.print(`Reply from ${host}: bytes=32 time<1ms TTL=64`); } else io.print('Request timed out.');
        if (!cont && sent >= count) { finish(); return false; }
        return true;
      }, up ? 700 : 900, () => finish());
    }
  });
  WinApps.addCommand(['ipconfig'], {
    run(args, io) {
      const all = args.some(a => /^[-/]all$/i.test(a));
      if (args.length && !all) { io.print('\nError: unrecognized or incomplete command line.\n\nUSAGE:\n    ipconfig [/allcompartments] [/? | /all | /renew [adapter] | /release [adapter] | /displaydns | /flushdns]'); return; }
      let out = `\nWindows IP Configuration\n${all ? '\n   Host Name . . . . . . . . . . . . : DESKTOP-OSB01\n   Primary Dns Suffix  . . . . . . . : \n   Node Type . . . . . . . . . . . . : Hybrid\n   IP Routing Enabled. . . . . . . . : No\n' : ''}\n`;
      out += `\nEthernet adapter Ethernet:\n\n   Connection-specific DNS Suffix  . : home\n${all ? `   Description . . . . . . . . . . . : ${ADAPTERS[1]}\n   Physical Address. . . . . . . . . : 3C-52-82-6A-41-0D\n   DHCP Enabled. . . . . . . . . . . : Yes\n` : ''}   Link-local IPv6 Address . . . . . : fe80::dd67:9e98:9ce0:51e%3\n   IPv4 Address. . . . . . . . . . . : ${HOST_IP}${all ? '(Preferred)' : ''}\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.1.1\n`;
      out += `\nWireless LAN adapter Wi-Fi:\n\n   Media State . . . . . . . . . . . : Media disconnected\n   Connection-specific DNS Suffix  . : \n${all ? `   Description . . . . . . . . . . . : ${ADAPTERS[0]}\n   Physical Address. . . . . . . . . : 70-CD-0D-4A-19-E2\n` : ''}`;
      if (Win.S.vboxNet) out += `\nEthernet adapter Ethernet 2:\n\n   Connection-specific DNS Suffix  . : \n${all ? '   Description . . . . . . . . . . . : VirtualBox Host-Only Ethernet Adapter\n' : ''}   Link-local IPv6 Address . . . . . : fe80::4c1a:2b7f:6e0d:9a11%9\n   IPv4 Address. . . . . . . . . . . : 192.168.56.1\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : \n`;
      io.print(out.replace(/\n$/, ''));
      T('hostip');
    }
  });
  Win.S.vboxNet = true;

  /* ---------------- VirtualBox ---------------- */
  let mgrRefresh = () => {};
  Win.registerApp('vbox', {
    title: 'Oracle VirtualBox', keywords: ['virtualbox', 'virtual machine', 'vm', 'oracle', 'cse-labvm'], kind: 'App', single: true,
    windowTitle: () => 'Oracle VirtualBox Manager',
    proc: { name: 'VirtualBox.exe', desc: 'VirtualBox Manager', tmName: 'Oracle VirtualBox', mem: 60000 },
    create(w) {
      const details = h('div', { class: 'panel', role: 'region', 'aria-label': 'Details of the selected virtual machine' });
      const g = Win.grid({ caption: 'Virtual machine inventory', cols: [{ key: 'name', label: 'Name' }, { key: 'state', label: 'State' }, { key: 'os', label: 'Guest operating system' }], rows: [], key: 'name', onSelect: () => show(), onOpen: () => startVM() });
      const tb = h('div', { class: 'toolbar', role: 'group', 'aria-label': 'VirtualBox toolbar' },
        h('button', { type: 'button', class: 'secondary', onclick: () => settings() }, 'Settings'),
        h('button', { type: 'button', onclick: () => startVM() }, 'Start'));
      w.body.append(Win.menubar([{ label: 'Machine', items: [{ label: 'Settings...', action: () => settings() }, { label: 'Start', action: () => startVM() }] }, { label: 'Help', items: [{ label: 'About VirtualBox', action: () => Win.alertBox('About VirtualBox', 'Oracle VirtualBox 7.1.4 (simulated for this lab).') }] }], 'VirtualBox menu bar'), tb, g.el, details);
      function show() {
        details.textContent = '';
        details.append(h('h4', null, 'CSE-LABVM'), h('dl', { class: 'kv' }, h('dt', null, 'State'), h('dd', null, vm.state), h('dt', null, 'Operating system'), h('dd', null, 'Ubuntu (64-bit)'), h('dt', null, 'Base memory'), h('dd', null, '2048 MB'), h('dt', null, 'Network adapter 1'), h('dd', null, `Intel PRO/1000 MT Desktop (${vm.attach}${vm.attach === 'Bridged Adapter' ? ', ' + vm.bridged : ''})`)));
      }
      mgrRefresh = () => { g.update([{ name: 'CSE-LABVM', state: vm.state, os: 'Ubuntu (64-bit)' }]); show(); };
      mgrRefresh();
    }
  });
  function settings() {
    if (vm.state === 'Running') { Win.alertBox('VirtualBox', 'The CSE-LABVM is running. Close it (power off or save its state) before changing its network settings, as the lab instructs.'); return; }
    let attach = vm.attach, br = vm.bridged;
    const nameWrap = h('div');
    const renderName = () => { nameWrap.textContent = ''; if (attach === 'Bridged Adapter') nameWrap.append(Win.select('Name (host adapter to bridge to)', ADAPTERS.map(a => ({ value: a, label: a })), br, v => { br = v; })); else nameWrap.append(h('p', { class: 'hint' }, attach === 'NAT' ? 'NAT: the virtual machine shares the host’s connection and is hidden behind it.' : 'This attachment type is not used in this lab.')); };
    const body = h('div', null, h('h3', null, 'Network'), h('h4', null, 'Adapter 1'), Win.checkbox('Enable Network Adapter', true, () => {}),
      Win.select('Attached to', ['NAT', 'Bridged Adapter', 'Internal Network', 'Host-only Adapter', 'NAT Network', 'Not attached'].map(v => ({ value: v, label: v })), attach, v => { attach = v; renderName(); announce(v === 'Bridged Adapter' ? 'Name list added: choose the host adapter.' : v); }),
      nameWrap);
    renderName();
    Win.dialog({ title: 'CSE-LABVM - Settings', body, wide: true, buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] }).then(r => {
      if (r.value !== 'ok') return;
      vm.attach = attach; vm.bridged = br; mgrRefresh();
      announce(`Network adapter 1 attached to ${attach}${attach === 'Bridged Adapter' ? ', ' + br : ''}.`);
      if (vmNet() === 'lan') T('bridged');
    });
  }
  function startVM() {
    if (vm.state === 'Running') { const ex = Win.S.windows.find(x => x.appId === 'vmconsole'); if (ex) ex.focus(); return; }
    Win.openApp('vmconsole');
  }
  Win.registerApp('vmconsole', {
    title: 'CSE-LABVM', hidden: true, single: true, windowTitle: () => 'CSE-LABVM [Running] - Oracle VirtualBox',
    proc: { name: 'VirtualBoxVM.exe', desc: 'VirtualBox Virtual Machine', tmName: 'CSE-LABVM', mem: 2100000 },
    create(w) {
      vm.state = 'Running'; mgrRefresh();
      const screen = h('div', { class: 'panel', role: 'region', 'aria-label': 'CSE-LABVM screen' });
      const closeDlg = async () => {
        let choice = 'save';
        const r = await Win.dialog({ title: 'Close Virtual Machine', body: Win.radios('vmclose', 'You want to:', [{ value: 'save', label: 'Save the machine state' }, { value: 'shutdown', label: 'Send the shutdown signal' }, { value: 'off', label: 'Power off the machine' }], 'save', v => { choice = v; }), buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
        if (r.value !== 'ok') return;
        vm.state = choice === 'save' ? 'Saved' : 'Powered Off'; if (choice !== 'save') vm.booted = false;
        w.close(); mgrRefresh(); announce(`CSE-LABVM ${vm.state === 'Saved' ? 'state saved' : 'powered off'}.`);
      };
      w.body.append(Win.menubar([{ label: 'File', items: [{ label: 'Close...', action: closeDlg }] }], 'Virtual machine menu bar'), h('p', { class: 'win-hint' }, `This window is the CSE-LABVM screen. Network adapter 1: ${vm.attach}${vm.attach === 'Bridged Adapter' ? ' (' + vm.bridged + ')' : ''}. Logged in automatically as cisco with a Terminal open.`), screen);
      w.onClose(() => { if (vm.state === 'Running') { vm.state = 'Saved'; mgrRefresh(); } });
      screen.append(h('p', { role: 'status' }, vm.booted ? 'Restoring the saved state of CSE-LABVM...' : 'CSE-LABVM is starting...'));
      setTimeout(() => {
        vm.booted = true; screen.textContent = '';
        screen.append(h('h4', null, 'Terminal (inside the CSE-LABVM)'));
        let sh;
        const term = new Term.Terminal(screen, { name: 'CSE-LABVM terminal', headingLevel: 5, prompt: () => sh ? sh.prompt() : 'cisco@labvm:~$ ', run: (line, io) => sh.run(line, io) });
        sh = new L.Shell(term, w); term.updatePrompt();
        w.term = term;
        w.onClose(() => term.destroy());
        announce('CSE-LABVM is ready. Terminal open.');
        setTimeout(() => term.focus(), 30);
      }, vm.booted ? 300 : 900);
    },
    onActivate(w) { if (w.term) setTimeout(() => w.term.focus(), 20); }
  });

  /* ---------------- Linux helpers ---------------- */
  function stream(ctx, io, lines, ms, fin) {
    return new Promise(res => {
      let i = 0, t;
      const step = () => {
        if (i < lines.length) { io.print(lines[i++]); t = setTimeout(step, ms); return; }
        ctx.term.running = null; res(fin ? fin(io) || {} : {});
      };
      ctx.term.running = { stop: () => { clearTimeout(t); io.print('^C'); res({ code: 130 }); } };
      t = setTimeout(step, 60);
    });
  }
  const notFound = (cmd, pkg) => ({ err: `\nCommand '${cmd}' not found, but can be installed with:\n\nsudo apt install ${pkg}\n`, code: 127 });
  const online = () => vmNet() === 'nat' || vmNet() === 'lan';

  /* ip address */
  L.def(['ip', 'ifconfig'], (args, ctx, w) => {
    if (w[0] === 'ip' && !/^a(ddr(ess)?)?$/.test(args[0] || '')) return { err: 'Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\nwhere  OBJECT := { address | route | link | neigh | ... }', notes: ['Try ip address.'], code: 255 };
    const ip = vmIP();
    const out = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever\n2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state ${vmNet() === 'nolink' ? 'DOWN' : 'UP'} group default qlen 1000\n    link/ether 08:00:27:5e:3c:91 brd ff:ff:ff:ff:ff:ff` +
      (ip ? `\n    inet ${ip}/24 brd ${ip.replace(/\d+$/, '255')} scope global dynamic noprefixroute enp0s3\n       valid_lft 86176sec preferred_lft 86176sec` : '') + '\n    inet6 fe80::a00:27ff:fe5e:3c91/64 scope link\n       valid_lft forever preferred_lft forever';
    const notes = [];
    if (vmNet() === 'nat') notes.push('10.0.2.15 is the private address VirtualBox NAT gives the guest. It is not on the same network as Windows (192.168.1.x). For this lab, switch Adapter 1 to Bridged Adapter.');
    if (vmNet() === 'nolink') notes.push('enp0s3 has no IPv4 address: the bridged host adapter (Wi-Fi) is not connected to a network. Bridge to the adapter Windows is using. ipconfig /all on Windows shows which one.');
    if (vmNet() === 'lan') T('vmip');
    return { out, notes, table: ctx.piped ? null : { headers: ['Interface', 'State', 'IPv4 address'], rows: [['lo', 'UNKNOWN', '127.0.0.1/8'], ['enp0s3', vmNet() === 'nolink' ? 'DOWN' : 'UP', ip ? ip + '/24' : '(none)']], caption: 'Network interfaces' } };
  });

  /* ping */
  L.def('ping', (args, ctx) => {
    const ci = args.indexOf('-c');
    const count = ci >= 0 ? parseInt(args[ci + 1], 10) : 0;
    const host = args.filter((a, i) => !a.startsWith('-') && !(ci >= 0 && i === ci + 1))[0];
    if (!host) return { err: 'ping: usage error: Destination address required', code: 1 };
    const site = SITES[host.toLowerCase()];
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(host);
    if (!site && !isIP) return { err: `ping: ${host}: Name or service not known`, code: 2 };
    if (!online()) return { err: site ? `ping: ${host}: Temporary failure in name resolution` : 'ping: connect: Network is unreachable', code: 2, notes: ['The virtual machine has no network connection. Check Adapter 1 in VirtualBox settings.'] };
    const ip = site || host;
    const toHost = ip === HOST_IP;
    const reply = site || ip === '127.0.0.1' || ip === vmIP() || ip === '192.168.1.1' || (toHost && vmNet() === 'lan' && echoAllowed());
    if (site) { done.inetVm = true; inet(); }
    const io = ctx.io;
    io.print(`PING ${host} (${ip}) 56(84) bytes of data.`);
    let seq = 0, got = 0; const t0 = Date.now();
    const stats = () => {
      io.print(`\n--- ${host} ping statistics ---\n${seq} packets transmitted, ${got} received, ${seq ? Math.round((seq - got) / seq * 100) : 0}% packet loss, time ${Math.max(0, seq - 1) * 1000 + 3}ms${got ? '\nrtt min/avg/max/mdev = 0.412/0.587/0.803/0.141 ms' : ''}`);
      if (toHost) {
        if (got) T('pingok');
        else {
          T('pingfail');
          io.note(vmNet() !== 'lan' ? 'No replies. The CSE-LABVM is not on the same network as Windows (use Bridged Adapter to the connected host adapter).' : 'No replies: Windows Defender Firewall drops incoming echo requests by default, so ping just waits. You will add an inbound rule in Part 3.');
        }
      }
    };
    return new Promise(res => {
      let t;
      const tick = () => {
        seq++;
        if (reply) { got++; io.print(`64 bytes from ${ip}: icmp_seq=${seq} ttl=${toHost ? 128 : ip === '127.0.0.1' || ip === vmIP() ? 64 : 57} time=${(Math.random() * 0.5 + (site ? 12 : 0.4)).toFixed(site ? 1 : 3)} ms`); }
        if (count && seq >= count) { ctx.term.running = null; stats(); res({ code: got ? 0 : 1 }); return; }
        t = setTimeout(tick, 900);
      };
      ctx.term.running = { stop: () => { clearTimeout(t); io.print('^C'); stats(); res({ code: got ? 0 : 1 }); } };
      if (!count) io.note('Linux ping keeps going until you stop it: press Ctrl+C in the command box or use the Stop command button.');
      t = setTimeout(tick, 400);
    });
  });

  /* ---------------- apt ---------------- */
  const pk = { updated: false, upgraded: false, chkrootkit: null, lynis: null, lynisIdx: false, aptKey: false };
  const KEYRING = '/usr/share/keyrings/cisofy-archive-keyring.gpg';
  const exists = p => { try { L.stat(p, { user: 'root', cwd: '/' }); return true; } catch (e) { return false; } };
  function repoState() {
    let txt = '';
    try { const d = L.stat('/etc/apt/sources.list.d', { user: 'root', cwd: '/' }); L.enter(d).children.forEach((ino, name) => { try { txt += L.readFile('/etc/apt/sources.list.d/' + name, { user: 'root', cwd: '/' }) + '\n'; } catch (e) {} }); } catch (e) {}
    const line = txt.split('\n').find(l => /^\s*deb\s.*packages\.cisofy\.com\/community\/lynis\/deb\/?\s+stable\s+main/.test(l));
    if (!line) return { present: false, bad: /cisofy/.test(txt) };
    const m = line.match(/signed-by=([^\]\s]+)/);
    return { present: true, signed: m ? exists(m[1]) : pk.aptKey, signedBy: m ? m[1] : null };
  }
  const lock = (what) => ({ err: what === 'lists' ? 'E: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)\nE: Unable to lock directory /var/lib/apt/lists/' : 'E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?', code: 100, notes: ['Changing installed software needs root. Run the command again with sudo in front.'] });
  const UPG = ['firefox', 'firefox-locale-en', 'libnss3', 'linux-firmware', 'openssl', 'libssl1.1', 'snapd', 'sudo', 'tzdata', 'ubuntu-advantage-tools', 'python3-software-properties', 'software-properties-common', 'libpython3.8', 'python3.8', 'libc6', 'libc-bin', 'locales'];
  const upgradable = () => pk.upgraded ? 0 : UPG.length;
  function aptUpdate(ctx, io, isApt) {
    if (!online()) return stream(ctx, io, ['Err:1 http://us.archive.ubuntu.com/ubuntu focal InRelease', "  Temporary failure resolving 'us.archive.ubuntu.com'", 'Err:2 http://security.ubuntu.com/ubuntu focal-security InRelease', "  Temporary failure resolving 'security.ubuntu.com'", 'Reading package lists... Done', 'W: Failed to fetch http://us.archive.ubuntu.com/ubuntu/dists/focal/InRelease  Temporary failure resolving \'us.archive.ubuntu.com\'', 'W: Some index files failed to download. They have been ignored, or old ones used instead.'], 150, () => ({ code: 100, notes: ['The virtual machine is not connected to a network. Check Adapter 1 in VirtualBox settings.'] }));
    const lines = [pk.updated ? 'Hit:1 http://us.archive.ubuntu.com/ubuntu focal InRelease' : 'Hit:1 http://us.archive.ubuntu.com/ubuntu focal InRelease', 'Get:2 http://us.archive.ubuntu.com/ubuntu focal-updates InRelease [128 kB]', 'Get:3 http://us.archive.ubuntu.com/ubuntu focal-backports InRelease [128 kB]', 'Get:4 http://security.ubuntu.com/ubuntu focal-security InRelease [128 kB]'];
    if (!pk.updated) lines.push('Get:5 http://us.archive.ubuntu.com/ubuntu focal-updates/main amd64 Packages [3,456 kB]', 'Get:6 http://us.archive.ubuntu.com/ubuntu focal-updates/universe amd64 Packages [1,201 kB]', 'Get:7 http://security.ubuntu.com/ubuntu focal-security/main amd64 Packages [2,984 kB]');
    const r = repoState();
    let fail = false;
    if (r.present) {
      if (r.signed) { lines.push(`Get:${lines.length + 1} https://packages.cisofy.com/community/lynis/deb stable InRelease [5,317 B]`, `Get:${lines.length + 2} https://packages.cisofy.com/community/lynis/deb stable/main amd64 Packages [2,026 B]`); }
      else { fail = true; lines.push(`Get:${lines.length + 1} https://packages.cisofy.com/community/lynis/deb stable InRelease [5,317 B]`, `Err:${lines.length + 1} https://packages.cisofy.com/community/lynis/deb stable InRelease`, "  The following signatures couldn't be verified because the public key is not available: NO_PUBKEY 9DE922F1C2FDE6C4"); }
    }
    lines.push(`Fetched ${pk.updated ? '389 kB in 1s (412 kB/s)' : '8,031 kB in 3s (2,677 kB/s)'}`, 'Reading package lists... Done');
    if (isApt) lines.push('Building dependency tree', 'Reading state information... Done', upgradable() ? `${upgradable()} packages can be upgraded. Run 'apt list --upgradable' to see them.` : 'All packages are up to date.');
    if (fail) lines.push("W: GPG error: https://packages.cisofy.com/community/lynis/deb stable InRelease: The following signatures couldn't be verified because the public key is not available: NO_PUBKEY 9DE922F1C2FDE6C4", "E: The repository 'https://packages.cisofy.com/community/lynis/deb stable InRelease' is not signed.", "N: Updating from such a repository can't be done securely, and is therefore disabled by default.", 'N: See apt-secure(8) manpage for repository creation and user configuration details.');
    return stream(ctx, io, lines, 110, () => {
      pk.updated = true;
      if (r.present && r.signed) pk.lynisIdx = true;
      T('aptupd');
      L.emit('apt:update', {});
      return { code: fail ? 100 : 0, notes: fail ? ['apt refused the Lynis repository because it cannot check its signature. Import the CISOfy key first (Part 4, Step 2), then run sudo apt-get update again.'] : [] };
    });
  }
  function aptUpgrade(ctx, io, yes) {
    const head = ['Reading package lists... Done', 'Building dependency tree', 'Reading state information... Done', 'Calculating upgrade... Done'];
    if (!upgradable()) { head.push('0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.'); return stream(ctx, io, head, 80, () => { T('aptupg'); return {}; }); }
    head.push('The following packages will be upgraded:', '  ' + UPG.slice(0, 9).join(' '), '  ' + UPG.slice(9).join(' '), `${UPG.length} upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`, 'Need to get 479 MB of archives.', 'After this operation, 53.7 MB of additional disk space will be used.');
    const run = io2 => stream(ctx, io2, ['Get:1 http://us.archive.ubuntu.com/ubuntu focal-updates/main amd64 libc6 amd64 2.31-0ubuntu9.16 [2,723 kB]', 'Get:2 http://us.archive.ubuntu.com/ubuntu focal-updates/main amd64 firefox amd64 131.0+build1-0ubuntu0.20.04.1 [74.3 MB]', 'Get:3 http://us.archive.ubuntu.com/ubuntu focal-updates/main amd64 linux-firmware all 1.187.39 [118 MB]', '...', 'Fetched 479 MB in 1min 12s (6,650 kB/s)', 'Preparing to unpack .../libc6_2.31-0ubuntu9.16_amd64.deb ...', 'Unpacking libc6:amd64 (2.31-0ubuntu9.16) over (2.31-0ubuntu9.9) ...', 'Setting up libc6:amd64 (2.31-0ubuntu9.16) ...', 'Setting up firefox (131.0+build1-0ubuntu0.20.04.1) ...', 'Setting up linux-firmware (1.187.39) ...', 'Processing triggers for man-db (2.9.1-1) ...', 'Processing triggers for libc-bin (2.31-0ubuntu9.16) ...'], 140, () => { pk.upgraded = true; T('aptupg'); return { notes: pk.updated ? [] : ['Tip: run sudo apt-get update before an upgrade, so apt knows about the newest versions.'] }; });
    return stream(ctx, io, head, 80).then(r => {
      if (r && r.code === 130) return r;
      if (yes) return run(io);
      return new Promise(res => ctx.term.ask('Do you want to continue? [Y/n] ', 'Do you want to continue? Type y and press Enter to continue, or n to stop', (ans, io2) => {
        if (/^(y|yes|)$/i.test(ans.trim())) run(io2).then(res);
        else { io2.print('Abort.'); res({ code: 1 }); }
      }, { onCancel: () => res({ code: 1 }) }));
    });
  }
  function aptInstall(ctx, io, names, isApt) {
    const lines = ['Reading package lists... Done', 'Building dependency tree', 'Reading state information... Done'];
    const n = names[0];
    if (!n) { lines.push(`0 upgraded, 0 newly installed, 0 to remove and ${upgradable()} not upgraded.`); return stream(ctx, io, lines, 60, () => ({ notes: ['Name the package to install, for example sudo apt install chkrootkit.'] })); }
    const known = { chkrootkit: true, lynis: true };
    if (!known[n]) { lines.push(`E: Unable to locate package ${n}`); return stream(ctx, io, lines, 60, () => ({ code: 100, notes: ['Check the spelling. This simulation offers chkrootkit and lynis.'] })); }
    if (!online()) { lines.push(`E: Failed to fetch http://us.archive.ubuntu.com/ubuntu/pool/universe/${n[0]}/${n}/${n}.deb  Temporary failure resolving 'us.archive.ubuntu.com'`); return stream(ctx, io, lines, 60, () => ({ code: 100 })); }
    let ver, src, size, pkgFile;
    if (n === 'chkrootkit') { ver = '0.53-1'; src = 'http://us.archive.ubuntu.com/ubuntu focal/universe amd64 chkrootkit amd64 0.53-1 [324 kB]'; size = '324 kB'; }
    else { if (pk.lynisIdx) { ver = '3.0.6-100'; src = 'https://packages.cisofy.com/community/lynis/deb stable/main amd64 lynis all 3.0.6-100 [262 kB]'; size = '262 kB'; } else { ver = '2.6.2-1'; src = 'http://us.archive.ubuntu.com/ubuntu focal/universe amd64 lynis all 2.6.2-1 [181 kB]'; size = '181 kB'; } }
    if (pk[n] === ver) { lines.push(`${n} is already the newest version (${ver}).`, `0 upgraded, 0 newly installed, 0 to remove and ${upgradable()} not upgraded.`); return stream(ctx, io, lines, 60, () => { if (n === 'lynis') L.emit('lynis:installed', { ver }); return {}; }); }
    const upgrade = !!pk[n];
    lines.push(upgrade ? 'The following packages will be upgraded:' : 'The following NEW packages will be installed:', `  ${n}`, `${upgrade ? 1 : 0} upgraded, ${upgrade ? 0 : 1} newly installed, 0 to remove and ${upgradable()} not upgraded.`, `Need to get ${size} of archives.`, `After this operation, ${n === 'lynis' ? (ver.startsWith('3') ? '1,681' : '1,113') : '962'} kB of additional disk space will be used.`, `Get:1 ${src}`, `Fetched ${size} in 1s (290 kB/s)`, upgrade ? `(Reading database ... 205812 files and directories currently installed.)` : `Selecting previously unselected package ${n}.`, upgrade ? '' : '(Reading database ... 205787 files and directories currently installed.)', `Preparing to unpack .../${n}_${ver}_${n === 'lynis' ? 'all' : 'amd64'}.deb ...`, `Unpacking ${n} (${ver})${upgrade ? ' over (' + pk[n] + ')' : ''} ...`, `Setting up ${n} (${ver}) ...`, 'Processing triggers for man-db (2.9.1-1) ...');
    return stream(ctx, io, lines.filter(Boolean), 110, () => {
      pk[n] = ver;
      L.put(n === 'lynis' ? '/usr/sbin/lynis' : '/usr/sbin/chkrootkit', '', { mode: 0o755 });
      L.emit('apt:install', { n, ver });
      const notes = [];
      if (n === 'lynis' && ver.startsWith('2')) notes.push('This installed Lynis 2.6.2 from Ubuntu’s own repository, an older version. To get 3.0.6, add the CISOfy key and repository, run sudo apt-get update, then run sudo apt install lynis again.');
      return { notes };
    });
  }
  function aptFn(isApt) {
    return (args, ctx) => {
      const sub = args.find(a => !a.startsWith('-'));
      const yes = args.includes('-y') || args.includes('--yes');
      const rest = args.filter(a => !a.startsWith('-')).slice(1);
      if (!sub) return { out: isApt ? 'apt 2.0.10 (amd64)\nUsage: apt [options] command\n\nMost used commands:\n  list - list packages based on package names\n  search - search in package descriptions\n  show - show package details\n  install - install packages\n  remove - remove packages\n  update - update list of available packages\n  upgrade - upgrade the system by installing/upgrading packages\n  full-upgrade - upgrade the system by removing/installing/upgrading packages' : 'apt 2.0.10 (amd64)\nUsage: apt-get [options] command\n       apt-get [options] install|remove pkg1 [pkg2 ...]\n       apt-get [options] source pkg1 [pkg2 ...]\n\napt-get is a command line interface for retrieval of packages\nand information about them from authenticated sources and\nfor installation, upgrade and removal of packages together\nwith their dependencies.\n\nMost used commands:\n  update - Retrieve new lists of packages\n  upgrade - Perform an upgrade\n  install - Install new packages (pkg is libc6 not libc6.deb)\n  reinstall - Reinstall packages (pkg is libc6 not libc6.deb)\n  remove - Remove packages\n  purge - Remove packages and config files\n  autoremove - Remove automatically all unused packages\n  dist-upgrade - Distribution upgrade, see apt-get(8)\n  dselect-upgrade - Follow dselect selections\n  build-dep - Configure build-dependencies for source packages\n  clean - Erase downloaded archive files\n  autoclean - Erase old downloaded archive files\n  check - Verify that there are no broken dependencies\n  source - Download source archives\n  download - Download the binary package into the current directory\n  changelog - Download and display the changelog for the given package\n\nSee apt-get(8) for more information about the available commands.\nConfiguration options and syntax is detailed in apt.conf(5).\nInformation about how to configure sources can be found in sources.list(5).\nPackage and version preferences can be specified via apt_preferences(5).\nSecurity details are available in apt-secure(8).\n                                        This APT has Super Cow Powers.' };
      const io = ctx.io;
      if (sub === 'update') return ctx.user !== 'root' ? lock('lists') : aptUpdate(ctx, io, isApt);
      if (sub === 'upgrade' || sub === 'full-upgrade' || sub === 'dist-upgrade') return ctx.user !== 'root' ? lock('dpkg') : aptUpgrade(ctx, io, yes);
      if (sub === 'install') return ctx.user !== 'root' ? lock('dpkg') : aptInstall(ctx, io, rest, isApt);
      if (sub === 'list' && isApt && args.includes('--upgradable')) return { out: 'Listing... Done\n' + (pk.upgraded ? '' : UPG.map(p => `${p}/focal-updates [upgradable]`).join('\n')) };
      return { err: `E: Invalid operation ${sub}`, code: 100, notes: ['This simulation supports update, upgrade, and install.'] };
    };
  }
  L.def('apt-get', aptFn(false));
  L.def('apt', aptFn(true));
  L.def('apt-cache', (args) => {
    if (args[0] !== 'policy' || args[1] !== 'lynis') return args[0] === 'policy' && args[1] ? { out: `${args[1]}:\n  Installed: ${pk[args[1]] || '(none)'}\n  Candidate: ${args[1] === 'chkrootkit' ? '0.53-1' : '(none)'}` } : { err: 'E: This simulation supports apt-cache policy lynis.', code: 100 };
    const ver = pk.lynis || '(none)';
    const cand = pk.lynisIdx ? '3.0.6-100' : '2.6.2-1';
    let out = `lynis:\n  Installed: ${ver}\n  Candidate: ${cand}\n  Version table:`;
    const rows = [];
    if (pk.lynisIdx) { out += `\n ${ver === '3.0.6-100' ? '***' : '   '} 3.0.6-100 500\n        500 https://packages.cisofy.com/community/lynis/deb stable/main amd64 Packages${ver === '3.0.6-100' ? '\n        100 /var/lib/dpkg/status' : ''}`; rows.push(['3.0.6-100', ver === '3.0.6-100' ? 'Yes' : 'No', 'packages.cisofy.com (CISOfy)']); }
    out += `\n ${ver === '2.6.2-1' ? '***' : '   '} 2.6.2-1 500\n        500 http://us.archive.ubuntu.com/ubuntu focal/universe amd64 Packages${ver === '2.6.2-1' ? '\n        100 /var/lib/dpkg/status' : ''}`;
    rows.push(['2.6.2-1', ver === '2.6.2-1' ? 'Yes' : 'No', 'us.archive.ubuntu.com (Ubuntu focal/universe)']);
    T('policy');
    return { out, table: { headers: ['Version', 'Installed', 'Repository'], rows, caption: 'Versions of lynis available' }, notes: ['500 is the priority of each repository; 100 marks the copy already installed (/var/lib/dpkg/status). The *** marks the installed version.'] };
  });

  /* keys */
  L.def('apt-key', (args, ctx) => {
    if (args.includes('--recv-')) return { err: 'gpg: invalid option "--recv-"', code: 2, notes: ['The option was split in two. In the original lab the command wraps onto a second line, so pasting it breaks --recv-keys apart. Type the whole command on one line.'] };
    if (args[0] === 'list') return { out: pk.aptKey ? '/etc/apt/trusted.gpg\n--------------------\npub   rsa4096 2017-02-07 [SC]\n      013B AA07 180C 50A7 1010  97EF 9DE9 22F1 C2FD E6C4\nuid           [ unknown] CISOfy software signing <software@cisofy.com>\nsub   rsa4096 2017-02-07 [E]' : '' };
    if (args[0] !== 'adv') return { err: 'Usage: apt-key [--keyring file] [command] [arguments]', code: 1 };
    if (ctx.user !== 'root') return { err: 'ERROR: This command can only be used by root.', code: 1 };
    const ki = args.indexOf('--recv-keys');
    const key = ki >= 0 ? (args[ki + 1] || '').toLowerCase() : '';
    const ks = args[args.indexOf('--keyserver') + 1] || '';
    const pre = `Executing: /tmp/apt-key-gpghome.8C6X477onz/gpg.1.sh ${args.slice(1).join(' ')}`;
    if (!online()) return { out: pre, err: 'gpg: keyserver receive failed: Server indicated a failure', code: 2 };
    if (ks !== 'keyserver.ubuntu.com') return { out: pre, err: 'gpg: keyserver receive failed: No name', code: 2, notes: ['Check the keyserver name: keyserver.ubuntu.com.'] };
    if (key.replace(/^0x/, '') !== '013baa07180c50a7101097ef9de922f1c2fde6c4') return { out: pre, err: 'gpg: keyserver receive failed: No data', code: 2, notes: ['The key ID does not match a key on the keyserver. Check each character of the long key ID.'] };
    pk.aptKey = true; T('key');
    return { out: `${pre}\ngpg: key 9DE922F1C2FDE6C4: public key "CISOfy software signing <software@cisofy.com>" imported\ngpg: Total number processed: 1\ngpg:               imported: 1`, notes: ['apt-key works on this Ubuntu 20.04 virtual machine. It is deprecated and removed in newer releases, where you save the key to a keyring file instead (see the note in Part 4).'] };
  });
  const PGP = '-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQINBFiZ4WkBEADJ4cE0q6l8fl4Fv6dBlOl3qvF3o5mQ3C1k8yK5nZ2...\n(key data shortened in this simulation)\n=Q8yT\n-----END PGP PUBLIC KEY BLOCK-----';
  L.def('curl', (args, ctx) => {
    const url = args.find(a => /^https?:\/\//.test(a));
    if (!url) return { err: "curl: try 'curl --help' or 'curl --manual' for more information", code: 2 };
    if (!online()) return { err: `curl: (6) Could not resolve host: ${url.split('/')[2]}`, code: 6 };
    if (/packages\.cisofy\.com\/keys\/cisofy-software-public\.key$/.test(url)) return { out: PGP };
    return { err: `curl: (22) The requested URL returned error: 404`, code: 22, notes: ['This simulation only knows the CISOfy key address: https://packages.cisofy.com/keys/cisofy-software-public.key'] };
  });
  L.def('gpg', (args, ctx) => {
    if (!args.includes('--dearmor')) return { err: 'gpg: This simulation supports gpg --dearmor -o FILE.', code: 2 };
    const oi = args.indexOf('-o') >= 0 ? args.indexOf('-o') : args.indexOf('--output');
    if (!/BEGIN PGP PUBLIC KEY BLOCK/.test(ctx.stdin || '')) return { err: 'gpg: no valid OpenPGP data found.', code: 2 };
    if (oi < 0) return { out: '(binary key data)' };
    const f = args[oi + 1];
    try { L.writeFile(f, '(binary OpenPGP keyring)\n', ctx); } catch (e) { return { err: `gpg: can't create '${f}': ${e.message}\ngpg: dearmoring failed: ${e.message}`, code: 2 }; }
    if (L.norm(f, ctx.cwd) === KEYRING) T('key');
    return {};
  });
  L.on('tee', ({ path }) => { if (path.startsWith('/etc/apt/sources.list.d/') && repoState().present) T('repo'); });

  /* chkrootkit */
  const CHECKS = ['amd', 'basename', 'biff', 'chfn', 'chsh', 'cron', 'crontab', 'date', 'du', 'dirname', 'echo', 'egrep', 'env', 'find', 'fingerd', 'gpm', 'grep', 'hdparm', 'su', 'ifconfig', 'inetd', 'inetdconf', 'identd', 'init', 'killall', 'ldsopreload', 'login', 'ls', 'lsof', 'mail', 'mingetty', 'netstat', 'named', 'passwd', 'pidof', 'pop2', 'pop3', 'ps', 'pstree', 'rpcinfo', 'rlogind', 'rshd', 'slogin', 'sendmail', 'sshd', 'syslogd', 'tar', 'tcpd', 'tcpdump', 'top', 'telnetd', 'timed', 'traceroute', 'vdir', 'w', 'write'];
  const notInf = ['amd', 'fingerd', 'gpm', 'identd', 'inetd', 'mail', 'mingetty', 'named', 'pop2', 'pop3', 'rlogind', 'rshd', 'sendmail', 'timed', 'write'];
  L.def('chkrootkit', (args, ctx) => {
    if (!pk.chkrootkit) return notFound('chkrootkit', 'chkrootkit');
    if (ctx.user !== 'root') return { err: '/usr/sbin/chkrootkit needs root privileges', code: 1 };
    const pad = s => s.padEnd(60);
    const lines = ['ROOTDIR is `/\''];
    CHECKS.forEach(c => lines.push(pad(`Checking \`${c}'...`) + (notInf.includes(c) ? 'not found' : 'not infected')));
    lines.push(pad('Checking `aliens\'...') + 'no suspect files', pad('Searching for sniffer\'s logs, it may take a while...') + 'nothing found', pad('Searching for rootkit HiDrootkit\'s default files...') + 'nothing found', pad('Searching for rootkit t0rn\'s default files...') + 'nothing found');
    [['LPD Worm files and dirs...', 'nothing found'], ['Ramen Worm files and dirs...', 'nothing found'], ['Maniac files and dirs...', 'nothing found'], ['RK17 files and dirs...', 'nothing found'], ['Ducoci rootkit...', 'nothing found'], ['Adore Worm...', 'nothing found'], ['ShitC Worm...'.replace('ShitC', 'Sh*tC'), 'nothing found'], ['Omega Worm...', 'nothing found'], ['Sadmind/IIS Worm...', 'nothing found'], ['MonKit...', 'nothing found'], ['Showtee...', 'nothing found'], ['OpticKit...', 'nothing found'], ['T.R.K...', 'nothing found'], ['Mithra...', 'nothing found'], ['LOC rootkit...', 'nothing found'], ['Romanian rootkit...', 'nothing found'], ['Suckit rootkit...', 'nothing found'], ['Volc rootkit...', 'nothing found'], ['Gold2 rootkit...', 'nothing found'], ['TC2 Worm default files and dirs...', 'nothing found'], ['Anonoying rootkit default files and dirs...', 'nothing found'], ['ZK rootkit...', 'nothing found'], ['ShKit rootkit...', 'nothing found'], ['AjaKit rootkit...', 'nothing found'], ['zaRwT rootkit...', 'nothing found'], ['Madalin rootkit default files...', 'nothing found'], ['Fu rootkit default files...', 'nothing found'], ['ESRK rootkit default files...', 'nothing found'], ['rootedoor...', 'nothing found'], ['ENYELKM rootkit default files...', 'nothing found'], ['common ssh-scanners default files...', 'nothing found'], ['Linux/Ebury - Operation Windigo ssh...', 'not tested'], ['64-bit Linux Rootkit ...', 'nothing found'], ['suspect PHP files...', 'nothing found'], ['anomalies in shell history files...', 'nothing found']].forEach(([a, b]) => lines.push(pad('Searching for ' + a) + b));
    lines.push(pad('Checking `asp\'...') + 'not infected', pad('Checking `bindshell\'...') + 'not infected', pad('Checking `lkm\'...') + 'chkproc: nothing detected', pad('Checking `rexedcs\'...') + 'not found', pad('Checking `sniffer\'...') + 'enp0s3: PF_PACKET(/usr/sbin/NetworkManager)', pad('Checking `w55808\'...') + 'not infected', pad('Checking `wted\'...') + 'chkwtmp: nothing deleted', pad('Checking `scalper\'...') + 'not infected', pad('Checking `slapper\'...') + 'not infected', pad('Checking `z2\'...') + 'chklastlog: nothing deleted');
    lines.push("Checking `chkutmp'...  The tty of the following user process(es) were not found", ' in /var/run/utmp !', '! RUID          PID TTY    CMD');
    const nextCmd = ctx.piped && ctx.pipelineLine ? ctx.pipelineLine.split('|').slice(ctx.stageIndex + 1).map(s => s.trim())[0] : null;
    if (nextCmd) lines.push(`! cisco       32822 pts/0  ${nextCmd.replace(/^grep\b/, 'grep --color=auto')}`);
    lines.push(pad('Checking `OSX_RSPLUG\'...') + 'not tested');
    L.emit('chkrootkit', { piped: !!nextCmd, line: ctx.pipelineLine });
    return { out: lines.join('\n') };
  });
  L.on('cmd', ({ words, code }) => {
    if (words.length > 1 && words[0].includes('chkrootkit') && words[1][0] === 'grep' && words[1].some(a => /worm/i.test(a))) T('chk');
  });

  /* lynis */
  L.def('lynis', (args) => {
    if (!pk.lynis) return notFound('lynis', 'lynis');
    const v = pk.lynis.split('-')[0];
    if (args[0] === 'show' && args[1] === 'version') { if (v === '3.0.6') T('lynis'); return { out: v, notes: v === '3.0.6' ? [] : ['This is the older Ubuntu package. See the note after installing.'] }; }
    if (args[0] === 'audit') return { out: `\n[ Lynis ${v} ]\n\n################################################################################\n  Lynis comes with ABSOLUTELY NO WARRANTY. This is free software, and you are\n  welcome to redistribute it under the terms of the GNU General Public License.\n  See the LICENSE file for details about using this software.\n\n  2007-2021, CISOfy - https://cisofy.com/lynis/\n  Enterprise support available (compliance, plugins, interface and tools)\n################################################################################`, notes: ['A full audit is part of a later activity, so this simulation stops here.'] };
    return { out: `\n[ Lynis ${v} ]\n\n  Usage: lynis command [options]\n\n  Command:\n\n    audit\n        audit system                  : Perform local security scan\n    show\n        show version                  : Show Lynis version\n        show commands                 : Show available Lynis commands\n        show help                     : Show help` };
  });
  L.MAN.chkrootkit = 'CHKROOTKIT(1)\n\nNAME\n       chkrootkit - Determine whether the system is infected with a rootkit\n\nSYNOPSIS\n       chkrootkit [options] [test ...]\n\nDESCRIPTION\n       chkrootkit examines certain elements of the target system and\n       determines whether they have been tampered with. It must be run as\n       root.';

  /* ---------------- Windows Update ---------------- */
  const fmtNowW = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  let lastChecked = 'Yesterday, 6:58 PM';
  const wuSeen = { check: false, hours: false };
  const wuDone = () => { if (wuSeen.check && wuSeen.hours) T('wu'); };
  Win.registerApp('winupdate', {
    title: 'Windows Update', keywords: ['check for updates', 'windows update', 'updates', 'settings'], kind: 'System settings', single: true,
    windowTitle: () => 'Settings - Windows Update',
    create(w) {
      const area = h('div');
      w.body.append(area);
      const back = () => h('button', { type: 'button', class: 'secondary', onclick: () => home(true) }, 'Back to Windows Update');
      const page = (title, ...kids) => { area.textContent = ''; const hd = h('h4', { tabindex: '-1' }, title); area.append(back(), hd, ...kids); hd.focus(); };
      function home(focus) {
        area.textContent = '';
        const status = h('p', { role: 'status' });
        const hd = h('h4', { tabindex: '-1' }, 'You’re up to date');
        const lc = h('p', null, `Last checked: ${lastChecked}`);
        const btn = h('button', { type: 'button' }, 'Check for updates');
        btn.addEventListener('click', () => {
          btn.disabled = true; status.textContent = 'Checking for updates...';
          setTimeout(() => { lastChecked = `Today, ${fmtNowW()}`; lc.textContent = `Last checked: ${lastChecked}`; status.textContent = 'You’re up to date. No new updates were found.'; btn.disabled = false; wuSeen.check = true; wuDone(); }, 1200);
        });
        const more = h('ul', { class: 'cp-list', 'aria-label': 'More options' },
          h('li', null, h('button', { type: 'button', class: 'link', onclick: pause }, 'Pause updates')),
          h('li', null, h('button', { type: 'button', class: 'link', onclick: history }, 'Update history')),
          h('li', null, h('button', { type: 'button', class: 'link', onclick: advanced }, 'Advanced options')));
        area.append(hd, lc, h('div', { class: 'toolbar' }, btn), status, h('h4', null, 'More options'), more);
        if (focus) hd.focus();
      }
      let paused = null;
      function pause() {
        const s = h('p', { role: 'status' }, paused ? `Updates paused until ${paused}.` : 'Updates are not paused.');
        page('Pause updates', h('p', null, 'Pausing stops Windows from installing updates for a while. You will not get security fixes during that time.'),
          Win.select('Pause for', [{ value: '', label: 'Do not pause' }, { value: '1', label: '1 week' }, { value: '2', label: '2 weeks' }, { value: '3', label: '3 weeks' }, { value: '5', label: '5 weeks' }], '', v => { if (!v) { paused = null; s.textContent = 'Updates are not paused.'; return; } const d = new Date(Date.now() + v * 7 * 864e5); paused = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); s.textContent = `Updates paused until ${paused}. Remember to resume them.`; }), s);
      }
      function history() {
        const g = Win.grid({ caption: 'Update history', cols: [{ key: 'cat', label: 'Category' }, { key: 'name', label: 'Update' }, { key: 'res', label: 'Result' }], key: 'name', rows: [
          { cat: 'Quality Updates', name: '2026-09 Cumulative Update for Windows 11 Version 23H2 for x64-based Systems', res: 'Successfully installed on 9/9/2026' },
          { cat: 'Quality Updates', name: '2026-09 .NET Framework Cumulative Update for Windows 11', res: 'Successfully installed on 9/9/2026' },
          { cat: 'Driver Updates', name: 'Realtek Semiconductor Corp. - Net - 10.68.815.2023', res: 'Successfully installed on 8/20/2026' },
          { cat: 'Definition Updates', name: 'Security Intelligence Update for Microsoft Defender Antivirus (Version 1.419.112.0)', res: 'Successfully installed on 10/5/2026' },
          { cat: 'Other Updates', name: 'Windows Malicious Software Removal Tool x64 - v5.130', res: 'Successfully installed on 9/9/2026' }] });
        page('Update history', g.el);
      }
      function advanced() {
        page('Advanced options',
          h('h5', null, 'Active hours'),
          h('p', null, 'Current active hours: 8:00 AM to 5:00 PM. Adjust active hours: Manually.'),
          h('p', null, 'We won’t restart your device during active hours. Outside them, Windows can restart automatically to finish installing updates.'),
          h('h5', null, 'Optional updates'), h('p', null, '1 available: 2026-10 Cumulative Update Preview for Windows 11 Version 23H2. Optional updates are not installed automatically.'),
          Win.checkbox('Receive updates for other Microsoft products', true, () => {}),
          Win.checkbox('Notify me when a restart is required to finish updating', false, () => {}));
        wuSeen.hours = true; wuDone();
      }
      home(false);
    }
  });

  /* ---------------- Change password ---------------- */
  let pwChangedThisSession = false;
  function pwProblem(user, cur, nw) {
    const reasons = [];
    if (nw.length < sp.minlen) reasons.push(`shorter than ${sp.minlen} characters`);
    if (sp.complex) {
      const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(nw)).length;
      if (kinds < 3) reasons.push('fewer than three kinds of characters');
      if (nw.length < 6) reasons.push('fewer than 6 characters (complexity rule)');
      if (nw.toLowerCase().includes(user.toLowerCase())) reasons.push('contains the account name');
    }
    if (sp.hist > 0 && nw === cur) reasons.push('the same as a remembered password');
    if (sp.minage > 0 && pwChangedThisSession) reasons.push(`changed less than ${sp.minage} day ago (minimum password age)`);
    return reasons;
  }
  Win.registerApp('chpw', {
    title: 'Change your password', keywords: ['change your password', 'password', 'sign-in options', 'accounts'], kind: 'System settings', single: true,
    windowTitle: () => 'Settings - Accounts - Sign-in options',
    create(w) {
      const status = h('p', { role: 'status' });
      w.body.append(h('h4', null, 'Ways to sign in'), h('h5', null, 'Password'), h('p', null, 'Sign in with your account’s password.'),
        h('button', { type: 'button', onclick: change }, 'Change'), status);
      function change() {
        const u = Win.S.user, acct = Win.S.users[u];
        const data = { cur: '', nw: '', cf: '', hint: '' };
        const pwField = (label, key, d) => { const i = h('input', { type: 'password', autocomplete: 'off', value: d[key] }); i.addEventListener('input', () => { d[key] = i.value; }); return Win.field(label, i); };
        Win.wizard({ title: 'Change your password', finishLabel: 'Finish', data, pages: [
          { title: 'Verify your current password', render: (b, d) => b.append(h('p', null, u), pwField('Current password', 'cur', d)), validate: d => d.cur === acct.password ? null : 'The password is incorrect. Try again.' },
          { title: 'Change your password', render: (b, d) => { const hi = h('input', { type: 'text', autocomplete: 'off', value: d.hint }); hi.addEventListener('input', () => { d.hint = hi.value; }); b.append(pwField('New password', 'nw', d), pwField('Confirm password', 'cf', d), Win.field('Password hint', hi)); },
            validate: d => {
              if (!d.nw) return 'Enter a new password.';
              if (d.nw !== d.cf) return 'The passwords don’t match. Try again.';
              if (!d.hint.trim()) return 'Enter a password hint.';
              if (d.hint.includes(d.nw)) return 'Your password hint can’t contain your password.';
              const p = pwProblem(u, acct.password, d.nw);
              if (p.length) { announce(''); Win.emit('pw:rejected', { reasons: p }); if (sp.minlen >= 8 && sp.complex) T('pwtest'); return `The password you entered doesn’t meet the password policy requirements. Try one that’s longer or more complex. (Simulation detail: the new password is ${p.join('; ')}.)`; }
              return null;
            } },
          { title: 'Next time you sign in, use your new password', render: b => b.append(h('p', null, 'Choose Finish to save your new password.')) }
        ], onFinish: d => {
          acct.password = d.nw; pwChangedThisSession = true;
          status.textContent = `Password changed. Your new password is now in effect. Remember it: you need it to change the password again.${sp.minlen < 8 || !sp.complex ? ' Note: the password policy is not fully set yet, so Windows accepted it. Set the policy in Local Security Policy, then test again.' : ''}`;
        } });
      }
    }
  });

  /* ---------------- Local Security Policy ---------------- */
  const PW = [
    { k: 'hist', name: 'Enforce password history', type: 'num', min: 0, max: 24, label: 'Keep password history for:', unit: 'passwords remembered', explain: 'Sets how many unique new passwords a user must use before an old password can be reused. The value can be 0 to 24.' },
    { k: 'maxage', name: 'Maximum password age', type: 'num', min: 0, max: 999, label: 'Password will expire in:', unit: 'days', explain: 'Sets how long a password can be used before Windows requires the user to change it. 0 means passwords never expire.' },
    { k: 'minage', name: 'Minimum password age', type: 'num', min: 0, max: 998, label: 'Password can be changed after:', unit: 'days', explain: 'Sets how long a password must be used before the user can change it. Without it, a user could change a password several times in a row to get back to an old one, defeating password history.' },
    { k: 'minlen', name: 'Minimum password length', type: 'num', min: 0, max: 14, label: 'Password must be at least:', unit: 'characters', explain: 'Sets the fewest characters a password can contain. 0 means no password is required.' },
    { k: 'lenaudit', name: 'Minimum password length audit', type: 'fixed', value: 'Not Defined', explain: 'Logs an event when a new password is shorter than this value. It does not block the password. Not used in this lab.' },
    { k: 'complex', name: 'Password must meet complexity requirements', type: 'bool', explain: 'When enabled, passwords must not contain the account name, must be at least 6 characters, and must contain characters from three of these four groups: uppercase letters, lowercase letters, digits, and symbols.' },
    { k: 'relax', name: 'Relax minimum password length limits', type: 'fixed', value: 'Not Defined', explain: 'Allows a minimum password length above 14. Not used in this lab.' },
    { k: 'reversible', name: 'Store passwords using reversible encryption', type: 'bool', explain: 'Stores passwords in a form that can be decrypted, which is nearly the same as storing them in plain text. Enable it only when an application requires it.' }
  ];
  const LO = [
    { k: 'duration', name: 'Account lockout duration', type: 'num', min: 0, max: 99999, label: 'Account is locked out for:', unit: 'minutes', explain: 'Sets how many minutes a locked-out account stays locked before it unlocks automatically. 0 means an administrator must unlock it.' },
    { k: 'threshold', name: 'Account lockout threshold', type: 'num', min: 0, max: 999, label: 'Account will lock out after:', unit: 'invalid logon attempts', explain: 'Sets how many failed sign-in attempts lock the account. 0 means the account is never locked out.' },
    { k: 'adminLock', name: 'Allow Administrator account lockout', type: 'bool', explain: 'Controls whether the built-in Administrator account can be locked out. Not changed in this lab.' },
    { k: 'reset', name: 'Reset account lockout counter after', type: 'num', min: 1, max: 99999, label: 'Reset account lockout counter after:', unit: 'minutes', explain: 'Sets how many minutes after a failed attempt the failed-attempt counter goes back to 0. It must be less than or equal to the lockout duration.' }
  ];
  const AU = ['Audit account logon events', 'Audit account management', 'Audit directory service access', 'Audit logon events', 'Audit object access', 'Audit policy change', 'Audit privilege use', 'Audit process tracking', 'Audit system events'];
  const AUX = {
    'Audit account logon events': 'Decides whether Windows records an event each time this computer validates an account’s credentials. Success records valid sign-ins; Failure records attempts that failed. Useful for spotting password guessing.',
    'Audit account management': 'Records changes to accounts: creating, changing, renaming, disabling, or deleting users and groups, and setting passwords.',
    'Audit directory service access': 'Records access to Active Directory objects that have their own audit settings. Applies to domain controllers.',
    'Audit logon events': 'Records each time a user signs in to or out of this computer, including network sign-ins.',
    'Audit object access': 'Records access to files, folders, registry keys, and printers that have auditing turned on in their own settings.',
    'Audit policy change': 'Records changes to user rights, audit policies, and trust policies.',
    'Audit privilege use': 'Records each time a user exercises a user right, such as changing the system time.',
    'Audit process tracking': 'Records program activity such as a process starting or ending.',
    'Audit system events': 'Records restarts, shutdowns, and events that affect system security or the security log.'
  };
  const disp = (p) => {
    if (p.type === 'fixed') return p.value;
    const v = sp[p.k];
    if (p.type === 'bool') return v ? 'Enabled' : 'Disabled';
    if ((p.k === 'duration' || p.k === 'reset') && sp.threshold === 0) return 'Not Applicable';
    if (p.k === 'maxage' && v === 0) return 'Password will not expire';
    if (p.k === 'minlen' && v === 0) return '0 characters';
    if (p.k === 'threshold' && v === 0) return '0 invalid logon attempts';
    return `${v} ${p.unit.replace(/^passwords remembered$/, v === 1 ? 'password remembered' : 'passwords remembered').replace(/^days$/, v === 1 ? 'day' : 'days').replace(/^minutes$/, v === 1 ? 'minute' : 'minutes')}`;
  };
  const audDisp = n => { const a = sp.audit[n] || {}; return a.s && a.f ? 'Success, Failure' : a.s ? 'Success' : a.f ? 'Failure' : 'No auditing'; };
  function checkPw() { if (sp.hist === 2 && sp.maxage === 90 && sp.minage === 1 && sp.minlen === 8 && sp.complex && !sp.reversible) T('pwpol'); }
  function checkLo() { if (sp.threshold === 5 && sp.reset === 10 && sp.duration >= 10) T('lockout'); }
  function policyProps(p, refresh) {
    let val = sp[p.k];
    const err = h('p', { class: 'dlg-error', role: 'alert' });
    const items = [{ id: 'set', label: 'Local Security Setting', render: panel => {
      panel.append(h('p', null, p.name));
      if (p.type === 'fixed') { panel.append(h('p', null, `${p.value}. This policy is not used in this lab.`)); return; }
      if (p.type === 'bool') { panel.append(Win.radios('pol-' + p.k, p.name, [{ value: 'e', label: 'Enabled' }, { value: 'd', label: 'Disabled' }], val ? 'e' : 'd', v => { val = v === 'e'; })); return; }
      const i = h('input', { type: 'number', min: String(p.min), max: String(p.max), value: String(val), inputmode: 'numeric' });
      i.addEventListener('input', () => { val = i.value; });
      panel.append(Win.field(`${p.label} (${p.unit})`, i, `Allowed values: ${p.min} to ${p.max}.`));
    } }, { id: 'explain', label: 'Explain', render: panel => { panel.append(h('h3', null, p.name), h('p', null, p.explain)); } }];
    const tb = Win.tabs({ label: `${p.name} Properties`, items });
    return Win.dialog({ title: `${p.name} Properties`, body: h('div', null, tb.el, err), wide: true, buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }, { label: 'Apply', value: 'apply' }],
      validate: () => {
        if (p.type !== 'num') return null;
        const n = Number(val);
        if (String(val).trim() === '' || !Number.isInteger(n) || n < p.min || n > p.max) return `The value must be a whole number from ${p.min} to ${p.max}.`;
        if (p.k === 'minage' && sp.maxage && n >= sp.maxage) return 'The minimum password age must be less than the maximum password age.';
        if (p.k === 'maxage' && n && n <= sp.minage) return 'The maximum password age must be greater than the minimum password age.';
        if (p.k === 'reset' && sp.threshold && n > sp.duration) return 'The Reset account lockout counter after value must be less than or equal to the Account lockout duration value.';
        if (p.k === 'duration' && sp.threshold && n && n < sp.reset) return 'The Account lockout duration value must be greater than or equal to the Reset account lockout counter after value.';
        return null;
      } }).then(async r => {
      if (r.value === 'cancel' || p.type === 'fixed') return;
      const old = sp[p.k];
      sp[p.k] = p.type === 'num' ? Number(val) : !!val;
      if (p.k === 'threshold' && old === 0 && sp.threshold > 0) {
        sp.duration = Math.max(sp.duration, 10); sp.reset = Math.min(Math.max(sp.reset, 10), sp.duration);
        await Win.alertBox('Suggested Value Changes', `Because the value of Account lockout threshold is now ${sp.threshold} invalid logon attempts, the settings for the following items will be changed to the suggested values: Account lockout duration, ${sp.duration} minutes; Reset account lockout counter after, ${sp.reset} minutes.`);
      }
      refresh();
      announce(`${p.name}: ${disp(p)}.`);
      checkPw(); checkLo();
    });
  }
  function auditProps(n, refresh) {
    const a = Object.assign({ s: false, f: false }, sp.audit[n]);
    const items = [{ id: 'set', label: 'Local Security Setting', render: panel => panel.append(h('p', null, n), h('fieldset', null, h('legend', null, 'Audit these attempts:'), Win.checkbox('Success', a.s, v => { a.s = v; }), Win.checkbox('Failure', a.f, v => { a.f = v; }))) },
      { id: 'explain', label: 'Explain', render: panel => { panel.append(h('h3', null, n), h('p', null, AUX[n])); if (n === AU[0]) T('audit'); } }];
    const tb = Win.tabs({ label: `${n} Properties`, items });
    Win.dialog({ title: `${n} Properties`, body: tb.el, wide: true, buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] }).then(r => { if (r.value === 'ok') { sp.audit[n] = a; refresh(); } });
  }
  Win.registerApp('secpol', {
    title: 'Local Security Policy', keywords: ['secpol.msc', 'secpol', 'local security policy', 'security policy'], kind: 'Windows Tools app', single: true, requiresAdmin: true,
    proc: { name: 'mmc.exe', desc: 'Microsoft Management Console', tmName: 'Microsoft Management Console', mem: 21000 },
    create(w) {
      const right = h('div', { class: 'panel', role: 'region', 'aria-label': 'Policies' });
      let cur = 'pw';
      const nodes = [{ id: 'root', label: 'Security Settings', expanded: true, children: [
        { id: 'acct', label: 'Account Policies', children: [{ id: 'pw', label: 'Password Policy' }, { id: 'lo', label: 'Account Lockout Policy' }] },
        { id: 'local', label: 'Local Policies', children: [{ id: 'au', label: 'Audit Policy' }, { id: 'ura', label: 'User Rights Assignment' }, { id: 'so', label: 'Security Options' }] },
        { id: 'wf', label: 'Windows Defender Firewall with Advanced Security' }, { id: 'nlm', label: 'Network List Manager Policies' }, { id: 'pk', label: 'Public Key Policies' },
        { id: 'srp', label: 'Software Restriction Policies' }, { id: 'acp', label: 'Application Control Policies' }, { id: 'ips', label: 'IP Security Policies on Local Computer' }, { id: 'aapc', label: 'Advanced Audit Policy Configuration' }] }];
      const tr = Win.tree({ label: 'Security Settings tree', nodes, onSelect: n => { cur = n.id; render(); } });
      function render() {
        right.textContent = '';
        const list = cur === 'pw' ? PW : cur === 'lo' ? LO : null;
        if (list) {
          const g = Win.grid({ caption: cur === 'pw' ? 'Password Policy' : 'Account Lockout Policy', cols: [{ key: 'name', label: 'Policy' }, { key: 'set', label: 'Security Setting' }], key: 'name', rows: list.map(p => ({ name: p.name, set: disp(p), ref: p })), onOpen: r => policyProps(r.ref, render), onContext: (r, b) => Win.popMenu(b, [{ label: 'Properties', action: () => policyProps(r.ref, render) }], 'Policy actions') });
          right.append(h('p', null, 'Select a policy and press Enter, or use Properties, to change it.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'secondary', onclick: () => { const r = g.selected; if (!r) { announce('Select a policy first.'); return; } policyProps(r.ref, render); } }, 'Properties')), g.el);
          return;
        }
        if (cur === 'au') {
          const g = Win.grid({ caption: 'Audit Policy', cols: [{ key: 'name', label: 'Policy' }, { key: 'set', label: 'Security Setting' }], key: 'name', rows: AU.map(n => ({ name: n, set: audDisp(n) })), onOpen: r => auditProps(r.name, render) });
          right.append(h('p', null, 'Select a policy and press Enter, or use Properties.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'secondary', onclick: () => { const r = g.selected; if (!r) { announce('Select a policy first.'); return; } auditProps(r.name, render); } }, 'Properties')), g.el);
          return;
        }
        const n = { root: 'Security Settings holds every security policy for this computer. Expand Account Policies or Local Policies.', acct: 'Account Policies: Password Policy and Account Lockout Policy.', local: 'Local Policies: Audit Policy, User Rights Assignment, and Security Options.' }[cur];
        right.append(h('p', null, n || 'This area is not used in this lab.'));
      }
      w.body.append(h('div', { class: 'two-pane' }, h('div', { class: 'pane-nav' }, tr.el), h('div', { class: 'pane-main' }, right)));
      tr.select('pw'); tr.expand('acct', true);
      render();
    }
  });

  /* ---------------- Windows Defender Firewall ---------------- */
  const ALLOWED = [['Cast to Device functionality', 'Yes', 'Yes'], ['Core Networking', 'Yes', 'Yes'], ['Core Networking Diagnostics', 'No', 'No'], ['File and Printer Sharing', 'No', 'No'], ['Microsoft Edge', 'Yes', 'Yes'], ['Network Discovery', 'Yes', 'No'], ['Remote Desktop', 'No', 'No'], ['Windows Defender Firewall Remote Management', 'No', 'No']];
  Win.registerApp('firewall', {
    title: 'Windows Defender Firewall', keywords: ['firewall', 'windows defender firewall', 'windows firewall'], kind: 'Control Panel item', single: true,
    create(w) {
      w.body.append(h('h4', null, 'Help protect your PC with Windows Defender Firewall'),
        h('p', null, 'Windows Defender Firewall can help prevent hackers or malicious software from gaining access to your PC through the internet or a network.'),
        h('ul', { class: 'cp-list', 'aria-label': 'Tasks' },
          h('li', null, h('button', { type: 'button', class: 'link', onclick: allowApps }, 'Allow an app or feature through Windows Defender Firewall')),
          h('li', null, h('button', { type: 'button', class: 'link', onclick: () => Win.alertBox('Windows Defender Firewall', 'Notification settings are not changed in this lab.') }, 'Change notification settings')),
          h('li', null, h('button', { type: 'button', class: 'link', onclick: () => Win.alertBox('Windows Defender Firewall', 'Leave the firewall on. Turning it off removes this protection for every app and network.') }, 'Turn Windows Defender Firewall on or off')),
          h('li', null, h('button', { type: 'button', class: 'link', onclick: () => Win.openApp('wfas') }, 'Advanced settings'))),
        h('h5', null, 'Private networks: Connected'),
        h('dl', { class: 'kv' }, h('dt', null, 'Windows Defender Firewall state'), h('dd', null, 'On'), h('dt', null, 'Incoming connections'), h('dd', null, 'Block all connections to apps that are not on the list of allowed apps'), h('dt', null, 'Active private networks'), h('dd', null, 'Network'), h('dt', null, 'Notification state'), h('dd', null, 'Notify me when Windows Defender Firewall blocks a new app')),
        h('h5', null, 'Guest or public networks: Not connected'));
    }
  });
  function allowApps() {
    const g = Win.grid({ caption: 'Allowed apps and features', cols: [{ key: 'n', label: 'Name' }, { key: 'pr', label: 'Private' }, { key: 'pu', label: 'Public' }], key: 'n', rows: ALLOWED.map(a => ({ n: a[0], pr: a[1], pu: a[2] })) });
    Win.dialog({ title: 'Allowed apps', wide: true, body: h('div', null, h('p', null, 'Allow apps to communicate through Windows Defender Firewall. Yes means the app or feature is allowed on that network type. To change a setting you would choose Change settings; in this lab you only review the list.'), g.el),
      buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] }).then(() => T('fwallow'));
  }
  const BUILTIN = [
    { name: 'Cast to Device functionality (qWave-TCP-In)', group: 'Cast to Device functionality', profiles: ['Private', 'Public'], enabled: true, action: 'allow', protocol: 'TCP' },
    { name: 'Core Networking - Destination Unreachable (ICMPv6-In)', group: 'Core Networking', profiles: ['Domain', 'Private', 'Public'], enabled: true, action: 'allow', protocol: 'ICMPv6', icmp: ['Destination Unreachable'] },
    { name: 'Core Networking Diagnostics - ICMP Echo Request (ICMPv4-In)', group: 'Core Networking Diagnostics', profiles: ['Private', 'Public'], enabled: false, action: 'allow', protocol: 'ICMPv4', icmp: ['Echo Request'] },
    { name: 'File and Printer Sharing (Echo Request - ICMPv4-In)', group: 'File and Printer Sharing', profiles: ['Private', 'Public'], enabled: false, action: 'allow', protocol: 'ICMPv4', icmp: ['Echo Request'] },
    { name: 'Microsoft Edge (mDNS-In)', group: 'Microsoft Edge', profiles: ['Domain', 'Private', 'Public'], enabled: true, action: 'allow', protocol: 'UDP' },
    { name: 'Network Discovery (NB-Name-In)', group: 'Network Discovery', profiles: ['Private'], enabled: true, action: 'allow', protocol: 'UDP' },
    { name: 'Remote Desktop - User Mode (TCP-In)', group: 'Remote Desktop', profiles: ['Domain', 'Private', 'Public'], enabled: false, action: 'allow', protocol: 'TCP' }
  ];
  fw.rules.push(...BUILTIN);
  const ICMP = ['Packet Too Big', 'Destination Unreachable', 'Source Quench', 'Redirect', 'Echo Request', 'Echo Reply', 'Router Advertisement', 'Router Solicitation', 'Time Exceeded', 'Parameter Problem', 'Timestamp Request', 'Address Mask Request'];
  Win.registerApp('wfas', {
    title: 'Windows Defender Firewall with Advanced Security', keywords: ['wf.msc', 'advanced security', 'firewall advanced', 'windows defender firewall with advanced security'], kind: 'Windows Tools app', single: true, requiresAdmin: true,
    proc: { name: 'mmc.exe', desc: 'Microsoft Management Console', tmName: 'Microsoft Management Console', mem: 24000 },
    create(w) {
      const right = h('div', { class: 'panel', role: 'region', 'aria-label': 'Details' });
      let cur = 'in';
      const tr = Win.tree({ label: 'Firewall tree', nodes: [{ id: 'root', label: 'Windows Defender Firewall with Advanced Security on Local Computer', expanded: true, children: [{ id: 'in', label: 'Inbound Rules' }, { id: 'out', label: 'Outbound Rules' }, { id: 'csr', label: 'Connection Security Rules' }, { id: 'mon', label: 'Monitoring' }] }], onSelect: n => { cur = n.id; render(); } });
      function render() {
        right.textContent = '';
        if (cur === 'in') {
          const g = Win.grid({ caption: 'Inbound Rules', cols: [{ key: 'name', label: 'Name' }, { key: 'group', label: 'Group' }, { key: 'prof', label: 'Profile' }, { key: 'en', label: 'Enabled' }, { key: 'act', label: 'Action' }], key: 'name', sortable: false,
            rows: fw.rules.map(r => ({ name: r.name, group: r.group || '', prof: r.profiles.length === 3 ? 'All' : r.profiles.join(', '), en: r.enabled ? 'Yes' : 'No', act: r.action === 'allow' ? 'Allow' : 'Block', ref: r })),
            onOpen: r => props(r.ref), onContext: (r, b) => Win.popMenu(b, menu(r.ref), 'Rule actions') });
          const menu = r => [{ label: r.enabled ? 'Disable Rule' : 'Enable Rule', action: () => { r.enabled = !r.enabled; render(); announce(`${r.name}: ${r.enabled ? 'enabled' : 'disabled'}.`); } }, { label: 'Delete', disabled: !r.custom, action: async () => { if (await Win.confirmBox('Windows Defender Firewall with Advanced Security', 'Are you sure you want to delete these rules?')) { fw.rules.splice(fw.rules.indexOf(r), 1); render(); announce('Rule deleted.'); } } }, { label: 'Properties', action: () => props(r) }];
          const actions = h('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, 'Actions for selected rule');
          actions.addEventListener('click', () => { const r = g.selected; if (!r) { announce('Select a rule first.'); return; } Win.popMenu(actions, menu(r.ref), 'Rule actions'); });
          right.append(h('h4', null, 'Inbound Rules'), h('div', { class: 'toolbar', role: 'group', 'aria-label': 'Actions' }, h('button', { type: 'button', onclick: newRule }, 'New Rule...'), actions), g.el);
          return;
        }
        if (cur === 'mon') {
          right.append(h('h4', null, 'Monitoring'), h('p', null, 'Private Profile is Active.'), h('dl', { class: 'kv' }, h('dt', null, 'Windows Defender Firewall'), h('dd', null, 'On'), h('dt', null, 'Inbound connections that do not match a rule'), h('dd', null, 'Blocked'), h('dt', null, 'Outbound connections that do not match a rule'), h('dd', null, 'Allowed')),
            h('h5', null, 'Active inbound rules for the Private profile'), h('ul', null, ...fw.rules.filter(r => r.enabled && r.profiles.includes('Private')).map(r => h('li', null, `${r.name} (${r.action === 'allow' ? 'Allow' : 'Block'})`))));
          return;
        }
        right.append(h('p', null, { root: 'Windows Defender Firewall is on for the Private profile (active) and blocks inbound connections that do not match a rule. Choose Inbound Rules to work with rules.', out: 'Outbound rules are not changed in this lab.', csr: 'Connection security rules are not used in this lab.' }[cur]));
      }
      function props(r) {
        Win.alertBox(`${r.name} Properties`, `Enabled: ${r.enabled ? 'Yes' : 'No'}. Action: ${r.action === 'allow' ? 'Allow the connection' : 'Block the connection'}. Protocol: ${r.protocol}${r.icmp ? ', ICMP types: ' + (r.icmp === 'all' ? 'All' : r.icmp.join(', ')) : ''}. Profiles: ${r.profiles.join(', ')}. Programs: All programs. Remote addresses: Any.`);
      }
      function newRule() {
        const d = { type: 'custom', program: 'all', protocol: 'Any', icmp: 'all', action: 'allow', profiles: { Domain: true, Private: true, Public: true }, name: '', desc: '' };
        Win.wizard({ title: 'New Inbound Rule Wizard', finishLabel: 'Finish', data: d, pages: [
          { title: 'Rule Type', render: (b, d) => b.append(Win.radios('rt', 'What type of rule would you like to create?', [{ value: 'program', label: 'Program: rule that controls connections for a program' }, { value: 'port', label: 'Port: rule that controls connections for a TCP or UDP port' }, { value: 'predefined', label: 'Predefined: rule that controls connections for a Windows experience' }, { value: 'custom', label: 'Custom: custom rule' }], d.type, v => { d.type = v; })),
            validate: d => d.type === 'custom' ? null : 'This simulation builds the Custom rule from the lab. Choose Custom.' },
          { title: 'Program', render: (b, d) => b.append(Win.radios('rp', 'Does this rule apply to all programs or a specific program?', [{ value: 'all', label: 'All programs' }, { value: 'path', label: 'This program path (not used in this lab)' }], d.program, v => { d.program = v; })), validate: d => d.program === 'all' ? null : 'Choose All programs for this rule.' },
          { title: 'Protocol and Ports', render: (b, d) => {
            const sum = h('p', { role: 'status' });
            const cust = h('button', { type: 'button', class: 'secondary' }, 'Customize...');
            const upd = () => { const icmpP = /^ICMP/.test(d.protocol); cust.disabled = !icmpP; sum.textContent = icmpP ? `ICMP settings: ${d.icmp === 'all' ? 'All ICMP types' : 'Specific types: ' + (d.icmp.join(', ') || 'none')}.` : d.protocol === 'Any' ? 'Any protocol, all ports.' : `${d.protocol}, all ports.`; };
            cust.addEventListener('click', () => {
              let mode = d.icmp === 'all' ? 'all' : 'specific';
              const picks = new Set(d.icmp === 'all' ? [] : d.icmp);
              const list = h('fieldset', null, h('legend', null, 'Specific ICMP types'), ...ICMP.map(t => Win.checkbox(t, picks.has(t), v => { v ? picks.add(t) : picks.delete(t); })));
              const err = h('p', { class: 'dlg-error', role: 'alert' });
              Win.dialog({ title: 'Customize ICMP Settings', wide: true, body: h('div', null, h('p', null, 'Apply this rule to the following Internet Control Message Protocol (ICMP) connections:'), Win.radios('icm', 'ICMP types', [{ value: 'all', label: 'All ICMP types' }, { value: 'specific', label: 'Specific ICMP types' }], mode, v => { mode = v; }), list, err),
                buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }], validate: () => mode === 'specific' && !picks.size ? 'Select at least one ICMP type, or choose All ICMP types.' : null })
                .then(r => { if (r.value === 'ok') { d.icmp = mode === 'all' ? 'all' : ICMP.filter(t => picks.has(t)); upd(); announce(sum.textContent); } });
            });
            b.append(Win.select('Protocol type', ['Any', 'ICMPv4', 'ICMPv6', 'TCP', 'UDP', 'IGMP', 'GRE'].map(v => ({ value: v, label: v })), d.protocol, v => { d.protocol = v; d.icmp = 'all'; upd(); }), h('p', null, 'Internet Control Message Protocol (ICMP) settings:'), h('div', { class: 'toolbar' }, cust), sum);
            upd();
          } },
          { title: 'Scope', render: b => b.append(h('p', null, 'Which local IP addresses does this rule apply to? Any IP address.'), h('p', null, 'Which remote IP addresses does this rule apply to? Any IP address.')) },
          { title: 'Action', render: (b, d) => b.append(Win.radios('ra', 'What action should be taken when a connection matches the specified conditions?', [{ value: 'allow', label: 'Allow the connection' }, { value: 'secure', label: 'Allow the connection if it is secure' }, { value: 'block', label: 'Block the connection' }], d.action, v => { d.action = v; })) },
          { title: 'Profile', render: (b, d) => b.append(h('fieldset', null, h('legend', null, 'When does this rule apply?'), Win.checkbox('Domain: applies when the computer is connected to its corporate domain', d.profiles.Domain, v => { d.profiles.Domain = v; }), Win.checkbox('Private: applies when the computer is connected to a private network, such as home or work', d.profiles.Private, v => { d.profiles.Private = v; }), Win.checkbox('Public: applies when the computer is connected to a public network', d.profiles.Public, v => { d.profiles.Public = v; }))),
            validate: d => Object.values(d.profiles).some(Boolean) ? null : 'Select at least one profile.' },
          { title: 'Name', render: (b, d) => { const n = h('input', { type: 'text', value: d.name, autocomplete: 'off' }); n.addEventListener('input', () => { d.name = n.value; }); const ds = h('textarea', { rows: '2' }); ds.value = d.desc; ds.addEventListener('input', () => { d.desc = ds.value; }); b.append(Win.field('Name', n), Win.field('Description (optional)', ds)); },
            validate: d => d.name.trim() ? null : 'Enter a name for the rule.' }
        ], onFinish: d => {
          const r = { name: d.name.trim(), group: '', profiles: Object.keys(d.profiles).filter(k => d.profiles[k]), enabled: true, action: d.action === 'block' ? 'block' : 'allow', protocol: d.protocol, icmp: /^ICMP/.test(d.protocol) ? d.icmp : null, custom: true };
          fw.rules.unshift(r); render();
          announce(`Rule ${r.name} created and enabled. It is at the top of Inbound Rules.`);
          if (r.protocol === 'ICMPv4' && r.action === 'allow' && (r.icmp === 'all' || r.icmp.includes('Echo Request')) && r.profiles.includes('Private') && !r.profiles.includes('Public')) T('rule');
          else Win.alertBox('Check the rule', `The rule was created, but it does not match the lab: ${[r.protocol !== 'ICMPv4' ? 'the protocol should be ICMPv4' : '', r.action !== 'allow' ? 'the action should be Allow the connection' : '', r.profiles.includes('Public') ? 'Public should be cleared' : '', !r.profiles.includes('Private') ? 'Private must be checked, because this PC is on a private network' : ''].filter(Boolean).join('; ') || 'check the ICMP types (Echo Request)'}. You can disable or delete it and create another.`);
        } });
      }
      w.body.append(h('div', { class: 'two-pane' }, h('div', { class: 'pane-nav' }, tr.el), h('div', { class: 'pane-main' }, right)));
      tr.select('in');
      render();
    }
  });

  Win.desktop(document.getElementById('sim'), { computer: 'DESKTOP-OSB01', user: 'CyberOpsUser', ui: { tbItems: [{ label: 'Oracle VirtualBox', app: 'vbox' }, { label: 'Task Manager', app: 'taskmgr' }] } });
})();
