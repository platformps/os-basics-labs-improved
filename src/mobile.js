/* Simulated phones (Android and iOS) for the Module 3 and 4 labs. */
const Mobile = (() => {
  const { h, announce } = Lab;
  const bus = new EventTarget();
  const on = (t, f) => bus.addEventListener(t, e => f(e.detail));
  const emit = (t, d) => bus.dispatchEvent(new CustomEvent(t, { detail: d }));
  let dseq = 0;

  /* Native modal dialog. buttons: [{label, value, primary, disabled}] */
  function dialog({ title, message, body, buttons = [{ label: 'OK', value: 'ok', primary: true }], cancelValue = 'cancel', validate, onRender }) {
    return new Promise(resolve => {
      const id = 'mdlg' + (++dseq);
      const opener = document.activeElement;
      const b = h('div', { class: 'dlg-body', id: id + '-b' });
      if (message) b.append(h('p', null, message));
      if (body) b.append(body);
      const err = h('p', { class: 'dlg-error', role: 'alert' });
      b.append(err);
      const foot = h('div', { class: 'dlg-foot' });
      const d = h('dialog', { 'aria-labelledby': id + '-t', 'aria-describedby': message ? id + '-b' : null }, h('div', { class: 'dlg-head' }, h('h2', { id: id + '-t' }, title)), b, foot);
      let result = cancelValue;
      buttons.forEach(x => {
        const btn = h('button', { type: 'button', class: x.primary ? '' : 'secondary', disabled: x.disabled || null, 'data-v': x.value }, x.label);
        btn.addEventListener('click', () => {
          if (validate && x.value !== cancelValue) { const e = validate(x.value, b); if (e) { err.textContent = e; return; } }
          result = x.value; d.close();
        });
        foot.append(btn);
      });
      d.addEventListener('cancel', () => { result = cancelValue; });
      d.addEventListener('close', () => { d.remove(); resolve({ value: result, body: b }); setTimeout(() => { if (document.activeElement === document.body && opener && opener.isConnected) opener.focus(); }, 0); });
      document.body.append(d);
      if (onRender) onRender(b, d, foot);
      d.showModal();
      const first = b.querySelector('[autofocus],input:not([type=hidden]),select,textarea') || foot.querySelector('button:not([disabled])');
      if (first) first.focus();
    });
  }
  /* A list of choices in a dialog, like the TalkBack or VoiceOver actions menu. */
  function actionsMenu(title, items) {
    return new Promise(resolve => {
      let picked = null;
      const ul = h('ul', { class: 'm-actions' });
      items.forEach(it => ul.append(h('li', null, h('button', { type: 'button', class: 'secondary', disabled: it.disabled || null, onclick: e => { picked = it; e.target.closest('dialog').close(); } }, it.label))));
      dialog({ title, body: ul, buttons: [{ label: 'Close', value: 'cancel' }] }).then(() => { if (picked && picked.action) setTimeout(() => picked.action(), 0); resolve(picked); });
    });
  }
  function field(label, input, hint) {
    const id = input.id || ('mf' + (++dseq)); input.id = id;
    const kids = [h('label', { for: id }, label)];
    if (hint) { const hid = id + '-h'; input.setAttribute('aria-describedby', hid); kids.push(h('span', { class: 'hint', id: hid }, hint)); }
    kids.push(input);
    return h('div', { class: 'field' }, ...kids);
  }
  function checkbox(label, checked, onChange) {
    const id = 'mcb' + (++dseq);
    const c = h('input', { type: 'checkbox', id }); c.checked = !!checked; c.addEventListener('change', () => onChange && onChange(c.checked));
    return h('div', { class: 'opt' }, c, h('label', { for: id }, label));
  }

  class Phone {
    constructor(container, opts) {
      this.os = opts.os; this.name = opts.name; this.screens = {}; this.stack = []; this.state = opts.state || {};
      this.clock = opts.clock || '9:41';
      const hid = 'ph' + (++dseq);
      this.statusEl = h('p', { class: 'phone-status' });
      this.title = h('h3', { class: 'scr-title', tabindex: '-1', id: hid + '-t' });
      this.body = h('div', { class: 'scr-body' });
      this.toast = h('p', { class: 'm-toast' });
      this.screenEl = h('div', { class: 'phone-screen' }, this.title, this.body, this.toast);
      const nav = h('div', { class: 'phone-nav', role: 'group', 'aria-label': `${this.name} navigation` },
        h('button', { type: 'button', class: 'secondary', onclick: () => this.back() }, 'Back'),
        h('button', { type: 'button', class: 'secondary', onclick: () => this.home(true) }, this.os === 'ios' ? 'Home (swipe up)' : 'Home'));
      this.physEl = h('div', { class: 'phone-phys', role: 'group', 'aria-label': `${this.name}: physical buttons and movements`, hidden: true });
      this.el = h('section', { class: 'phone', 'aria-label': `Simulated ${this.name}`, 'data-os': this.os }, this.statusEl, this.screenEl, nav, this.physEl);
      this.locked = false; this.asleep = false; this.saved = null;
      this.screens.off = { title: 'Screen off', render: b => b.append(h('p', null, 'The screen is dark and the phone is asleep. Press the side button to wake it.')) };
      container.append(this.el);
      this.statusFn = opts.status || (() => '');
      this.updateStatus();
    }
    def(id, spec) { this.screens[id] = spec; }
    cur() { return this.stack[this.stack.length - 1]; }
    go(id, params = {}, o = {}) {
      if (!this.screens[id]) { this.say('This is not used in this lab.'); return; }
      if (o.replace) this.stack.pop();
      this.stack.push({ id, params });
      this.render(true);
      emit('screen', { phone: this, id, params });
    }
    blocked() { if (this.asleep) { this.say('The screen is off. Press the side button to wake the phone.'); return true; } if (this.locked) { this.say('The phone is locked. Unlock it first.'); return true; } return false; }
    sleep() { if (this.asleep) return; if (!this.locked) this.saved = this.stack.slice(); this.asleep = true; this.stack = [{ id: 'off', params: {} }]; this.render(true); this.say('Screen off. The phone is asleep.'); emit('sleep', { phone: this }); }
    wake(needLock) {
      if (!this.asleep) return;
      this.asleep = false;
      if (needLock) { this.locked = true; this.stack = [{ id: 'lock', params: {} }]; this.render(true); }
      else { this.locked = false; this.stack = this.saved || [{ id: 'home', params: {} }]; this.saved = null; this.render(true); this.say('Screen on. No lock is set, so the phone opens straight away.'); }
      emit('wake', { phone: this, locked: this.locked });
    }
    unlock() { this.locked = false; this.stack = this.saved && this.saved.length ? this.saved : [{ id: 'home', params: {} }]; this.saved = null; this.render(true); emit('unlock', { phone: this }); }
    physical(items) { this.physEl.hidden = false; this.physEl.textContent = ''; this.physEl.append(h('p', { class: 'm-note', 'aria-hidden': 'true' }, 'Physical buttons and movements:')); items.forEach(it => this.physEl.append(h('button', { type: 'button', class: 'secondary', onclick: it.action }, it.label))); }
    slider(label, value, onChange, key, unit = 'percent') {
      const i = h('input', { type: 'range', min: '0', max: '100', step: '10', value: String(value), 'data-k': key || ('sl-' + label), 'aria-valuetext': `${value} ${unit}` });
      i.addEventListener('input', () => { i.setAttribute('aria-valuetext', `${i.value} ${unit}`); onChange(+i.value, false); });
      i.addEventListener('change', () => onChange(+i.value, true));
      return field(label, i);
    }
    back() {
      if (this.blocked()) return;
      if (this.stack.length <= 1) { this.say(this.os === 'ios' ? 'You are on the Home Screen.' : 'You are on the home screen.'); return; }
      this.stack.pop(); this.render(true);
      emit('screen', { phone: this, id: this.cur().id, params: this.cur().params });
    }
    home(user) { if (user && this.blocked()) return; this.stack = [{ id: 'home', params: {} }]; this.render(true); if (user) emit('screen', { phone: this, id: 'home', params: {} }); }
    render(focus) {
      const c = this.cur(); const spec = this.screens[c.id];
      const prevKey = !focus && document.activeElement && this.el.contains(document.activeElement) ? document.activeElement.dataset.k : null;
      this.title.textContent = typeof spec.title === 'function' ? spec.title(c.params, this) : spec.title;
      this.body.textContent = '';
      spec.render(this.body, c.params, this);
      this.updateStatus();
      /* Move focus to the new screen title only when the learner is working in this phone (or in a dialog it opened),
         never on page load, so screen reader users start at the top of the page. */
      const ae = document.activeElement;
      const inPhone = ae && (this.el.contains(ae) || ae.closest('dialog') || ae === this.title);
      if (focus) { this.toast.textContent = ''; if (inPhone) this.title.focus(); }
      else if (prevKey) { const el = this.body.querySelector(`[data-k="${CSS.escape(prevKey)}"]`); if (el) el.focus(); else this.title.focus(); }
    }
    refresh() { if (this.cur()) this.render(false); }
    updateStatus() { this.statusEl.textContent = `Status bar: ${this.clock}. ${this.statusFn(this)}`; }
    say(msg) { this.toast.textContent = msg; announce(msg); }
    /* widgets */
    switchBtn(label, checked, onChange, key) {
      const b = h('button', { type: 'button', role: 'switch', class: 'm-switch', 'aria-checked': String(!!checked), 'data-k': key || ('sw-' + label) }, h('span', { 'aria-hidden': 'true' }, checked ? 'On' : 'Off'));
      b.setAttribute('aria-label', label);
      b.addEventListener('click', () => onChange(!(b.getAttribute('aria-checked') === 'true')));
      return b;
    }
    list(items, label) {
      const ul = h('ul', { class: 'm-list', 'aria-label': label || null });
      items.forEach(it => {
        const li = h('li');
        const main = h('button', { type: 'button', class: 'm-row', 'data-k': it.key || it.label, onclick: it.onClick || (() => this.say(`${it.label} is not used in this lab.`)) }, it.label, it.sub ? h('span', { class: 'm-sub' }, h('span', { class: 'sr-only' }, ', '), it.sub) : null);
        li.append(main);
        (it.extra || []).forEach(x => li.append(x));
        ul.append(li);
      });
      return ul;
    }
  }

  /* Two phones with a picker, for labs with an Android part and an iOS part */
  function twoPhones(sim, labels = ['Android phone', 'iPhone']) {
    let cur = 'android';
    const wrapA = h('div'), wrapI = h('div', { hidden: true });
    const pick = h('div', { class: 'device-pick' }, h('fieldset', null, h('legend', null, 'Phone'), ...[['android', labels[0]], ['ios', labels[1]]].map(([v, l]) => {
      const r = h('input', { type: 'radio', name: 'phone-pick', id: 'pp-' + v, value: v }); r.checked = v === cur;
      r.addEventListener('change', () => { if (!r.checked) return; cur = v; wrapA.hidden = v !== 'android'; wrapI.hidden = v !== 'ios'; announce(`${l} selected.`); });
      return h('div', { class: 'opt' }, r, h('label', { for: 'pp-' + v }, l));
    })));
    sim.append(pick, wrapA, wrapI);
    return { wrapA, wrapI };
  }

  /* ---------------- Wi-Fi model shared by Android and iOS ---------------- */
  function wifiModel(opts) {
    const W = { on: true, connected: opts.connected, saved: Object.assign({}, opts.saved), nets: opts.nets, busy: null, fail: {}, phones: [] };
    W.net = ssid => W.nets.find(n => n.ssid === ssid);
    W.update = () => W.phones.forEach(p => { p.refresh(); p.updateStatus(); });
    W.setOn = (v, phone) => {
      if (W.on === v) return;
      W.on = v; W.busy = null;
      if (!v) { W.connected = null; W.update(); phone.say('Wi-Fi turned off. Not connected to any network.', false); emit('wifi:toggle', { os: phone.os, on: false }); return; }
      W.busy = 'scan'; W.update(); phone.say('Wi-Fi turned on. Scanning for networks...', false);
      emit('wifi:toggle', { os: phone.os, on: true });
      setTimeout(() => {
        W.busy = null;
        const auto = W.nets.find(n => W.saved[n.ssid] !== undefined);
        if (auto) W.connect(auto.ssid, W.saved[auto.ssid], phone, true); else { W.update(); phone.say(`${W.nets.length} networks found. Not connected.`, false); }
      }, 900);
    };
    W.connect = (ssid, pw, phone, auto) => {
      const n = W.net(ssid);
      W.busy = 'connect:' + ssid; W.update();
      phone.say(`Connecting to ${ssid}...`, false);
      setTimeout(() => {
        W.busy = null;
        if (n.secure && pw !== n.password) { delete W.fail[ssid]; W.fail[ssid] = true; W.update(); emit('wifi:fail', { os: phone.os, ssid }); phone.say(phone.os === 'ios' ? `Incorrect password for ${ssid}.` : `Couldn't connect to ${ssid}. Check the password and try again.`, false); if (phone.os === 'ios') dialog({ title: `Incorrect password for “${ssid}”`, buttons: [{ label: 'OK', value: 'ok', primary: true }] }); return; }
        delete W.fail[ssid];
        W.saved[ssid] = pw || ''; W.connected = ssid; W.update();
        phone.say(`Connected to ${ssid}.`, false);
        emit('wifi:connected', { os: phone.os, ssid, auto: !!auto });
      }, 800);
    };
    W.forget = (ssid, phone) => {
      delete W.saved[ssid];
      if (W.connected === ssid) W.connected = null;
      W.update();
      emit('wifi:forget', { os: phone.os, ssid });
    };
    W.status = () => !W.on ? 'Wi-Fi off' : W.connected ? `Wi-Fi connected to ${W.connected}` : W.busy ? 'Wi-Fi searching' : 'Wi-Fi on, not connected';
    return W;
  }
  const bars = s => ({ 3: 'strong signal', 2: 'medium signal', 1: 'weak signal' }[s]);

  /* Android (Samsung Galaxy, One UI) settings with Wi-Fi */
  function androidSettings(P, W) {
    W.phones.push(P);
    P.def('settings', { title: 'Settings', render: (b) => {
      b.append(P.list([
        { label: 'Connections', sub: 'Wi-Fi, Bluetooth, SIM manager', onClick: () => P.go('connections') },
        { label: 'Connected devices' }, { label: 'Modes and Routines' }, { label: 'Sounds and vibration' }, { label: 'Notifications' }, { label: 'Display' }, { label: 'Battery' }, { label: 'Apps' }, { label: 'Accessibility' }, { label: 'About phone' }], 'Settings'));
    } });
    P.def('connections', { title: 'Connections', render: (b) => {
      const bt = P.state.bt !== false;
      b.append(P.list([
        { label: 'Wi-Fi', sub: !W.on ? 'Off' : W.connected || (W.busy ? 'Searching' : 'Not connected'), key: 'c-wifi', onClick: () => P.go('wifi'), extra: [P.switchBtn('Wi-Fi', W.on, v => W.setOn(v, P), 'c-wifi-sw')] },
        { label: 'Bluetooth', sub: bt ? 'On' : 'Off', key: 'c-bt', extra: [P.switchBtn('Bluetooth', bt, v => { P.state.bt = v; P.refresh(); P.say(`Bluetooth ${v ? 'on' : 'off'}.`, false); }, 'c-bt-sw')] },
        { label: 'NFC and contactless payments' }, { label: 'Flight mode' }, { label: 'SIM manager' }, { label: 'Mobile networks' }, { label: 'Data usage' }, { label: 'Mobile Hotspot and Tethering' }], 'Connections'));
    } });
    P.def('wifi', { title: 'Wi-Fi', render: (b) => {
      b.append(h('div', { class: 'm-big-switch' }, h('span', { class: 'lbl', 'aria-hidden': 'true' }, W.on ? 'On' : 'Off'), P.switchBtn('Wi-Fi', W.on, v => W.setOn(v, P), 'w-master')));
      if (!W.on) { b.append(h('p', { class: 'm-note' }, 'Turn on Wi-Fi to see available networks.')); return; }
      if (W.busy === 'scan') { b.append(h('p', { class: 'm-note' }, 'Searching for networks...')); return; }
      if (W.connected) {
        const n = W.net(W.connected);
        b.append(h('h4', null, 'Current network'), P.list([{ label: n.ssid, sub: 'Connected', key: 'cur-' + n.ssid, onClick: () => P.go('netdetails', { ssid: n.ssid }) }], 'Current network'));
      }
      const avail = W.nets.filter(n => n.ssid !== W.connected);
      b.append(h('h4', null, 'Available networks'), P.list(avail.map(n => ({ label: n.ssid, key: 'n-' + n.ssid,
        sub: W.busy === 'connect:' + n.ssid ? 'Connecting...' : W.fail[n.ssid] ? 'Authentication error occurred' : [W.saved[n.ssid] !== undefined ? 'Saved' : '', n.secure ? 'Secured' : 'Open', bars(n.strength)].filter(Boolean).join(', '),
        onClick: () => joinAndroid(n) })), 'Available networks'));
    } });
    P.def('netdetails', { title: p => p.ssid, render: (b, p) => {
      const n = W.net(p.ssid);
      b.append(h('dl', { class: 'kv' }, h('dt', null, 'Status'), h('dd', null, W.connected === n.ssid ? 'Connected' : 'Saved'), h('dt', null, 'Network speed'), h('dd', null, '433 Mbps'), h('dt', null, 'Security'), h('dd', null, n.secure ? 'WPA2-Personal' : 'Open'), h('dt', null, 'IP address'), h('dd', null, '192.168.1.42')),
        h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'm-danger', 'data-k': 'forget', onclick: () => { W.forget(n.ssid, P); P.back(); P.say(`${n.ssid} forgotten. It is still listed under Available networks, but the phone is no longer connected to it or saved.`); } }, 'Forget')));
    } });
    function joinAndroid(n) {
      if (W.busy) return;
      if (W.saved[n.ssid] !== undefined || !n.secure) { W.connect(n.ssid, W.saved[n.ssid], P); return; }
      let pw = '', show = false;
      const inp = h('input', { type: 'password', autocomplete: 'off' });
      inp.addEventListener('input', () => { pw = inp.value; });
      dialog({ title: n.ssid, body: h('div', null, field('Password', inp), checkbox('Show password', false, v => { show = v; inp.type = v ? 'text' : 'password'; }), checkbox('Auto reconnect', true, () => {})),
        buttons: [{ label: 'Connect', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }], validate: () => pw.length < 8 ? 'Enter at least 8 characters.' : null })
        .then(r => { if (r.value === 'ok') W.connect(n.ssid, pw, P); });
    }
  }

  /* iOS settings with Wi-Fi */
  function iosSettings(P, W) {
    W.phones.push(P);
    P.def('settings', { title: 'Settings', render: (b) => {
      b.append(P.list([
        { label: 'Airplane Mode', extra: [P.switchBtn('Airplane Mode', false, () => P.say('Airplane Mode is not used in this lab.'), 's-air')] },
        { label: 'Wi-Fi', sub: !W.on ? 'Off' : W.connected || 'Not Connected', onClick: () => P.go('wifi'), key: 's-wifi' },
        { label: 'Bluetooth', sub: 'On' }, { label: 'Cellular' }, { label: 'Personal Hotspot' }, { label: 'Notifications' }, { label: 'Sounds and Haptics' }, { label: 'General' }, { label: 'Accessibility' }, { label: 'Privacy and Security' }], 'Settings'));
    } });
    P.def('wifi', { title: 'Wi-Fi', render: (b) => {
      b.append(h('div', { class: 'm-big-switch' }, h('span', { class: 'lbl', 'aria-hidden': 'true' }, 'Wi-Fi'), P.switchBtn('Wi-Fi', W.on, v => W.setOn(v, P), 'w-master')));
      if (!W.on) { b.append(h('p', { class: 'm-note' }, 'AirDrop, AirPlay, and location accuracy improve when Wi-Fi is turned on.')); return; }
      const info = n => h('button', { type: 'button', class: 'm-more', 'data-k': 'i-' + n.ssid, 'aria-label': `More info, ${n.ssid}`, onclick: () => P.go('netinfo', { ssid: n.ssid }) }, 'i');
      if (W.connected) {
        const n = W.net(W.connected);
        b.append(P.list([{ label: n.ssid, sub: `Connected, checkmark, ${n.secure ? 'secure network' : 'open network'}, ${bars(n.strength)}`, key: 'cur-' + n.ssid, onClick: () => P.say(`Already connected to ${n.ssid}. To see its details, choose More info, the i button.`), extra: [info(n)] }], 'Current network'));
      }
      const mine = W.nets.filter(n => n.ssid !== W.connected && W.saved[n.ssid] !== undefined);
      const other = W.nets.filter(n => n.ssid !== W.connected && W.saved[n.ssid] === undefined);
      const row = n => ({ label: n.ssid, key: 'n-' + n.ssid, sub: W.busy === 'connect:' + n.ssid ? 'Joining...' : [n.secure ? 'secure network' : 'open network', bars(n.strength)].join(', '), onClick: () => joinIOS(n), extra: [info(n)] });
      if (mine.length) b.append(h('h4', null, 'My Networks'), P.list(mine.map(row), 'My Networks'));
      b.append(h('h4', null, 'Networks'), W.busy === 'scan' ? h('p', { class: 'm-note' }, 'Searching...') : P.list(other.map(row), 'Other networks'));
    } });
    P.def('netinfo', { title: p => p.ssid, render: (b, p) => {
      const n = W.net(p.ssid);
      const known = W.saved[n.ssid] !== undefined;
      if (known) b.append(h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'm-danger', 'data-k': 'forget', onclick: async () => {
        const r = await dialog({ title: `Forget Wi-Fi Network “${n.ssid}”?`, message: 'Your iPhone and other devices using iCloud Keychain will no longer join this Wi-Fi network.', buttons: [{ label: 'Forget', value: 'forget', primary: true }, { label: 'Cancel', value: 'cancel' }] });
        if (r.value !== 'forget') return;
        W.forget(n.ssid, P); P.back(); P.say(`${n.ssid} forgotten. It is listed under Networks, but the iPhone is not connected to it.`);
      } }, 'Forget This Network')));
      else b.append(h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'join', onclick: () => joinIOS(n) }, 'Join This Network')));
      b.append(h('dl', { class: 'kv' }, h('dt', null, 'Auto-Join'), h('dd', null, known ? 'On' : 'Off'), h('dt', null, 'Security'), h('dd', null, n.secure ? 'WPA2/WPA3 Personal' : 'None'), h('dt', null, 'IP Address'), h('dd', null, W.connected === n.ssid ? '192.168.1.43' : 'Not connected')));
    } });
    function joinIOS(n) {
      if (W.busy) return;
      if (W.saved[n.ssid] !== undefined || !n.secure) { W.connect(n.ssid, W.saved[n.ssid], P); return; }
      let pw = '';
      const inp = h('input', { type: 'password', autocomplete: 'off' });
      dialog({ title: `Enter the password for “${n.ssid}”`, body: field('Password', inp),
        buttons: [{ label: 'Join', value: 'ok', primary: true, disabled: true }, { label: 'Cancel', value: 'cancel' }],
        onRender: (b, d, foot) => { const j = foot.querySelector('[data-v="ok"]'); inp.addEventListener('input', () => { pw = inp.value; j.disabled = pw.length < 8; }); inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !j.disabled) { e.preventDefault(); j.click(); } }); } })
        .then(r => { if (r.value === 'ok') W.connect(n.ssid, pw, P); });
    }
  }


  /* ---------------- Android launcher (Pixel or Samsung style home screen) ---------------- */
  const COLS = 4, ROWS = 5;
  function androidLauncher(P, opts) {
    const apps = opts.apps;           // id -> {name, system, open?}
    const widgets = opts.widgets || []; // {id, app, name, w, h, text}
    const L = { pages: opts.pages, dock: opts.dock, installed: new Set(Object.keys(apps).filter(k => !apps[k].notInstalled)), page: 0, seq: 100 };
    P.launcher = L;
    const nameOf = it => it.kind === 'app' ? apps[it.app].name : it.kind === 'folder' ? (it.name || 'Unnamed folder') : it.name;
    const cells = (page, skip) => { const g = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); page.forEach(it => { if (it === skip) return; for (let r = 0; r < it.h; r++) for (let c = 0; c < it.w; c++) if (g[it.r + r]) g[it.r + r][it.c + c] = it; }); return g; };
    const fits = (page, w, hh, r, c, skip) => { if (r + hh > ROWS || c + w > COLS) return false; const g = cells(page, skip); for (let i = 0; i < hh; i++) for (let j = 0; j < w; j++) if (g[r + i][c + j]) return false; return true; };
    const firstFree = (page, w, hh, skip) => { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (fits(page, w, hh, r, c, skip)) return { r, c }; return null; };
    const pos = it => `row ${it.r + 1}, column ${it.c + 1}`;
    const find = pred => { for (let i = 0; i < L.pages.length; i++) { const it = L.pages[i].find(pred); if (it) return { it, page: i }; } return null; };
    L.find = find; L.nameOf = nameOf;
    function place(it, pageIdx, at) {
      while (L.pages.length <= pageIdx) L.pages.push([]);
      const pg = L.pages[pageIdx];
      const spot = at && fits(pg, it.w, it.h, at.r, at.c, it) ? at : firstFree(pg, it.w, it.h, it);
      if (!spot) return false;
      it.r = spot.r; it.c = spot.c;
      L.pages.forEach(p2 => { const i = p2.indexOf(it); if (i >= 0) p2.splice(i, 1); });
      pg.push(it);
      return true;
    }
    function removeItem(it) { L.pages.forEach(p2 => { const i = p2.indexOf(it); if (i >= 0) p2.splice(i, 1); }); }
    function trimPages() { while (L.pages.length > 1 && !L.pages[L.pages.length - 1].length && L.page < L.pages.length - 1) L.pages.pop(); }
    function openApp(id) {
      const a = apps[id];
      if (a.open) { a.open(P); return; }
      P.go('app', { id });
    }
    async function choosePlace(title, it, startPage) {
      let pg = String(startPage), r = 'auto', c = 'auto';
      const pages = L.pages.map((_, i) => ({ v: String(i), l: `Home screen ${i + 1}` })).concat([{ v: 'new', l: 'New home screen' }]);
      const sel = (label, options, val, set) => { const s2 = h('select'); options.forEach(o => s2.append(h('option', { value: o.v }, o.l))); s2.value = val; s2.addEventListener('change', () => set(s2.value)); return field(label, s2); };
      const posOpts = n => [{ v: 'auto', l: 'First empty space' }].concat(Array.from({ length: n }, (_, i) => ({ v: String(i), l: String(i + 1) })));
      const body = h('div', null, sel('Screen', pages, pg, v => { pg = v; }), sel('Row', posOpts(ROWS), r, v => { r = v; }), sel('Column', posOpts(COLS), c, v => { c = v; }), h('p', { class: 'hint' }, `Each home screen has ${ROWS} rows and ${COLS} columns. ${it.w > 1 || it.h > 1 ? `This item takes ${it.w} columns and ${it.h} row${it.h > 1 ? 's' : ''}.` : ''}`));
      const res = await dialog({ title, body, buttons: [{ label: 'Place here', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }],
        validate: () => {
          const idx = pg === 'new' ? L.pages.length : +pg;
          const page = L.pages[idx] || [];
          if ((r === 'auto') !== (c === 'auto')) return 'Choose both a row and a column, or leave both as First empty space.';
          if (r === 'auto') return firstFree(page, it.w, it.h, it) ? null : `No room on Home screen ${idx + 1}. Choose another screen, or remove something first.`;
          return fits(page, it.w, it.h, +r, +c, it) ? null : `That space is taken or too small${it.w > 1 ? ' for this ' + it.w + ' by ' + it.h + ' item' : ''}. Choose an empty space, or First empty space.`;
        } });
      if (res.value !== 'ok') return null;
      return { page: pg === 'new' ? L.pages.length : +pg, at: r === 'auto' ? null : { r: +r, c: +c } };
    }
    async function moveItem(it, from) {
      const ch = await choosePlace(`Move ${nameOf(it)}`, it, from);
      if (!ch) return;
      place(it, ch.page, ch.at); L.page = ch.page; trimPages();
      P.refresh();
      P.say(`${nameOf(it)} moved to Home screen ${ch.page + 1}, ${pos(it)}.`);
      emit('home:move', { it, from, to: ch.page });
    }
    function makeFolder(a, b, pageIdx) {
      const f = { id: 'f' + (++L.seq), kind: 'folder', name: '', apps: [a.app, b.app], w: 1, h: 1, r: b.r, c: b.c };
      removeItem(a); removeItem(b);
      L.pages[pageIdx].push(f);
      P.refresh();
      P.say(`Folder created with ${apps[b.app].name} and ${apps[a.app].name}. It is named Unnamed folder, at ${pos(f)}.`);
      emit('home:folder', { f });
      return f;
    }
    function itemActions(it, pageIdx) {
      const n = nameOf(it);
      const items = [{ label: 'Move to another screen or position', action: () => moveItem(it, pageIdx) }];
      if (it.kind === 'app') {
        const others = L.pages[pageIdx].filter(x => x !== it && x.kind === 'app');
        others.forEach(o => items.push({ label: `Create folder with ${apps[o.app].name}`, action: () => makeFolder(it, o, pageIdx) }));
        L.pages[pageIdx].filter(x => x.kind === 'folder').forEach(f => items.push({ label: `Add to folder ${nameOf(f)}`, action: () => { removeItem(it); f.apps.push(it.app); P.refresh(); P.say(`${n} added to ${nameOf(f)}.`); emit('home:addtofolder', { f, app: it.app }); } }));
      }
      items.push({ label: 'Remove', action: () => { removeItem(it); trimPages(); P.refresh(); P.say(`${n} removed from the home screen.${it.kind === 'app' ? ' The app is still installed. Find it in All apps.' : ''}`); emit('home:remove', { it }); } });
      if (it.kind === 'app') {
        items.push({ label: 'App info', action: () => appInfo(it.app) });
        if (!apps[it.app].system) items.push({ label: 'Uninstall', action: () => uninstall(it.app) });
      }
      return actionsMenu(`Actions for ${n}`, items);
    }
    function appInfo(id) { const a = apps[id]; dialog({ title: `App info: ${a.name}`, message: `${a.name}. ${a.system ? 'Preinstalled app; it can be disabled but not uninstalled.' : 'Installed from Google Play.'} Storage: ${a.size || '48 MB'}.` }); }
    async function uninstall(id) {
      const a = apps[id];
      if (a.system) { dialog({ title: a.name, message: `${a.name} came with the phone and cannot be uninstalled. You can remove its shortcut from the home screen.` }); return; }
      const r = await dialog({ title: a.name, message: 'Do you want to uninstall this app?', buttons: [{ label: 'OK', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
      if (r.value !== 'ok') return;
      L.installed.delete(id);
      L.pages.forEach(pg => { for (let i = pg.length - 1; i >= 0; i--) { const x = pg[i]; if (x.kind === 'app' && x.app === id) pg.splice(i, 1); if (x.kind === 'folder') x.apps = x.apps.filter(y => y !== id); } });
      P.refresh(); P.say(`${a.name} uninstalled.`);
      emit('app:uninstall', { id });
    }
    L.uninstall = uninstall;
    P.def('home', { title: () => 'Home screen', render: (b) => {
      if (L.page >= L.pages.length) L.page = L.pages.length - 1;
      const pg = L.pages[L.page];
      const pager = h('div', { class: 'hs-pager' },
        h('button', { type: 'button', class: 'secondary', 'data-k': 'prev', disabled: L.page === 0 || null, onclick: () => { L.page--; P.refresh(); P.say(`Home screen ${L.page + 1} of ${L.pages.length}.`, false); } }, 'Previous screen'),
        h('p', null, `Screen ${L.page + 1} of ${L.pages.length}`),
        h('button', { type: 'button', class: 'secondary', 'data-k': 'next', disabled: L.page >= L.pages.length - 1 || null, onclick: () => { L.page++; P.refresh(); P.say(`Home screen ${L.page + 1} of ${L.pages.length}.`, false); } }, 'Next screen'));
      const grid = h('ul', { class: 'hs-grid', 'aria-label': `Home screen ${L.page + 1} items, in reading order` });
      const sorted = pg.slice().sort((x, y) => x.r - y.r || x.c - y.c);
      sorted.forEach(it => {
        const n = nameOf(it);
        const label = it.kind === 'widget' ? `${n} widget: ${it.text}` : it.kind === 'folder' ? `Folder: ${n}, ${it.apps.length} apps` : n;
        const li = h('li', { class: 'hs-item ' + it.kind, style: `grid-column:${it.c + 1} / span ${it.w};grid-row:${it.r + 1} / span ${it.h}` },
          h('button', { type: 'button', class: 'hs-open', 'data-k': 'o-' + it.id, 'aria-describedby': null, onclick: () => { if (it.kind === 'app') openApp(it.app); else if (it.kind === 'folder') P.go('folder', { id: it.id }); else P.say(`${n}: ${it.text}`); } }, label, h('span', { class: 'sr-only' }, `, ${pos(it)}`)),
          h('button', { type: 'button', class: 'hs-act', 'data-k': 'a-' + it.id, onclick: () => itemActions(it, L.page) }, h('span', { class: 'sr-only' }, `Actions for ${n}`), h('span', { 'aria-hidden': 'true' }, 'Actions')));
        grid.append(li);
      });
      b.append(pager, sorted.length ? grid : h('p', { class: 'hs-empty' }, 'This home screen is empty.'),
        h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'secondary', 'data-k': 'opts', onclick: () => homeOptions() }, 'Home screen options (touch and hold empty space)'), h('button', { type: 'button', 'data-k': 'allapps', onclick: () => P.go('apps') }, 'All apps')),
        h('h4', null, 'Favorites tray'), h('ul', { class: 'hs-dock', 'aria-label': 'Favorites tray' }, ...L.dock.map(id => h('li', null, h('button', { type: 'button', 'data-k': 'd-' + id, onclick: () => openApp(id) }, apps[id].name)))));
    } });
    function homeOptions() {
      actionsMenu('Home screen options', [{ label: 'Wallpaper and style', action: () => P.say('Wallpaper is not used in this lab.') }, { label: 'Widgets', action: () => P.go('widgets') }, { label: 'Home settings', action: () => P.say('Home settings are not used in this lab.') }]);
    }
    P.def('apps', { title: 'All apps', render: (b) => {
      const ids = [...L.installed].sort((x, y) => apps[x].name.localeCompare(apps[y].name));
      b.append(h('p', { class: 'm-note' }, `${ids.length} apps. Choose an app to open it, or its Actions button to add it to the home screen or uninstall it.`));
      const ul = h('ul', { class: 'm-list', 'aria-label': 'All apps' });
      ids.forEach(id => ul.append(h('li', null, h('button', { type: 'button', class: 'm-row', 'data-k': 'ap-' + id, onclick: () => openApp(id) }, apps[id].name),
        h('button', { type: 'button', class: 'm-more', 'data-k': 'aa-' + id, onclick: () => actionsMenu(`Actions for ${apps[id].name}`, [
          { label: 'Add to Home screen', action: async () => { const it = { id: 'i' + (++L.seq), kind: 'app', app: id, w: 1, h: 1, r: 0, c: 0 }; const ch = await choosePlace(`Add ${apps[id].name} to Home screen`, it, L.page); if (!ch) return; place(it, ch.page, ch.at); L.page = ch.page; P.say(`${apps[id].name} added to Home screen ${ch.page + 1}, ${pos(it)}.`); emit('home:add', { it }); } },
          { label: 'App info', action: () => appInfo(id) },
          { label: 'Uninstall', disabled: !!apps[id].system, action: () => uninstall(id) }]) }, h('span', { class: 'sr-only' }, `Actions for ${apps[id].name}`), h('span', { 'aria-hidden': 'true' }, 'Actions')))));
      b.append(ul);
    } });
    P.def('widgets', { title: 'Widgets', render: (b) => {
      b.append(h('p', { class: 'm-note' }, 'Widgets come with installed apps. Choose Add to Home screen, then pick a screen with enough empty space.'));
      const byApp = {};
      widgets.filter(w => L.installed.has(w.app)).forEach(w => (byApp[w.app] = byApp[w.app] || []).push(w));
      Object.keys(byApp).sort((x, y) => apps[x].name.localeCompare(apps[y].name)).forEach(a => {
        b.append(h('h4', null, apps[a].name), P.list(byApp[a].map(w => ({ label: `${w.name}`, sub: `${w.w} by ${w.h}`, key: 'wg-' + w.id, onClick: async () => {
          const it = { id: 'w' + (++L.seq), kind: 'widget', name: w.name, text: w.text, app: w.app, w: w.w, h: w.h, r: 0, c: 0 };
          const ch = await choosePlace(`Add ${w.name} widget`, it, L.page); if (!ch) return;
          place(it, ch.page, ch.at); L.page = ch.page; P.home(); P.say(`${w.name} widget added to Home screen ${ch.page + 1}, ${pos(it)}.`); emit('home:widget', { it });
        } })), `${apps[a].name} widgets`));
      });
    } });
    P.def('folder', { title: p => { const f = find(x => x.id === p.id); return f ? nameOf(f.it) : 'Folder'; }, render: (b, p) => {
      const fr = find(x => x.id === p.id);
      if (!fr) { b.append(h('p', null, 'This folder no longer exists.')); return; }
      const f = fr.it;
      const inp = h('input', { type: 'text', value: f.name, placeholder: 'Unnamed folder', autocomplete: 'off', 'data-k': 'fname' });
      const save = () => { const v = inp.value.trim(); if (v === f.name) return; f.name = v; P.title.textContent = nameOf(f); P.say(`Folder renamed ${nameOf(f)}.`); emit('home:rename', { f }); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
      b.append(field('Folder name', inp, 'Type a name, then choose Save name or press Enter.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'fsave', onclick: save }, 'Save name')));
      b.append(h('h4', null, 'Apps in this folder'), P.list(f.apps.map(id => ({ label: apps[id].name, key: 'fa-' + id, onClick: () => openApp(id), extra: [h('button', { type: 'button', class: 'm-more', 'data-k': 'fx-' + id, onclick: () => actionsMenu(`Actions for ${apps[id].name}`, [
        { label: 'Move out of folder to the home screen', action: () => moveOut(f, id, fr.page) },
        { label: 'App info', action: () => appInfo(id) }]) }, h('span', { class: 'sr-only' }, `Actions for ${apps[id].name}`), h('span', { 'aria-hidden': 'true' }, 'Actions'))] })), 'Apps in this folder'));
    } });
    function moveOut(f, id, pageIdx) {
      f.apps = f.apps.filter(x => x !== id);
      const it = { id: 'i' + (++L.seq), kind: 'app', app: id, w: 1, h: 1, r: 0, c: 0 };
      let msg;
      if (f.apps.length === 1) {
        const last = f.apps[0];
        removeItem(f);
        const keep = { id: 'i' + (++L.seq), kind: 'app', app: last, w: 1, h: 1, r: f.r, c: f.c };
        L.pages[pageIdx].push(keep);
        place(it, pageIdx);
        msg = `${apps[id].name} moved to the home screen at ${pos(it)}. Only ${apps[last].name} was left, so the folder was removed and ${apps[last].name} now sits where the folder was, ${pos(keep)}.`;
        emit('home:folderGone', { last });
        L.page = pageIdx; P.home(); P.say(msg); return;
      }
      if (!place(it, pageIdx)) { f.apps.push(id); P.say('No room on this home screen. Remove something first.'); return; }
      P.refresh(); P.say(`${apps[id].name} moved to the home screen at ${pos(it)}.`);
    }
    P.def('app', { title: p => apps[p.id].name, render: (b, p) => { b.append(h('p', null, `${apps[p.id].name} is open. This app is not used in this lab. Use Home or Back to leave it.`)); } });
    P.home();
    return L;
  }


  /* ---------------- iOS Home Screen with pages, folders, App Library, and App Store ---------------- */
  const IOS_PER_PAGE = 24;
  function iosLauncher(P, opts) {
    const apps = opts.apps; // id -> {name, cat, fixed (cannot delete), open}
    const L = { pages: opts.pages, dock: opts.dock, installed: new Set(Object.keys(apps).filter(k => !apps[k].notInstalled)), library: new Set(), page: 0, seq: 500 };
    P.launcher = L;
    const nm = e => typeof e === 'string' ? apps[e].name : e.name;
    const findPage = e => L.pages.findIndex(pg => pg.includes(e));
    const cleanup = () => { for (let i = L.pages.length - 1; i > 0; i--) if (!L.pages[i].length && L.page !== i) L.pages.splice(i, 1); if (L.page >= L.pages.length) L.page = L.pages.length - 1; };
    const take = e => L.pages.forEach(pg => { const i = pg.indexOf(e); if (i >= 0) pg.splice(i, 1); });
    function put(e, pageIdx, pos) {
      while (L.pages.length <= pageIdx) L.pages.push([]);
      let pi = pageIdx;
      while (L.pages[pi].length >= IOS_PER_PAGE) { pi++; if (!L.pages[pi]) L.pages.push([]); }
      const pg = L.pages[pi];
      pg.splice(pos == null ? pg.length : Math.min(pos, pg.length), 0, e);
      return pi;
    }
    const where = e => { const pi = findPage(e); return `page ${pi + 1}, position ${L.pages[pi].indexOf(e) + 1}`; };
    function openApp(id) { const a = apps[id]; if (a.open) a.open(P); else P.go('app', { id }); }
    async function moveDlg(e) {
      let pg = String(findPage(e)), pos = 'end';
      const pages = L.pages.map((_, i) => ({ v: String(i), l: `Page ${i + 1}` })).concat([{ v: 'new', l: 'New page' }]);
      const sel = (label, options, val, set) => { const x = h('select'); options.forEach(o => x.append(h('option', { value: o.v }, o.l))); x.value = val; x.addEventListener('change', () => set(x.value)); return field(label, x); };
      const posOpts = [{ v: 'end', l: 'At the end of the page' }].concat(Array.from({ length: IOS_PER_PAGE }, (_, i) => ({ v: String(i), l: `Position ${i + 1}` })));
      const r = await dialog({ title: `Move ${nm(e)}`, body: h('div', null, sel('Page', pages, pg, v => { pg = v; }), sel('Position', posOpts, pos, v => { pos = v; }), h('p', { class: 'hint' }, 'Apps on an iPhone Home Screen fill in order, 4 per row, so other icons shift to make room. On a real iPhone you drag the icon to the screen edge to reach the next page.')), buttons: [{ label: 'Move', value: 'ok', primary: true }, { label: 'Cancel', value: 'cancel' }] });
      if (r.value !== 'ok') return;
      const from = findPage(e);
      take(e);
      const target = pg === 'new' ? L.pages.length : +pg;
      const pi = put(e, target, pos === 'end' ? null : +pos);
      L.page = pi; cleanup(); P.refresh();
      P.say(`${nm(e)} moved to ${where(e)}.${pg === 'new' ? ' A new Home Screen page was created for it.' : ''}`);
      emit('ios:move', { e, from, to: findPage(e) });
    }
    function makeFolder(dragged, target) {
      const pi = findPage(target), idx = L.pages[pi].indexOf(target);
      const f = { kind: 'folder', id: 'f' + (++L.seq), name: apps[target].cat || 'Folder', apps: [target, dragged] };
      take(dragged); L.pages[pi][L.pages[pi].indexOf(target)] = f;
      P.refresh(); P.say(`Folder ${f.name} created with ${apps[target].name} and ${apps[dragged].name}. iOS named it from the kind of apps inside.`);
      emit('ios:folder', { f });
    }
    async function removeApp(id) {
      const a = apps[id];
      const items = [];
      if (!a.fixed) items.push({ label: 'Delete App', value: 'del', primary: true });
      items.push({ label: 'Remove from Home Screen', value: 'rm' }, { label: 'Cancel', value: 'cancel' });
      const r = await dialog({ title: `Remove “${a.name}”?`, message: a.fixed ? `${a.name} is built in and cannot be deleted, but you can remove it from the Home Screen. It stays in the App Library.` : 'Removing from Home Screen will keep the app in your App Library.', buttons: items });
      if (r.value === 'rm') { L.pages.forEach(pg => { const i = pg.indexOf(id); if (i >= 0) pg.splice(i, 1); }); L.library.add(id); cleanup(); P.refresh(); P.say(`${a.name} removed from the Home Screen. It is still installed; find it in the App Library.`); emit('ios:removeHome', { id }); return; }
      if (r.value !== 'del') return;
      const c = await dialog({ title: `Delete “${a.name}”?`, message: 'Deleting this app will also delete its data.', buttons: [{ label: 'Delete', value: 'del', primary: true }, { label: 'Cancel', value: 'cancel' }] });
      if (c.value !== 'del') return;
      L.installed.delete(id);
      L.pages.forEach(pg => { for (let i = pg.length - 1; i >= 0; i--) { const e = pg[i]; if (e === id) pg.splice(i, 1); else if (e.kind === 'folder') e.apps = e.apps.filter(x => x !== id); } });
      cleanup(); P.refresh(); P.say(`${a.name} deleted.`);
      emit('ios:delete', { id });
    }
    function actions(e) {
      const pi = findPage(e);
      const items = [{ label: 'Move to another page or position', action: () => moveDlg(e) }];
      if (typeof e === 'string') {
        L.pages[pi].filter(x => typeof x === 'string' && x !== e).forEach(t => items.push({ label: `Create folder with ${apps[t].name}`, action: () => makeFolder(e, t) }));
        L.pages[pi].filter(x => x.kind === 'folder').forEach(f => items.push({ label: `Add to folder ${f.name}`, action: () => { take(e); f.apps.push(e); P.refresh(); P.say(`${apps[e].name} added to ${f.name}.`); } }));
        items.push({ label: 'Remove App', action: () => removeApp(e) });
      }
      return actionsMenu(`Actions for ${nm(e)}`, items);
    }
    P.def('home', { title: 'Home Screen', render: (b) => {
      cleanup();
      const pg = L.pages[L.page];
      b.append(h('div', { class: 'hs-pager' },
        h('button', { type: 'button', class: 'secondary', 'data-k': 'prev', disabled: L.page === 0 || null, onclick: () => { L.page--; P.refresh(); P.say(`Page ${L.page + 1} of ${L.pages.length}.`); } }, 'Previous page'),
        h('p', null, `Page ${L.page + 1} of ${L.pages.length}`),
        h('button', { type: 'button', class: 'secondary', 'data-k': 'next', disabled: L.page >= L.pages.length - 1 || null, onclick: () => { L.page++; P.refresh(); P.say(`Page ${L.page + 1} of ${L.pages.length}.`); } }, 'Next page')));
      const grid = h('ul', { class: 'hs-grid', 'aria-label': `Page ${L.page + 1} apps, in order` });
      pg.forEach((e, i) => {
        const isF = typeof e !== 'string';
        grid.append(h('li', { class: 'hs-item ' + (isF ? 'folder' : 'app') },
          h('button', { type: 'button', class: 'hs-open', 'data-k': 'o-' + (isF ? e.id : e), onclick: () => isF ? P.go('folder', { id: e.id }) : openApp(e) }, isF ? `Folder: ${e.name}, ${e.apps.length} app${e.apps.length === 1 ? '' : 's'}` : apps[e].name, h('span', { class: 'sr-only' }, `, position ${i + 1}`)),
          h('button', { type: 'button', class: 'hs-act', 'data-k': 'a-' + (isF ? e.id : e), onclick: () => actions(e) }, h('span', { class: 'sr-only' }, `Actions for ${nm(e)}`), h('span', { 'aria-hidden': 'true' }, 'Actions'))));
      });
      b.append(pg.length ? grid : h('p', { class: 'hs-empty' }, 'This page is empty.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'secondary', 'data-k': 'lib', onclick: () => P.go('library') }, 'App Library (after the last page)')),
        h('h4', null, 'Dock'), h('ul', { class: 'hs-dock', 'aria-label': 'Dock' }, ...L.dock.map(id => h('li', null, h('button', { type: 'button', 'data-k': 'd-' + id, onclick: () => openApp(id) }, apps[id].name)))));
    } });
    P.def('folder', { title: p => { const f = L.pages.flat().find(x => x.id === p.id); return f ? f.name : 'Folder'; }, render: (b, p) => {
      const f = L.pages.flat().find(x => x.id === p.id);
      if (!f) { b.append(h('p', null, 'This folder no longer exists.')); return; }
      const inp = h('input', { type: 'text', value: f.name, autocomplete: 'off', 'data-k': 'fname' });
      const save = () => { const v = inp.value.trim(); if (!v || v === f.name) return; f.name = v; P.title.textContent = v; P.say(`Folder renamed ${v}.`); emit('ios:rename', { f }); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
      b.append(field('Folder name', inp, 'On a real iPhone you touch and hold the name. Type a name, then choose Save name or press Enter.'), h('div', { class: 'toolbar' }, h('button', { type: 'button', 'data-k': 'fsave', onclick: save }, 'Save name')),
        h('h4', null, 'Apps in this folder'), P.list(f.apps.map(id => ({ label: apps[id].name, key: 'fa-' + id, onClick: () => openApp(id), extra: [h('button', { type: 'button', class: 'm-more', 'data-k': 'fx-' + id, onclick: () => actionsMenu(`Actions for ${apps[id].name}`, [{ label: 'Move out of folder to the Home Screen', action: () => moveOut(f, id) }, { label: 'Remove App', action: () => removeApp(id) }]) }, h('span', { class: 'sr-only' }, `Actions for ${apps[id].name}`), h('span', { 'aria-hidden': 'true' }, 'Actions'))] })), 'Apps in this folder'));
    } });
    function moveOut(f, id) {
      const pi = findPage(f);
      f.apps = f.apps.filter(x => x !== id);
      put(id, pi);
      if (!f.apps.length) { take(f); L.page = pi; cleanup(); P.home(); P.say(`${apps[id].name} moved to the Home Screen at ${where(id)}. The folder was empty, so it disappeared.`); emit('ios:folderGone', {}); return; }
      P.refresh(); P.say(`${apps[id].name} moved out of ${f.name} to the Home Screen at ${where(id)}. The folder still holds ${f.apps.map(x => apps[x].name).join(', ')}.`);
      emit('ios:moveOut', { id });
    }
    P.def('library', { title: 'App Library', render: (b) => {
      const ids = [...L.installed].sort((x, y) => apps[x].name.localeCompare(apps[y].name));
      b.append(h('p', { class: 'm-note' }, 'Every installed app, including ones removed from the Home Screen.'), P.list(ids.map(id => ({ label: apps[id].name, sub: apps[id].cat, key: 'lib-' + id, onClick: () => openApp(id), extra: [h('button', { type: 'button', class: 'm-more', 'data-k': 'lx-' + id, onclick: () => actionsMenu(`Actions for ${apps[id].name}`, [
        { label: 'Add to Home Screen', disabled: L.pages.flat().some(e => e === id || (e.apps && e.apps.includes(id))), action: () => { const pi = put(id, L.pages.length - 1); L.library.delete(id); P.say(`${apps[id].name} added to Home Screen page ${pi + 1}.`); } },
        { label: 'Delete App', disabled: !!apps[id].fixed, action: () => removeApp(id) }]) }, h('span', { class: 'sr-only' }, `Actions for ${apps[id].name}`), h('span', { 'aria-hidden': 'true' }, 'Actions'))] })), 'App Library'));
    } });
    P.def('app', { title: p => apps[p.id].name, render: (b, p) => b.append(h('p', null, `${apps[p.id].name} is open. It is not used in this lab. Use Home to leave it.`)) });
    L.put = put; L.removeApp = removeApp; L.openApp = openApp;
    P.home();
    return L;
  }

  /* Simple iOS Home Screen for the Wi-Fi lab */
  function iosHome(P, appNames, openers) {
    P.def('home', { title: 'Home Screen', render: (b) => {
      b.append(h('p', { class: 'm-note' }, 'Page 1 of 1. Apps in reading order:'), P.list(appNames.map(n => ({ label: n, key: 'h-' + n, onClick: openers[n] || (() => P.go('app', { name: n })) })), 'Home Screen apps'));
    } });
    P.def('app', { title: p => p.name, render: (b, p) => b.append(h('p', null, `${p.name} is open. It is not used in this lab. Use Home to leave it.`)) });
    P.home();
  }

  return { iosLauncher, twoPhones, androidLauncher, iosHome, on, emit, dialog, actionsMenu, field, checkbox, Phone, wifiModel, androidSettings, iosSettings };
})();
