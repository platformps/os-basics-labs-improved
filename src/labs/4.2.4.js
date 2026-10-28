/* Lab 4.2.4: Working with iOS */
(() => {
  const { h } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '4.2.4', title: 'Lab 4.2.4 Working with iOS', onReset: () => location.reload(),
    tasks: [
      { id: 'move', label: 'Move Contacts to another Home Screen page' },
      { id: 'folder', label: 'Create a folder from Stocks and Calendar' },
      { id: 'rename', label: 'Rename the folder ITE Folder' },
      { id: 'out', label: 'Move Calendar out of the folder' },
      { id: 'gone', label: 'Move Stocks out so the folder disappears' },
      { id: 'install', label: 'Install LastPass from the App Store' },
      { id: 'delete', label: 'Delete LastPass' }
    ]
  });
  const M = Mobile;
  const P = new M.Phone(document.getElementById('sim'), { os: 'ios', name: 'iPhone', status: () => 'Wi-Fi connected. Battery 76 percent.' });
  const A = (name, cat, fixed) => ({ name, cat, fixed: !!fixed });
  const apps = {
    phone: A('Phone', 'Social', true), safari: A('Safari', 'Utilities', true), messages: A('Messages', 'Social', true), music: A('Music', 'Entertainment'),
    calendar: A('Calendar', 'Productivity'), photos: A('Photos', 'Photo and Video', true), camera: A('Camera', 'Photo and Video', true), mail: A('Mail', 'Productivity'),
    clock: A('Clock', 'Utilities'), maps: A('Maps', 'Travel'), weather: A('Weather', 'Weather'), reminders: A('Reminders', 'Productivity'), notes: A('Notes', 'Productivity'),
    stocks: A('Stocks', 'Finance'), books: A('Books', 'Books'), appstore: A('App Store', 'Utilities', true), podcasts: A('Podcasts', 'Entertainment'), tv: A('TV', 'Entertainment'),
    health: A('Health', 'Health and Fitness', true), home: A('Home', 'Utilities'), wallet: A('Wallet', 'Finance', true), settings: A('Settings', 'Utilities', true), contacts: A('Contacts', 'Social'),
    lastpass: Object.assign(A('LastPass', 'Productivity'), { notInstalled: true })
  };
  apps.appstore.open = p => p.go('store');
  const L = M.iosLauncher(P, { apps, dock: ['phone', 'safari', 'messages', 'music'], pages: [['calendar', 'photos', 'camera', 'mail', 'clock', 'maps', 'weather', 'reminders', 'notes', 'stocks', 'books', 'appstore', 'podcasts', 'tv', 'health', 'home', 'wallet', 'settings', 'contacts']] });

  /* App Store */
  const tabs = b => b.append(h('div', { class: 'toolbar', role: 'group', 'aria-label': 'App Store tabs' }, ...['Today', 'Games', 'Apps', 'Arcade', 'Search'].map(t => h('button', { type: 'button', class: t === 'Search' ? '' : 'secondary', 'data-k': 'tab-' + t, onclick: () => t === 'Search' ? P.go('search', {}, { replace: P.cur().id !== 'store' }) : P.say(`${t} is not used in this lab. Choose Search.`) }, t))));
  P.def('store', { title: 'App Store: Today', render: b => { b.append(h('p', null, 'Stories and featured apps. To find a specific app, use the Search tab at the bottom of the screen.')); tabs(b); } });
  P.def('search', { title: 'App Store: Search', render: b => {
    const q = h('input', { type: 'search', autocomplete: 'off', 'data-k': 'q' });
    const go = () => { const v = q.value.trim(); if (!v) { P.say('Type an app name to search.'); return; } P.go('results', { q: v }); };
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    b.append(M.field('Games, Apps, Stories, and More', q), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'go', onclick: go }, 'Search')));
    tabs(b);
  } });
  P.def('results', { title: p => `Results for ${p.q}`, render: (b, p) => {
    if (!/last\s*pass|password/i.test(p.q)) { b.append(h('p', null, `No results for "${p.q}" in this simulation. Try LastPass.`)); return; }
    b.append(P.list([{ label: 'LastPass Password Manager', sub: `Productivity, 4.7 stars, ${L.installed.has('lastpass') ? 'Open' : 'Get'}`, key: 'r-lp', onClick: () => P.go('lp') }], 'Search results'));
  } });
  let busy = false;
  P.def('lp', { title: 'LastPass Password Manager', render: b => {
    b.append(h('p', null, 'LastPass US LP. Productivity. Rated 4.7 stars. Free. Offers In-App Purchases.'), h('p', null, 'Store passwords in a secure vault, fill them in on websites and apps, and generate strong passwords.'));
    if (busy) { b.append(h('p', null, 'Downloading and installing...')); return; }
    if (L.installed.has('lastpass')) { b.append(h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'open', onclick: () => P.go('app', { id: 'lastpass' }) }, 'Open'))); return; }
    b.append(h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'get', onclick: async () => {
      let pw = '';
      const inp = h('input', { type: 'password', autocomplete: 'off' }); inp.addEventListener('input', () => { pw = inp.value; });
      const r = await M.dialog({ title: 'App Store', body: h('div', null, h('p', null, 'LastPass Password Manager. Account: learner@example.com.'), h('p', null, 'Confirm with Face ID, or enter your Apple Account password.'), M.field('Apple Account password', inp)),
        buttons: [{ label: 'Install', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }], validate: () => pw === 'Apple2026!' ? null : 'Your Apple Account password is incorrect. The password for this lab is Apple2026!' });
      if (r.value !== 'ok') return;
      busy = true; P.refresh(); P.say('Downloading LastPass...');
      setTimeout(() => { busy = false; L.installed.add('lastpass'); const pi = L.put('lastpass', L.pages.length - 1); P.refresh(); P.say(`LastPass installed and added to Home Screen page ${pi + 1}. The button now says Open.`); M.emit('ios:install', { id: 'lastpass' }); const o = P.body.querySelector('[data-k="open"]'); if (o) o.focus(); }, 1500);
    } }, 'Get')));
  } });

  M.on('ios:move', ({ e, from, to }) => { if (e === 'contacts' && from !== to) T('move'); });
  M.on('ios:folder', ({ f }) => { if (f.apps.includes('stocks') && f.apps.includes('calendar')) T('folder'); });
  M.on('ios:rename', ({ f }) => { if (/^ite folder$/i.test(f.name)) T('rename'); });
  M.on('ios:moveOut', ({ id }) => { if (id === 'calendar') T('out'); });
  M.on('ios:folderGone', () => { T('gone'); });
  M.on('ios:install', () => T('install'));
  M.on('ios:delete', ({ id }) => { if (id === 'lastpass') T('delete'); });
})();
