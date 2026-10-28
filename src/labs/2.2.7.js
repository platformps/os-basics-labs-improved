/* Lab 2.2.7: Getting Familiar with the Linux Shell */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '2.2.7', title: 'Lab 2.2.7 Getting Familiar with the Linux Shell', onReset: () => location.reload(),
    tasks: [
      { id: 'man', label: 'Read the man pages for man, cp, and pwd' },
      { id: 'pwd', label: 'Show the current directory with pwd' },
      { id: 'mkdirs', label: 'Create cyops_folder1, cyops_folder2, and cyops_folder3' },
      { id: 'cd3', label: 'Change to /home/analyst/cyops_folder3' },
      { id: 'tilde', label: 'Return home with cd ~' },
      { id: 'folder4', label: 'Create cyops_folder4 inside cyops_folder3' },
      { id: 'dots', label: 'Use cd . and cd .. from cyops_folder3' },
      { id: 'redirect', label: 'Write and then overwrite some_text_file.txt with >' },
      { id: 'append', label: 'Append a line with >>' },
      { id: 'hidden', label: 'Compare ls -l and ls -la in your home folder' },
      { id: 'manls', label: 'Read the man page for ls' },
      { id: 'cp', label: 'Copy some_text_file.txt into cyops_folder2' },
      { id: 'rm', label: 'Delete some_text_file.txt from your home folder' },
      { id: 'rmr', label: 'Delete cyops_folder1 with rm -r' },
      { id: 'mv', label: 'Move the file from cyops_folder2 back home' },
      { id: 'rm2', label: 'Delete cyops_folder2' }
    ]
  });
  const L = Linux;
  L.baseImage();
  L.put('/home/analyst/space.txt', 'Linux treats almost everything as a file, so a text editor is one of the most useful tools a security analyst can learn to use well.\n', { uid: 'analyst', gid: 'analyst', mtime: 'Oct  5 09:41' });
  const home = '/home/analyst';
  const ctxA = { user: 'analyst', cwd: '/' };
  const exists = p => { try { L.stat(p, ctxA); return true; } catch (e) { return false; } };
  const content = p => { try { return L.readFile(p, ctxA); } catch (e) { return null; } };
  const mans = new Set();
  let overwrote = false, lsl = false, lsla = false, prevFile = null;
  L.on('man', ({ topic }) => { mans.add(topic); if (['man', 'cp', 'pwd'].every(t => mans.has(t))) T('man'); if (topic === 'ls') T('manls'); });
  L.on('cmd', ({ words, line, cwd, code }) => {
    const w = words[0] || [];
    const prev = this_prev; this_prev = cwd;
    if (w[0] === 'pwd') T('pwd');
    if (['cyops_folder1', 'cyops_folder2', 'cyops_folder3'].every(f => exists(home + '/' + f))) T('mkdirs');
    if (cwd === home + '/cyops_folder3') T('cd3');
    if (w[0] === 'cd' && /^\s*cd\s+~\/?\s*$/.test(line) && cwd === home) T('tilde');
    if (exists(home + '/cyops_folder3/cyops_folder4')) T('folder4');
    if (w[0] === 'cd' && w[1] === '.' && cwd === home + '/cyops_folder3') dotSeen = true;
    if (w[0] === 'cd' && w[1] === '..' && prev === home + '/cyops_folder3' && cwd === home && dotSeen) T('dots');
    const f = content(home + '/some_text_file.txt');
    if (/>/.test(line) && !/>>/.test(line) && f !== null) {
      if (prevFile !== null && prevFile !== f && f.split('\n').filter(Boolean).length === 1) { overwrote = true; T('redirect'); }
      prevFile = f;
    }
    if (/>>/.test(line) && f && f.split('\n').filter(Boolean).length >= 2) T('append');
    if (w[0] === 'ls' && cwd === home && !w.slice(1).some(a => !a.startsWith('-') && a !== home && a !== home + '/' && a !== '.')) { const fl = w.filter(a => a.startsWith('-')).join(''); if (/l/.test(fl) && !/a/.test(fl)) lsl = true; if (/l/.test(fl) && /a/.test(fl)) lsla = true; if (lsl && lsla) T('hidden'); }
    if (w[0] === 'cp' && exists(home + '/cyops_folder2/some_text_file.txt')) T('cp');
    if (w[0] === 'rm' && !exists(home + '/some_text_file.txt') && exists(home + '/cyops_folder2/some_text_file.txt')) T('rm');
    if (w[0] === 'rm' && !exists(home + '/cyops_folder1') && Lab.isDone('mkdirs')) T('rmr');
    if (w[0] === 'mv' && exists(home + '/some_text_file.txt') && exists(home + '/cyops_folder2') && !exists(home + '/cyops_folder2/some_text_file.txt')) T('mv');
    if ((w[0] === 'rm' || w[0] === 'rmdir') && !exists(home + '/cyops_folder2') && Lab.isDone('mkdirs')) T('rm2');
  });
  let this_prev = home, dotSeen = false;
  L.desktop(document.getElementById('sim'));
})();
