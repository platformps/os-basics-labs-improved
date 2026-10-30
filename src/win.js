/* Simulated Windows desktop engine: windows, taskbar, Start search, processes, files,
   and accessible building blocks (grid, tree, tabs, menus, dialogs, wizards). */
const Win = (() => {
  const { h, announce } = Lab;
  const bus = new EventTarget();
  const on = (t, f) => bus.addEventListener(t, e => f(e.detail));
  const emit = (t, d) => bus.dispatchEvent(new CustomEvent(t, { detail: d }));

  const S = {
    computer: 'DESKTOP-OSB01', user: 'CyberOpsUser', isAdmin: true, signedIn: true,
    users: {}, apps: {}, windows: [], active: null, root: null, wseq: 0,
  };

  /* ---------------- Processes ---------------- */
  const procs = new Map();
  let nextPid = 5200;
  const proc = {
    add(p) { procs.set(p.pid, Object.assign({ user: S.user, cpu: '0', mem: 4000, kind: 'background', desc: '', company: 'Microsoft Corporation', path: 'C:\\Windows\\System32\\' + p.name, threads: 4, handles: 120, started: Date.now() }, p)); return p.pid; },
    spawn(p) { const pid = p.pid || (nextPid += 4 + Math.floor(Math.random() * 40)); proc.add(Object.assign({}, p, { pid })); emit('proc:start', procs.get(pid)); return pid; },
    get: pid => procs.get(pid),
    list: () => Array.from(procs.values()),
    children: pid => Array.from(procs.values()).filter(p => p.parent === pid),
    byName: n => Array.from(procs.values()).filter(p => p.name.toLowerCase() === n.toLowerCase()),
    kill(pid, why) {
      const p = procs.get(pid); if (!p) return false;
      if (p.protected) return false;
      procs.delete(pid);
      emit('proc:exit', { ...p, why });
      // Dependent children (console hosts) end with their parent.
      proc.children(pid).forEach(c => { if (c.dependsOnParent) proc.kill(c.pid, 'parent ended'); });
      const w = S.windows.find(w => w.pid === pid);
      if (w) closeWindow(w, { fromKill: true });
      return true;
    },
    reset() { procs.clear(); }
  };

  /* ---------------- Files ---------------- */
  function mkNode(name, type, extra) { return Object.assign({ name, type, children: type === 'dir' ? {} : undefined, modified: '10/5/2026 9:12 AM', size: type === 'dir' ? null : 1, owner: null, acl: null }, extra || {}); }
  const fsRoot = mkNode('This PC', 'dir');
  const fs = {
    root: fsRoot,
    norm(p) { return p.replace(/\//g, '\\').replace(/\\+$/, '').replace(/^([a-z]):/i, (m, d) => d.toUpperCase() + ':'); },
    parts(p) { return fs.norm(p).split('\\').filter(Boolean); },
    get(p) {
      let n = fsRoot;
      for (const part of fs.parts(p)) {
        if (!n || n.type !== 'dir') return null;
        const k = Object.keys(n.children).find(c => c.toLowerCase() === part.toLowerCase());
        n = k ? n.children[k] : null;
      }
      return n;
    },
    ensure(p, extra) {
      let n = fsRoot;
      for (const part of fs.parts(p)) {
        const k = Object.keys(n.children).find(c => c.toLowerCase() === part.toLowerCase());
        if (k) n = n.children[k]; else { n.children[part] = mkNode(part, 'dir', extra); n = n.children[part]; }
      }
      return n;
    },
    write(p, content, extra) {
      const parts = fs.parts(p); const name = parts.pop();
      const dir = fs.ensure(parts.join('\\'));
      const k = Object.keys(dir.children).find(c => c.toLowerCase() === name.toLowerCase()) || name;
      dir.children[k] = Object.assign(dir.children[k] || mkNode(name, 'file'), { content, size: (content || '').length || 1 }, extra || {});
      emit('fs:change', { path: p });
      return dir.children[k];
    },
    remove(p) {
      const parts = fs.parts(p); const name = parts.pop();
      const dir = fs.get(parts.join('\\'));
      if (!dir) return false;
      const k = Object.keys(dir.children).find(c => c.toLowerCase() === name.toLowerCase());
      if (!k) return false;
      const node = dir.children[k];
      delete dir.children[k];
      emit('fs:change', { path: p, removed: node });
      return node;
    },
    list(p) { const n = fs.get(p); return n && n.type === 'dir' ? Object.values(n.children) : null; },
    join(a, b) { return fs.norm(a) + '\\' + b; },
    parent(p) { const parts = fs.parts(p); parts.pop(); return parts.join('\\') + (parts.length === 1 ? '\\' : ''); },
    typeOf(n) {
      if (n.type === 'dir') return n.ftype || 'File folder';
      const ext = (n.name.split('.').pop() || '').toLowerCase();
      return n.ftype || ({ txt: 'Text Document', csv: 'Microsoft Excel Comma Separated Values File', exe: 'Application', zip: 'Compressed (zipped) Folder', chm: 'Compiled HTML Help file', docx: 'Microsoft Word Document', png: 'PNG File', blg: 'Performance Monitor File' }[ext] || ext.toUpperCase() + ' File');
    },
    sizeText(n) { if (n.type === 'dir') return ''; const kb = Math.max(1, Math.ceil((n.size || 1) / 1024)); return kb.toLocaleString() + ' KB'; }
  };
  const recycle = [];

  /* ---------------- Building blocks ---------------- */
  let dlgSeq = 0;
  function dialog({ title, body, buttons = [{ label: 'OK', value: 'ok', primary: true }], cancelValue = 'cancel', describedBy, onRender, wide, validate }) {
    return new Promise(resolve => {
      const id = 'dlg' + (++dlgSeq);
      const opener = document.activeElement;
      const bodyEl = h('div', { class: 'dlg-body', id: id + '-body' });
      if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.append(body);
      const foot = h('div', { class: 'dlg-foot' });
      const d = h('dialog', { 'aria-labelledby': id + '-t', 'aria-describedby': describedBy ? id + '-body' : null, class: wide ? 'wide' : '' },
        h('div', { class: 'dlg-head' }, h('h2', { id: id + '-t' }, title)), bodyEl, foot);
      let result = cancelValue;
      buttons.forEach(b => {
        const btn = h('button', { type: 'button', class: b.primary ? '' : 'secondary', 'data-v': b.value, disabled: b.disabled || null }, b.label);
        btn.addEventListener('click', () => {
          if (validate && b.value !== cancelValue) { const err = validate(b.value, bodyEl); if (err) { announce(err, true); const errEl = bodyEl.querySelector('.dlg-error'); if (errEl) errEl.textContent = err; return; } }
          result = b.value; d.close();
        });
        foot.append(btn);
      });
      d.addEventListener('cancel', () => { result = cancelValue; });
      d.addEventListener('close', () => {
        d.remove();
        resolve({ value: result, body: bodyEl });
        // Return focus only if the dialog's action did not already move it (avoids a spoken bounce).
        setTimeout(() => { if (document.activeElement !== document.body) return; if (opener && opener.isConnected) opener.focus(); else focusActive(); }, 0);
      });
      document.body.append(d);
      if (onRender) onRender(bodyEl, d, foot);
      d.showModal();
      const first = bodyEl.querySelector('[autofocus],input:not([type=hidden]),select,textarea') || foot.querySelector('button:not([disabled])');
      if (first) first.focus();
    });
  }
  const alertBox = (title, message, label = 'OK') => dialog({ title, body: h('p', null, message), buttons: [{ label, value: 'ok', primary: true }], describedBy: true });
  const confirmBox = (title, message, yes = 'Yes', no = 'No') => dialog({ title, body: h('p', null, message), buttons: [{ label: yes, value: 'yes', primary: true }, { label: no, value: 'no' }], cancelValue: 'no', describedBy: true }).then(r => r.value === 'yes');
  function uac(appName, publisher = 'Microsoft Windows') {
    return dialog({ title: 'User Account Control', describedBy: true,
      body: h('div', null, h('p', null, 'Do you want to allow this app to make changes to your device?'), h('p', null, h('strong', null, appName)), h('p', null, 'Verified publisher: ' + publisher)),
      buttons: [{ label: 'Yes', value: 'yes', primary: true }, { label: 'No', value: 'no' }], cancelValue: 'no' }).then(r => r.value === 'yes');
  }

  /* Disclosure style menu of buttons. items: [{label, action, disabled, checked, sep, submenu:[...] }] */
  let openMenu = null;
  function closeMenu(returnFocus = true) {
    if (!openMenu) return;
    const { list, trigger } = openMenu;
    list.remove(); trigger.setAttribute('aria-expanded', 'false');
    openMenu = null;
    if (returnFocus) setTimeout(() => { if (document.activeElement === document.body && trigger.isConnected) trigger.focus(); }, 0);
  }
  function popMenu(trigger, items, label) {
    if (openMenu && openMenu.trigger === trigger) { closeMenu(); return; }
    closeMenu(false);
    const list = h('ul', { class: 'popmenu', 'aria-label': label || trigger.textContent });
    const build = (ul, its) => its.forEach(it => {
      if (it.sep) { ul.append(h('li', { class: 'sep', 'aria-hidden': 'true' })); return; }
      const b = h('button', { type: 'button', class: 'menuitem', 'aria-disabled': it.disabled ? 'true' : null, 'aria-pressed': it.checked === undefined ? null : String(!!it.checked) }, it.label);
      const li = h('li', null, b);
      if (it.submenu) {
        b.setAttribute('aria-expanded', 'false');
        const sub = h('ul', { class: 'submenu', hidden: true });
        build(sub, it.submenu); li.append(sub);
        b.addEventListener('click', () => { const ex = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!ex)); sub.hidden = ex; if (!ex) sub.querySelector('button').focus(); });
      } else b.addEventListener('click', () => { if (it.disabled) { announce(`${it.label} is not available right now.`); return; } closeMenu(); it.action && it.action(); });
      ul.append(li);
    });
    build(list, items);
    list.addEventListener('keydown', e => {
      const btns = Array.from(list.querySelectorAll('button')).filter(b => b.offsetParent !== null);
      const i = btns.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); btns[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); btns[btns.length - 1].focus(); }
      else if (e.key === 'Tab') { closeMenu(false); }
    });
    trigger.setAttribute('aria-expanded', 'true');
    trigger.after(list);
    openMenu = { list, trigger };
    list.querySelector('button').focus();
  }
  document.addEventListener('click', e => { if (openMenu && !openMenu.list.contains(e.target) && e.target !== openMenu.trigger) closeMenu(false); });

  /* Menu bar: [{label:'File', items:[...]}] */
  function menubar(menus, label) {
    const nav = h('div', { class: 'menubar', role: 'group', 'aria-label': label || 'Menu bar' });
    menus.forEach(m => {
      const b = h('button', { type: 'button', class: 'mb', 'aria-expanded': 'false' }, m.label);
      b.addEventListener('click', () => popMenu(b, typeof m.items === 'function' ? m.items() : m.items, m.label + ' menu'));
      nav.append(h('span', { class: 'mb-wrap' }, b));
    });
    return nav;
  }

  /* Data grid with row selection. cols: [{key,label,sort:true,fmt(row)}] */
  let gridSeq = 0;
  function grid({ caption, cols, rows, key = 'id', nameKey, rowLabel, onSelect, onOpen, onContext, emptyText = 'No items.', sortable = true, captionHidden, rowClass, expandable, isExpanded, onToggle }) {
    const id = 'g' + (++gridSeq);
    let data = rows.slice(), sel = null, sortKey = null, sortDir = 'none';
    const table = h('table', { class: 'data grid', id });
    const cap = h('caption', { class: captionHidden ? 'sr-only' : '' }, caption);
    const thead = h('thead'), tbody = h('tbody');
    table.append(cap, thead, tbody);
    const wrap = h('div', { class: 'table-scroll grid-wrap' }, table);
    const hdr = () => {
      thead.textContent = '';
      const tr = h('tr');
      cols.forEach(c => {
        const th = h('th', { scope: 'col', 'aria-sort': sortable && c.sort !== false ? (sortKey === c.key ? sortDir : 'none') : null });
        if (sortable && c.sort !== false) {
          const b = h('button', { type: 'button', class: 'th-btn' }, c.label);
          b.addEventListener('click', () => { sortBy(c.key); b.focus(); });
          b.addEventListener('keydown', e => { if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') { e.preventDefault(); if (c.onHeaderMenu) c.onHeaderMenu(b); } });
          if (c.onHeaderMenu) b.addEventListener('contextmenu', e => { e.preventDefault(); c.onHeaderMenu(b); });
          th.append(b);
        } else th.textContent = c.label;
        tr.append(th);
      });
      thead.append(tr);
    };
    const val = (r, c) => c.fmt ? c.fmt(r) : r[c.key];
    function sortBy(k, dir, quiet) {
      if (dir) sortDir = dir; else if (sortKey === k) sortDir = sortDir === 'descending' ? 'ascending' : 'descending';
      else { const c = cols.find(c => c.key === k); sortDir = c.numeric ? 'descending' : 'ascending'; }
      sortKey = k;
      const c = cols.find(c => c.key === k);
      data.sort((a, b) => {
        const av = c.sortVal ? c.sortVal(a) : a[k], bv = c.sortVal ? c.sortVal(b) : b[k];
        const r = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'ascending' ? r : -r;
      });
      render();
      if (!quiet) announce(`Sorted by ${c.label}, ${sortDir}.`);
      if (api.onSort) api.onSort(k, sortDir);
    }
    function render() {
      hdr();
      tbody.textContent = '';
      if (!data.length) { tbody.append(h('tr', null, h('td', { colspan: cols.length }, emptyText))); return; }
      data.forEach((r, i) => {
        const tr = h('tr', { class: (sel === r[key] ? 'selected ' : '') + (rowClass ? rowClass(r) : '') });
        cols.forEach((c, ci) => {
          const v = val(r, c);
          if (ci === 0) {
            const cell = h('td', { class: 'namecell' });
            if (api.expandable && api.expandable(r)) {
              const ex = !!(api.isExpanded && api.isExpanded(r));
              const t = h('button', { type: 'button', class: 'expander', 'data-k': String(r[key]), 'aria-expanded': String(ex), 'aria-label': `${ex ? 'Collapse' : 'Expand'} ${r[nameKey || key]}` }, ex ? '▾' : '▸');
              t.addEventListener('click', () => { api.onToggle(r); const nb = tbody.querySelector(`.expander[data-k="${CSS.escape(String(r[key]))}"]`); if (nb) nb.focus(); });
              cell.append(t);
            } else if (api.expandable) cell.append(h('span', { class: 'expander-pad', 'aria-hidden': 'true' }));
            const b = h('button', { type: 'button', class: 'rowbtn', 'aria-pressed': String(sel === r[key]), 'data-k': String(r[key]), style: r._indent ? `padding-left:${0.4 + r._indent * 1.2}em` : null },
              v, r._sr ? h('span', { class: 'sr-only' }, r._sr) : null);
            b.addEventListener('click', () => select(r[key], true));
            b.addEventListener('dblclick', () => { if (onOpen) onOpen(r); });
            b.addEventListener('keydown', e => rowKey(e, r));
            b.addEventListener('contextmenu', e => { if (onContext) { e.preventDefault(); select(r[key]); onContext(r, b); } });
            cell.append(b);
            tr.append(cell);
          } else tr.append(h('td', null, v === undefined || v === null ? '' : v));
        });
        tbody.append(tr);
      });
    }
    function rowKey(e, r) {
      const btns = Array.from(tbody.querySelectorAll('.rowbtn'));
      const i = btns.indexOf(e.currentTarget);
      if (e.key === 'ArrowDown' && i < btns.length - 1) { e.preventDefault(); btns[i + 1].focus(); }
      else if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); btns[i - 1].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); btns[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); btns[btns.length - 1].focus(); }
      else if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') { e.preventDefault(); select(r[key]); if (onContext) onContext(r, e.currentTarget); }
      else if (e.key === 'Delete' && api.onDelete) { e.preventDefault(); select(r[key]); api.onDelete(r); }
    }
    function select(k, user) {
      sel = k;
      tbody.querySelectorAll('.rowbtn').forEach(b => { const on = b.dataset.k === String(k); b.setAttribute('aria-pressed', String(on)); b.closest('tr').classList.toggle('selected', on); });
      const r = data.find(x => x[key] === k);
      if (r && onSelect) onSelect(r, user);
    }
    const api = {
      el: wrap, table,
      update(newRows, keepSort = true) {
        const focusedKey = document.activeElement && tbody.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.k : null;
        data = newRows.slice();
        if (keepSort && sortKey) { const d = sortDir; const k = sortKey; sortKey = k; sortDir = d; const c = cols.find(c => c.key === k); data.sort((a, b) => { const av = c.sortVal ? c.sortVal(a) : a[k], bv = c.sortVal ? c.sortVal(b) : b[k]; const r = (typeof av === 'number' && typeof bv === 'number') ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true }); return d === 'ascending' ? r : -r; }); }
        if (sel !== null && !data.some(r => r[key] === sel)) sel = null;
        render();
        if (focusedKey) { const b = tbody.querySelector(`.rowbtn[data-k="${CSS.escape(focusedKey)}"]`); if (b) b.focus(); }
      },
      select, sortBy, get selected() { return data.find(r => r[key] === sel) || null; }, get rows() { return data; },
      focusRow(k) { const b = tbody.querySelector(`.rowbtn[data-k="${CSS.escape(String(k))}"]`); if (b) b.focus(); },
      focusFirst() { const b = tbody.querySelector('.rowbtn'); if (b) b.focus(); },
      setCols(c) { cols = c; render(); }
    };
    Object.assign(api, { expandable, isExpanded, onToggle });
    render();
    return api;
  }

  /* Tree of disclosure buttons. nodes: [{id,label,children:[...],expanded}] */
  let treeSeq = 0;
  function tree({ label, nodes, onSelect, selected }) {
    const id = 'tr' + (++treeSeq);
    let sel = selected || null;
    const nav = h('div', { class: 'tree', role: 'group', 'aria-label': label });
    const byId = {};
    function build(list, depth, parentId) {
      const ul = h('ul', { class: depth ? 'tree-sub' : 'tree-root' });
      list.forEach(n => {
        byId[n.id] = n; n._parent = parentId;
        const hasKids = n.children && n.children.length;
        const b = h('button', { type: 'button', class: 'tree-node', 'data-id': n.id, 'aria-expanded': hasKids ? String(!!n.expanded) : null, 'aria-current': sel === n.id ? 'true' : null },
          hasKids ? h('span', { class: 'tw', 'aria-hidden': 'true' }, n.expanded ? '\u25BE' : '\u25B8') : h('span', { class: 'tw', 'aria-hidden': 'true' }, ' '), n.label,
          h('span', { class: 'sr-only' }, `, level ${depth + 1}`));
        const li = h('li', null, b);
        if (hasKids) { const sub = build(n.children, depth + 1, n.id); sub.hidden = !n.expanded; li.append(sub); }
        b.addEventListener('click', () => activate(n.id, true));
        b.addEventListener('keydown', e => key(e, n));
        ul.append(li);
      });
      return ul;
    }
    function vis() { return Array.from(nav.querySelectorAll('.tree-node')).filter(b => b.offsetParent !== null || b.closest('ul').hidden === false && !b.closest('[hidden]')); }
    function btn(nid) { return nav.querySelector(`.tree-node[data-id="${CSS.escape(nid)}"]`); }
    function setExpanded(nid, ex) {
      const n = byId[nid]; if (!n || !n.children || !n.children.length) return;
      n.expanded = ex; const b = btn(nid); b.setAttribute('aria-expanded', String(ex));
      b.querySelector('.tw').textContent = ex ? '\u25BE' : '\u25B8';
      b.parentElement.querySelector('ul').hidden = !ex;
    }
    function activate(nid, user) {
      const n = byId[nid];
      const wasSel = sel === nid;
      sel = nid;
      nav.querySelectorAll('.tree-node').forEach(b => { if (b.dataset.id === nid) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      if (n.children && n.children.length && user) setExpanded(nid, wasSel ? !n.expanded : true);
      if (onSelect) onSelect(n, user);
    }
    function key(e, n) {
      const list = Array.from(nav.querySelectorAll('.tree-node')).filter(b => !b.closest('ul[hidden]'));
      const i = list.indexOf(e.currentTarget);
      if (e.key === 'ArrowDown' && i < list.length - 1) { e.preventDefault(); list[i + 1].focus(); }
      else if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); list[i - 1].focus(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (n.children && n.children.length) { if (!n.expanded) setExpanded(n.id, true); else { const sub = btn(n.id).parentElement.querySelector('ul .tree-node'); if (sub) sub.focus(); } } }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (n.expanded) setExpanded(n.id, false); else if (n._parent) btn(n._parent).focus(); }
      else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    }
    nav.append(build(nodes, 0, null));
    return { el: nav, select: (nid) => activate(nid, false), expand: setExpanded, focus: (nid) => { const b = btn(nid || sel); if (b) b.focus(); }, get selected() { return byId[sel]; },
      rebuild(newNodes) { nav.textContent = ''; Object.keys(byId).forEach(k => delete byId[k]); nav.append(build(newNodes, 0, null)); } };
  }

  /* Tabs. tabs: [{id,label,render(panel)}] */
  let tabSeq = 0;
  function tabs({ label, items, selected, onChange }) {
    const id = 'tb' + (++tabSeq);
    const list = h('div', { role: 'tablist', 'aria-label': label, class: 'tablist' });
    const panels = h('div', { class: 'tabpanels' });
    const btns = [];
    let cur = selected || items[0].id;
    items.forEach((t, i) => {
      const b = h('button', { type: 'button', role: 'tab', id: `${id}-t-${t.id}`, 'aria-controls': `${id}-p-${t.id}`, 'aria-selected': String(t.id === cur), tabindex: t.id === cur ? '0' : '-1' }, t.label);
      const p = h('div', { role: 'tabpanel', id: `${id}-p-${t.id}`, 'aria-labelledby': `${id}-t-${t.id}`, tabindex: '0', hidden: t.id !== cur, class: 'tabpanel' });
      b.addEventListener('click', () => choose(t.id, true));
      b.addEventListener('keydown', e => {
        const k = btns.indexOf(b);
        let n = null;
        if (e.key === 'ArrowRight') n = (k + 1) % btns.length; else if (e.key === 'ArrowLeft') n = (k - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = btns.length - 1;
        if (n !== null) { e.preventDefault(); choose(items[n].id, true); btns[n].focus(); }
      });
      btns.push(b); list.append(b); panels.append(p);
      t._panel = p; t._btn = b;
    });
    function choose(tid, user) {
      cur = tid;
      items.forEach(t => { const on = t.id === tid; t._btn.setAttribute('aria-selected', String(on)); t._btn.tabIndex = on ? 0 : -1; t._panel.hidden = !on; if (on) { t._panel.textContent = ''; t.render(t._panel); } });
      if (onChange) onChange(tid, user);
    }
    const el = h('div', { class: 'tabs' }, list, panels);
    choose(cur, false);
    return { el, select: (tid) => choose(tid, false), refresh: () => choose(cur, false), get current() { return cur; } };
  }

  /* Wizard inside a modal dialog. pages: [{title, render(body,data), validate(data)->error string}] */
  function wizard({ title, pages, data = {}, onFinish, finishLabel = 'Finish' }) {
    return new Promise(resolve => {
      const opener = document.activeElement;
      let i = 0;
      const head = h('h2', { id: 'wz-t' }, title);
      const stepH = h('h3', { tabindex: '-1', class: 'wz-step' });
      const body = h('div', { class: 'wz-body' });
      const err = h('p', { class: 'dlg-error', role: 'alert' });
      const back = h('button', { type: 'button', class: 'secondary' }, 'Back');
      const next = h('button', { type: 'button' }, 'Next');
      const cancel = h('button', { type: 'button', class: 'secondary' }, 'Cancel');
      const d = h('dialog', { 'aria-labelledby': 'wz-t', class: 'wide' }, h('div', { class: 'dlg-head' }, head), h('div', { class: 'dlg-body' }, stepH, err, body), h('div', { class: 'dlg-foot' }, back, next, cancel));
      let result = null;
      function show() {
        const p = pages[i];
        stepH.textContent = `Step ${i + 1} of ${pages.length}: ${p.title}`;
        body.textContent = ''; err.textContent = '';
        p.render(body, data);
        back.disabled = i === 0;
        next.textContent = i === pages.length - 1 ? finishLabel : 'Next';
        stepH.focus();
      }
      back.addEventListener('click', () => { if (i > 0) { i--; show(); } });
      next.addEventListener('click', () => {
        const p = pages[i];
        const e = p.validate ? p.validate(data, body) : null;
        if (e) { err.textContent = e; return; }
        if (p.onNext) p.onNext(data);
        if (i < pages.length - 1) { i++; show(); } else { result = data; d.close(); }
      });
      cancel.addEventListener('click', () => d.close());
      d.addEventListener('close', () => { d.remove(); if (result && onFinish) onFinish(result); resolve(result); setTimeout(() => { if (document.activeElement === document.body && opener && opener.isConnected) opener.focus(); }, 0); });
      document.body.append(d);
      d.showModal();
      show();
    });
  }

  function field(labelText, input, hint) {
    const id = input.id || ('f' + Math.random().toString(36).slice(2, 8));
    input.id = id;
    const hintEl = hint ? h('span', { class: 'hint', id: id + '-hint' }, hint) : null;
    if (hintEl) input.setAttribute('aria-describedby', id + '-hint');
    return h('div', { class: 'field' }, h('label', { for: id }, labelText), hintEl, input);
  }
  function radios(name, legend, options, value, onChange) {
    const fs = h('fieldset', null, h('legend', null, legend));
    options.forEach(o => {
      const id = name + '-' + String(o.value).replace(/\W/g, '');
      const r = h('input', { type: 'radio', name, id, value: o.value });
      r.checked = o.value === value;
      r.addEventListener('change', () => { if (r.checked && onChange) onChange(o.value); });
      fs.append(h('div', { class: 'opt' }, r, h('label', { for: id }, o.label)));
    });
    return fs;
  }
  function checkbox(labelText, checked, onChange, id) {
    id = id || 'cb' + Math.random().toString(36).slice(2, 8);
    const c = h('input', { type: 'checkbox', id }); c.checked = !!checked;
    c.addEventListener('change', () => onChange && onChange(c.checked));
    return h('div', { class: 'opt' }, c, h('label', { for: id }, labelText));
  }
  function select(labelText, options, value, onChange) {
    const s = h('select'); options.forEach(o => { const op = h('option', { value: o.value === undefined ? o : o.value }, o.label === undefined ? o : o.label); s.append(op); });
    s.value = value; s.addEventListener('change', () => onChange && onChange(s.value));
    return field(labelText, s);
  }

  /* ---------------- Desktop, taskbar, windows ---------------- */
  let els = {};
  function registerApp(id, def) { S.apps[id] = Object.assign({ id, keywords: [] }, def); }

  function desktop(container, opts = {}) {
    Object.assign(S, opts);
    S.root = container;
    const U = Object.assign({ startLabel: 'Start', startHeading: 'Start', searchLabel: 'Search apps, settings, and documents', searchHint: 'Type a name such as Command Prompt, PowerShell, or Control Panel. Results update as you type.', signOut: true, tbItems: [{ label: 'Task Manager', app: 'taskmgr' }, { label: 'Show desktop (list of desktop icons)', app: 'desktopicons' }], emptyText: 'No windows are open. Use the Start button on the taskbar to search for and open an app.', who: null }, opts.ui || {});
    S.ui = U;
    els.start = h('button', { type: 'button', class: 'start-btn', 'aria-expanded': 'false', 'aria-controls': 'start-panel' }, U.startLabel);
    els.tasklist = h('ul', { class: 'tasklist', 'aria-label': 'Open windows' });
    els.tbMore = h('button', { type: 'button', class: 'secondary tb-more', 'aria-expanded': 'false' }, 'Taskbar options');
    els.tbMore.addEventListener('click', () => popMenu(els.tbMore, U.tbItems.map(i => ({ label: i.label, action: () => openApp(i.app) })), 'Taskbar options'));
    if (!U.tbItems.length) els.tbMore.hidden = true;
    els.who = h('p', { class: 'who' });
    els.taskbar = h('nav', { class: 'taskbar', 'aria-label': 'Taskbar' }, els.start, els.tasklist, els.tbMore);
    els.q = h('input', { type: 'search', id: 'start-q', autocomplete: 'off' });
    els.results = h('ul', { class: 'start-results', id: 'start-results', 'aria-label': 'Search results' });
    els.panel = h('div', { id: 'start-panel', class: 'start-panel', hidden: true, role: 'region', 'aria-label': 'Start menu' },
      h('h3', null, U.startHeading),
      field(U.searchLabel, els.q, U.searchHint),
      els.results,
      h('div', { class: 'toolbar' }, U.signOut ? h('button', { type: 'button', class: 'secondary', onclick: () => signOut() }, 'Sign out') : null, h('button', { type: 'button', class: 'secondary', onclick: () => toggleStart(false) }, `Close ${U.startLabel}`)));
    els.windows = h('div', { class: 'win-area' });
    els.empty = h('p', { class: 'desk-empty' }, U.emptyText);
    els.signin = h('div', { class: 'signin', hidden: true });
    container.append(els.who, els.taskbar, els.panel, els.signin, els.windows, els.empty);
    els.start.addEventListener('click', () => toggleStart());
    els.q.addEventListener('input', () => search(els.q.value));
    els.q.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const b = els.results.querySelector('button'); if (b) b.click(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); const b = els.results.querySelector('button'); if (b) b.focus(); }
      if (e.key === 'Escape') { toggleStart(false); }
    });
    els.results.addEventListener('keydown', e => {
      const btns = Array.from(els.results.querySelectorAll('button')); const i = btns.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && i < btns.length - 1) { e.preventDefault(); btns[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) btns[i - 1].focus(); else els.q.focus(); }
      if (e.key === 'Escape') toggleStart(false);
    });
    updateWho(); renderTasklist(); search('');
  }
  function updateWho() { if (S.ui && S.ui.who) { els.who.textContent = S.ui.who(); return; } els.who.textContent = S.signedIn ? `Signed in to ${S.computer} as ${S.user}${S.isAdmin ? ' (administrator)' : ' (standard user)'}.` : `Signed out of ${S.computer}.`; }
  function toggleStart(force) {
    const open = force === undefined ? els.panel.hidden : force;
    if (open && !S.signedIn) { announce('Sign in first.'); return; }
    els.panel.hidden = !open; els.start.setAttribute('aria-expanded', String(open));
    if (open) { els.q.value = ''; search(''); els.q.focus(); } else els.start.focus();
  }
  function search(q) {
    q = q.trim().toLowerCase();
    els.results.textContent = '';
    const apps = Object.values(S.apps).filter(a => a.title && !a.hidden && (!q || a.title.toLowerCase().includes(q) || a.keywords.some(k => k.toLowerCase().includes(q))));
    if (!apps.length) { els.results.append(h('li', null, `No results for "${q}".`)); }
    apps.slice(0, q ? 8 : 12).forEach(a => {
      const li = h('li', null, h('button', { type: 'button', onclick: () => { toggleStart(false); openApp(a.id); } }, a.title, a.kind ? h('span', { class: 'sr-only' }, ', ' + a.kind) : null));
      if (a.canElevate) li.append(h('button', { type: 'button', class: 'secondary', onclick: () => { toggleStart(false); openApp(a.id, { elevate: true }); } }, `Run ${a.title} as administrator`));
      els.results.append(li);
    });
    if (q) announce(`${apps.length} result${apps.length === 1 ? '' : 's'}.`);
  }

  async function openApp(appId, opts = {}) {
    if (!S.signedIn) { announce('Sign in first.'); return null; }
    const app = S.apps[appId];
    if (!app) { alertBox('Windows', `Windows cannot find '${appId}'. Make sure you typed the name correctly, and then try again.`); return null; }
    if (app.launch) return app.launch(opts);
    if (app.single) { const ex = S.windows.find(w => w.appId === appId); if (ex) { activate(ex); return ex; } }
    let elevated = false;
    if (opts.elevate || app.requiresAdmin) {
      if (!S.isAdmin) {
        await alertBox('User Account Control', 'To continue, enter an administrator user name and password. In this simulation, sign in with an administrator account to run this app as an administrator.');
        return null;
      }
      const ok = await uac(app.uacName || app.title);
      if (!ok) { announce(`${app.title} was not started because you chose No.`); return null; }
      elevated = true;
    }
    return createWindow(app, Object.assign({}, opts, { elevated }));
  }

  function createWindow(app, opts) {
    const n = ++S.wseq;
    const titleId = `w${n}-title`;
    const titleEl = h('h3', { id: titleId, tabindex: '-1', class: 'win-title' });
    const closeBtn = h('button', { type: 'button', class: 'secondary win-close' }, 'Close');
    const body = h('div', { class: 'win-body' });
    const section = h('section', { class: 'win', 'aria-labelledby': titleId, 'data-app': app.id }, h('div', { class: 'win-titlebar' }, titleEl, closeBtn), body);
    const w = { n, appId: app.id, app, el: section, body, titleEl, opts, closers: [], pid: null, procs: [],
      setTitle(t) { w.title = t; titleEl.textContent = t; closeBtn.setAttribute('aria-label', `Close ${t}`); renderTasklist(); },
      onClose(f) { w.closers.push(f); }, close() { closeWindow(w); }, focus() { activate(w); } };
    closeBtn.addEventListener('click', () => closeWindow(w));
    w.setTitle(app.windowTitle ? app.windowTitle(opts) : app.title);
    S.windows.push(w);
    els.windows.append(section);
    if (app.proc) {
      const pinfo = typeof app.proc === 'function' ? app.proc(opts) : app.proc;
      w.pid = proc.spawn(Object.assign({ parent: explorerPid(), kind: 'app', win: w.n, elevated: opts.elevated }, pinfo));
      if (pinfo.console) proc.spawn({ name: 'conhost.exe', parent: w.pid, kind: 'windows', desc: 'Console Window Host', dependsOnParent: true, mem: 7200 });
    }
    app.create(w, opts);
    activate(w, { announceOpen: true });
    emit('window:open', w);
    return w;
  }
  function explorerPid() { const e = proc.byName('explorer.exe')[0]; return e ? e.pid : 0; }

  function activate(w, o = {}) {
    S.active = w;
    S.windows.forEach(x => { x.el.hidden = x !== w; });
    els.empty.hidden = S.windows.length > 0;
    renderTasklist();
    w.titleEl.focus();
    if (o.announceOpen) announce(`${w.title} window opened.`);
    if (w.app.onActivate) w.app.onActivate(w);
    emit('window:activate', w);
  }
  function focusActive() { if (S.active && S.active.el.isConnected) S.active.titleEl.focus(); else if (els.start) els.start.focus(); }
  function closeWindow(w, o = {}) {
    if (!S.windows.includes(w)) return;
    w.closers.forEach(f => { try { f(o); } catch (e) { console.error(e); } });
    S.windows = S.windows.filter(x => x !== w);
    w.el.remove();
    if (w.pid && !o.fromKill) proc.kill(w.pid, 'window closed');
    emit('window:close', w);
    announce(`${w.title} ${o.fromKill ? 'ended because its process was stopped' : 'closed'}.`);
    if (S.active === w) { S.active = null; const last = S.windows[S.windows.length - 1]; if (last) activate(last); else { els.empty.hidden = false; renderTasklist(); els.start.focus(); } }
    else renderTasklist();
  }
  function renderTasklist() {
    if (!els.tasklist) return;
    els.tasklist.textContent = '';
    S.windows.forEach(w => {
      const b = h('button', { type: 'button', class: 'task', 'aria-current': S.active === w ? 'true' : null }, w.title || w.app.title);
      b.addEventListener('click', () => activate(w));
      els.tasklist.append(h('li', null, b));
    });
    if (!S.windows.length) els.tasklist.append(h('li', { class: 'muted' }, 'No open windows'));
  }

  /* Sign in and out */
  function signOut() {
    toggleStart(false);
    S.windows.slice().forEach(w => closeWindow(w));
    // end processes owned by the user
    proc.list().filter(p => p.user === S.user && !p.protected).forEach(p => proc.kill(p.pid, 'signed out'));
    S.signedIn = false;
    emit('session:signout', { user: S.user });
    updateWho();
    showSignIn();
  }
  function showSignIn() {
    els.signin.hidden = false; els.empty.hidden = true; els.taskbar.hidden = true;
    els.signin.textContent = '';
    const head = h('h3', { tabindex: '-1' }, 'Sign-in screen');
    const pw = h('input', { type: 'password', autocomplete: 'off' });
    const err = h('p', { class: 'dlg-error', role: 'alert' });
    let chosen = Object.keys(S.users)[0];
    const users = radios('signin-user', 'Choose an account', Object.keys(S.users).map(u => ({ value: u, label: u })), chosen, v => { chosen = v; });
    const form = h('form', { onsubmit: e => { e.preventDefault(); const u = S.users[chosen]; if ((u.password || '') !== pw.value) { err.textContent = 'The password is incorrect. Try again.'; pw.value = ''; pw.focus(); return; } signIn(chosen); } },
      users, field('Password', pw, 'Leave blank if the account has no password.'), err, h('button', { type: 'submit' }, 'Sign in'));
    els.signin.append(head, form);
    head.focus();
    announce('Signed out. The sign-in screen is showing.');
  }
  function signIn(user) {
    const u = S.users[user];
    S.user = user; S.isAdmin = !!u.admin(); S.signedIn = true;
    els.signin.hidden = true; els.taskbar.hidden = false; els.empty.hidden = false;
    // a new explorer.exe for the session
    proc.spawn({ name: 'explorer.exe', parent: 0, kind: 'windows', desc: 'Windows Explorer', user, mem: 61000, system: true });
    updateWho();
    emit('session:signin', { user });
    announce(`Signed in as ${user}. ${u.firstTime ? 'Windows finished setting up this new account. ' : ''}Use the Start button to open apps.`);
    u.firstTime = false;
    els.start.focus();
  }

  function reset() {
    S.windows.slice().forEach(w => { w.closers = []; w.el.remove(); });
    S.windows = []; S.active = null; closeMenu(false);
    if (els.signin) { els.signin.hidden = true; els.taskbar.hidden = false; }
    renderTasklist();
    if (els.empty) els.empty.hidden = false;
  }

  return { S, on, emit, proc, fs, recycle, dialog, alertBox, confirmBox, uac, popMenu, closeMenu, menubar, grid, tree, tabs, wizard, field, radios, checkbox, select,
    desktop, registerApp, openApp, activate, closeWindow, signOut, signIn, updateWho, reset, focusActive, get active() { return S.active; } };
})();
