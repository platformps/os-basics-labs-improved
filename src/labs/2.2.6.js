/* Lab 2.2.6: Working with Text Files in the CLI */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '2.2.6', title: 'Lab 2.2.6 Working with Text Files in the CLI', onReset: () => location.reload(),
    tasks: [
      { id: 'save', label: 'Create space.txt in SciTE and save it in your home folder' },
      { id: 'reopen', label: 'Reopen space.txt in SciTE using the All Files filter' },
      { id: 'sciteterm', label: 'Open space.txt in SciTE from the terminal, then end it' },
      { id: 'nano', label: 'Open space.txt in nano and find the line continuation mark' },
      { id: 'nanohelp', label: "Open and close nano's help" },
      { id: 'hidden', label: 'List hidden files with ls -la' },
      { id: 'bashrc', label: 'Display .bashrc with cat' },
      { id: 'etc', label: 'List /etc and display /etc/bash.bashrc' },
      { id: 'red', label: 'Change the prompt color to red in SciTE' },
      { id: 'newterm', label: 'Open a new terminal and see the red prompt' },
      { id: 'yellow', label: 'Change the prompt to yellow with nano and reload it with bash' },
      { id: 'conf', label: 'Change custom_server.conf to port 8080 and the text_ed_lab folder' },
      { id: 'start', label: 'Start nginx with custom_server.conf' },
      { id: 'browse', label: 'Open 127.0.0.1:8080 in Firefox and read the nginx message' },
      { id: 'stop', label: 'Stop nginx and confirm the page no longer loads' },
      { id: 'challenge', label: 'Challenge: open custom_server.conf in SciTE as root' }
    ]
  });
  Linux.baseImage();
  const home = '/home/analyst';
  const L = Linux;

  L.on('scite:save', ({ path, content, user }) => {
    if (path === home + '/space.txt' && content.trim().length > 20) T('save');
    if (path === home + '/.bashrc' && /\\e\[1;31m/.test(content)) T('red');
  });
  let filterAll = false;
  L.on('scite:filter', ({ filter }) => { filterAll = filter === 'all'; });
  L.on('scite:open', ({ path }) => { if (path === home + '/space.txt' && filterAll) T('reopen'); });
  L.on('scite:start', ({ path, user }) => { if (user === 'root' && path === '/etc/nginx/custom_server.conf') T('challenge'); });
  let sciteBusy = false;
  L.on('scite:terminal', () => { sciteBusy = true; });
  L.on('cmd', ({ words, sh }) => {
    const w = words[words.length - 1] || [];
    const all = words.map(x => x.join(' '));
    if (w[0] === 'scite' && /space\.txt/.test(w.join(' '))) T('sciteterm');
    if (w[0] === 'ls' && w.some(a => /^-\w*a/.test(a))) T('hidden');
    if (w[0] === 'cat' && w.some(a => /(^|\/)\.bashrc$/.test(a))) T('bashrc');
    if (w[0] === 'ls' && w.includes('/etc')) etcList = true;
    if (w[0] === 'cat' && w.includes('/etc/bash.bashrc') && etcList) T('etc');
    if (w[0] === 'pkill' && w.includes('nginx') && Lab.isDone('start')) stopped = true;
  });
  let etcList = false, stopped = false;
  L.on('nano:start', ({ path }) => { if (path === home + '/space.txt') T('nano'); });
  L.on('nano:help', () => T('nanohelp'));
  L.on('terminal:open', ({ sh }) => { if (sh.color.code === 31) T('newterm'); });
  L.on('bash:reload', ({ color }) => { if (color.code === 33) T('yellow'); });
  L.on('nano:save', ({ path, content }) => {
    if (path === '/etc/nginx/custom_server.conf') {
      const lines = content.split('\n');
      const okPort = /^\s*listen\s+8080;/.test(lines[38] || '') || /listen\s+8080;/.test(content);
      const okRoot = /root\s+\/usr\/share\/nginx\/html\/text_ed_lab\/?;/.test(content);
      if (okPort && okRoot) T('conf');
      else Lab.announce(`custom_server.conf saved. ${okPort ? 'The port is 8080.' : 'The listen line does not say 8080 with a semicolon yet.'} ${okRoot ? 'The folder is text_ed_lab.' : 'The root line does not point to /usr/share/nginx/html/text_ed_lab yet.'}`);
    }
  });
  L.on('nginx:start', ({ port, root }) => { if (port === 8080 && /text_ed_lab$/.test(root)) T('start'); });
  L.on('nginx:error', ({ path }) => { if (path === '/favicon.ico' && L.nginx.port === 8080) T('browse'); });
  L.on('browser:load', ({ port, ok }) => { if (port === 8080 && !ok && stopped) T('stop'); });

  L.desktop(document.getElementById('sim'));
})();
