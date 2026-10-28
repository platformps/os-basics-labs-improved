/* Lab 2.3.5: Use a Port Scanner to Detect Open Ports */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '2.3.5', title: 'Lab 2.3.5 Use a Port Scanner to Detect Open Ports', onReset: () => location.reload(),
    tasks: [
      { id: 'term', label: 'Open a terminal on the CSE-LABVM' },
      { id: 'basic', label: 'Scan localhost with nmap' },
      { id: 'udp', label: 'Scan UDP ports with sudo nmap -sU' },
      { id: 'sv', label: 'Detect service versions with nmap -sV' },
      { id: 'a', label: 'Read the SSH host keys with nmap -A' },
      { id: 'man', label: 'Open the Nmap manual page' }
    ]
  });
  const L = Linux;
  Object.assign(L.S, { user: 'cisco', host: 'labvm', home: '/home/cisco', sudoPw: 'password', vmName: 'CSE-LABVM virtual machine', promptStyle: 'ubuntu' });
  L.baseImage();
  L.listeners.length = 0;
  L.ensureDir('/home/cisco', { uid: 'cisco', gid: 'cisco' });
  ['Desktop', 'Documents', 'Downloads', 'lab.support.files'].forEach(d => L.ensureDir('/home/cisco/' + d, { uid: 'cisco', gid: 'cisco' }));
  L.put('/home/cisco/.bashrc', "# ~/.bashrc\nalias ls='ls --color=auto'\n", { uid: 'cisco', gid: 'cisco' });

  const tcp = [['22/tcp', 'open', 'ssh', 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.2 (Ubuntu Linux; protocol 2.0)'], ['23/tcp', 'open', 'telnet', 'Linux telnetd'], ['631/tcp', 'open', 'ipp', 'CUPS 2.3']];
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toTimeString().slice(0, 5)} UTC`; };
  const head = () => `Starting Nmap 7.80 ( https://nmap.org ) at ${stamp()}\nNmap scan report for localhost (127.0.0.1)\nHost is up (0.000035s latency).\nOther addresses for localhost (not scanned): ::1`;
  L.def('nmap', (args, ctx) => {
    const flags = args.filter(a => a.startsWith('-'));
    const targets = args.filter(a => !a.startsWith('-'));
    if (!targets.length && !flags.length) return { out: 'Nmap 7.80 ( https://nmap.org )\nUsage: nmap [Scan Type(s)] [Options] {target specification}\nSCAN TECHNIQUES:\n  -sS/sT/sA/sW/sM: TCP SYN/Connect()/ACK/Window/Maimon scans\n  -sU: UDP Scan\nSERVICE/VERSION DETECTION:\n  -sV: Probe open ports to determine service/version info\nMISC:\n  -A: Enable OS detection, version detection, script scanning, and traceroute' };
    const bad = flags.find(f => !['-sU', '-sV', '-A', '-sT', '-sS', '-v', '-p-', '-Pn'].includes(f) && !/^-p\d/.test(f));
    if (bad) { if (bad === '-su' || bad === '-sv' || bad === '-a') return { err: `Unrecognized option ${bad}. Options are case sensitive: did you mean ${bad === '-a' ? '-A' : bad.slice(0, 2) + bad[2].toUpperCase()}?\nQUITTING!`, code: 1 }; return { err: `nmap: unrecognized option '${bad}'\nSee the output of nmap -h for a summary of options.`, code: 1 }; }
    if (!targets.length) return { err: 'WARNING: No targets were specified, so 0 hosts scanned.\nNmap done: 0 IP addresses (0 hosts up) scanned in 0.03 seconds' };
    const tgt = targets[0];
    if (!['localhost', '127.0.0.1'].includes(tgt)) return { err: `Failed to resolve "${tgt}".\nWARNING: No targets were specified, so 0 hosts scanned.`, notes: ['This simulated virtual machine can only scan itself. Use localhost.'], code: 1 };
    if (flags.includes('-sU')) {
      if (ctx.user !== 'root') return { err: 'You requested a scan type which requires root privileges.\nQUITTING!', notes: ['A UDP scan sends raw packets, which only root can do. Run it again with sudo.'], code: 1 };
      L.emit('nmap', { kind: 'udp' });
      return { out: `${head()}\nNot shown: 998 closed ports\nPORT     STATE         SERVICE\n631/udp  open|filtered ipp\n5353/udp open|filtered zeroconf\n\nNmap done: 1 IP address (1 host up) scanned in 1.32 seconds`, table: { headers: ['PORT', 'STATE', 'SERVICE'], rows: [['631/udp', 'open|filtered', 'ipp'], ['5353/udp', 'open|filtered', 'zeroconf']], caption: 'Open UDP ports' } };
    }
    if (flags.includes('-A') || flags.includes('-sV')) {
      const isA = flags.includes('-A');
      let out = `${head()}\nNot shown: 997 closed ports\nPORT    STATE SERVICE VERSION\n`;
      out += `22/tcp  open  ssh     ${tcp[0][3]}\n`;
      if (isA) out += '| ssh-hostkey: \n|   3072 56:68:77:00:41:7f:50:17:5b:73:82:36:47:c4:bc:2d (RSA)\n|   256 0e:52:78:ba:08:2a:df:e5:be:1b:07:a7:98:3a:c8:50 (ECDSA)\n|_  256 f7:9e:03:10:96:94:cc:f4:4f:2a:f2:7c:6a:37:c1:6f (ED25519)\n';
      out += `23/tcp  open  telnet  ${tcp[1][3]}\n631/tcp open  ipp     ${tcp[2][3]}\n`;
      if (isA) out += '| http-robots.txt: 1 disallowed entry \n|_/\n|_http-server-header: CUPS/2.3 IPP/2.1\n|_http-title: Home - CUPS 2.3.1\n';
      out += 'Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel\n\nService detection performed. Please report any incorrect results at https://nmap.org/submit/ .\n' + `Nmap done: 1 IP address (1 host up) scanned in ${isA ? '13.37' : '6.34'} seconds`;
      L.emit('nmap', { kind: isA ? 'A' : 'sV' });
      const rows = tcp.map(r => r.slice());
      const table = { headers: ['PORT', 'STATE', 'SERVICE', 'VERSION'], rows, caption: 'Open TCP ports and service versions' };
      const res = { out, table };
      if (isA) res.notes = ['The ssh-hostkey lines list each SSH host key: its size in bits, its fingerprint, and its type in parentheses.'];
      return res;
    }
    L.emit('nmap', { kind: 'basic' });
    return { out: `${head()}\nNot shown: 997 closed ports\nPORT    STATE SERVICE\n22/tcp  open  ssh\n23/tcp  open  telnet\n631/tcp open  ipp\n\nNmap done: 1 IP address (1 host up) scanned in 0.04 seconds`, table: { headers: ['PORT', 'STATE', 'SERVICE'], rows: tcp.map(r => r.slice(0, 3)), caption: 'Open TCP ports' } };
  });
  L.MAN.nmap = `NMAP(1)                      Nmap Reference Guide                      NMAP(1)

NAME
       nmap - Network exploration tool and security / port scanner

SYNOPSIS
       nmap [Scan Type...] [Options] {target specification}

DESCRIPTION
       Nmap ("Network Mapper") is an open source tool for network exploration
       and security auditing. It uses raw IP packets to determine what hosts
       are available on the network, what services (application name and
       version) those hosts are offering, what operating systems they are
       running, and what type of packet filters or firewalls are in use.

OPTIONS
       -sU    UDP scan. Requires root privileges.
       -sV    Probe open ports to determine service and version info.
       -A     Enable OS detection, version detection, script scanning, and
              traceroute.
       -p <port ranges>
              Only scan the specified ports, for example -p22 or -p1-65535.

       By default, Nmap scans the 1,000 most common ports for each protocol.`;
  L.on('terminal:open', () => T('term'));
  L.on('nmap', ({ kind }) => { T({ basic: 'basic', udp: 'udp', sV: 'sv', A: 'a' }[kind]); });
  L.on('man', ({ topic }) => { if (topic === 'nmap') T('man'); });
  L.desktop(document.getElementById('sim'));
})();
