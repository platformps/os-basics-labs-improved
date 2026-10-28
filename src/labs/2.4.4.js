/* Lab 2.4.4: Locating Log Files */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '2.4.4', title: 'Lab 2.4.4 Locating Log Files', onReset: () => location.reload(),
    tasks: [
      { id: 'tutorial', label: 'Read the web server log logstash-tutorial.log' },
      { id: 'messages', label: 'Read /var/log/messages with sudo' },
      { id: 'man', label: 'Read the nginx manual page' },
      { id: 'ps', label: 'Confirm nginx is running with ps and grep' },
      { id: 'etc', label: 'Find the nginx configuration folder in /etc' },
      { id: 'conf', label: 'Read /etc/nginx/nginx.conf' },
      { id: 'varlog', label: 'List /var/log' },
      { id: 'nginxlogs', label: 'List /var/log/nginx with sudo' },
      { id: 'tail', label: 'Show the end of the nginx access log with tail and tail -n 5' },
      { id: 'tailf', label: 'Follow the access log with tail -f and see a new entry from Firefox' },
      { id: 'journal', label: 'Run journalctl as analyst, then with sudo' },
      { id: 'boots', label: 'Show entries for the current and earlier boots with -b' },
      { id: 'listboots', label: 'List boots with --list-boots' },
      { id: 'since', label: 'Filter by time with --since' },
      { id: 'unit', label: 'Show nginx entries with -u nginx.service' },
      { id: 'follow', label: 'Follow nginx entries with -f and see the favicon error' }
    ]
  });
  const L = Linux;
  L.baseImage();
  const R = { uid: 'root', gid: 'log', mode: 0o640 };

  /* ---------------- log files ---------------- */
  const tut = [
    ['83.149.9.216', '04/Jan/2015:05:13:42 +0000', 'GET /presentations/logstash-monitorama-2013/images/kibana-search.png HTTP/1.1', 200, 203023],
    ['83.149.9.216', '04/Jan/2015:05:13:42 +0000', 'GET /presentations/logstash-monitorama-2013/images/kibana-dashboard3.png HTTP/1.1', 200, 171717],
    ['83.149.9.216', '04/Jan/2015:05:13:44 +0000', 'GET /presentations/logstash-monitorama-2013/plugin/highlight/highlight.js HTTP/1.1', 200, 26185],
    ['83.149.9.216', '04/Jan/2015:05:13:44 +0000', 'GET /presentations/logstash-monitorama-2013/plugin/zoom-js/zoom.js HTTP/1.1', 200, 7697],
    ['24.236.252.67', '04/Jan/2015:05:14:10 +0000', 'GET /favicon.ico HTTP/1.1', 200, 3638],
    ['93.114.45.13', '04/Jan/2015:05:14:32 +0000', 'GET /articles/dynamic-dns-with-dhcp/ HTTP/1.1', 200, 18848]];
  const uaMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.77 Safari/537.36';
  L.put('/var/log/logstash-tutorial.log', tut.map(r => `${r[0]} - - [${r[1]}] "${r[2]}" ${r[3]} ${r[4]} "http://semicomplete.com/presentations/logstash-monitorama-2013/" "${r[0] === '24.236.252.67' ? 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:26.0) Gecko/20100101 Firefox/26.0' : uaMac}"`).join('\n') + '\n', { uid: 'analyst', gid: 'analyst', mtime: 'Apr 19 10:05' });
  const msgs = [
    'Mar 20 08:34:38 secOps kernel: [    6.149910] random: crng init done',
    'Mar 20 08:34:40 secOps kernel: [    8.280667] floppy0: no floppy controllers found',
    'Mar 20 08:34:40 secOps kernel: [    8.280724] work still pending',
    'Mar 20 08:35:16 secOps kernel: [   44.414695] hrtimer: interrupt took 5346452 ns',
    'Mar 22 06:01:40 secOps kernel: [    0.000000] Linux version 4.8.12-2-ARCH (builduser@andyrtr) (gcc version 6.2.1 20160830 (GCC) ) #1 SMP PREEMPT Fri Dec 2 20:41:47 CET 2016',
    'Mar 22 06:01:40 secOps kernel: [    0.000000] x86/fpu: Supporting XSAVE feature 0x001: \'x87 floating point registers\'',
    'May 19 03:58:02 secOps kernel: [12044.115307] e1000: enp0s3 NIC Link is Up 1000 Mbps Full Duplex, Flow Control: RX',
    'May 19 04:12:44 secOps kernel: [12926.020151] perf: interrupt took too long (2508 > 2500), lowering kernel.perf_event_max_sample_rate to 79500',
    'May 19 04:19:53 secOps kernel: [13355.380012] pcnet32 0000:00:03.0 enp0s3: link down',
    'May 19 04:19:57 secOps kernel: [13359.220734] pcnet32 0000:00:03.0 enp0s3: link up, 100Mbps, full-duplex',
    'May 19 04:20:01 secOps kernel: [13363.351102] pcnet32 0000:00:03.0 enp0s3: link down',
    'May 19 04:20:09 secOps kernel: [13371.241950] pcnet32 0000:00:03.0 enp0s3: link up, 100Mbps, full-duplex',
    'May 19 04:20:19 secOps kernel: [13381.264018] pcnet32 0000:00:03.0 enp0s3: link down',
    'May 19 04:20:23 secOps kernel: [13385.314709] pcnet32 0000:00:03.0 enp0s3: link up, 100Mbps, full-duplex',
    'May 19 04:21:23 secOps kernel: [13445.366001] pcnet32 0000:00:03.0 enp0s3: link down',
    'May 19 04:21:27 secOps kernel: [13449.204281] pcnet32 0000:00:03.0 enp0s3: link up, 100Mbps, full-duplex',
    'May 19 04:35:10 secOps kernel: [14272.902117] usb 1-1: new full-speed USB device number 2 using ohci-pci'];
  L.put('/var/log/messages', msgs.join('\n') + '\n', Object.assign({ mtime: 'May 19 10:05', size: 1673153 }, R));
  [['auth.log', 188962], ['daemon.log', 849038], ['errors.log', 4416], ['everything.log', 1819814], ['kernel.log', 927701], ['syslog.log', 563], ['user.log', 216]].forEach(([n, s]) => L.put('/var/log/' + n, '', Object.assign({ size: s, mtime: 'Apr 19 10:05' }, R)));
  [['btmp', 384, 0o660, 'utmp'], ['wtmp', 70272, 0o664, 'utmp'], ['lastlog', 292292, 0o664, 'utmp'], ['faillog', 32032, 0o600, 'root'], ['tallylog', 64064, 0o600, 'root'], ['pacman.log', 97655, 0o644, 'root'], ['Xorg.0.log', 24756, 0o644, 'root'], ['Xorg.0.log.old', 25585, 0o644, 'root']].forEach(([n, s, m, g]) => L.put('/var/log/' + n, '', { size: s, mode: m, gid: g, mtime: 'Apr 19 09:45' }));
  L.ensureDir('/var/log/journal', { gid: 'systemd-journal' }); L.ensureDir('/var/log/old'); L.ensureDir('/var/log/snort', { uid: 'snort', gid: 'snort' });
  L.put('/var/log/nginx-logstash.log', '', { uid: 'http', gid: 'root', size: 989, mtime: 'Apr 19 10:05' });
  const ngdir = L.stat('/var/log/nginx', { user: 'root', cwd: '/' }); ngdir.uid = 'http'; ngdir.gid = 'log'; ngdir.mode = 0o750;
  const now = new Date();
  const ago = m => new Date(now.getTime() - m * 60000);
  const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0';
  const st = d => `${String(d.getDate()).padStart(2, '0')}/${d.toLocaleString('en-US', { month: 'short' })}/${d.getFullYear()}:${d.toTimeString().slice(0, 8)} -0400`;
  const acc = [[1500, '/', 200, 612], [1499, '/favicon.ico', 404, 153], [1440, '/', 304, 0], [1439, '/', 304, 0], [1200, '/', 200, 612], [1199, '/favicon.ico', 404, 153], [600, '/', 304, 0], [180, '/', 200, 612], [179, '/favicon.ico', 404, 153], [90, '/', 304, 0], [89, '/index.html', 200, 612], [60, '/', 304, 0]];
  L.put(L.accessLog, acc.map(([m, p, s, b]) => `127.0.0.1 - - [${st(ago(m))}] "GET ${p} HTTP/1.1" ${s} ${b} "-" "${ua}"`).join('\n') + '\n', { uid: 'http', gid: 'log', mode: 0o640, mtime: L.fmtNow() });
  [['access.log.1.gz', 175, 'Oct  1 09:42'], ['access.log.2.gz', 593, 'Sep 24 16:58'], ['access.log.3.gz', 193, 'Sep 17 11:20'], ['access.log.4.gz', 425, 'Sep 10 08:05']].forEach(([n, s, d]) => L.put('/var/log/nginx/' + n, '', { uid: 'http', gid: 'log', mode: 0o640, size: s, mtime: d }));

  /* ---------------- journal ---------------- */
  const hex = () => Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const bootAt = [60 * 24 * 21, 60 * 24 * 14, 60 * 24 * 7, 60 * 24 * 2, 60 * 26, 180];
  bootAt.forEach((m, i) => {
    const start = ago(m), end = i < bootAt.length - 1 ? new Date(start.getTime() + 6 * 3600e3) : null;
    const E = (off, proc, msg, unit, user) => ({ t: new Date(start.getTime() + off * 1000), proc, msg, unit, user });
    const nPid = 390 + i * 3;
    const entries = [
      E(0, 'kernel', 'Linux version 4.8.12-2-ARCH (builduser@andyrtr) (gcc version 6.2.1 20160830 (GCC) ) #1 SMP PREEMPT Fri Dec 2 20:41:47 CET 2016'),
      E(0, 'kernel', 'x86/fpu: Supporting XSAVE feature 0x001: \'x87 floating point registers\''),
      E(1, 'systemd-journald[169]', 'Time spent on flushing to /var is 849us for 0 entries.'),
      E(3, 'systemd[1]', 'Started Rotate log files.'),
      E(4, 'ovsdb-server[263]', 'ovs|00001|ovsdb_server|INFO|ovsdb-server (Open vSwitch) 2.6.1'),
      E(6, 'systemd[1]', 'Starting A high performance web server and a reverse proxy server...', 'nginx.service'),
      E(6, `nginx[${nPid}]`, `${start.getFullYear()}/${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')} ${new Date(start.getTime() + 6000).toTimeString().slice(0, 8)} [warn] ${nPid}#${nPid}: conflicting server name "localhost" on 0.0.0.0:80, ignored`, 'nginx.service'),
      E(6, 'systemd[1]', 'nginx.service: PID file /run/nginx.pid not readable (yet?) after start: No such file or directory', 'nginx.service'),
      E(7, 'systemd[1]', 'Started A high performance web server and a reverse proxy server.', 'nginx.service'),
      E(20, 'lightdm[1640]', 'pam_unix(lightdm-autologin:session): session opened for user analyst by (uid=0)'),
      E(24, 'xfce4-session[1700]', 'xfce4-session: Started the analyst desktop session.', null, 'analyst'),
      E(26, 'systemd[1090]', 'Reached target Paths.', null, 'analyst'),
      E(26, 'systemd[1090]', 'Reached target Timers.', null, 'analyst')
    ];
    for (let k = 1; k <= (end ? 10 : 6); k++) entries.push(E(k * 1800, 'filebeat[222]', `${new Date(start.getTime() + k * 1800e3).toISOString().replace('T', ' ').slice(0, 23)} logp.go:232: INFO No non-zero metrics in the last 30s`));
    if (end) entries.push(E(6 * 3600 - 5, 'systemd[1]', 'Stopping A high performance web server and a reverse proxy server...', 'nginx.service'), E(6 * 3600 - 4, 'systemd[1]', 'Stopped A high performance web server and a reverse proxy server.', 'nginx.service'));
    entries.sort((a, b) => a.t - b.t);
    L.journal.boots.push({ id: hex(), start, end, entries });
  });
  L.bootNginx(415, 416);
  L.on('cmd', ({ words, sudo, line, sh }) => { if (sudo) L.journalAdd('sudo[' + (3900 + Math.floor(Math.random() * 90)) + ']', `analyst : TTY=${sh.tty} ; PWD=${sh.cwd} ; USER=root ; COMMAND=${line.replace(/^sudo\s+/, '')}`); });

  /* ---------------- tasks ---------------- */
  let tailing = false, journalUser = false, boot0 = false, bootPrev = false, sinceN = 0, journalFollow = false;
  L.on('cmd', ({ words, sudo, line }) => {
    const w = words[0] || [];
    const has = re => re.test(line);
    if (/^(cat|more|less)$/.test(w[0]) && w.includes('/var/log/logstash-tutorial.log')) T('tutorial');
    if (/^(cat|more|less)$/.test(w[0]) && w.includes('/var/log/messages') && sudo) T('messages');
    if (w[0] === 'ps' && words[1] && words[1][0] === 'grep' && words[1].includes('nginx')) T('ps');
    if (w[0] === 'ls' && w.some(a => /^\/etc\/nginx\/?$/.test(a))) T('etc');
    if (/^(cat|more|less)$/.test(w[0]) && w.includes('/etc/nginx/nginx.conf')) T('conf');
    if (w[0] === 'ls' && w.some(a => /^\/var\/log\/?$/.test(a))) T('varlog');
    if (w[0] === 'ls' && sudo && w.some(a => /^\/var\/log\/nginx\/?$/.test(a))) T('nginxlogs');
    if (w[0] === 'tail' && sudo && w.includes(L.accessLog) && !w.includes('-f')) { if (has(/-n\s*5\b/)) tailN = true; else tailPlain = true; if (tailN && tailPlain) T('tail'); }
    if (w[0] === 'journalctl') {
      if (!sudo) journalUser = true;
      if (sudo && journalUser && w.length === 1) T('journal');
      const bi = w.indexOf('-b');
      if (sudo && bi >= 0) { if (!w[bi + 1] || w[bi + 1] === '0') boot0 = true; else bootPrev = true; if (boot0 && bootPrev) T('boots'); }
      if (sudo && w.includes('--list-boots')) T('listboots');
      if (sudo && w.includes('--since')) { sinceN++; T('since'); }
      if (sudo && w.includes('-u') && !w.includes('-f')) T('unit');
    }
  });
  let tailN = false, tailPlain = false;
  L.on('man', ({ topic }) => { if (topic === 'nginx') T('man'); });
  L.on('tail:follow', ({ path }) => { if (path === L.accessLog) tailing = true; });
  L.on('fs:write', ({ path }) => { if (path === L.accessLog && tailing && followingTerm()) T('tailf'); });
  L.on('journal:follow', ({ unit, user }) => { if (user === 'root' && unit && /nginx/.test(unit)) journalFollow = true; });
  L.on('journal:add', e => { if (journalFollow && e.unit === 'nginx.service' && /favicon/.test(e.msg) && followingTerm()) T('follow'); });
  function followingTerm() { return Win.S.windows.some(w => w.term && w.term.running); }
  L.desktop(document.getElementById('sim'));
})();
