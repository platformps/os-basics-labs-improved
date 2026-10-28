/* Lab 4.4.2: Passcode Locks */
(() => {
  const { h } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '4.4.2', title: 'Lab 4.4.2 Passcode Locks', onReset: () => location.reload(),
    tasks: [
      { id: 'apin', label: 'Android: set the screen lock to PIN 123456' },
      { id: 'aunlock', label: 'Android: lock the phone and unlock it with the PIN' },
      { id: 'awrong', label: 'Android: enter wrong PINs until the phone makes you wait' },
      { id: 'aafter', label: 'Android: unlock with the right PIN after the wait' },
      { id: 'afp', label: 'Android: register a fingerprint and unlock with it' },
      { id: 'aface', label: 'Android: register face recognition' },
      { id: 'aclean', label: 'Android: remove biometrics, set the lock to None, and wake without a PIN' },
      { id: 'ipass', label: 'iPhone: turn the passcode on (123456)' },
      { id: 'iunlock', label: 'iPhone: lock and unlock with the passcode' },
      { id: 'iunavail', label: 'iPhone: enter wrong passcodes until iPhone Unavailable appears' },
      { id: 'iafter', label: 'iPhone: unlock with the right passcode after the wait' },
      { id: 'iface', label: 'iPhone: set up Face ID and unlock with it' },
      { id: 'iclean', label: 'iPhone: reset Face ID, turn the passcode off, and wake without one' }
    ]
  });
  const M = Mobile;
  const { wrapA, wrapI } = M.twoPhones(document.getElementById('sim'), ['Android phone (Samsung Galaxy)', 'iPhone']);
  const now = () => Date.now();
  async function secret(title, label, hint, check, extra) {
    let v = '';
    const inp = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off' });
    inp.addEventListener('input', () => { v = inp.value; });
    const r = await M.dialog({ title, body: h('div', null, M.field(label, inp, hint), extra || ''), buttons: [{ label: 'Continue', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }], validate: () => check(v) });
    return r.value === 'ok' ? v : null;
  }
  function lockPad(P, label, onSubmit, autoLen) {
    const inp = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', 'data-k': 'pin' });
    const go = () => { const v = inp.value; inp.value = ''; onSubmit(v); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    if (autoLen) inp.addEventListener('input', () => { if (inp.value.length >= autoLen()) go(); });
    return h('div', null, M.field(label, inp), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'pinok', onclick: go }, autoLen ? 'Done' : 'OK')));
  }
  function countdown(P, S, until, msgFn) {
    clearInterval(S.timer);
    S.timer = setInterval(() => { if (now() >= S.until) { clearInterval(S.timer); S.until = 0; if (P.cur().id === 'lock') { P.refresh(); P.say('You can try again now.'); } } else if (P.cur().id === 'lock') { const t = P.body.querySelector('[data-k="cd"]'); if (t) t.textContent = msgFn(Math.ceil((S.until - now()) / 1000)); } }, 1000);
  }

  /* ---------------- Android ---------------- */
  const SA = { type: 'Swipe', pin: null, instant: true, fp: 0, face: false, fails: 0, until: 0, restarted: false, timer: null, enroll: 0, sawWait: false };
  const A = new M.Phone(wrapA, { os: 'android', name: 'Android phone', status: p => `${p.asleep ? 'Screen off' : p.locked ? 'Locked' : 'Unlocked'}. Screen lock: ${SA.type}. Battery 82 percent.` });
  const sys = n => ({ name: n, system: true });
  M.androidLauncher(A, { apps: { phone: sys('Phone'), messages: sys('Messages'), chrome: sys('Chrome'), camera: sys('Camera'), settings: Object.assign(sys('Settings'), { open: p => p.go('settings') }), gallery: sys('Gallery') },
    dock: ['phone', 'messages', 'chrome', 'camera'], pages: [[{ id: 's1', kind: 'app', app: 'settings', w: 1, h: 1, r: 0, c: 0 }, { id: 's2', kind: 'app', app: 'gallery', w: 1, h: 1, r: 0, c: 1 }]] });
  const secure = () => SA.type === 'PIN';
  const verifyA = async (then) => {
    if (!secure()) { then(); return; }
    const v = await secret('Confirm your PIN', 'PIN', 'To protect your settings, enter your current PIN.', x => x === SA.pin ? null : 'Incorrect PIN.');
    if (v !== null) then();
  };
  A.def('settings', { title: 'Settings', render: b => b.append(A.list([{ label: 'Connections' }, { label: 'Display' }, { label: 'Lock screen and AOD', sub: 'Screen lock type, Always On Display', key: 'st-lock', onClick: () => A.go('lockset') }, { label: 'Security and privacy', sub: 'Biometrics, permissions', key: 'st-sec', onClick: () => A.go('security') }, { label: 'Accessibility' }, { label: 'About phone' }], 'Settings')) });
  A.def('lockset', { title: 'Lock screen and AOD', render: b => b.append(A.list([
    { label: 'Screen lock type', sub: SA.type, key: 'ls-type', onClick: () => verifyA(() => A.go('locktype')) },
    { label: 'Secure lock settings', sub: secure() ? 'Lock instantly with side key, auto lock' : 'Set a secure screen lock first', key: 'ls-sec', onClick: () => secure() ? verifyA(() => A.go('securelock')) : A.say('Secure lock settings are available only with a PIN, pattern, or password.') },
    { label: 'Always On Display', sub: 'Off' }], 'Lock screen settings')) });
  A.def('locktype', { title: 'Screen lock type', render: b => {
    b.append(h('p', { class: 'm-note' }, `Current: ${SA.type}. Choose how to unlock your phone.`), A.list(['Swipe', 'Pattern', 'PIN', 'Password', 'None'].map(t => ({ label: t, sub: { Swipe: 'No security', Pattern: 'Medium security', PIN: 'Medium to high security', Password: 'High security', None: 'No security' }[t] + (SA.type === t ? ', selected' : ''), key: 'lt-' + t, onClick: () => chooseType(t) })), 'Screen lock types'),
      h('h4', null, 'Biometrics'), h('p', { class: 'm-note' }, 'Fingerprints and Face recognition are in Security and privacy, Biometrics. They need a PIN, pattern, or password as a backup.'));
  } });
  async function chooseType(t) {
    if (t === 'Pattern' || t === 'Password') { A.say(`${t} works on a real phone. This lab uses a PIN, so choose PIN.`); return; }
    if (t === 'PIN') {
      const p1 = await secret('Set PIN', 'PIN', 'Your PIN must contain at least 4 digits. Use 123456 for this lab.', x => /^\d{4,16}$/.test(x) ? null : 'Your PIN must contain at least 4 digits, and only digits.');
      if (p1 === null) return;
      const p2 = await secret('Confirm PIN', 'PIN', 'Enter the same PIN again.', x => x === p1 ? null : 'PINs don’t match. Try again.');
      if (p2 === null) return;
      SA.pin = p1; SA.type = 'PIN'; A.back(); A.say(`Screen lock set to PIN. From now on the phone asks for it when it wakes. (The phone is also encrypted with this PIN.)`);
      if (p1 === '123456') T('apin');
      return;
    }
    if (SA.fp || SA.face) {
      const r = await M.dialog({ title: 'Remove biometric data?', message: `Your registered ${[SA.fp ? 'fingerprints' : '', SA.face ? 'face' : ''].filter(Boolean).join(' and ')} will be deleted, because biometrics need a secure screen lock.`, buttons: [{ label: 'Remove', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
      if (r.value !== 'ok') return;
      SA.fp = 0; SA.face = false;
    }
    SA.type = t; SA.pin = null; A.back(); A.say(`Screen lock set to ${t}. ${t === 'None' ? 'The phone opens without any check.' : 'Anyone can swipe to open the phone.'}`);
  }
  A.def('securelock', { title: 'Secure lock settings', render: b => b.append(A.list([
    { label: 'Lock instantly with side key', sub: SA.instant ? 'On' : 'Off', key: 'sl-inst', extra: [A.switchBtn('Lock instantly with side key', SA.instant, v => { SA.instant = v; A.refresh(); A.say(`Lock instantly with side key ${v ? 'on' : 'off'}.`); }, 'sl-inst-sw')] },
    { label: 'Auto lock when screen turns off', sub: 'After 5 seconds' }, { label: 'Auto factory reset', sub: 'Off. Erases the phone after 15 failed unlock attempts' }, { label: 'Lock network and security', sub: 'Off' }], 'Secure lock settings')) });
  A.def('security', { title: 'Security and privacy', render: b => b.append(h('h4', null, 'Biometrics'), A.list([
    { label: 'Fingerprints', sub: SA.fp ? `${SA.fp} fingerprint registered` : 'Not registered', key: 'bio-fp', onClick: () => bioGo('fp') },
    { label: 'Face recognition', sub: SA.face ? 'Registered' : 'Not registered', key: 'bio-face', onClick: () => bioGo('face') }], 'Biometrics'), A.list([{ label: 'Permission manager' }, { label: 'Find My Mobile' }], 'More security')) });
  async function bioGo(kind) {
    if (!secure()) { A.say('To use biometrics, first set a backup screen lock: a PIN, pattern, or password. Go to Lock screen and AOD, Screen lock type.'); return; }
    verifyA(() => A.go(kind === 'fp' ? 'fp' : 'face'));
  }
  A.def('fp', { title: 'Fingerprints', render: b => {
    if (SA.fp) b.append(A.list([{ label: 'Fingerprint 1', sub: 'Registered', key: 'fp1', extra: [h('button', { type: 'button', class: 'm-danger', 'data-k': 'fprm', onclick: () => { SA.fp = 0; A.refresh(); A.say('Fingerprint 1 removed.'); } }, 'Remove')] }], 'Registered fingerprints'), A.list([{ label: 'Fingerprint unlock', sub: 'On' }], 'Fingerprint options'));
    b.append(h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'fpadd', onclick: () => { SA.enroll = 0; A.go('fpenroll'); } }, SA.fp ? 'Add fingerprint' : 'Register fingerprint')));
  } });
  A.def('fpenroll', { title: 'Register fingerprint', render: b => b.append(h('p', null, 'The sensor is under the screen near the bottom (on some phones it is in the side key). Place your finger on the sensor, lift it, and repeat, moving it slightly each time.'), h('p', { 'data-k': 'prog' }, `Progress: ${SA.enroll} percent.`), h('p', { class: 'm-note' }, 'Use Touch the fingerprint sensor under the phone.')) });
  A.def('face', { title: 'Face recognition', render: b => {
    if (SA.face) b.append(A.list([{ label: 'Faster recognition', sub: 'On' }, { label: 'Stay on lock screen until swipe', sub: 'Off' }], 'Face options'), h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'm-danger', 'data-k': 'facerm', onclick: () => { SA.face = false; A.refresh(); A.say('Face data removed.'); } }, 'Remove face data')));
    else b.append(h('p', null, 'Face recognition is less secure than your PIN. Someone or something that looks like you could unlock your phone.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'faceadd', onclick: () => A.go('faceenroll') }, 'Register face')));
  } });
  A.def('faceenroll', { title: 'Register face', render: b => b.append(h('p', null, 'Hold the phone 20 to 50 centimeters (8 to 20 inches) from your face, at eye level, so your face fills the circle. The phone vibrates and announces when registration is done.'), h('p', { class: 'm-note' }, 'Use Hold the phone in front of your face under the phone.')) });
  A.def('lock', { title: 'Lock screen', render: b => {
    if (SA.type === 'Swipe') { b.append(h('p', null, '9:41, Monday, October 5.'), h('button', { type: 'button', 'data-k': 'swipe', onclick: () => { A.unlock(); A.say('Unlocked by swiping. No PIN was needed.'); } }, 'Swipe to unlock')); return; }
    if (SA.until > now()) { b.append(h('p', { 'data-k': 'cd' }, `Too many incorrect attempts. Try again in ${Math.ceil((SA.until - now()) / 1000)} seconds.`), h('p', { class: 'm-note' }, 'The PIN field is unavailable until the countdown ends. Use Let 30 seconds pass to skip ahead.')); return; }
    b.append(h('p', null, `9:41, Monday, October 5.${SA.restarted ? ' PIN required after restart.' : SA.fp ? ' Or touch the fingerprint sensor.' : ''}`), lockPad(A, 'Enter PIN', v => {
      if (v === SA.pin) { const after = SA.sawWait; SA.fails = 0; SA.restarted = false; SA.sawWait = false; A.unlock(); A.say('PIN accepted. Unlocked.'); T('aunlock'); if (after) T('aafter'); return; }
      SA.fails++;
      if (SA.fails >= 5) { SA.until = now() + 30000; SA.sawWait = true; T('awrong'); countdown(A, SA, SA.until, s => `Too many incorrect attempts. Try again in ${s} seconds.`); A.refresh(); A.say(`Incorrect PIN. You have made ${SA.fails} incorrect attempts. Try again in 30 seconds.`); return; }
      A.say(`Incorrect PIN. ${5 - SA.fails} attempt${5 - SA.fails === 1 ? '' : 's'} left before you have to wait.`);
    }));
  } });
  A.physical([
    { label: 'Press the side (power) button', action: () => { if (A.asleep) A.wake(SA.type !== 'None'); else A.sleep(); } },
    { label: 'Touch the fingerprint sensor', action: () => {
      if (A.cur().id === 'fpenroll') { SA.enroll = Math.min(100, SA.enroll + 25); if (SA.enroll >= 100) { SA.fp = 1; A.back(); A.say('Fingerprint added. Fingerprint unlock is on.'); } else { A.refresh(); A.say(`Fingerprint ${SA.enroll} percent. Lift your finger and touch the sensor again.`); } return; }
      if (A.asleep || !A.locked) { A.say(A.asleep ? 'The screen is off. Press the side button first, or touch the sensor on the lock screen.' : 'Nothing happens: the phone is already unlocked.'); return; }
      if (!SA.fp) { A.say('Fingerprint not recognized. No fingerprint is registered.'); return; }
      if (SA.restarted) { A.say('Your PIN is required after the phone restarts. Fingerprints work again after that.'); return; }
      if (SA.until > now()) { A.say('Wait for the countdown to end.'); return; }
      A.unlock(); A.say('Fingerprint recognized. Unlocked.'); T('afp');
    } },
    { label: 'Hold the phone in front of your face', action: () => {
      if (A.cur().id === 'faceenroll') { SA.face = true; A.back(); A.say('Face registered. Face recognition is on.'); T('aface'); return; }
      if (A.locked && SA.face && !SA.restarted && SA.until <= now()) { A.unlock(); A.say('Face recognized. Unlocked.'); return; }
      A.say(A.locked ? 'Face not used: no face is registered, or your PIN is required right now.' : 'Nothing happens: the phone is already unlocked.');
    } },
    { label: 'Restart the phone', action: () => { SA.restarted = SA.type === 'PIN'; A.saved = null; A.asleep = false; A.sleep(); A.saved = [{ id: 'home', params: {} }]; A.wake(SA.type !== 'None'); A.say(`The phone restarted.${SA.restarted ? ' After a restart Android always asks for the PIN, even if you have fingerprints or face recognition.' : ''}`); } },
    { label: 'Let 30 seconds pass', action: () => { if (SA.until > now()) { SA.until = now(); clearInterval(SA.timer); SA.until = 0; A.refresh(); A.say('30 seconds have passed. You can try the PIN again.'); } else A.say('30 seconds pass. Nothing changes.'); } }
  ]);
  M.on('wake', ({ phone, locked }) => { if (phone === A && !locked && SA.type === 'None' && Lab.isDone('apin')) T('aclean'); });

  /* ---------------- iPhone ---------------- */
  const SI = { pass: null, face: false, attention: true, fails: 0, until: 0, timer: null, scan: 0, partial: false, faceOk: false, sawWait: false, swipe: false };
  const I = new M.Phone(wrapI, { os: 'ios', name: 'iPhone', status: p => `${p.asleep ? 'Screen off' : p.locked ? 'Locked' : 'Unlocked'}. Passcode ${SI.pass ? 'on' : 'off'}. Battery 76 percent.` });
  M.iosHome(I, ['Phone', 'Messages', 'Safari', 'Camera', 'Photos', 'Settings'], { Settings: () => I.go('settings') });
  I.def('settings', { title: 'Settings', render: b => b.append(I.list([{ label: 'General' }, { label: 'Accessibility' }, { label: 'Face ID and Passcode', key: 'st-fid', onClick: async () => {
    if (SI.pass) { const v = await secret('Enter Passcode', 'Passcode', 'Settings asks for your passcode before you can change it or Face ID.', x => x === SI.pass ? null : 'Wrong passcode.'); if (v === null) return; }
    I.go('fid');
  } }, { label: 'Privacy and Security' }, { label: 'Battery' }], 'Settings')) });
  I.def('fid', { title: 'Face ID and Passcode', render: b => {
    if (!SI.pass) {
      b.append(h('p', { class: 'm-note' }, 'Face ID needs a passcode as a backup. Turn the passcode on first.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'pon', onclick: async () => {
        let opt = '6';
        const sel = h('select'); [['6', '6-Digit Numeric Code'], ['4', '4-Digit Numeric Code'], ['n', 'Custom Numeric Code'], ['a', 'Custom Alphanumeric Code']].forEach(([v, l]) => sel.append(h('option', { value: v }, l))); sel.addEventListener('change', () => { opt = sel.value; });
        const ok = x => opt === '6' ? /^\d{6}$/.test(x) : opt === '4' ? /^\d{4}$/.test(x) : opt === 'n' ? /^\d{4,}$/.test(x) : x.length >= 4;
        const p1 = await secret('Set Passcode', 'Enter a passcode', 'Use 123456 for this lab.', x => ok(x) ? null : 'That passcode does not match the type chosen in Passcode Options.', M.field('Passcode Options', sel));
        if (p1 === null) return;
        const p2 = await secret('Set Passcode', 'Re-enter your new passcode', null, x => x === p1 ? null : 'Passcodes did not match. Try again.');
        if (p2 === null) return;
        SI.pass = p1; I.refresh(); I.say('Passcode turned on. Require Passcode: Immediately.'); if (p1 === '123456') T('ipass');
      } }, 'Turn Passcode On')));
      return;
    }
    b.append(h('h4', null, 'Use Face ID for'), I.list([{ label: 'iPhone Unlock', sub: SI.face ? 'On' : 'Off' }, { label: 'App Store', sub: SI.face ? 'On' : 'Off' }], 'Use Face ID for'),
      h('div', { class: 'toolbar' }, SI.face ? h('button', { type: 'button', class: 'm-danger', 'data-k': 'freset', onclick: () => { SI.face = false; I.refresh(); I.say('Face ID reset. Your face data was deleted.'); } }, 'Reset Face ID') : h('button', { type: 'button', 'data-k': 'fset', onclick: () => { SI.scan = 0; I.go('fenroll'); } }, 'Set Up Face ID')),
      h('h4', null, 'Attention'), I.list([{ label: 'Require Attention for Face ID', sub: SI.attention ? 'On: you must look at the screen with your eyes open' : 'Off', key: 'att', extra: [I.switchBtn('Require Attention for Face ID', SI.attention, v => { SI.attention = v; I.refresh(); I.say(`Require Attention for Face ID ${v ? 'on' : 'off'}.${v ? '' : ' Face ID unlocks without checking that your eyes are open and looking at the screen. VoiceOver turns this off by default; it is a little less secure.'}`); }, 'att-sw')] }], 'Attention'),
      h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'm-danger', 'data-k': 'poff', onclick: async () => {
        const r = await M.dialog({ title: 'Turn Off Passcode?', message: `Apple Pay and saved cards will be removed from this iPhone.${SI.face ? ' Face ID will also be turned off.' : ''}`, buttons: [{ label: 'Turn Off', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
        if (r.value !== 'ok') return; SI.pass = null; SI.face = false; I.refresh(); I.say('Passcode turned off.');
      } }, 'Turn Passcode Off')),
      I.list([{ label: 'Change Passcode' }, { label: 'Require Passcode', sub: 'Immediately' }, { label: 'Erase Data', sub: 'Off. Erases the iPhone after 10 failed passcode attempts' }], 'Passcode settings'));
  } });
  I.def('fenroll', { title: 'Set Up Face ID', render: b => {
    if (SI.scan === 0) b.append(h('p', null, 'How to Set Up Face ID: position your face in the camera frame, then move your head in a circle to show all the angles of your face.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'gs', onclick: () => { SI.scan = 1; I.refresh(); I.say('First scan. Move your head slowly in a circle.'); } }, 'Get Started'), h('button', { type: 'button', class: 'secondary', 'data-k': 'acc', onclick: () => { SI.partial = !SI.partial; I.say(`Use Partial Circle ${SI.partial ? 'on: you can finish with less head movement' : 'off'}.`); } }, 'Accessibility Options: Use Partial Circle')));
    else if (SI.scan === 1 || SI.scan === 3) b.append(h('p', null, `${SI.scan === 1 ? 'First' : 'Second'} Face ID scan. Look straight at the iPhone with your face inside the circle, and move your head slowly to complete the circle.`), h('p', { class: 'm-note' }, 'Use Move your head in a circle under the phone.'));
    else if (SI.scan === 2) b.append(h('p', null, 'First Face ID scan complete.'), h('button', { type: 'button', 'data-k': 'cont', onclick: () => { SI.scan = 3; I.refresh(); } }, 'Continue'));
    else b.append(h('p', null, 'Face ID is now set up.'), h('button', { type: 'button', 'data-k': 'fdone', onclick: () => { SI.face = true; I.back(); I.say('Face ID is on for iPhone Unlock.'); } }, 'Done'));
  } });
  I.def('lock', { title: 'Lock Screen', render: b => {
    if (!SI.pass) { b.append(h('p', null, '9:41, Monday, October 5.'), h('button', { type: 'button', 'data-k': 'sw', onclick: () => { I.unlock(); I.say('Opened without a passcode.'); } }, 'Swipe up to open')); return; }
    if (SI.faceOk) { b.append(h('p', null, 'Unlocked (the lock icon is open).'), h('button', { type: 'button', 'data-k': 'sw', onclick: () => { SI.faceOk = false; I.unlock(); I.say('Opened with Face ID.'); T('iface'); } }, 'Swipe up to open')); return; }
    if (SI.until > now()) { b.append(h('p', { 'data-k': 'cd' }, `iPhone Unavailable. Try again in ${Math.ceil((SI.until - now()) / 1000)} seconds.`), h('p', { class: 'm-note' }, 'Use Let 1 minute pass to skip ahead.')); return; }
    if (!SI.swipe) { b.append(h('p', null, '9:41, Monday, October 5. Locked.'), h('button', { type: 'button', 'data-k': 'sw', onclick: () => { SI.swipe = true; I.refresh(); } }, 'Swipe up to unlock')); return; }
    b.append(lockPad(I, 'Enter Passcode', v => {
      if (v === SI.pass) { const after = SI.sawWait; SI.fails = 0; SI.swipe = false; SI.sawWait = false; I.unlock(); I.say('Unlocked.'); T('iunlock'); if (after) T('iafter'); return; }
      SI.fails++;
      if (SI.fails >= 6) { SI.until = now() + 60000; SI.sawWait = true; SI.swipe = false; T('iunavail'); countdown(I, SI, SI.until, s => `iPhone Unavailable. Try again in ${s} seconds.`); I.refresh(); I.say('iPhone Unavailable. Try again in 1 minute.'); return; }
      I.say('Wrong passcode. The iPhone vibrates and the screen stays locked.');
    }, () => SI.pass.length));
  } });
  I.physical([
    { label: 'Press the side button', action: () => { if (I.asleep) { SI.swipe = false; SI.faceOk = false; I.wake(true); } else I.sleep(); } },
    { label: 'Look at the iPhone', action: () => {
      if (I.asleep) { I.say('The screen is off. Raise to Wake or tap the screen to wake it: press the side button.'); return; }
      if (!I.locked) { I.say('Nothing happens: the iPhone is already unlocked.'); return; }
      if (!SI.pass || !SI.face) { I.say('Face ID is not set up, so the iPhone stays locked.'); return; }
      if (SI.until > now()) { I.say('Face ID is not available while the iPhone is unavailable.'); return; }
      SI.faceOk = true; I.refresh(); I.say('Face ID recognized you. The lock icon opens. Swipe up to open.');
    } },
    { label: 'Move your head in a circle', action: () => {
      if (I.cur().id !== 'fenroll' || !(SI.scan === 1 || SI.scan === 3)) { I.say('Nothing to do: this is for Face ID setup scans.'); return; }
      SI.scan++; I.refresh(); I.say(SI.scan === 2 ? 'First Face ID scan complete. Choose Continue.' : 'Second scan complete. Face ID is now set up. Choose Done.');
    } },
    { label: 'Let 1 minute pass', action: () => { if (SI.until > now()) { clearInterval(SI.timer); SI.until = 0; SI.swipe = true; I.refresh(); I.say('A minute has passed. Enter your passcode.'); } else I.say('A minute passes. Nothing changes.'); } }
  ]);
  M.on('unlock', ({ phone }) => { if (phone === I && !SI.pass && !SI.face && Lab.isDone('ipass')) T('iclean'); });
})();
