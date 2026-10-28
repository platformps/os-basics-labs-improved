/* Lab 2.5.4: Navigating the Linux Filesystem and Permission Settings */
(() => {
  const T = Lab.complete;
  Lab.init({
    id: '2.5.4', title: 'Lab 2.5.4 Navigating the Linux Filesystem and Permission Settings', onReset: () => location.reload(),
    tasks: [
      { id: 'lsblk', label: 'List block devices with lsblk' },
      { id: 'mountgrep', label: 'Show the root filesystem with mount | grep sda1' },
      { id: 'rootls', label: 'List the root directory' },
      { id: 'mount', label: 'Mount /dev/sdb1 on second_drive' },
      { id: 'both', label: 'Show both drives with mount | grep /dev/sd' },
      { id: 'umount', label: 'Unmount /dev/sdb1' },
      { id: 'scripts', label: 'View permissions in lab.support.files/scripts' },
      { id: 'mnt', label: 'Try touch in /mnt and check its permissions with ls -ld' },
      { id: 'chmod', label: 'Change myFile.txt to 665 with chmod' },
      { id: 'chown', label: 'Make analyst the owner with chown' },
      { id: 'append', label: 'Append to myFile.txt without sudo' },
      { id: 'dirs', label: 'Compare a folder and a file in lab.support.files' },
      { id: 'dev', label: 'List /dev and find device files and links' },
      { id: 'links', label: 'Create a symbolic link and a hard link' },
      { id: 'rename', label: 'Rename the originals and test both links' }
    ]
  });
  const L = Linux;
  L.baseImage();
  const A = { uid: 'analyst', gid: 'analyst' };
  const S = '/home/analyst/lab.support.files/scripts';
  [['configure_as_dhcp.sh', 190, 0o755], ['configure_as_static.sh', 192, 0o755], ['cyberops_extended_topo_no_fw.py', 3459, 0o755], ['cyberops_extended_topo.py', 4062, 0o755], ['cyberops_topo.py', 3669, 0o755], ['cyops.mn', 2871, 0o644], ['fw_rules', 458, 0o755], ['mal_server_start.sh', 70, 0o755], ['reg_server_start.sh', 65, 0o755], ['start_ELK.sh', 189, 0o755], ['start_miniedit.sh', 85, 0o755], ['start_pox.sh', 76, 0o755], ['start_snort.sh', 106, 0o755], ['start_tftpd.sh', 61, 0o755]]
    .forEach(([n, s, m]) => L.put(`${S}/${n}`, '', Object.assign({ size: s, mode: m, mtime: 'Jun 13 09:45' }, A)));
  L.ensureDir(S + '/net_configuration_files', A);
  L.put('/home/analyst/space.txt', 'Linux treats almost everything as a file.\n', A);
  L.put('/home/analyst/some_text_file.txt', 'This is a DIFFERENT message, once again echoed to the terminal by echo.\nThis is another line of text. It will be APPENDED to the output file.\n', A);
  const ctxA = { user: 'analyst', cwd: '/' };
  const st = p => { try { return L.stat(p, ctxA); } catch (e) { return null; } };
  const flags = { mountAll: false, mntTouch: false, mntLd: false, s1: false, h1: false, catS: false, catH: false };
  L.on('cmd', ({ words, line, cwd, sudo, code }) => {
    const w = words[0] || [];
    const all = words.map(x => x.join(' ')).join(' | ');
    if (w[0] === 'lsblk') T('lsblk');
    if (words.length > 1 && w[0] === 'mount' && words[1][0] === 'grep' && words[1].includes('sda1')) T('mountgrep');
    if (words.length > 1 && w[0] === 'mount' && words[1][0] === 'grep' && words[1].some(a => /^\/dev\/sd/.test(a)) && L.mountTable.some(m => m.dev === '/dev/sdb1')) T('both');
    if (w[0] === 'ls' && (cwd === '/' && !w.slice(1).some(a => !a.startsWith('-')) || w.includes('/'))) T('rootls');
    if (w[0] === 'ls' && (cwd === S || w.some(a => /lab\.support\.files\/scripts\/?$/.test(a)))) T('scripts');
    if (w[0] === 'touch' && w.some(a => a.startsWith('/mnt/'))) flags.mntTouch = true;
    if (w[0] === 'ls' && w.includes('/mnt') && w.some(a => /^-\w*d/.test(a))) flags.mntLd = true;
    if (flags.mntTouch && flags.mntLd) T('mnt');
    if (w[0] === 'echo' && /myFile\.txt/.test(line) && />>/.test(line) && !sudo && code === 0) T('append');
    if (w[0] === 'ls' && (cwd === '/home/analyst/lab.support.files' && !w.slice(1).some(a => !a.startsWith('-')) || w.some(a => /lab\.support\.files\/?$/.test(a)))) T('dirs');
    if (w[0] === 'ls' && w.some(a => /^\/dev\/?$/.test(a))) T('dev');
    if (w[0] === 'cat' && w.includes('file1symbolic') && !st('/home/analyst/file1.txt')) flags.catS = true;
    if (w[0] === 'cat' && w.includes('file2hard') && !st('/home/analyst/file2.txt')) flags.catH = true;
    if (flags.catS && flags.catH) T('rename');
  });
  L.on('mount', ({ dev, path }) => { if (dev === '/dev/sdb1' && /second_drive$/.test(path)) T('mount'); });
  L.on('umount', ({ dev }) => { if (dev === '/dev/sdb1') T('umount'); });
  L.on('chmod', ({ path, mode }) => { if (/myFile\.txt$/.test(path) && (mode & 0o777) === 0o665) T('chmod'); });
  L.on('chown', ({ path, uid }) => { if (/myFile\.txt$/.test(path) && uid === 'analyst') T('chown'); });
  L.on('ln', ({ sym, link }) => { if (sym) flags.s1 = true; else flags.h1 = true; if (flags.s1 && flags.h1) T('links'); });
  L.desktop(document.getElementById('sim'));
})();
