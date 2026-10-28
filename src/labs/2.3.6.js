/* Lab 2.3.6: Linux Servers */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '2.3.6', title: 'Lab 2.3.6 Linux Servers', onReset: () => location.reload(),
    tasks: [
      { id: 'psef', label: 'List every process with sudo ps -elf' },
      { id: 'nginx', label: 'Start nginx with sudo /usr/sbin/nginx' },
      { id: 'tree', label: 'Show the process tree with sudo ps -ejH' },
      { id: 'netstat', label: 'Run netstat with no options' },
      { id: 'man', label: 'Read the netstat manual page' },
      { id: 'tunap', label: 'Run sudo netstat -tunap' },
      { id: 'grep', label: 'Filter ps output for the nginx PID with grep' },
      { id: 't80', label: 'Use telnet to talk to the server on port 80' },
      { id: 't22', label: 'Use telnet to talk to the server on port 22' },
      { id: 't68', label: 'Try telnet on port 68' }
    ]
  });
  const L = Linux;
  L.baseImage();
  L.S.nginxPid = 395;
  L.on('cmd', ({ words, sudo, line }) => {
    const w = words[0] || [];
    const f = w.slice(1).join('').replace(/-/g, '');
    if (w[0] === 'ps' && /^(elf|ef|efl|lef)$/.test(f) && sudo && words.length === 1) T('psef');
    if (w[0] === 'ps' && /^ejH$/i.test(f) && sudo) T('tree');
    if (w[0] === 'netstat' && w.length === 1) T('netstat');
    if (w[0] === 'netstat' && sudo && ['t', 'u', 'n', 'a', 'p'].every(c => f.includes(c))) T('tunap');
    if (words.length > 1 && w[0] === 'ps' && words[1][0] === 'grep' && L.nginx.running && words[1].includes(String(L.nginx.master))) T('grep');
  });
  L.on('nginx:start', () => T('nginx'));
  L.on('man', ({ topic }) => { if (topic === 'netstat') T('man'); });
  L.on('telnet:data', ({ port }) => { if (port === 80) T('t80'); if (port === 22) T('t22'); });
  L.on('telnet', ({ port, refused }) => { if (port === 68 && refused) T('t68'); });
  L.desktop(document.getElementById('sim'));
})();
