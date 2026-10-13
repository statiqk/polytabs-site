/* PolyTabs — page « Guide » : un seul lecteur, sommaire repliable, tiroir « Chapitres » sur téléphone.
 * Sans JavaScript : le premier chapitre se lit, et chaque lien du sommaire ouvre directement la vidéo. Aucune donnée n'est enregistrée. */
(() => {
  'use strict';
  const root = document.getElementById('guide');
  const video = document.getElementById('gd-video');
  if (!root || !video) return;
  const links = Array.from(root.querySelectorAll('.gd-it'));
  const infos = Array.from(root.querySelectorAll('.gd-info'));
  const cats = Array.from(root.querySelectorAll('.gd-cat'));
  const toc = document.getElementById('gd-toc');
  const bar = root.querySelector('.gd-bar-btn');
  const scrim = root.querySelector('.gd-scrim');
  const prev = root.querySelector('.gd-prev'), next = root.querySelector('.gd-next');
  if (!links.length || links.length !== infos.length) return;
  document.documentElement.classList.add('js-gd');

  const slugs = links.map((a) => a.dataset.slug);
  let cur = -1;
  const mobile = window.matchMedia('(max-width: 859px)');

  const openCat = (cat, on) => { cat.classList.toggle('is-open', on); const h = cat.querySelector('.gd-h'); if (h) h.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  const closeSheet = (focusBar) => {
    if (!toc) return;
    toc.classList.remove('is-sheet'); if (scrim) scrim.classList.remove('is-on');
    document.documentElement.classList.remove('gd-sheet-open');
    if (bar) { bar.setAttribute('aria-expanded', 'false'); if (focusBar) bar.focus(); }
  };
  const openSheet = () => {
    if (!toc) return;
    toc.classList.add('is-sheet'); if (scrim) scrim.classList.add('is-on');
    document.documentElement.classList.add('gd-sheet-open');
    if (bar) bar.setAttribute('aria-expanded', 'true');
    const c = links[cur]; if (c) c.focus({ preventScroll: true });
  };

  function select(i, play, fromHash) {
    if (i < 0 || i >= links.length) return;
    const a = links[i];
    const changed = i !== cur;
    cur = i;
    links.forEach((l, k) => { if (k === i) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    infos.forEach((n, k) => { n.hidden = k !== i; });
    cats.forEach((c) => openCat(c, c.contains(a)));              /* repli automatique : seule la catégorie en cours reste ouverte */
    if (changed) {
      video.pause();
      video.poster = a.dataset.poster;
      video.src = a.dataset.src;
      video.setAttribute('aria-label', 'Vidéo : ' + a.dataset.title);
      video.load();
    }
    if (play) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === links.length - 1;
    if (bar) {
      bar.querySelector('.gd-bar-n').textContent = String(i + 1).padStart(2, '0') + '/' + links.length;
      bar.querySelector('.gd-bar-t').textContent = a.dataset.title;
    }
    if (!fromHash && history.replaceState) { try { history.replaceState(null, '', '#' + slugs[i]); } catch (e) { /* ignoré */ } }
  }

  links.forEach((a, i) => a.addEventListener('click', (e) => {
    e.preventDefault();
    select(i, true, false);
    if (mobile.matches) { closeSheet(false); root.scrollIntoView({ block: 'start' }); }
  }));
  cats.forEach((c) => { const h = c.querySelector('.gd-h'); if (h) h.addEventListener('click', () => openCat(c, !c.classList.contains('is-open'))); });
  if (prev) prev.addEventListener('click', () => select(cur - 1, true, false));
  if (next) next.addEventListener('click', () => select(cur + 1, true, false));
  if (bar) bar.addEventListener('click', () => (toc.classList.contains('is-sheet') ? closeSheet(true) : openSheet()));
  if (scrim) scrim.addEventListener('click', () => closeSheet(true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toc && toc.classList.contains('is-sheet')) closeSheet(true); });
  const onMq = () => { if (!mobile.matches) closeSheet(false); };
  if (mobile.addEventListener) mobile.addEventListener('change', onMq); else if (mobile.addListener) mobile.addListener(onMq);

  const fromHash = () => { const k = slugs.indexOf((location.hash || '').slice(1)); return k >= 0 ? k : 0; };
  window.addEventListener('hashchange', () => { const k = slugs.indexOf((location.hash || '').slice(1)); if (k >= 0 && k !== cur) select(k, false, true); });
  select(fromHash(), false, true);
})();
