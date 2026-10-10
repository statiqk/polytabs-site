/* PolyTabs — petit écran : menu déroulant (bouton « Menu ») et points sous les listes qui défilent sur le côté.
 * Sans JavaScript, ou sur grand écran, la barre reste telle qu'elle est écrite dans la page. */
(() => {
  'use strict';
  /* Points sous les listes qui défilent sur le côté (téléphone) */
  document.querySelectorAll('.rows, .tools-cats').forEach((box) => {
    const items = Array.from(box.querySelectorAll(box.classList.contains('rows') ? '.card--lg' : '.tc'));
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
