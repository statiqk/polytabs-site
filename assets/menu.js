/* PolyTabs — petit écran : menu déroulant (bouton « Menu ») et points sous les listes qui défilent sur le côté.
 * Sans JavaScript, ou sur grand écran, la barre reste telle qu'elle est écrite dans la page. */
(() => {
  'use strict';
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

  const panel = document.createElement('div');
  panel.className = 'nav-panel'; panel.id = 'nav-panel';
  const list = document.createElement('nav'); list.setAttribute('aria-label', 'Menu');
  links.forEach((a) => { const c = a.cloneNode(true); c.classList.add('nav-panel-link'); list.appendChild(c); });
  panel.appendChild(list);

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'nav-toggle'; btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'nav-panel');
  btn.appendChild(icon(BURGER));
  const scrim = document.createElement('div'); scrim.className = 'nav-scrim';

  header.classList.add('js-menu');
  header.appendChild(btn); header.appendChild(panel); document.body.appendChild(scrim);

  const set = (open) => {
    header.classList.toggle('menu-open', open); scrim.classList.toggle('on', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Menu');
    btn.replaceChildren(icon(open ? CROSS : BURGER));
  };
  btn.addEventListener('click', () => set(!header.classList.contains('menu-open')));
  scrim.addEventListener('click', () => set(false));
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
  const tabs = Array.from(box.querySelectorAll('[role="tab"]')); if (tabs.length < 2) return;
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
  document.getElementById('outils').classList.add('js-tools');
})();
