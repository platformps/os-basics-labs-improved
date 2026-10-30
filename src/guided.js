/* Guided mode: shows the current lab step inside the simulation so a screen reader user
   never has to travel between the lab text and the simulated computer. Loaded only in the
   guided build. Depends on Lab (shell.js). */
;(function () {
  const sim = document.getElementById('sim');
  const simH = document.getElementById('sim-h');
  const labCol = document.querySelector('.lab-col');
  if (!sim || !simH || !labCol || typeof Lab === 'undefined') return;
  const h = Lab.h;
  const key = () => (window.COURSE_KEY || 'osb') + ':' + (Lab.config ? Lab.config.id : 'lab') + ':guided-step';

  // Collect step units: each h2 or h3 section in the lab text that holds a numbered steps list.
  const stop = new Set(['progress-h', 'howto', 'corrections']);
  const units = [];
  let part = '';
  const heads = [...labCol.querySelectorAll('h2, h3')].filter(x => !x.closest('.panel') && !stop.has(x.id));
  heads.forEach((hd) => {
    if (hd.tagName === 'H2') part = hd.textContent.trim();
    if (hd.id === 'howto' || hd.id === 'corrections') return;
    const block = [];
    let n = hd.nextElementSibling;
    while (n && !/^H[23]$/.test(n.tagName)) { block.push(n); n = n.nextElementSibling; }
    const lists = block.filter(x => x.matches('ol.steps'));
    const hasQ = block.some(x => x.matches('.question') || x.querySelector('.question'));
    const isStep = /^step\s*\d/i.test(hd.textContent.trim());
    const isWrap = /^(Reflection|Challenge|Summary)/i.test(hd.textContent.trim());
    if (!lists.length && !hasQ && !isStep && !isWrap) return;
    units.push({ head: hd, part: hd.tagName === 'H3' ? part : '', title: hd.textContent.trim(), block, lists, questionsOnly: !lists.length, hasQ });
  });
  if (!units.length) return;
  units.forEach(u => { u.isStep = /^Step\s*\d/i.test(u.title); u.wrap = !u.isStep && /^(Reflection|Challenge|Summary)/i.test(u.title); });
  const stepCount = units.filter(u => u.isStep).length;
  units.forEach((u, i) => { u.index = i; u.stepNo = u.isStep ? units.slice(0, i + 1).filter(x => x.isStep).length : 0; u.lists.forEach(l => { l._unit = i; }); });
  const where = u => u.isStep ? `${u.part ? u.part + '. ' : ''}${u.title.match(/^Step\s*[\d.]+/i)[0]}. ${u.stepNo} of ${stepCount} steps in this lab.` : (u.wrap ? `${u.title}. Wrap-up, after the last step.` : (u.part ? u.part + '. ' : ''));

  // Panel inside the simulation frame.
  const title = h('h3', { id: 'guide-h', class: 'guide-title' });
  const pos = h('p', { class: 'guide-pos' });
  const body = h('div', { class: 'guide-body' });
  const prev = h('button', { type: 'button', class: 'secondary', onclick: () => show(cur - 1, true) }, 'Previous step');
  const next = h('button', { type: 'button', onclick: () => show(cur + 1, true) }, 'Next step');
  const readFull = h('a', { href: '#', class: 'guide-read', onclick: (e) => { e.preventDefault(); const t = units[cur].head; t.scrollIntoView({ block: 'start' }); focusOnce(t); } }, 'Read this step in the full lab text');
  const nextItem = h('button', { type: 'button', class: 'secondary', onclick: () => stepItem(1, true) }, 'Next instruction');
  const repeatItem = h('button', { type: 'button', class: 'secondary', onclick: () => sayItem(true) }, 'Repeat instruction');
  const progLine = h('p', { class: 'guide-progress' });
  const stepsKey = () => key() + 's';
  const stepsDone = () => { const v = Lab.store.get(stepsKey()); return Array.isArray(v) ? v : []; };
  const doneBox = h('input', { type: 'checkbox', id: 'guide-done' });
  const doneLbl = h('label', { for: 'guide-done' }, 'I finished this step');
  const doneWrap = h('div', { class: 'guide-done' }, doneBox, doneLbl);
  doneBox.addEventListener('change', () => {
    const d = stepsDone(); const i = cur;
    if (doneBox.checked) { if (!d.includes(i)) d.push(i); } else { const k = d.indexOf(i); if (k >= 0) d.splice(k, 1); }
    Lab.store.set(stepsKey(), d);
    const n = units.filter((u, k) => d.includes(k) && u.isStep).length;
    Lab.announce(`${units[i].title} marked ${doneBox.checked ? 'done' : 'not done'}. ${n} of ${stepCount} steps done. ${progressText()}`);
  });
  function progressText() { const pt = document.getElementById('progress-text'); return pt ? pt.textContent.trim() + '.' : ''; }
  function refreshProgress() { const d = stepsDone(); const n = units.filter((u, k) => d.includes(k) && u.isStep).length; progLine.textContent = `${progressText()} ${n} of ${stepCount} steps marked done.`; }
  const keysHint = h('p', { class: 'guide-keys' }, h('strong', null, 'Shortcuts, from anywhere in the simulation: '), 'Alt+N reads the next instruction, Alt+P the previous one, Alt+R repeats it. Alt+A jumps to the answer box for a question, Alt+B takes you back to where you were in the simulation.');
  const panel = h('section', { class: 'guide', 'aria-labelledby': 'guide-h' }, title, pos, body, doneWrap, progLine, h('div', { class: 'toolbar guide-tools' }, nextItem, repeatItem, prev, next, readFull), keysHint);
  sim.before(panel);
  const back = document.getElementById('back-to-steps');
  if (back) back.parentElement.remove();

  function focusOnce(el) {
    el.setAttribute('tabindex', '-1');
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true });
    el.focus();
  }

  // The lab shell turns each question's text into the label of its answer box (with a hidden
  // "Question:" prefix); read the visible words only, so the panel never says "Question" twice.
  function qText(qel) {
    const src = qel.querySelector('.qlabel') || qel.querySelector('.qtext');
    if (!src) return '';
    const c = src.cloneNode(true);
    c.querySelectorAll('.sr-only').forEach(x => x.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  // An answer box inside the panel, kept in sync with the real one in the lab text, so the
  // learner can answer without leaving the simulation.
  function answerBox(el) {
    const orig = el.querySelector('textarea');
    const id = el.dataset.q || Math.random().toString(36).slice(2, 7);
    const taId = 'guide-ans-' + id;
    const lbl = h('label', { for: taId, class: 'qlabel' }, h('span', { class: 'sr-only' }, 'Question: '), qText(el));
    const ta = h('textarea', { id: taId, rows: 3 });
    ta.value = orig ? orig.value : '';
    ta.addEventListener('input', () => { if (orig) { orig.value = ta.value; orig.dispatchEvent(new Event('input', { bubbles: true })); } });
    const wrap = h('div', { class: 'question guide-question' }, lbl, ta);
    const det = el.querySelector('details');
    if (det) wrap.append(h('details', null, h('summary', null, 'Show sample answer'), det.querySelector('.sample-body').cloneNode(true)));
    return wrap;
  }

  function cloneBlock(u) {
    const frag = document.createDocumentFragment();
    u.block.forEach(el => {
      if (el.classList.contains('jump-wrap')) return;
      const c = el.cloneNode(true);
      [c, ...c.querySelectorAll('[id]')].forEach(x => x.removeAttribute && x.removeAttribute('id'));
      c.querySelectorAll('[tabindex]').forEach(x => x.removeAttribute('tabindex'));
      // Questions keep their answer boxes in the lab text; here they become a short pointer.
      if (c.classList.contains('question')) { frag.append(answerBox(el)); return; }
      const origQs = el.querySelectorAll('.question');
      c.querySelectorAll('.question').forEach((qel, k) => qel.replaceWith(answerBox(origQs[k])));
      frag.append(c);
    });
    return frag;
  }

  let cur = 0;
  function show(i, announce) {
    if (i < 0 || i >= units.length) return;
    cur = i;
    const u = units[i];
    title.textContent = u.title;
    pos.textContent = where(u) + (u.questionsOnly && u.hasQ ? ' Type your answer in the box below.' : '') + (i === units.length - 1 ? ' This is the end of the lab.' : '');
    body.textContent = '';
    body.append(cloneBlock(u));
    if (i === units.length - 1) {
      const ex = document.getElementById('btn-export');
      body.append(h('div', { class: 'guide-finish' },
        h('p', null, 'When you are done, download your answers to hand in. Your checklist and answers are also saved in this browser.'),
        h('div', { class: 'toolbar' }, h('button', { type: 'button', onclick: () => { if (ex) ex.click(); } }, 'Download my answers'), h('a', { href: '../index.html', class: 'btn secondary' }, 'All labs'))));
    }
    prev.disabled = i === 0;
    const nx = units[i + 1];
    next.textContent = nx ? (nx.isStep ? 'Next step' : `Next: ${nx.title}`) : 'Next step (this is the end of the lab)';
    next.disabled = !nx;
    Lab.store.set(key(), i);
    doneBox.checked = stepsDone().includes(i);
    doneLbl.textContent = u.isStep ? `I finished this step (${u.title})` : `I finished this section (${u.title})`;
    refreshProgress();
    setItem(0);
    if (announce) { focusOnce(title); Lab.announce(u.isStep ? `${u.title}. ${u.stepNo} of ${stepCount} steps in this lab.` : where(u)); }
  }

  // Instructions inside the current step: numbered items, notes, and questions. The learner
  // moves through them with Alt+N / Alt+P / Alt+R while focus stays in the simulated computer.
  let items = [], curItem = 0;
  function itemText(el) {
    if (el.classList.contains('guide-question')) return 'Question: ' + el.querySelector('label').textContent.replace(/^Question:\s*/, '').trim();
    return el.textContent.replace(/\s+/g, ' ').trim();
  }
  function setItem(k) {
    items = [...body.querySelectorAll('ol.steps > li, .guide-question, .note')];
    items.forEach(x => { x.classList.remove('guide-cur'); x.removeAttribute('aria-current'); });
    curItem = Math.max(0, Math.min(k, items.length - 1));
    if (items[curItem]) { items[curItem].classList.add('guide-cur'); items[curItem].setAttribute('aria-current', 'step'); }
    nextItem.disabled = !items.length;
    repeatItem.disabled = !items.length;
  }
  let returnTo = null;
  function sayItem(announce) {
    const it = items[curItem]; if (!it) { Lab.announce(`${units[cur].title}. No numbered instructions in this step.`); return; }
    const u = units[cur];
    const isQ = it.classList.contains('guide-question');
    Lab.announce(`${u.title}, instruction ${curItem + 1} of ${items.length}: ${itemText(it)}` + (isQ ? ' Press Alt+A to answer.' : ''));
  }
  // Alt+A: jump to the answer box of the current (or nearest) question; Alt+B: go back to where you were.
  function answerCurrent() {
    let k = curItem; while (k < items.length && !items[k].classList.contains('guide-question')) k++;
    if (k >= items.length) { k = curItem; while (k >= 0 && !items[k].classList.contains('guide-question')) k--; }
    if (k < 0) { Lab.announce('This step has no question to answer.'); return; }
    const ta = items[k].querySelector('textarea'); if (!ta) return;
    const a = document.activeElement;
    returnTo = (a && a !== document.body && !panel.contains(a)) ? a : returnTo;
    setItem(k);
    ta.focus();
    Lab.announce('Answer box. Type your answer, then press Alt+B to go back to where you were, or Alt+N for the next instruction.');
  }
  function goBack() {
    if (returnTo && returnTo.isConnected && returnTo.offsetParent !== null) { const t = returnTo; returnTo = null; t.focus(); Lab.announce('Back in the simulation.'); return; }
    const first = sim.querySelector('.term-input, .start-btn, button, input, [tabindex="0"]');
    if (first) { first.focus(); Lab.announce('Back in the simulation.'); } else Lab.announce('Nothing to go back to.');
  }
  function stepItem(dir, announce) {
    if (!items.length || curItem + dir >= items.length) {
      if (dir > 0 && cur < units.length - 1) { show(cur + 1, false); Lab.announce(`Moving on. `); sayItem(true); }
      else if (dir > 0) Lab.announce('That was the last instruction of the lab.');
      return;
    }
    if (curItem + dir < 0) {
      if (cur > 0) { show(cur - 1, false); setItem(items.length - 1); sayItem(true); } else Lab.announce('This is the first instruction of the lab.');
      return;
    }
    setItem(curItem + dir); sayItem(true);
  }
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const k = e.code;
    if (k === 'KeyN') { e.preventDefault(); stepItem(1, true); }
    else if (k === 'KeyP') { e.preventDefault(); stepItem(-1, true); }
    else if (k === 'KeyR') { e.preventDefault(); sayItem(true); }
    else if (k === 'KeyA') { e.preventDefault(); answerCurrent(); }
    else if (k === 'KeyB') { e.preventDefault(); goBack(); }
  });

  // Lab text: each list's jump link opens that step in the panel.
  units.forEach((u, i) => {
    u.lists.forEach(l => {
      const wrap = l.nextElementSibling;
      const a = wrap && wrap.classList.contains('jump-wrap') ? wrap.querySelector('a') : null;
      if (!a) return;
      const fresh = a.cloneNode(true);
      fresh.textContent = `Do this step in the simulation (${u.title})`;
      fresh.addEventListener('click', (e) => { e.preventDefault(); show(i, false); simH.scrollIntoView({ block: 'start' }); focusOnce(title); Lab.announce(`${u.title}, shown in the simulation.`); });
      a.replaceWith(fresh);
    });
  });

  const note = h('div', { class: 'note guide-note' }, h('p', null, h('strong', null, 'Guided version: '), 'the simulation starts with a "Current step" panel that shows the step you are on, with Previous step and Next step buttons and the answer boxes for that step, so you can stay in the simulation from the first step to the last. While you work in the simulated computer, press Alt+N to hear the next instruction, Alt+P for the previous one, and Alt+R to repeat it; focus stays where you are. When an instruction is a question, Alt+A moves you to its answer box and Alt+B brings you back. Use the "Skip to the simulation" link at the top of the page to get there. The full lab text below is the same as always; each steps list also has a link that opens that step in the simulation.'));
  const start = document.getElementById('lab-start');
  if (start) start.after(note);

  // When the last task is marked complete, point to what remains (usually the Reflection).
  // Labs keep their own reference to Lab.complete, so watch the progress line instead of wrapping it.
  const progress = document.getElementById('progress-text');
  let allDoneSaid = false;
  function checkAllDone() {
    const tasks = (Lab.config && Lab.config.tasks) || [];
    if (allDoneSaid || !tasks.length || !tasks.every(t => Lab.isDone(t.id))) return;
    allDoneSaid = true;
    const rest = units.slice(cur + 1).filter(u => u.wrap && u.hasQ);
    const unanswered = [...labCol.querySelectorAll('.question textarea')].filter(t => !t.value.trim()).length;
    if (rest.length) Lab.announce(`${rest.map(u => u.title).join(' and ')} ${rest.length === 1 ? 'is' : 'are'} still to do: use the Next button in the Current step panel.`);
    else if (unanswered) Lab.announce(`${unanswered} question${unanswered === 1 ? '' : 's'} still ${unanswered === 1 ? 'needs' : 'need'} an answer. Use Previous step to find ${unanswered === 1 ? 'it' : 'them'}.`);
    else Lab.announce('Every question has an answer. The Download my answers button is at the end of the last step.');
  }
  if (progress) {
    const tasks = (Lab.config && Lab.config.tasks) || [];
    allDoneSaid = tasks.length > 0 && tasks.every(t => Lab.isDone(t.id));
    new MutationObserver(() => { refreshProgress(); checkAllDone(); }).observe(progress, { childList: true, characterData: true, subtree: true });
  }

  const saved = Lab.store.get(key());
  show(typeof saved === 'number' && saved < units.length ? saved : 0, false);
  window.Guided = { units, show, get current() { return cur; } };
})();
