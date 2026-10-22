/* PolyTabs — petit écran : menu déroulant (bouton « Menu ») et points sous les listes qui défilent sur le côté.
 * Sans JavaScript, ou sur grand écran, la barre reste telle qu'elle est écrite dans la page. */
(() => {
  'use strict';
  /* Interrupteur des téléchargements : false = verrouillés (pastille « Bientôt » sur les boutons, page d'attente), true = ouverts. */
  const DL_OUVERT = false;
  if (!DL_OUVERT) document.documentElement.classList.add('dl-soon');
  /* Points sous les listes qui défilent sur le côté (téléphone) */
  document.querySelectorAll('.rows, .tools-cats').forEach((box) => {
    const items = Array.from(box.querySelectorAll(box.classList.contains('rows') ? '.card--lg, .feat-mini' : '.tc'));
    if (items.length < 2) return;
    const dots = document.createElement('div'); dots.className = 'dots'; dots.setAttribute('aria-hidden', 'true');
    items.forEach(() => dots.appendChild(document.createElement('i')));
    box.insertAdjacentElement('afterend', dots);
    const upd = () => {
      const r = box.getBoundingClientRect(); let best = 0, bd = 1e9;
      items.forEach((el, i) => { const d = Math.abs(el.getBoundingClientRect().left - r.left - 24); if (d < bd) { bd = d; best = i; } });
      Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i === best));
    };
    box.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true }); upd();
  });

  const header = document.querySelector('.site-header');
  const nav = header && header.querySelector('.nav');
  if (!header || !nav) return;
  const links = Array.from(nav.querySelectorAll('.nav-link'));
  if (!links.length) return;

  const NS = 'http://www.w3.org/2000/svg';
  const icon = (d) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); return s; };
  const BURGER = 'M4 7h16M4 12h16M4 17h16', CROSS = 'M6 6l12 12M18 6L6 18';

  const SVGH = (d, w) => '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
  const ICONS = {
    fonctionnalites: ['<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', 'Ce que fait PolyTabs'],
    outils: ['<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z"/>', 'Boutons et raccourcis'],
    guide: ['<circle cx="12" cy="12" r="9"/><path d="M10 8.8v6.4l5.2-3.2z"/>', 'Les 12 vidéos et les PDF'],
    questions: ['<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.01"/>', 'Les réponses à tes questions'],
    versions: ['<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', 'Les nouveautés, version par version']
  };
  const keyOf = (a) => { const h = (a.getAttribute('href') || '').replace('faq.html', 'questions'); return Object.keys(ICONS).find((k) => h.indexOf(k) !== -1) || ''; };

  const panel = document.createElement('div');
  panel.className = 'nav-panel'; panel.id = 'nav-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Menu');
  const top = document.createElement('div'); top.className = 'np-top';
  const brand = header.querySelector('.brand');
  if (brand) { const bc = brand.cloneNode(true); bc.removeAttribute('aria-label'); top.appendChild(bc); }
  const close = document.createElement('button'); close.type = 'button'; close.className = 'np-close'; close.setAttribute('aria-label', 'Fermer le menu'); close.innerHTML = SVGH('<path d="M6 6l12 12M18 6L6 18"/>', 22);
  top.appendChild(close);
  const list = document.createElement('nav'); list.setAttribute('aria-label', 'Menu');
  links.forEach((a) => {
    const c = a.cloneNode(false); c.className = 'np-row';
    const k = keyOf(a), ic = ICONS[k];
    c.insertAdjacentHTML('beforeend', '<i>' + SVGH(ic ? ic[0] : '<circle cx="12" cy="12" r="3"/>', 20) + '</i>');
    const t = document.createElement('span'); t.appendChild(document.createTextNode(a.textContent.trim()));
    if (ic) { const em = document.createElement('em'); em.textContent = ic[1]; t.appendChild(em); }
    c.appendChild(t);
    if (a.getAttribute('aria-current')) c.setAttribute('aria-current', a.getAttribute('aria-current'));
    list.appendChild(c);
  });
  const foot = document.createElement('div'); foot.className = 'np-foot';
  const dl = nav.querySelector('.btn');
  if (dl) { const d = dl.cloneNode(false); d.className = 'np-cta'; d.removeAttribute('data-download'); d.insertAdjacentHTML('beforeend', SVGH('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', 22) + 'Télécharger'); foot.appendChild(d); }
  const ver = document.createElement('div'); ver.className = 'np-ver'; foot.appendChild(ver);
  panel.appendChild(top); panel.appendChild(list); panel.appendChild(foot);

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'nav-toggle'; btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'nav-panel');
  btn.appendChild(icon(BURGER));

  header.classList.add('js-menu');
  header.appendChild(btn); header.appendChild(panel);

  const set = (open) => {
    header.classList.toggle('menu-open', open); document.documentElement.classList.toggle('menu-lock', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      const v = document.querySelector('[data-version]');
      ver.textContent = (v && v.textContent.trim() ? 'Version ' + v.textContent.trim() + ' · ' : '') + 'Pour Windows 64 bits';
      close.focus();
    }
  };
  btn.addEventListener('click', () => set(!header.classList.contains('menu-open')));
  close.addEventListener('click', () => { set(false); btn.focus(); });
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && header.classList.contains('menu-open')) { set(false); btn.focus(); } });
  window.matchMedia('(min-width: 860px)').addEventListener('change', (m) => { if (m.matches) set(false); });
})();

