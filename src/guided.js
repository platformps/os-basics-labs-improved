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
    if (!lists.length && !hasQ && !isStep) return;
    units.push({ head: hd, part: hd.tagName === 'H3' ? part : '', title: hd.textContent.trim(), block, lists, questionsOnly: !lists.length, hasQ });
  });
  if (!units.length) return;
  units.forEach((u, i) => { u.index = i; u.lists.forEach(l => { l._unit = i; }); });

  // Panel inside the simulation frame.
  const title = h('h3', { id: 'guide-h', class: 'guide-title' });
  const pos = h('p', { class: 'guide-pos' });
  const body = h('div', { class: 'guide-body' });
  const prev = h('button', { type: 'button', class: 'secondary', onclick: () => show(cur - 1, true) }, 'Previous step');
  const next = h('button', { type: 'button', onclick: () => show(cur + 1, true) }, 'Next step');
  const readFull = h('a', { href: '#', class: 'guide-read', onclick: (e) => { e.preventDefault(); const t = units[cur].head; t.scrollIntoView({ block: 'start' }); focusOnce(t); } }, 'Read this step in the full lab text');
  const panel = h('section', { class: 'guide', 'aria-labelledby': 'guide-h' }, title, pos, body, h('div', { class: 'toolbar guide-tools' }, prev, next, readFull));
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
  function answerLink(el) {
    return h('a', { href: '#', onclick: (e) => { e.preventDefault(); const ta = el.querySelector('textarea, input'); if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); } } }, 'Answer it in the lab text');
  }

  function cloneBlock(u) {
    const frag = document.createDocumentFragment();
    u.block.forEach(el => {
      if (el.classList.contains('jump-wrap')) return;
      const c = el.cloneNode(true);
      [c, ...c.querySelectorAll('[id]')].forEach(x => x.removeAttribute && x.removeAttribute('id'));
      c.querySelectorAll('[tabindex]').forEach(x => x.removeAttribute('tabindex'));
      // Questions keep their answer boxes in the lab text; here they become a short pointer.
      if (c.classList.contains('question')) {
        frag.append(h('p', { class: 'guide-q' }, h('strong', null, 'Question: '), qText(el) + ' ', answerLink(el)));
        return;
      }
      const origQs = el.querySelectorAll('.question');
      c.querySelectorAll('.question').forEach((qel, k) => {
        const orig = origQs[k];
        qel.replaceWith(h('p', { class: 'guide-q' }, h('strong', null, 'Question: '), qText(orig) + ' ', answerLink(orig)));
      });
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
    pos.textContent = (u.part ? u.part + '. ' : '') + `Step ${i + 1} of ${units.length}.` + (u.questionsOnly ? ' Answer the question below in the lab text.' : '') + (i === units.length - 1 ? ' This is the last step of the lab.' : '');
    body.textContent = '';
    body.append(cloneBlock(u));
    prev.disabled = i === 0;
    const nx = units[i + 1];
    next.textContent = nx ? (nx.questionsOnly ? `Next: ${nx.title}` : 'Next step') : 'Next step (this is the last step)';
    next.disabled = !nx;
    Lab.store.set(key(), i);
    if (announce) { focusOnce(title); Lab.announce(`${u.part ? u.part + ', ' : ''}${u.title}. Step ${i + 1} of ${units.length}.`); }
  }

  // Lab text: each list's jump link opens that step in the panel.
  units.forEach((u, i) => {
    u.lists.forEach(l => {
      const wrap = l.nextElementSibling;
      const a = wrap && wrap.classList.contains('jump-wrap') ? wrap.querySelector('a') : null;
      if (!a) return;
      const fresh = a.cloneNode(true);
      fresh.textContent = `Do this step in the simulation (${u.title})`;
      fresh.addEventListener('click', (e) => { e.preventDefault(); show(i, false); simH.scrollIntoView({ block: 'start' }); focusOnce(title); Lab.announce(`${u.title}, shown in the simulation. Step ${i + 1} of ${units.length}.`); });
      a.replaceWith(fresh);
    });
  });

  const note = h('div', { class: 'note guide-note' }, h('p', null, h('strong', null, 'Guided version: '), 'the simulation starts with a "Current step" panel that shows the step you are on, with Previous step and Next step buttons, so you can stay in the simulation from the first step to the last. The full lab text below is the same as always; each steps list also has a link that opens that step in the simulation.'));
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
    const rest = units.slice(cur + 1).filter(u => u.questionsOnly && u.hasQ);
    const unanswered = [...labCol.querySelectorAll('.question textarea')].filter(t => !t.value.trim()).length;
    if (rest.length) Lab.announce(`${rest.map(u => u.title).join(' and ')} ${rest.length === 1 ? 'is' : 'are'} still to do: use the Next button in the Current step panel.`);
    else if (unanswered) Lab.announce(`${unanswered} question${unanswered === 1 ? '' : 's'} in the lab text still ${unanswered === 1 ? 'needs' : 'need'} an answer.`);
    else Lab.announce('Every question has an answer. You can download your answers from the Your progress section.');
  }
  if (progress) {
    const tasks = (Lab.config && Lab.config.tasks) || [];
    allDoneSaid = tasks.length > 0 && tasks.every(t => Lab.isDone(t.id));
    new MutationObserver(checkAllDone).observe(progress, { childList: true, characterData: true, subtree: true });
  }

  const saved = Lab.store.get(key());
  show(typeof saved === 'number' && saved < units.length ? saved : 0, false);
  window.Guided = { units, show, get current() { return cur; } };
})();
