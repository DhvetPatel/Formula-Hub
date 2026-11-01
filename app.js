/* ==========================================================
   FormulaHub – app.js
   Pure front-end. No libraries, no build step.
   Routes (hash based):
     #/                       → home (3 subjects)
     #/s/<subject>            → chapters of a subject
     #/c/<subject>/<chapter>  → formulas in a chapter
     #/about                  → about page
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Easy-to-edit config ---------- */
  const CONFIG = {
    siteName: 'FormulaHub',
    author: 'Dabetto26',          // ← change this later
    year: new Date().getFullYear(),
    tagline: 'JEE · NEET · CBSE — Class 11 & 12',
  };

  /* ---------- Subjects ---------- */
  const ICONS = {
    maths: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M38 8H12l15 16-15 16h26"/></svg>',
    physics: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2"><ellipse cx="24" cy="24" rx="19" ry="7.5"/><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(120 24 24)"/><circle cx="24" cy="24" r="3.6" fill="currentColor" stroke="none"/></svg>',
    chemistry: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6h12M20 6v12L8 38a3 3 0 0 0 2.7 4.4h26.6A3 3 0 0 0 40 38L28 18V6"/><path d="M14 30h20" /><circle cx="21" cy="35.5" r="1.4" fill="currentColor"/><circle cx="28" cy="34" r="1.4" fill="currentColor"/></svg>',
  };
  const SUBJECTS = {
    maths:     { key: 'maths',     label: 'Maths',     tag: 'MATHS',     tone: 'yellow', glyph: '∫', blurb: 'Algebra, trigonometry, calculus, vectors, 3D geometry & probability.' },
    physics:   { key: 'physics',   label: 'Physics',   tag: 'PHYSICS',   tone: 'green',  glyph: 'ψ', blurb: 'Mechanics, thermodynamics, waves, electromagnetism, optics & modern physics.' },
    chemistry: { key: 'chemistry', label: 'Chemistry', tag: 'CHEMISTRY', tone: 'coral',  glyph: '⚗', blurb: 'Physical & general chemistry — mole concept to electrochemistry and kinetics.' },
  };
  const TONES = ['yellow', 'green', 'coral', 'blue', 'navy'];

  /* ---------- Build the database from data-*.js ---------- */
  const RAW = window.FD || {};
  const GREEK = { α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', Δ: 'delta', ε: 'epsilon', θ: 'theta', λ: 'lambda lamda', μ: 'mu', ν: 'nu', π: 'pi', ρ: 'rho', σ: 'sigma', τ: 'tau', φ: 'phi', ω: 'omega', Ω: 'omega', η: 'eta', ψ: 'psi', χ: 'chi', κ: 'kappa', '∫': 'integral integration', Σ: 'sigma sum summation', '√': 'root sqrt square root', '∞': 'infinity', '°': 'degree' };
  const SUPERSCRIPT_WORDS = { '²': ' squared', '³': ' cubed', '⁻¹': ' inverse' };

  const BY_ID = new Map();
  const ALL = [];
  Object.keys(SUBJECTS).forEach((key) => {
    const s = SUBJECTS[key];
    s.chapters = (RAW[key] || []).map((c, ci) => {
      const chapter = { id: c.id, name: c.name, cls: c.cls, index: ci, subject: key, tone: TONES[ci % TONES.length], formulas: [] };
      chapter.formulas = c.f.map((a, fi) => {
        const f = {
          id: key + '|' + c.id + '|' + fi,
          name: a[0], topic: a[1], formula: a[2], vars: a[3] || '',
          subject: key, chapter: c.id, chapterName: c.name, cls: c.cls,
        };
        f.n = { name: low(f.name), topic: low(f.topic), chapter: low(f.chapterName), vars: low(f.vars), formula: low(f.formula), subject: key + ' ' + s.label.toLowerCase(), cls: 'class ' + f.cls };
        f.blob = Object.values(f.n).join(' ') + ' ' + extras(f.formula + ' ' + f.vars);
        BY_ID.set(f.id, f);
        ALL.push(f);
        return f;
      });
      return chapter;
    });
    s.count = s.chapters.reduce((n, c) => n + c.formulas.length, 0);
  });
  const TOTAL = ALL.length;
  const TOTAL_CHAPTERS = Object.values(SUBJECTS).reduce((n, s) => n + s.chapters.length, 0);

  function low(s) { return String(s).toLowerCase(); }
  function extras(s) {           // adds searchable words for greek letters / symbols
    let out = '';
    for (const ch of s) { if (GREEK[ch]) out += ' ' + GREEK[ch]; }
    for (const k in SUPERSCRIPT_WORDS) { if (s.includes(k)) out += SUPERSCRIPT_WORDS[k]; }
    return low(out);
  }

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const main = $('#main');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function hl(text, tokens) {
    if (!tokens || !tokens.length) return esc(text);
    const re = new RegExp('(' + tokens.map(reEsc).join('|') + ')', 'gi');
    return String(text).split(re).map((p, i) => (i % 2 ? '<mark>' + esc(p) + '</mark>' : esc(p))).join('');
  }
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const go = (hash) => { location.hash = hash; };

  /* ---------- Templates ---------- */
  function formulaCard(f, tokens, withContext) {
    const tone = SUBJECTS[f.subject].tone;
    return `
      <article class="f-card pop reveal tone-${tone}" data-id="${esc(f.id)}">
        <div class="f-head">
          <span class="pill">${hl(f.topic, tokens)}</span>
          ${withContext ? `<span class="pill ghost">Class ${f.cls}</span>` : ''}
        </div>
        <h3>${hl(f.name, tokens)}</h3>
        <div class="f-eq">${hl(f.formula, tokens)}
          <button class="copy-btn" type="button" data-copy="${esc(f.id)}" aria-label="Copy formula" title="Copy formula">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>
          </button>
        </div>
        ${f.vars ? `<p class="f-vars"><b>Where:</b> ${hl(f.vars, tokens)}</p>` : ''}
        ${withContext ? `<p class="f-ctx"><a href="#/s/${f.subject}">${SUBJECTS[f.subject].label}</a> › <a href="#/c/${f.subject}/${f.chapter}">${hl(f.chapterName, tokens)}</a></p>` : ''}
      </article>`;
  }

  function chapterCard(c, i) {
    return `
      <a class="chapter-card pop reveal tone-${c.tone}" href="#/c/${c.subject}/${c.id}">
        <div class="c-top">
          <h3>${esc(c.name)}</h3>
          <span class="c-num">${String(c.index + 1).padStart(2, '0')}</span>
        </div>
        <div class="c-meta">
          <span class="c-cls">Class ${c.cls}</span>
          <span>${plural(c.formulas.length, 'formula')} <span class="c-go">→</span></span>
        </div>
      </a>`;
  }

  /* ---------- Views ---------- */
  function viewHome() {
    const subjects = Object.values(SUBJECTS).map((s) => `
      <a class="subject-card pop reveal tone-${s.tone}" href="#/s/${s.key}" data-glyph="${s.glyph}">
        <span class="s-icon">${ICONS[s.key]}</span>
        <span class="s-tag">${s.tag}</span>
        <h2>${s.label}</h2>
        <p>${s.blurb}</p>
        <span class="s-meta"><span>${s.chapters.length} chapters · ${s.count} formulas</span><span class="s-arrow">→</span></span>
      </a>`).join('');

    return `
      <section class="page">
        <div class="hero">
          <i class="blob b1"></i><i class="blob b2" style="--r:14deg"></i><i class="blob b3"></i>
          <div class="hero-eyebrow">
            <span class="pill tone-yellow">JEE</span><span class="pill tone-green">NEET</span><span class="pill tone-coral">CBSE</span><span class="pill ghost">Class 11 &amp; 12</span>
          </div>
          <h1>Every formula, <span class="hl">one tap</span> away.</h1>
          <p class="lead">Pick a subject, open a chapter, and revise every formula with its name, topic and what each symbol means. Or just search.</p>
          <div class="hero-stats">
            <div class="stat"><b data-count="${TOTAL}">0</b><span>formulas</span></div>
            <div class="stat"><b data-count="${TOTAL_CHAPTERS}">0</b><span>chapters</span></div>
            <div class="stat"><b data-count="3">0</b><span>subjects</span></div>
          </div>
        </div>
        <div class="subject-grid">${subjects}</div>
        <div class="quick reveal">
          <h3>Try searching</h3>
          <div class="chips">
            ${['kinetic energy', 'ohm', 'mole', 'integration by parts', 'omega', 'efficiency', 'Nernst', 'projectile'].map((q) => `<button class="chip" type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}
          </div>
        </div>
      </section>`;
  }

  function viewSubject(key, filter) {
    const s = SUBJECTS[key];
    if (!s) return viewNotFound();
    const cls = filter === '11' || filter === '12' ? filter : 'all';
    const list = s.chapters.filter((c) => cls === 'all' || String(c.cls) === cls);
    const n11 = s.chapters.filter((c) => c.cls === 11).length;
    const n12 = s.chapters.filter((c) => c.cls === 12).length;
    return `
      <section class="page" data-subject="${key}">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> › <span>${s.label}</span></nav>
        <div class="banner pop tone-${s.tone}">
          <div>
            <span class="pill">${s.tag}</span>
            <h1 style="margin-top:12px">${s.label}</h1>
            <p class="b-sub">${s.chapters.length} chapters · ${s.count} formulas</p>
          </div>
          <span class="b-icon">${ICONS[key]}</span>
        </div>
        <div class="toolbar">
          <div class="chips" role="group" aria-label="Filter by class">
            <button class="chip" type="button" data-cls="all" aria-pressed="${cls === 'all'}">All <small>${s.chapters.length}</small></button>
            <button class="chip" type="button" data-cls="11" aria-pressed="${cls === '11'}">Class 11 <small>${n11}</small></button>
            <button class="chip" type="button" data-cls="12" aria-pressed="${cls === '12'}">Class 12 <small>${n12}</small></button>
          </div>
        </div>
        <div class="chapter-grid" id="chapterGrid">${list.map(chapterCard).join('')}</div>
      </section>`;
  }

  function viewChapter(key, id) {
    const s = SUBJECTS[key];
    const idx = s ? s.chapters.findIndex((c) => c.id === id) : -1;
    if (idx < 0) return viewNotFound();
    const c = s.chapters[idx];
    const groups = [];
    c.formulas.forEach((f) => {
      let g = groups.find((x) => x.topic === f.topic);
      if (!g) { g = { topic: f.topic, items: [] }; groups.push(g); }
      g.items.push(f);
    });
    const prev = s.chapters[idx - 1], next = s.chapters[idx + 1];
    return `
      <section class="page">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> › <a href="#/s/${key}">${s.label}</a> › <span>${esc(c.name)}</span></nav>
        <div class="banner pop tone-${s.tone}">
          <div>
            <div class="chips"><span class="pill">${s.tag}</span><span class="pill">Class ${c.cls}</span></div>
            <h1 style="margin-top:12px">${esc(c.name)}</h1>
            <p class="b-sub">${plural(c.formulas.length, 'formula')} across ${plural(groups.length, 'topic')}</p>
          </div>
          <span class="b-icon">${ICONS[key]}</span>
        </div>
        ${groups.length > 1 ? `
        <div class="topic-nav">
          <div class="chips" aria-label="Jump to topic">${groups.map((g, i) => `<button class="chip" type="button" data-jump="t${i}">${esc(g.topic)} <small>${g.items.length}</small></button>`).join('')}</div>
        </div>` : ''}
        ${groups.map((g, i) => `
          <div class="topic-group tone-${s.tone}" id="t${i}">
            <h2>${esc(g.topic)}</h2>
            <div class="formula-grid">${g.items.map((f) => formulaCard(f, null, false)).join('')}</div>
          </div>`).join('')}
        <div class="pager">
          ${prev ? `<a class="prev pop" href="#/c/${key}/${prev.id}"><small>← Previous</small><span>${esc(prev.name)}</span></a>` : '<span></span>'}
          ${next ? `<a class="next pop" href="#/c/${key}/${next.id}"><small>Next →</small><span>${esc(next.name)}</span></a>` : ''}
        </div>
      </section>`;
  }

  const search = { q: '', subject: 'all' };

  function tokensOf(q) { return low(q).split(/\s+/).filter(Boolean); }

  function runSearch(q, subject) {
    const tokens = tokensOf(q);
    const out = [];
    for (const f of ALL) {
      if (subject !== 'all' && f.subject !== subject) continue;
      let score = 0, ok = true;
      for (const t of tokens) {
        if (!f.blob.includes(t)) { ok = false; break; }
        if (f.n.name.includes(t)) score += 6;
        if (f.n.topic.includes(t)) score += 4;
        if (f.n.chapter.includes(t)) score += 3;
        if (f.n.vars.includes(t)) score += 3;
        if (f.n.formula.includes(t)) score += 2;
        if (f.n.subject.includes(t)) score += 1;
        if (f.n.name.split(/\W+/).includes(t)) score += 3;   // whole-word bonus
      }
      if (ok) out.push({ f, score });
    }
    out.sort((a, b) => b.score - a.score);
    return { tokens, results: out.map((r) => r.f) };
  }

  function viewSearch() {
    const { tokens, results } = runSearch(search.q, search.subject);
    const base = runSearch(search.q, 'all').results;   // for per-subject counts
    const counts = { all: base.length };
    Object.keys(SUBJECTS).forEach((k) => (counts[k] = base.filter((f) => f.subject === k).length));
    const shown = results.slice(0, 150);
    return `
      <section class="page">
        <div class="results-head">
          <h1>Results for <em>${esc(search.q)}</em></h1>
          <p>${plural(results.length, 'formula')} found${results.length > shown.length ? ' · showing top ' + shown.length : ''}. Searching names, topics, chapters, subjects, formulas and parameters.</p>
        </div>
        <div class="toolbar">
          <div class="chips" role="group" aria-label="Filter by subject">
            ${['all'].concat(Object.keys(SUBJECTS)).map((k) => `<button class="chip" type="button" data-subj="${k}" aria-pressed="${search.subject === k}">${k === 'all' ? 'All' : SUBJECTS[k].label} <small>${counts[k]}</small></button>`).join('')}
          </div>
        </div>
        ${shown.length ? `<div class="formula-grid">${shown.map((f) => formulaCard(f, tokens, true)).join('')}</div>` : `
        <div class="empty pop" style="margin-top:20px;background:var(--surface)">
          <div class="big">∅</div>
          <h2>No formula found</h2>
          <p>Try fewer words, or search by a parameter like “velocity”, “mass” or “temperature”.</p>
          <button class="btn" type="button" data-q="energy">Try “energy”</button>
        </div>`}
      </section>`;
  }

  function viewAbout() {
    return `
      <section class="page about">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> › <span>About</span></nav>
        <div class="about-card pop">
          <span class="eyebrow">ABOUT THE PROJECT</span>
          <h1>Made by<br>${esc(CONFIG.author)}</h1>
          <p>${esc(CONFIG.siteName)} A site where u can find formulas for class 11-12 if ur too lazy to flip through ur pages.
            While ur at it, check out my socials:
            Instagram:- <a href="https://www.instagram.com/molten_mozzarella/" target="_blank" rel="noopener noreferrer">@molten_mozzarella</a>.
        </div>
        <div class="about-grid">
          <div class="about-tile pop reveal"><h3>🔎 Instant search</h3><p>Find any formula by its name, topic, subject or even a parameter like “velocity” or “ω”.</p></div>
          <div class="about-tile pop reveal"><h3>🌗 Light &amp; dark</h3><p>Switch themes from the menu. Your choice is remembered on this device.</p></div>
          <div class="about-tile pop reveal"><h3>📱 Every device</h3><p>Responsive layout that works on phones, tablets and desktops. No sign-up, no ads.</p></div>
        </div>
        <p style="margin-top:28px;color:var(--muted);font-size:.9rem">Version 1.0 · ${CONFIG.tagline}</p>
      </section>`;
  }

  function viewNotFound() {
    return `
      <section class="page empty">
        <div class="big">404</div>
        <h2>That page doesn't exist</h2>
        <p>The chapter or subject you're looking for couldn't be found.</p>
        <a class="btn" href="#/">← Back home</a>
      </section>`;
  }

  /* ---------- Rendering ---------- */
  let observer = null;
  let subjectClassFilter = 'all';

  function mount(html) {
    main.innerHTML = html;
    afterRender();
  }

  function afterRender() {
    // Staggered scroll reveal
    if (observer) observer.disconnect();
    const items = $$('.reveal', main);
    items.forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
      items.forEach((el) => observer.observe(el));
    } else items.forEach((el) => el.classList.add('in'));

    // Count-up numbers
    $$('[data-count]', main).forEach((el) => {
      const target = +el.dataset.count;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = target; return; }
      const t0 = performance.now(), dur = 900;
      (function tick(t) {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  function renderRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    let title = CONFIG.siteName;
    let html;
    if (!parts.length) { html = viewHome(); }
    else if (parts[0] === 's' && parts[1]) { subjectClassFilter = 'all'; html = viewSubject(parts[1], subjectClassFilter); if (SUBJECTS[parts[1]]) title = SUBJECTS[parts[1]].label + ' formulas'; }
    else if (parts[0] === 'c' && parts[1] && parts[2]) {
      html = viewChapter(parts[1], parts[2]);
      const ch = SUBJECTS[parts[1]] && SUBJECTS[parts[1]].chapters.find((c) => c.id === parts[2]);
      if (ch) title = ch.name + ' – ' + SUBJECTS[parts[1]].label;
    }
    else if (parts[0] === 'about') { html = viewAbout(); title = 'About'; }
    else html = viewNotFound();
    document.title = title + (title === CONFIG.siteName ? ' – JEE, NEET & CBSE Formulas' : ' · ' + CONFIG.siteName);
    mount(html);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderCurrent() {
    if (search.q.trim()) { mount(viewSearch()); } else { renderRoute(); }
  }

  /* ---------- Search input ---------- */
  const form = $('#searchForm'), input = $('#searchInput'), clearBtn = $('#searchClear');
  let timer;
  function setQuery(q, focus) {
    input.value = q;
    onInput();
    if (focus) input.focus();
  }
  function onInput() {
    const v = input.value;
    form.classList.toggle('has-value', !!v);
    clearBtn.hidden = !v;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const had = !!search.q.trim();
      search.q = v;
      if (v.trim()) { if (!had) search.subject = 'all'; mount(viewSearch()); document.title = 'Search: ' + v.trim() + ' · ' + CONFIG.siteName; }
      else renderRoute();
    }, 110);
  }
  input.addEventListener('input', onInput);
  form.addEventListener('submit', (e) => { e.preventDefault(); input.blur(); });
  clearBtn.addEventListener('click', () => { setQuery('', true); });

  document.addEventListener('keydown', (e) => {
    const typing = /^(input|textarea)$/i.test(document.activeElement.tagName);
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); input.focus(); input.select(); }
    if (e.key === 'Escape') {
      if (menu.classList.contains('open')) closeMenu();
      else if (document.activeElement === input && input.value) setQuery('', true);
    }
  });

  /* ---------- Delegated clicks inside <main> ---------- */
  main.addEventListener('click', (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const f = BY_ID.get(copy.dataset.copy);
      if (f) copyText(f.formula, copy);
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) { setQuery(q.dataset.q, false); return; }
    const subj = e.target.closest('[data-subj]');
    if (subj) { search.subject = subj.dataset.subj; mount(viewSearch()); return; }
    const cls = e.target.closest('[data-cls]');
    if (cls) {
      const key = location.hash.split('/')[2];
      subjectClassFilter = cls.dataset.cls;
      const s = SUBJECTS[key];
      $$('[data-cls]', main).forEach((b) => b.setAttribute('aria-pressed', String(b === cls)));
      $('#chapterGrid', main).innerHTML = s.chapters
        .filter((c) => subjectClassFilter === 'all' || String(c.cls) === subjectClassFilter)
        .map(chapterCard).join('');
      afterRender();
      return;
    }
    const jump = e.target.closest('[data-jump]');
    if (jump) { const t = document.getElementById(jump.dataset.jump); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    // clicking a link from search results clears the search so the route shows
    const link = e.target.closest('a[href^="#/"]');
    if (link && search.q.trim()) { search.q = ''; input.value = ''; form.classList.remove('has-value'); clearBtn.hidden = true; if (location.hash === link.getAttribute('href')) renderRoute(); }
  });

  /* ---------- Copy ---------- */
  function copyText(text, btn) {
    const done = () => {
      toast('Formula copied');
      btn.classList.add('done');
      setTimeout(() => btn.classList.remove('done'), 1200);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { toast('Press Ctrl+C to copy'); }
    ta.remove();
  }
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  /* ---------- Menu & theme ---------- */
  const menuBtn = $('#menuBtn'), menu = $('#menu');
  function openMenu() { menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu'); }
  function closeMenu() { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); }
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.contains('open') ? closeMenu() : openMenu(); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== menuBtn) closeMenu(); });
  $$('[data-close]', menu).forEach((a) => a.addEventListener('click', () => { closeMenu(); clearSearchOnly(); }));
  $('#aboutBtn').addEventListener('click', () => { closeMenu(); clearSearchOnly(); go('#/about'); if (location.hash === '#/about') renderRoute(); });
  function clearSearchOnly() { if (search.q) { search.q = ''; input.value = ''; form.classList.remove('has-value'); clearBtn.hidden = true; renderRoute(); } }

  const themeBtn = $('#themeToggle'), themeIcon = $('#themeIcon'), themeLabel = $('#themeLabel');
  function applyTheme(t, save) {
    document.documentElement.setAttribute('data-theme', t);
    const dark = t === 'dark';
    themeBtn.setAttribute('aria-checked', String(dark));
    themeIcon.textContent = dark ? '☀' : '☾';
    themeLabel.textContent = dark ? 'Light mode' : 'Dark mode';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#1a1a1a' : '#f0eadf');
    if (save) { try { localStorage.setItem('fh-theme', t); } catch (e) {} }
  }
  themeBtn.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true));
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light', false);

  /* ---------- Boot ---------- */
  $('#footerText').textContent = '© ' + CONFIG.year + ' ' + CONFIG.siteName + ' · Made by ' + CONFIG.author;
  window.addEventListener('hashchange', () => {
    if (search.q) { search.q = ''; input.value = ''; form.classList.remove('has-value'); clearBtn.hidden = true; }
    renderRoute();
  });
  renderRoute();
})();
