/* Lab 1.3.10: Create User Accounts */
(() => {
  const { h, announce } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '1.3.10', title: 'Lab 1.3.10 Create User Accounts', onReset: () => location.reload(),
    tasks: [
      { id: 'create', label: 'Create the local account User1 without a Microsoft account' },
      { id: 'signin1', label: 'Sign out and sign in as User1' },
      { id: 'secUser1', label: 'View the Security tab of the User1 folder' },
      { id: 'denied', label: 'As User1, try to open the CyberOpsUser folder' },
      { id: 'signin2', label: 'Sign back in as CyberOpsUser' },
      { id: 'secCyber', label: 'View the Security tab of the CyberOpsUser folder' },
      { id: 'memberUser1', label: 'Check which group User1 belongs to in Local Users and Groups' },
      { id: 'memberCyber', label: 'Check which groups CyberOpsUser belongs to' },
      { id: 'promote', label: 'Change User1 to an administrator in Control Panel' },
      { id: 'memberAdmin', label: 'Confirm the groups User1 belongs to now' },
      { id: 'demote', label: 'Remove User1 from the Administrators group' },
      { id: 'delete', label: 'Delete the User1 account' }
    ]
  });

  const mkUser = (password, groups, extra) => Object.assign({ password, groups, admin() { return this.groups.includes('Administrators'); } }, extra || {});
  Win.S.users.CyberOpsUser = mkUser('Cisco123!', ['Administrators', 'Users'], { full: 'CyberOpsUser' });
  WinApps.baseSystem();

  /* Profile folder is created the first time an account signs in */
  Win.on('session:signin', ({ user }) => {
    const p = 'C:\\Users\\' + user;
    if (!Win.fs.get(p)) {
      const n = Win.fs.ensure(p);
      ['Desktop', 'Documents', 'Downloads', 'Pictures'].forEach(d => Win.fs.ensure(p + '\\' + d));
      n.acl = [{ p: 'SYSTEM', perm: 'Full control' }, { p: 'Administrators', perm: 'Full control' }, { p: user, perm: 'Full control' }];
      n.owner = user;
    }
    if (user === 'User1') T('signin1');
    if (user === 'CyberOpsUser' && Lab.isDone('signin1')) T('signin2');
  });
  Win.on('fs:security', ({ path }) => {
    const p = path.toLowerCase();
    if (p.endsWith('\\users\\user1')) T('secUser1');
    if (p.endsWith('\\users\\cyberopsuser') && Win.S.user === 'CyberOpsUser') T('secCyber');
  });
  Win.on('fs:denied', ({ path, user }) => { if (user === 'User1' && /cyberopsuser$/i.test(path)) T('denied'); });
  Win.on('user:memberof', ({ name, groups }) => {
    if (name === 'User1' && groups.includes('Administrators')) T('memberAdmin');
    else if (name === 'User1') T('memberUser1');
    if (name === 'CyberOpsUser') T('memberCyber');
  });
  Win.on('user:groups', ({ name, groups }) => { if (name === 'User1' && !groups.includes('Administrators') && Lab.isDone('promote')) T('demote'); });
  Win.on('user:deleted', ({ name }) => { if (name === 'User1') T('delete'); });

  /* ---------------- Settings: Accounts, Other users ---------------- */
  const questions = ["What was your first pet's name?", "What's the name of the city where you were born?", "What was your childhood nickname?", "What's the name of the city where your parents met?", "What's the first name of your oldest cousin?", "What's the name of the first school you attended?"];
  async function addAccountFlow() {
    // Screen 1: Microsoft account sign-in
    const email = h('input', { type: 'text', autocomplete: 'off' });
    let next = 'cancel';
    await Win.dialog({ title: 'How will this person sign in?', body: h('div', null, h('p', null, 'Enter the email address or phone number of the person you want to add. If they use Windows, Office, Outlook.com, OneDrive, Skype, or Xbox, enter the email or phone number they use to sign in.'),
      Win.field('Email or phone', email), h('button', { type: 'button', class: 'link', onclick: (e) => { next = 'noinfo'; e.target.closest('dialog').close(); } }, "I don't have this person's sign-in information")),
      buttons: [{ label: 'Next', value: 'next', primary: true }, { label: 'Cancel', value: 'cancel' }] }).then(r => { if (r.value === 'next') next = 'ms'; });
    if (next === 'ms') { await Win.alertBox('Microsoft account', 'This simulation cannot create Microsoft accounts. Go back and choose "I don\'t have this person\'s sign-in information".'); return; }
    if (next !== 'noinfo') return;
    // Screen 2
    let next2 = 'cancel';
    await Win.dialog({ title: 'Create account', body: h('div', null, h('p', null, 'Get started with a Microsoft account to use apps and services on your devices.'), h('button', { type: 'button', class: 'link', onclick: (e) => { next2 = 'local'; e.target.closest('dialog').close(); } }, 'Add a user without a Microsoft account')),
      buttons: [{ label: 'Next', value: 'next', primary: true }, { label: 'Back', value: 'cancel' }] }).then(r => { if (r.value === 'next') next2 = 'ms'; });
    if (next2 === 'ms') { await Win.alertBox('Microsoft account', 'This simulation cannot create Microsoft accounts. Choose "Add a user without a Microsoft account" instead.'); return; }
    if (next2 !== 'local') return;
    // Screen 3: local account form
    const name = h('input', { type: 'text', autocomplete: 'off' });
    const pw1 = h('input', { type: 'password', autocomplete: 'new-password' });
    const pw2 = h('input', { type: 'password', autocomplete: 'new-password' });
    const qs = [0, 1, 2].map(i => { const s = h('select'); s.append(h('option', { value: '' }, 'Choose a security question')); questions.forEach(q => s.append(h('option', { value: q }, q))); return { s, a: h('input', { type: 'text', autocomplete: 'off' }) }; });
    const qBlock = h('fieldset', null, h('legend', null, 'In case you forget your password'), ...qs.flatMap((q, i) => [Win.field(`Security question ${i + 1}`, q.s), Win.field(`Your answer ${i + 1}`, q.a)]));
    const err = h('p', { class: 'dlg-error', role: 'alert' });
    const body = h('div', null, h('p', null, 'Who\u2019s going to use this PC?'), Win.field('User name', name), h('p', null, 'Make it secure.'), Win.field('Enter password', pw1, 'Optional. If you set a password, all three security questions are required.'), Win.field('Re-enter password', pw2), qBlock, err);
    const r = await Win.dialog({ title: 'Create a user for this PC', body, wide: true, buttons: [{ label: 'Next', value: 'next', primary: true }, { label: 'Back', value: 'cancel' }],
      validate: () => {
        const n = name.value.trim();
        if (!n) return 'Enter a user name.';
        if (/[\\/"\[\]:|<>+=;,?*@]/.test(n)) return 'The user name can\u2019t contain these characters: \\ / " [ ] : | < > + = ; , ? * @';
        if (Object.keys(Win.S.users).some(u => u.toLowerCase() === n.toLowerCase()) || /^(administrator|guest)$/i.test(n)) return `The user name ${n} is already in use. Choose another one.`;
        if (pw1.value !== pw2.value) return 'The passwords don\u2019t match. Re-enter the password.';
        if (pw1.value) {
          if (qs.some(q => !q.s.value || !q.a.value.trim())) return 'Choose all three security questions and type an answer for each.';
          if (new Set(qs.map(q => q.s.value)).size < 3) return 'Choose three different security questions.';
        }
        return null;
      } });
    if (r.value !== 'next') return;
    const n = name.value.trim();
    Win.S.users[n] = mkUser(pw1.value, ['Users'], { firstTime: true, full: n });
    Win.emit('user:change', {});
    announce(`The account ${n} was created. It is a local account and a standard user.`);
    if (n.toLowerCase() === 'user1') T('create');
    if (n !== 'User1') announce(`Note: this lab uses the name User1. You created ${n}, which works the same way, but the checklist looks for User1.`);
  }
  Win.registerApp('settings', {
    title: 'Settings', keywords: ['settings', 'accounts', 'other users', 'family'], kind: 'App', single: true,
    proc: { name: 'SystemSettings.exe', desc: 'Settings', tmName: 'Settings', mem: 31000 },
    create(w, o) {
      const nav = Win.tree({ label: 'Settings categories', nodes: [{ id: 'system', label: 'System' }, { id: 'network', label: 'Network and internet' }, { id: 'accounts', label: 'Accounts', expanded: true, children: [{ id: 'yourinfo', label: 'Your info' }, { id: 'other', label: 'Other users' }] }, { id: 'update', label: 'Windows Update' }], onSelect: n => show(n.id), selected: 'other' });
      const main = h('div', { class: 'pane-main', role: 'region', 'aria-label': 'Settings page' });
      w.body.append(h('div', { class: 'two-pane' }, h('div', { class: 'pane-nav' }, nav.el), main));
      function show(id) {
        main.textContent = '';
        if (id === 'other') {
          w.setTitle('Settings: Accounts, Other users');
          main.append(h('h4', { tabindex: '-1' }, 'Accounts > Other users'));
          if (!Win.S.isAdmin) { main.append(h('p', null, 'Some settings are managed by your administrator. Only administrators can add other users.')); return; }
          main.append(h('div', { class: 'toolbar' }, h('span', null, 'Add other user'), h('button', { type: 'button', onclick: addAccountFlow }, 'Add account')));
          const list = h('ul', { class: 'cp-list' });
          const draw = () => { list.textContent = ''; Object.entries(Win.S.users).filter(([n]) => n !== Win.S.user).forEach(([n, u]) => list.append(h('li', null, `${n}: Local account, ${u.admin() ? 'Administrator' : 'Standard user'} `, h('button', { type: 'button', class: 'secondary', onclick: async () => { if (await Win.confirmBox('Delete account and data?', `Deleting ${n}'s account will remove this user's data from this PC, including items on their desktop, downloads, documents, photos, music, and other files.`, 'Delete account and data', 'Cancel')) { delete Win.S.users[n]; Win.emit('user:deleted', { name: n, via: 'settings' }); Win.emit('user:change', {}); draw(); announce(`${n} removed.`); } } }, `Remove ${n}`)))); if (!list.children.length) list.append(h('li', null, 'No other users.')); };
          draw();
          Win.on('user:change', () => { if (list.isConnected) draw(); });
          main.append(h('h5', null, 'Other users on this PC'), list);
        } else { w.setTitle('Settings'); main.append(h('h4', { tabindex: '-1' }, id === 'yourinfo' ? 'Your info' : 'Settings'), h('p', null, id === 'yourinfo' ? `${Win.S.user}, Local account, ${Win.S.isAdmin ? 'Administrator' : 'Standard user'}` : 'This page is not used in this lab.')); }
      }
      show(o.page || 'other');
    }
  });

  /* ---------------- Control Panel: User Accounts ---------------- */
  Win.registerApp('useraccounts', {
    title: 'User Accounts', keywords: ['user accounts', 'accounts', 'netplwiz'], kind: 'Control Panel item', single: true,
    create(w) {
      const main = h('div');
      w.body.append(main);
      const link = (label, fn) => h('li', null, h('button', { type: 'button', class: 'link', onclick: fn }, label));
      function home() {
        main.textContent = '';
        const u = Win.S.users[Win.S.user];
        main.append(h('h4', { tabindex: '-1' }, 'Make changes to your user account'), h('p', null, `${Win.S.user}, Local Account, ${u.admin() ? 'Administrator' : 'Standard user'}, Password protected`),
          h('ul', { class: 'cp-list' }, link('Change your account type', () => Win.alertBox('User Accounts', 'Use Manage another account for this lab.')), link('Manage another account', manage)));
        main.querySelector('h4').focus();
      }
      async function manage() {
        if (!Win.S.isAdmin) { await Win.alertBox('User Account Control', 'Managing other accounts needs an administrator. You are signed in as a standard user.'); return; }
        main.textContent = '';
        main.append(h('h4', { tabindex: '-1' }, 'Choose the user you would like to change'));
        const ul = h('ul', { class: 'cp-list' });
        Object.entries(Win.S.users).forEach(([n, u]) => ul.append(link(`${n}: Local Account, ${u.admin() ? 'Administrator' : 'Standard user'}${u.password ? ', Password protected' : ''}`, () => account(n))));
        main.append(ul, h('ul', { class: 'cp-list' }, link('Add a new user in PC settings', () => Win.openApp('settings', { page: 'other' })), link('Back to your account', home)));
        main.querySelector('h4').focus();
        Win.emit('ua:manage', {});
      }
      function account(n) {
        const u = Win.S.users[n];
        main.textContent = '';
        main.append(h('h4', { tabindex: '-1' }, `Make changes to ${n}'s account`), h('p', null, `${n}, Local Account, ${u.admin() ? 'Administrator' : 'Standard user'}`),
          h('ul', { class: 'cp-list' }, link('Change the account name', () => Win.alertBox('User Accounts', 'Not used in this lab.')), link('Change the password', () => Win.alertBox('User Accounts', 'Not used in this lab.')), link('Change the account type', () => type(n)), link('Delete the account', () => del(n)), link('Manage another account', manage)));
        main.querySelector('h4').focus();
      }
      function type(n) {
        const u = Win.S.users[n];
        let choice = u.admin() ? 'admin' : 'std';
        main.textContent = '';
        main.append(h('h4', { tabindex: '-1' }, `Choose a new account type for ${n}`),
          Win.radios('acct-type', 'Account type', [{ value: 'std', label: 'Standard: can use most software and change settings that do not affect other users or the security of this PC.' }, { value: 'admin', label: 'Administrator: has complete control over the PC, can change any settings and access all files and programs stored on this PC.' }], choice, v => { choice = v; }),
          h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: () => {
            if (n === Win.S.user && choice === 'std') { Win.alertBox('User Accounts', 'At least one administrator account must remain on this PC.'); return; }
            if (choice === 'admin' && !u.groups.includes('Administrators')) u.groups.unshift('Administrators');
            if (choice === 'std') u.groups = u.groups.filter(g => g !== 'Administrators');
            if (!u.groups.includes('Users')) u.groups.push('Users');
            Win.emit('user:change', {}); Win.emit('user:groups', { name: n, groups: u.groups.slice(), via: 'control' });
            announce(`${n} is now ${choice === 'admin' ? 'an administrator' : 'a standard user'}.`);
            if (n === 'User1' && choice === 'admin') T('promote');
            account(n);
          } }, 'Change Account Type'), h('button', { type: 'button', class: 'secondary', onclick: () => account(n) }, 'Cancel')));
        main.querySelector('h4').focus();
      }
      async function del(n) {
        if (n === Win.S.user) { Win.alertBox('User Accounts', 'You cannot delete the account you are signed in with.'); return; }
        const r = await Win.dialog({ title: `Do you want to keep ${n}'s files?`, describedBy: true, body: h('p', null, `Before you delete ${n}'s account, Windows can automatically save the contents of ${n}'s desktop and Documents, Favorites, Music, Pictures and Videos folders to a new folder called '${n}' on your desktop.`), buttons: [{ label: 'Delete Files', value: 'del', primary: true }, { label: 'Keep Files', value: 'keep' }, { label: 'Cancel', value: 'cancel' }] });
        if (r.value === 'cancel') return;
        if (!(await Win.confirmBox('Are you sure you want to delete the account?', `Windows will delete all of ${n}'s files, and then delete ${n}'s account.`, 'Delete Account', 'Cancel'))) return;
        delete Win.S.users[n];
        Win.emit('user:deleted', { name: n, via: 'control' }); Win.emit('user:change', {});
        announce(`${n}'s account was deleted.`);
        manage();
      }
      home();
    }
  });

  Win.desktop(document.getElementById('sim'), { computer: 'DESKTOP-OSB01', user: 'CyberOpsUser' });
})();
