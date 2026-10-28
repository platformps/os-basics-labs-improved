/* Lab 4.3.4: Mobile Device Features */
(() => {
  const { h } = Lab;
  const T = Lab.complete;
  Lab.init({
    id: '4.3.4', title: 'Lab 4.3.4 Mobile Device Features', onReset: () => location.reload(),
    tasks: [
      { id: 'arotoff', label: 'Android: rotate the phone with auto-rotate off' },
      { id: 'aroton', label: 'Android: rotate the phone with auto-rotate on' },
      { id: 'abright', label: 'Android: set brightness all the way up, then all the way down' },
      { id: 'aadapt', label: 'Android: turn on adaptive brightness and change the room lighting' },
      { id: 'aloc', label: 'Android: open Maps with location off, then let it turn location on' },
      { id: 'ilock', label: 'iPhone: rotate with Portrait Orientation Lock on' },
      { id: 'iunlock', label: 'iPhone: rotate with the lock off' },
      { id: 'ibright', label: 'iPhone: change brightness in Control Center' },
      { id: 'idisplay', label: 'iPhone: explore Display and Brightness' },
      { id: 'iloc', label: 'iPhone: turn Location Services off and on, then locate yourself in Maps' },
      { id: 'igeo', label: 'iPhone: stop the Camera from geotagging photos' }
    ]
  });
  const M = Mobile;
  const { wrapA, wrapI } = M.twoPhones(document.getElementById('sim'), ['Android phone (Samsung Galaxy)', 'iPhone']);
  const LIGHT = { sun: ['bright sunlight', 100], room: ['an ordinary indoor room', 60], dark: ['a dark room', 20] };

  /* ---------------- Android ---------------- */
  const screenLand = s => s.devLand && s.rot;
  const SA = { rot: false, devLand: false, bright: 60, adapt: false, light: 'room', loc: true, sawMax: false, panelFrom: null };
  const A = new M.Phone(wrapA, { os: 'android', name: 'Android phone', status: () => `Wi-Fi connected. ${SA.loc ? 'Location on.' : 'Location off.'} Battery 82 percent. Screen ${screenLand(SA) ? 'landscape' : 'portrait'}, brightness ${SA.bright} percent` });
  const sysA = n => ({ name: n, system: true });
  M.androidLauncher(A, { apps: { phone: sysA('Phone'), messages: sysA('Messages'), chrome: sysA('Chrome'), camera: sysA('Camera'), settings: Object.assign(sysA('Settings'), { open: p => p.go('settings') }), maps: Object.assign(sysA('Maps'), { open: p => p.go('maps') }), gallery: sysA('Gallery'), calculator: sysA('Calculator') },
    dock: ['phone', 'messages', 'chrome', 'camera'], pages: [[{ id: 'm1', kind: 'app', app: 'maps', w: 1, h: 1, r: 0, c: 0 }, { id: 'm2', kind: 'app', app: 'gallery', w: 1, h: 1, r: 0, c: 1 }, { id: 'm3', kind: 'app', app: 'calculator', w: 1, h: 1, r: 0, c: 2 }, { id: 'm4', kind: 'app', app: 'settings', w: 1, h: 1, r: 0, c: 3 }]] });
  const meter = v => h('span', { class: 'm-meter', 'aria-hidden': 'true' }, h('span', { style: `width:${v}%` }));
  function setBright(v, done, P, S) {
    S.bright = v; P.updateStatus();
    if (done) { const m = `Brightness ${v} percent.${v === 100 ? ' The screen is as bright as it goes.' : v === 0 ? ' The screen is as dark as it goes; it does not turn off.' : ''}`; if (v === 100 || v === 0) P.say(m); else P.toast.textContent = m; if (S === SA) { if (v === 100) SA.sawMax = true; if (v === 0 && SA.sawMax) T('abright'); } else T('ibright'); }
  }
  const brightA = () => A.slider('Brightness', SA.bright, (v, done) => { if (SA.adapt && done) A.say('Adaptive brightness is on, so the phone will keep adjusting from here based on the light around you.'); setBright(v, done, A, SA); }, 'bright');
  A.def('panel', { title: 'Quick settings panel', render: b => {
    b.append(brightA(), meter(SA.bright), A.list([
      { label: 'Wi-Fi', sub: 'On', key: 'q-wifi' },
      { label: 'Auto rotate', sub: SA.rot ? 'On' : 'Off, locked to portrait', key: 'q-rot', extra: [A.switchBtn('Auto rotate', SA.rot, v => setRot(v), 'q-rot-sw')] },
      { label: 'Location', sub: SA.loc ? 'On' : 'Off', key: 'q-loc', extra: [A.switchBtn('Location', SA.loc, v => setLocA(v), 'q-loc-sw')] },
      { label: 'Flashlight', sub: 'Off', key: 'q-flash' }, { label: 'Bluetooth', sub: 'On', key: 'q-bt' }], 'Quick settings'));
  } });
  function setRot(v) { SA.rot = v; A.refresh(); A.say(`Auto rotate ${v ? 'on. The screen will follow the way you hold the phone.' : 'off. The screen stays in portrait.'}${SA.devLand ? (v ? ' You are holding the phone sideways, so the screen turns to landscape now.' : ' The screen goes back to portrait.') : ''}`); A.el.classList.toggle('landscape', screenLand(SA)); }
  function setLocA(v) { SA.loc = v; A.refresh(); A.say(`Location ${v ? 'on. Apps can use GPS, Wi-Fi, and mobile networks to find you.' : 'off.'}`); }
  A.def('settings', { title: 'Settings', render: b => b.append(A.list([{ label: 'Connections' }, { label: 'Display', sub: 'Brightness, Auto rotate, Dark mode', onClick: () => A.go('display') }, { label: 'Location', sub: SA.loc ? 'On' : 'Off', onClick: () => A.go('location') }, { label: 'Accessibility', sub: 'TalkBack, vision, hearing' }, { label: 'Battery' }, { label: 'About phone' }], 'Settings')) });
  A.def('display', { title: 'Display', render: b => {
    b.append(h('h4', null, 'Brightness'), brightA(), meter(SA.bright),
      A.list([{ label: 'Adaptive brightness', sub: SA.adapt ? 'On: adjusts to the light around you' : 'Off', key: 'd-ad', extra: [A.switchBtn('Adaptive brightness', SA.adapt, v => { SA.adapt = v; if (v) adaptNow(A, SA); A.refresh(); A.say(v ? `Adaptive brightness on. The phone reads its light sensor: you are in ${LIGHT[SA.light][0]}, so brightness is now ${SA.bright} percent. Try Change the room lighting.` : 'Adaptive brightness off. Brightness stays where you set it.'); }, 'd-ad-sw')] },
        { label: 'Auto rotate screen', sub: SA.rot ? 'On' : 'Off', key: 'd-rot', extra: [A.switchBtn('Auto rotate screen', SA.rot, v => setRot(v), 'd-rot-sw')] },
        { label: 'Dark mode', sub: 'Off' }, { label: 'Font size and style' }, { label: 'Screen timeout', sub: '30 seconds' }], 'Display settings'));
  } });
  A.def('location', { title: 'Location', render: b => b.append(h('div', { class: 'm-big-switch' }, h('span', { class: 'lbl', 'aria-hidden': 'true' }, SA.loc ? 'On' : 'Off'), A.switchBtn('Use location', SA.loc, v => setLocA(v), 'l-sw')), h('p', { class: 'm-note' }, 'Location may use sources like GPS, Wi-Fi, mobile networks, and sensors to help estimate where your phone is.')) });
  const mapsSeen = { a: false };
  A.def('maps', { title: 'Maps', render: b => {
    b.append(h('p', null, SA.loc ? 'Your location: Main Street at 2nd Avenue, shown as a blue dot. Accuracy: about 5 meters.' : 'Location is off. Maps shows a general area from your Wi-Fi network and internet address: somewhere in your city, accuracy about 2 kilometers.'),
      h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'mylocA', onclick: async () => {
        if (SA.loc) { A.say('Centered on your location. Accuracy about 5 meters.'); if (mapsSeen.a) T('aloc'); return; }
        mapsSeen.a = true;
        const r = await M.dialog({ title: 'Turn on device location?', message: 'For a better experience, turn on device location, which uses Google’s location service.', buttons: [{ label: 'Turn on', value: 'ok', primary: true }, { label: 'No thanks', value: 'cancel' }] });
        if (r.value !== 'ok') { A.say('Location is still off. Maps can only guess roughly where you are.'); return; }
        SA.loc = true; A.refresh(); A.say('Location turned on. Maps found you: Main Street at 2nd Avenue, accuracy about 5 meters.'); T('aloc');
      } }, 'Show my location (crosshair)')));
  } });
  function adaptNow(P, S) { S.bright = LIGHT[S.light][1]; P.updateStatus(); }
  const lightPick = (P, S) => async () => {
    let v = S.light;
    const fs = h('fieldset', null, h('legend', null, 'Where is the phone?'), ...Object.entries(LIGHT).map(([k, [l]]) => { const r = h('input', { type: 'radio', name: 'light-' + P.os, id: `lt-${P.os}-${k}`, value: k }); r.checked = k === v; r.addEventListener('change', () => { v = k; }); return h('div', { class: 'opt' }, r, h('label', { for: `lt-${P.os}-${k}` }, l[0].toUpperCase() + l.slice(1))); }));
    const r = await M.dialog({ title: 'Change the room lighting', body: fs, buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
    if (r.value !== 'ok') return;
    S.light = v;
    const auto = P.os === 'ios' ? S.autoB : S.adapt;
    if (auto) { adaptNow(P, S); P.refresh(); P.say(`You are now in ${LIGHT[v][0]}. The light sensor noticed, and brightness changed to ${S.bright} percent on its own.`); if (P === A && v !== 'room') T('aadapt'); }
    else P.say(`You are now in ${LIGHT[v][0]}. ${P.os === 'ios' ? 'Auto-Brightness' : 'Adaptive brightness'} is off, so the screen brightness stays at ${S.bright} percent.`);
  };
  function rotate(P, S, iosCalc) {
    S.devLand = !S.devLand;
    const locked = P.os === 'ios' ? S.lock : !S.rot;
    const land = S.devLand && !locked;
    P.el.classList.toggle('landscape', land);
    P.updateStatus();
    let msg = `You turned the phone a quarter turn ${S.devLand ? 'clockwise, so you are holding it sideways' : 'back, so you are holding it upright'}. `;
    msg += locked ? (S.devLand ? 'The screen stays in portrait: rotation is locked.' : 'The screen is in portrait.') : (S.devLand ? 'The screen rotates to landscape to match.' : 'The screen rotates back to portrait.');
    if (iosCalc && P.cur().id === 'calc') { P.refresh(); msg += land ? ' The Calculator now shows the scientific calculator.' : ' The Calculator shows the basic calculator.'; }
    P.say(msg);
    return { locked, sideways: S.devLand };
  }
  A.physical([
    { label: 'Rotate the phone 90 degrees clockwise', action: () => { const r = rotate(A, SA); if (r.sideways) T(r.locked ? 'arotoff' : 'aroton'); } },
    { label: 'Swipe down from the top (open quick settings)', action: () => { if (A.cur().id !== 'panel') A.go('panel'); else A.say('Quick settings are already open.'); } },
    { label: 'Change the room lighting', action: lightPick(A, SA) }
  ]);

  /* ---------------- iPhone ---------------- */
  const SI = { lock: false, devLand: false, bright: 60, autoB: true, trueTone: true, light: 'room', loc: true, dark: false, auto: false, bold: false, raise: true, zoom: 'Default', camLoc: 'While Using the App', seenMapsOff: false, locWasOff: false, display: new Set() };
  const I = new M.Phone(wrapI, { os: 'ios', name: 'iPhone', status: () => `Wi-Fi connected. ${SI.lock ? 'Portrait Orientation Lock on. ' : ''}${SI.loc ? 'Location Services on.' : 'Location Services off.'} Battery 76 percent. Screen ${SI.devLand && !SI.lock ? 'landscape' : 'portrait'}, brightness ${SI.bright} percent` });
  M.iosHome(I, ['Phone', 'Messages', 'Safari', 'Camera', 'Photos', 'Maps', 'Calculator', 'Weather', 'Settings'], { Settings: () => I.go('settings'), Calculator: () => I.go('calc'), Maps: () => I.go('imaps') });
  I.def('cc', { title: 'Control Center', render: b => {
    b.append(I.list([{ label: 'Portrait Orientation Lock', sub: SI.lock ? 'On' : 'Off', key: 'cc-lock', extra: [I.switchBtn('Portrait Orientation Lock', SI.lock, v => { SI.lock = v; I.el.classList.toggle('landscape', SI.devLand && !v); I.refresh(); I.say(`Portrait Orientation Lock ${v ? 'on. The screen will stay upright however you hold the iPhone.' : 'off. The screen can turn to match the iPhone.'}`); }, 'cc-lock-sw')] },
      { label: 'Wi-Fi', sub: 'On', key: 'cc-wifi' }, { label: 'Bluetooth', sub: 'On', key: 'cc-bt' }, { label: 'Focus', key: 'cc-focus' }], 'Control Center controls'),
    I.slider('Display Brightness', SI.bright, (v, done) => setBright(v, done, I, SI), 'cc-bright'), meter(SI.bright),
    h('p', { class: 'm-note' }, 'Swipe up, or choose Home or Back, to close Control Center.'));
  } });
  I.def('calc', { title: 'Calculator', render: b => {
    const land = SI.devLand && !SI.lock;
    b.append(h('p', null, land ? 'Scientific calculator (landscape): extra keys for parentheses, x squared, square root, sin, cos, tan, log, and more.' : 'Basic calculator (portrait): digits 0 to 9, add, subtract, multiply, divide, percent, and equals.'));
  } });
  I.def('settings', { title: 'Settings', render: b => b.append(I.list([{ label: 'Wi-Fi', sub: 'HomeNet' }, { label: 'Bluetooth', sub: 'On' }, { label: 'General' }, { label: 'Accessibility' }, { label: 'Display and Brightness', onClick: () => I.go('display'), key: 's-disp' }, { label: 'Privacy and Security', onClick: () => I.go('privacy'), key: 's-priv' }, { label: 'Battery' }], 'Settings')) });
  const seeD = k => { SI.display.add(k); if (SI.display.size >= 3) T('idisplay'); };
  I.def('display', { title: 'Display and Brightness', render: b => {
    const sw = (label, key, sub, extra) => ({ label, sub, key: 'd-' + key, extra: [I.switchBtn(label, SI[key], v => { SI[key] = v; seeD(key); if (extra) extra(v); I.refresh(); I.say(`${label} ${v ? 'on' : 'off'}.`); }, 'd-' + key + '-sw')] });
    b.append(h('h4', null, 'Appearance'), h('div', { role: 'radiogroup', 'aria-label': 'Appearance', class: 'toolbar' }, ...['Light', 'Dark'].map(m => h('button', { type: 'button', role: 'radio', 'aria-checked': String((m === 'Dark') === SI.dark), class: 'secondary', 'data-k': 'ap-' + m, onclick: () => { SI.dark = m === 'Dark'; seeD('appearance'); I.refresh(); I.say(`${m} appearance selected.`); } }, m))),
      I.list([sw('Automatic', 'auto', SI.auto ? 'Light until sunset, Dark until sunrise' : 'Off'), { label: 'Options', sub: 'Sunset to Sunrise, or a Custom Schedule', key: 'd-opt', onClick: () => { seeD('options'); I.say('Options: Sunset to Sunrise, or Custom Schedule (for example Light at 7:00 AM and Dark at 10:00 PM).'); } }], 'Appearance options'),
      h('h4', null, 'Text'), I.list([{ label: 'Text Size', key: 'd-ts', onClick: () => { seeD('text'); I.say('Text Size: drag the slider to choose a larger or smaller reading size. Apps that support Dynamic Type follow it.'); } }, sw('Bold Text', 'bold')], 'Text'),
      h('h4', null, 'Brightness'), I.slider('Brightness', SI.bright, (v, done) => setBright(v, done, I, SI), 'd-bright'), meter(SI.bright),
      I.list([sw('True Tone', 'trueTone', 'Adapts the display to the light around you'), { label: 'Night Shift', sub: 'Off. Shifts colors warmer after dark', key: 'd-ns', onClick: () => { seeD('nightshift'); I.say('Night Shift shifts the display colors to the warmer end of the spectrum after dark. Schedule: Sunset to Sunrise.'); } },
        { label: 'Auto-Lock', sub: '30 seconds', key: 'd-al', onClick: () => { seeD('autolock'); I.say('Auto-Lock locks the iPhone after 30 seconds, 1 to 5 minutes, or Never.'); } }, sw('Raise to Wake', 'raise', 'Wakes the screen when you pick up the iPhone'),
        { label: 'Display Zoom', sub: SI.zoom, key: 'd-zoom', onClick: () => { seeD('zoom'); SI.zoom = SI.zoom === 'Default' ? 'Larger Text' : 'Default'; I.refresh(); I.say(`Display Zoom: ${SI.zoom}.`); } }], 'Display options'),
      h('p', { class: 'm-note' }, 'Auto-Brightness itself is in Settings, Accessibility, Display and Text Size.'));
  } });
  I.def('privacy', { title: 'Privacy and Security', render: b => b.append(I.list([{ label: 'Location Services', sub: SI.loc ? 'On' : 'Off', key: 'p-loc', onClick: () => I.go('locsvc') }, { label: 'Tracking' }, { label: 'Contacts' }, { label: 'Photos' }, { label: 'Camera' }], 'Privacy and Security')) });
  const APPS = () => [['Camera', SI.camLoc], ['Find My', 'While Using the App'], ['Maps', 'While Using the App'], ['Safari Websites', 'Never'], ['Weather', 'Always']];
  I.def('locsvc', { title: 'Location Services', render: b => {
    b.append(h('div', { class: 'm-big-switch' }, h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Location Services'), I.switchBtn('Location Services', SI.loc, async v => {
      if (!v) { const r = await M.dialog({ title: 'Location Services', message: 'Location Services will be disabled for all apps, but your personalized Location Services settings for apps will be temporarily restored if you use Find My to enable Lost Mode.', buttons: [{ label: 'Turn Off', value: 'off', primary: true }, { label: 'Cancel', value: 'cancel' }] }); if (r.value !== 'off') return; SI.locWasOff = true; }
      SI.loc = v; I.refresh(); I.say(`Location Services ${v ? 'on' : 'off'}.`);
    }, 'ls-sw')));
    if (SI.loc) b.append(h('h4', null, 'Apps that can use your location'), I.list(APPS().map(([n, a]) => ({ label: n, sub: a, key: 'la-' + n, onClick: n === 'Camera' ? () => I.go('camloc') : () => I.say(`${n} can use your location: ${a}.`) })), 'Apps using location'));
    else b.append(h('p', { class: 'm-note' }, 'No apps can use your location while Location Services is off.'));
  } });
  I.def('camloc', { title: 'Camera', render: b => {
    let fs = h('fieldset', null, h('legend', null, 'Allow location access'), ...['Never', 'Ask Next Time Or When I Share', 'While Using the App'].map((o, i) => { const r = h('input', { type: 'radio', name: 'camloc', id: 'cl' + i, value: o, 'data-k': 'cl' + i }); r.checked = SI.camLoc === o; r.addEventListener('change', () => { SI.camLoc = o; I.say(`Camera location access: ${o}.${o === 'Never' ? ' New photos will not record where they were taken.' : ''}`); if (o === 'Never') T('igeo'); }); return h('div', { class: 'opt' }, r, h('label', { for: 'cl' + i }, o)); }));
    b.append(h('p', null, 'When the Camera can use your location, every photo stores where it was taken. This is called geotagging. Anyone you share the photo with may be able to see that place.'), fs);
  } });
  I.def('imaps', { title: 'Maps', render: b => {
    b.append(h('p', null, SI.loc ? 'Map of your area.' : 'Map of the whole country. Maps does not know where you are.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'iloc', onclick: async () => {
      if (!SI.loc) { SI.seenMapsOff = true; const r = await M.dialog({ title: 'Location Services Off', message: 'Turn on Location Services in Settings, Privacy and Security to allow “Maps” to determine your location.', buttons: [{ label: 'Settings', value: 'set', primary: true }, { label: 'OK', value: 'ok' }] }); if (r.value === 'set') { I.go('privacy'); I.go('locsvc'); } return; }
      I.say('Current location: Main Street at 2nd Avenue, shown as a blue dot, accurate to about 5 meters.');
      if (SI.locWasOff && SI.seenMapsOff) T('iloc');
    } }, 'Current Location (arrow button)')));
  } });
  I.physical([
    { label: 'Rotate the iPhone 90 degrees clockwise', action: () => { const r = rotate(I, SI, true); if (r.sideways) T(r.locked ? 'ilock' : 'iunlock'); } },
    { label: 'Swipe down from the top right corner (open Control Center)', action: () => { if (I.cur().id !== 'cc') I.go('cc'); else I.say('Control Center is already open.'); } },
    { label: 'Change the room lighting', action: lightPick(I, SI) }
  ]);
})();