/* Bouton « haut de page » (téléphone) : apparaît après un peu de défilement, l'anneau montre l'avancement dans la page. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg', C = 144.5;
  const el = (n, a) => { const e = document.createElementNS(NS, n); Object.keys(a).forEach((k) => e.setAttribute(k, a[k])); return e; };
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'to-top'; btn.setAttribute('aria-label', 'Revenir en haut de la page'); btn.hidden = true;
  const ring = el('svg', { viewBox: '0 0 52 52', class: 'tt-ring', 'aria-hidden': 'true', focusable: 'false' });
  ring.appendChild(el('circle', { cx: 26, cy: 26, r: 23, fill: 'none', 'stroke-width': 3, class: 'tt-track' }));
  const bar = el('circle', { cx: 26, cy: 26, r: 23, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': C, 'stroke-dashoffset': C, transform: 'rotate(-90 26 26)', class: 'tt-bar' });
  ring.appendChild(bar);
  const arrow = el('svg', { viewBox: '0 0 24 24', class: 'tt-arrow', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });
  arrow.appendChild(el('path', { d: 'M12 19V5M5 12l7-7 7 7' }));
  btn.appendChild(ring); btn.appendChild(arrow); document.body.appendChild(btn);
  let tick = false;
  const upd = () => {
    tick = false;
    const y = window.scrollY || document.documentElement.scrollTop, max = document.documentElement.scrollHeight - window.innerHeight;
    btn.hidden = y < 500;
    bar.setAttribute('stroke-dashoffset', String(C * (1 - (max > 0 ? Math.min(1, y / max) : 0))));
  };
  window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
  window.addEventListener('resize', upd);
  btn.addEventListener('click', () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    const h = document.querySelector('header a, h1'); if (h) h.focus({ preventScroll: true });
  });
  upd();
})();

/* « Outils sous la main » (téléphone) : barre d'icônes ; un outil touché affiche sa description. Sans JavaScript, la liste des six outils reste affichée. */
(() => {
  'use strict';
  const box = document.querySelector('.tools-pick'); if (!box) return;
  const tabs = Array.from(box.querySelectorAll('.tbar [role="tab"]')); if (tabs.length < 2) return;
  const pick = (t, focus) => {
    tabs.forEach((x) => {
      const on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
      const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
    });
    if (focus) t.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t, false));
    t.addEventListener('keydown', (e) => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (k) { e.preventDefault(); pick(tabs[(i + k + tabs.length) % tabs.length], true); }
    });
  });
  /* Bascule « Outils | Widgets » */
  const modes = Array.from(box.querySelectorAll('.oseg [role="tab"]'));
  const mode = (t, focus) => {
    modes.forEach((x) => {
      const on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
      const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
    });
    if (focus) t.focus();
  };
  modes.forEach((t, i) => {
    t.addEventListener('click', () => mode(t, false));
    t.addEventListener('keydown', (e) => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (k) { e.preventDefault(); mode(modes[(i + k + modes.length) % modes.length], true); }
    });
  });
  document.getElementById('outils').classList.add('js-tools');
})();
