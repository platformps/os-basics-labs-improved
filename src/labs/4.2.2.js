/* Lab 4.2.2: Working with Android */
(() => {
  const { h } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '4.2.2', title: 'Lab 4.2.2 Working with Android', onReset: () => location.reload(),
    tasks: [
      { id: 'shortcut', label: 'Add an app shortcut from All apps' },
      { id: 'widget', label: 'Add a widget to the home screen' },
      { id: 'move', label: 'Move an app or widget to another screen' },
      { id: 'remove', label: 'Remove Drive from the home screen' },
      { id: 'folder', label: 'Create a folder from two apps' },
      { id: 'rename', label: 'Rename the folder ITE Apps Folder' },
      { id: 'unfolder', label: 'Move an app out so the folder disappears' },
      { id: 'install', label: 'Install LastPass from Play Store' },
      { id: 'uninstall', label: 'Uninstall LastPass' }
    ]
  });
  const M = Mobile;
  const sim = document.getElementById('sim');
  const P = new M.Phone(sim, { os: 'android', name: 'Android phone', status: () => 'Wi-Fi connected. Battery 82 percent.' });
  const sys = n => ({ name: n, system: true });
  const apps = {
    phone: sys('Phone'), messages: sys('Messages'), chrome: sys('Chrome'), camera: sys('Camera'), calculator: sys('Calculator'), calendar: sys('Calendar'), clock: sys('Clock'),
    contacts: sys('Contacts'), drive: sys('Drive'), files: sys('Files'), fit: sys('Fit'), gmail: sys('Gmail'), google: sys('Google'), maps: sys('Maps'), photos: sys('Photos'),
    settings: sys('Settings'), youtube: sys('YouTube'),
    play: { name: 'Play Store', system: true, open: p => p.go('play') },
    lastpass: { name: 'LastPass', notInstalled: true, size: '61 MB' }
  };
  const widgets = [
    { id: 'clockd', app: 'clock', name: 'Digital clock', w: 4, h: 1, text: '9:41, Monday, October 5' },
    { id: 'clocka', app: 'clock', name: 'Analog clock', w: 2, h: 2, text: 'clock face showing 9:41' },
    { id: 'search', app: 'google', name: 'Search bar', w: 4, h: 1, text: 'Search the web and your phone' },
    { id: 'cal', app: 'calendar', name: 'Schedule', w: 4, h: 2, text: 'No events today' },
    { id: 'fit', app: 'fit', name: 'Fit daily goals', w: 2, h: 2, text: '3,412 steps, 24 Heart Points today' },
    { id: 'gmail', app: 'gmail', name: 'Gmail inbox', w: 4, h: 2, text: '2 unread messages' }
  ];
  const A = (id, app, r, c) => ({ id, kind: 'app', app, w: 1, h: 1, r, c });
  const L = M.androidLauncher(P, { apps, widgets, dock: ['phone', 'messages', 'chrome', 'camera'], pages: [
    [{ id: 'w0', kind: 'widget', name: 'Search bar', text: 'Search the web and your phone', app: 'google', w: 4, h: 1, r: 0, c: 0 }, A('a1', 'gmail', 1, 0), A('a2', 'maps', 1, 1), A('a3', 'drive', 1, 2), A('a4', 'play', 1, 3), A('a5', 'photos', 2, 0), A('a6', 'youtube', 2, 1), A('a7', 'settings', 2, 2)],
    [A('b1', 'clock', 0, 0)]
  ] });

  /* Play Store */
  let installing = false;
  P.def('play', { title: 'Google Play', render: (b) => {
    const q = h('input', { type: 'search', autocomplete: 'off', 'data-k': 'q' });
    const go = () => { const v = q.value.trim(); if (!v) { P.say('Type something to search for.'); return; } P.go('playres', { q: v }); };
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    b.append(M.field('Search for apps and games', q), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'qs', onclick: go }, 'Search')));
  } });
  P.def('playres', { title: p => `Results for ${p.q}`, render: (b, p) => {
    const hit = /last\s*pass|password/i.test(p.q);
    if (!hit) { b.append(h('p', null, `No results for "${p.q}" in this simulation. Try LastPass.`)); return; }
    b.append(P.list([
      { label: 'LastPass Password Manager', sub: 'LastPass US LP, rated 4.4 stars, ' + (L.installed.has('lastpass') ? 'Installed' : 'Free'), key: 'r-lp', onClick: () => P.go('lp') },
      { label: 'LastPass Authenticator', sub: 'LastPass US LP, rated 4.6 stars, Free', key: 'r-lpa', onClick: () => P.say('This lab installs LastPass Password Manager. Choose that one.') }], 'Search results'));
  } });
  P.def('lp', { title: 'LastPass Password Manager', render: (b) => {
    const inst = L.installed.has('lastpass');
    b.append(h('p', null, 'LastPass US LP. Rated 4.4 stars. Rated for 3 and up. 10 million plus downloads.'),
      h('p', null, 'About this app: LastPass stores your passwords in a secure vault, fills them in for you, and creates strong new passwords.'));
    if (installing) { b.append(h('p', { role: 'status' }, 'Installing...')); return; }
    if (inst) b.append(h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'm-danger', 'data-k': 'un', onclick: () => L.uninstall('lastpass') }, 'Uninstall'), h('button', { type: 'button', 'data-k': 'open', onclick: () => P.go('app', { id: 'lastpass' }) }, 'Open')));
    else b.append(h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'inst', onclick: () => {
      installing = true; P.refresh(); P.say('Pending, then downloading and installing LastPass...');
      setTimeout(() => { installing = false; L.installed.add('lastpass'); P.refresh(); P.say('LastPass installed. It is now listed in All apps.'); M.emit('app:install', { id: 'lastpass' }); const b2 = P.body.querySelector('[data-k="open"]'); if (b2) b2.focus(); }, 1500);
    } }, 'Install')));
  } });

  M.on('home:add', ({ it }) => { if (it.kind === 'app') T('shortcut'); });
  M.on('home:widget', () => T('widget'));
  M.on('home:move', ({ from, to }) => { if (from !== to) T('move'); });
  M.on('home:remove', ({ it }) => { if (it.kind === 'app' && it.app === 'drive') T('remove'); });
  M.on('home:folder', () => T('folder'));
  M.on('home:rename', ({ f }) => { if (/^ite apps folder$/i.test(f.name.trim())) T('rename'); });
  M.on('home:folderGone', () => T('unfolder'));
  M.on('app:install', ({ id }) => { if (id === 'lastpass') T('install'); });
  M.on('app:uninstall', ({ id }) => { if (id === 'lastpass') T('uninstall'); });
})();
