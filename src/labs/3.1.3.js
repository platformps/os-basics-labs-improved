/* Lab 3.1.3: Mobile Wi-Fi */
(() => {
  const { h, announce } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '3.1.3', title: 'Lab 3.1.3 Mobile Wi-Fi', onReset: () => location.reload(),
    tasks: [
      { id: 'aoff', label: 'Android: turn Wi-Fi off' },
      { id: 'aon', label: 'Android: turn Wi-Fi on and reconnect' },
      { id: 'aforget', label: 'Android: forget HomeNet' },
      { id: 'ajoin', label: 'Android: join HomeNet again with the password' },
      { id: 'ioff', label: 'iPhone: turn Wi-Fi off' },
      { id: 'ion', label: 'iPhone: turn Wi-Fi on and reconnect' },
      { id: 'iforget', label: 'iPhone: forget HomeNet' },
      { id: 'ijoin', label: 'iPhone: join HomeNet again with the password' }
    ]
  });
  const M = Mobile;
  const nets = () => [
    { ssid: 'HomeNet', secure: true, password: 'NetLab2026!', strength: 3 },
    { ssid: 'Neighbor-5G', secure: true, password: 'not-yours-123', strength: 2 },
    { ssid: 'CoffeeShop Guest', secure: false, strength: 1 },
    { ssid: 'PS-Learners', secure: true, password: 'not-yours-456', strength: 1 }
  ];
  const sim = document.getElementById('sim');
  let current = 'android';
  const pick = h('div', { class: 'device-pick' }, h('fieldset', null, h('legend', null, 'Phone'),
    ...[['android', 'Android phone (Samsung Galaxy)'], ['ios', 'iPhone']].map(([v, l]) => {
      const r = h('input', { type: 'radio', name: 'phone-pick', id: 'pp-' + v, value: v }); r.checked = v === current;
      r.addEventListener('change', () => { if (r.checked) show(v); });
      return h('div', { class: 'opt' }, r, h('label', { for: 'pp-' + v }, l));
    })));
  const wrapA = h('div'), wrapI = h('div', { hidden: true });
  sim.append(pick, wrapA, wrapI);
  function show(v) { current = v; wrapA.hidden = v !== 'android'; wrapI.hidden = v !== 'ios'; announce(v === 'ios' ? 'iPhone selected. Home Screen.' : 'Android phone selected.'); }

  /* Android */
  const WA = M.wifiModel({ connected: 'HomeNet', saved: { HomeNet: 'NetLab2026!' }, nets: nets() });
  const A = new M.Phone(wrapA, { os: 'android', name: 'Android phone', status: () => WA.status() + '. Battery 82 percent.' });
  M.androidSettings(A, WA);
  const apps = { phone: { name: 'Phone', system: true }, messages: { name: 'Messages', system: true }, chrome: { name: 'Chrome', system: true }, camera: { name: 'Camera', system: true },
    settings: { name: 'Settings', system: true, open: P => P.go('settings') }, gallery: { name: 'Gallery', system: true }, calendar: { name: 'Calendar', system: true }, clock: { name: 'Clock', system: true }, play: { name: 'Play Store', system: true }, gmail: { name: 'Gmail', system: true } };
  M.androidLauncher(A, { apps, dock: ['phone', 'messages', 'chrome', 'camera'], pages: [[
    { id: 'h1', kind: 'app', app: 'gallery', w: 1, h: 1, r: 0, c: 0 }, { id: 'h2', kind: 'app', app: 'calendar', w: 1, h: 1, r: 0, c: 1 }, { id: 'h3', kind: 'app', app: 'play', w: 1, h: 1, r: 0, c: 2 }, { id: 'h4', kind: 'app', app: 'gmail', w: 1, h: 1, r: 0, c: 3 }]] });

  /* iPhone */
  const WI = M.wifiModel({ connected: 'HomeNet', saved: { HomeNet: 'NetLab2026!' }, nets: nets() });
  const I = new M.Phone(wrapI, { os: 'ios', name: 'iPhone', status: () => WI.status() + '. Battery 76 percent.' });
  M.iosSettings(I, WI);
  M.iosHome(I, ['Phone', 'Messages', 'Safari', 'Mail', 'Camera', 'Photos', 'Calendar', 'App Store', 'Settings'], { Settings: () => I.go('settings') });

  const seen = { android: false, ios: false };
  M.on('wifi:toggle', ({ os, on }) => { const p = os === 'ios' ? 'i' : 'a'; if (!on) { seen[os] = true; T(p + 'off'); } });
  M.on('wifi:connected', ({ os, ssid, auto }) => {
    const p = os === 'ios' ? 'i' : 'a';
    if (ssid !== 'HomeNet') return;
    if (auto && seen[os]) T(p + 'on');
    if (!auto && Lab.isDone(p + 'forget')) T(p + 'join');
  });
  M.on('wifi:forget', ({ os, ssid }) => { if (ssid === 'HomeNet') T((os === 'ios' ? 'i' : 'a') + 'forget'); });
})();
