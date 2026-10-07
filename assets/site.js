/* PolyTabs — site de présentation.
 * 1) la maquette interactive (un clic sur l'en-tête d'un panneau le met devant ; les onglets 1 et 2 changent de contenu) ;
 * 2) la version automatique : la page lit la dernière publication GitHub (version, date, installeur, nouveautés).
 * Si GitHub ne répond pas, ou si AUTO_UPDATE vaut false, la page garde simplement les textes écrits dans index.html. */
(() => {
  'use strict';

  const AUTO_UPDATE = true;                         // false : aucune requête vers GitHub, tout reste écrit dans la page
  const REPO = 'statiqk/polytabs-releases';

  const doc = document;
  const root = doc.documentElement;
  root.classList.add('js');

  /* ---------------------------------------------------------------- 1. Maquette interactive */
  const mock = doc.getElementById('mock');
  if (mock) {
    const SETS = { '1': ['web', 'log', 'clock', 'todo'], '2': ['cal', 'note', 'timer'] };
    const front = { '1': 'todo', '2': 'timer' };
    const grids = { '1': doc.getElementById('mock-tab-1'), '2': doc.getElementById('mock-tab-2') };
    const panel = (id) => mock.querySelector('[data-panel="' + id + '"]');
    const applyZ = (set) => {
      SETS[set].forEach((id, i) => {
        const el = panel(id);
        if (!el) return;
        const isFront = front[set] === id;
        el.classList.toggle('is-front', isFront);
        el.style.zIndex = String(isFront ? 10 : i + 1);
      });
    };
    applyZ('1');
    applyZ('2');
    mock.addEventListener('click', (e) => {
      const head = e.target.closest('[data-raise]');
      if (head) {
        const id = head.getAttribute('data-raise');
        const set = SETS['1'].indexOf(id) !== -1 ? '1' : '2';
        front[set] = id;
        applyZ(set);
        return;
      }
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        const t = tab.getAttribute('data-tab');
        mock.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', b === tab ? 'true' : 'false'));
        Object.keys(grids).forEach((k) => { if (grids[k]) grids[k].hidden = k !== t; });
      }
    });
  }

  /* ---------------------------------------------------------------- 1 bis. Vidéo : image de couverture de la version affichée */
  // Seule la vidéo visible reçoit son image de couverture (horizontale sur ordinateur et tablette, verticale sur petit écran) : on évite de télécharger les deux.
  // Sans JavaScript, la vidéo reste lisible (commandes natives), simplement sans image de couverture.
  const phoneQuery = window.matchMedia ? window.matchMedia('(max-width: 560px)') : null;
  const placePoster = () => {
    const v = doc.querySelector(phoneQuery && phoneQuery.matches ? '.demo-tall' : '.demo-wide');
    if (v && v.dataset.poster && !v.getAttribute('poster')) v.setAttribute('poster', v.dataset.poster);
  };
  placePoster();
  if (phoneQuery && phoneQuery.addEventListener) phoneQuery.addEventListener('change', placePoster);       // rotation d'un téléphone, redimensionnement de la fenêtre


  /* Bascule Illustration / Vidéo du hero */
  (() => {
    const fig = doc.querySelector('.mock-fig'), bm = doc.getElementById('seg-mock'), bv = doc.getElementById('seg-vid');
    const pane = doc.getElementById('vidpane'), mock = doc.getElementById('mock'), tr = doc.querySelector('.vid-only');
    if (!fig || !bm || !bv || !pane || !mock) return;
    const show = (video) => {
      bm.setAttribute('aria-selected', String(!video)); bv.setAttribute('aria-selected', String(video));
      mock.hidden = video; pane.hidden = !video; if (tr) tr.hidden = !video; fig.classList.toggle('is-video', video);
      if (video) { placePoster(); } else { pane.querySelectorAll('video').forEach(v => v.pause()); }
    };
    bm.addEventListener('click', () => show(false));
    bv.addEventListener('click', () => show(true));
    doc.querySelectorAll('[data-show-video]').forEach(a => a.addEventListener('click', () => show(true)));
  })();


  /* Un lien vers une question (#avertissement-windows…) ouvre la question */
  (() => {
    const ouvre = () => { const el = location.hash.length > 1 ? doc.getElementById(decodeURIComponent(location.hash.slice(1))) : null; if (el && el.tagName === 'DETAILS') el.open = true; };
    ouvre();
    window.addEventListener('hashchange', ouvre);
    doc.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href*="#"]'); if (a) setTimeout(ouvre, 0); });
  })();

  /* ---------------------------------------------------------------- 2. Version automatique (GitHub) */
  if (!AUTO_UPDATE) { root.dataset.release = 'static'; return; }

  // Toutes les publications récentes (une seule requête) : la page choisit elle-même le numéro de version le plus élevé, sans dépendre de l'ordre renvoyé par GitHub.
  const API = 'https://api.github.com/repos/' + REPO + '/releases?per_page=100';
  const HTML_PREFIX = 'https://github.com/' + REPO + '/';
  const DL_PREFIX = HTML_PREFIX + 'releases/download/';
  const CACHE_KEY = 'polytabs-site:release:v1';
  const TTL = 60 * 60 * 1000;                       // une heure : GitHub limite à 60 requêtes par heure et par visiteur
  const STALE_MAX = 7 * 24 * 60 * 60 * 1000;        // en cas de panne, une réponse de moins d'une semaine reste utilisable
  const MAX_CARDS = 8;
  const SHOWN_SECTIONS = /nouveaut|correction|am[ée]lioration|fonctionnalit/i;   // « Technique », « À retenir », « Connu » ne sont pas affichés

  const VERSION_RE = /^\d+(?:\.\d+){1,3}$/;
  // Le numéro est lu à la fin de l'étiquette ou, à défaut, du titre de la publication : « v1.0.19 », « v.1.0.19 » (point en trop), « V1.0.19 », « 1.0.19 »
  // ou « PolyTabs 1.0.19 » donnent tous 1.0.19. Seuls des chiffres et des points sont gardés ; une étiquette sans numéro (« nightly ») est ignorée.
  const VERSION_AT_END = /(\d+(?:\.\d+){1,3})\s*$/;
  function versionOf(j) {
    for (const t of [j && j.tag_name, j && j.name]) {
      const m = typeof t === 'string' ? VERSION_AT_END.exec(t.trim()) : null;
      if (m) return m[1];
    }
    return null;
  }
  function compareVersions(a, b) {
    const x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }      // comparaison numérique : 1.0.10 > 1.0.9
    return 0;
  }
  const clean = (s) => String(s).replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim();

  // Texte d'une note (Markdown) → texte DOM sûr : seuls **gras**, `code` et le texte des liens sont gardés, jamais de HTML.
  function renderInline(parent, text) {
    const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\))/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(doc.createTextNode(text.slice(last, m.index)));
      const tok = m[0];
      if (tok.indexOf('**') === 0) { const s = doc.createElement('strong'); s.textContent = tok.slice(2, -2); parent.appendChild(s); }
      else if (tok.charAt(0) === '`') { const c = doc.createElement('code'); c.textContent = tok.slice(1, -1); parent.appendChild(c); }
      else parent.appendChild(doc.createTextNode(tok.slice(1, tok.indexOf(']'))));
      last = m.index + tok.length;
    }
    if (last < text.length) parent.appendChild(doc.createTextNode(text.slice(last)));
  }

  function truncate(text, max) {
    if (text.length <= max) return text;
    let cut = text.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    if (sp > max * 0.6) cut = cut.slice(0, sp);
    if ((cut.match(/\*\*/g) || []).length % 2) cut = cut.slice(0, cut.lastIndexOf('**'));      // pas de balise coupée en deux
    if ((cut.match(/`/g) || []).length % 2) cut = cut.slice(0, cut.lastIndexOf('`'));
    return cut.replace(/[\s,;:(]+$/, '') + '…';
  }

  function parseNotes(md) {
    const out = { intro: '', cards: [] };
    let section = '';
    let inSections = false;
    for (const raw of String(md).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) { if (h[1].length >= 3) { inSections = true; section = clean(h[2]); } continue; }
      const b = /^[-*]\s+(.*)$/.exec(line);
      if (b) {
        if (!SHOWN_SECTIONS.test(section) || out.cards.length >= MAX_CARDS) continue;
        const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(b[1]);
        let title = m ? clean(m[1]).replace(/[.:]+$/, '') : section;
        const text = truncate(m ? m[2] : b[1], 230);
        if (!title || title.length > 90) title = section;
        out.cards.push({ tag: section, title, text });
      } else if (!inSections && !out.intro) {
        out.intro = clean(line).slice(0, 300);
      }
    }
    return out;
  }

  // Ne garde que ce dont la page a besoin, et vérifie chaque valeur : une réponse inattendue est ignorée en bloc.
  function normalize(j) {
    if (!j || typeof j !== 'object' || j.draft || j.prerelease) return null;
    const tag = versionOf(j);
    if (!tag || !VERSION_RE.test(tag)) return null;
    const assets = Array.isArray(j.assets) ? j.assets : [];
    const exe = assets.find((a) => a && typeof a.name === 'string' && /^PolyTabs-Setup-[\w.-]+\.exe$/i.test(a.name) &&
      typeof a.browser_download_url === 'string' && a.browser_download_url.indexOf(DL_PREFIX) === 0);
    return {
      version: tag,
      download: exe ? exe.browser_download_url : null,
      size: exe && Number.isFinite(exe.size) && exe.size > 0 ? exe.size : null,
      htmlUrl: typeof j.html_url === 'string' && j.html_url.indexOf(HTML_PREFIX) === 0 ? j.html_url : null,
      date: typeof j.published_at === 'string' && !isNaN(Date.parse(j.published_at)) ? j.published_at : null,
      notes: parseNotes(typeof j.body === 'string' ? j.body.slice(0, 20000) : '')
    };
  }

  // Parmi les publications reçues (brouillons et préversions écartés), garde celle dont le numéro est le plus élevé ; à numéro égal, la plus récemment publiée.
  function pickLatest(json) {
    const list = Array.isArray(json) ? json : [json];
    let best = null;
    for (const j of list) {
      if (!j || typeof j !== 'object' || j.draft || j.prerelease) continue;
      const v = versionOf(j);
      if (!v) continue;
      const when = Date.parse(j.published_at) || 0;
      if (!best || compareVersions(v, best.v) > 0 || (compareVersions(v, best.v) === 0 && when > best.when)) best = { j, v, when };
    }
    return best ? normalize(best.j) : null;
  }

  // Un contenu relu depuis le stockage local est revérifié de la même façon (il a pu être modifié).
  function sane(r) {
    return !!r && typeof r === 'object' && VERSION_RE.test(String(r.version)) &&
      (r.download === null || (typeof r.download === 'string' && r.download.indexOf(DL_PREFIX) === 0)) &&
      (r.htmlUrl === null || (typeof r.htmlUrl === 'string' && r.htmlUrl.indexOf(HTML_PREFIX) === 0)) &&
      !!r.notes && Array.isArray(r.notes.cards) && r.notes.cards.every((c) => c && typeof c.tag === 'string' && typeof c.title === 'string' && typeof c.text === 'string') &&
      typeof r.notes.intro === 'string';
  }

  const readCache = () => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); return c && typeof c.t === 'number' && sane(c.data) ? c : null; } catch (e) { return null; } };
  const writeCache = (data) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* stockage plein ou bloqué : sans importance */ } };

  function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }

  function applyRelease(rel, origin) {
    doc.querySelectorAll('[data-version]').forEach((e) => { e.textContent = rel.version; });
    // Chaque lien garde son adresse d'origine (celle écrite dans la page) : si la publication n'a pas d'installeur, ou si une réponse
    // plus récente remplace une réponse en cache, aucun lien ne reste sur une ancienne version.
    // Les boutons « Télécharger » restent sur telecharger.html : l'adresse de l'installeur n'est jamais écrite dans la page.

    const parts = ['Version ' + rel.version];
    if (rel.size) parts.push('installeur de ' + Math.round(rel.size / 1048576) + '\u00a0Mo');
    if (rel.date) parts.push('publiée le ' + fmtDate(rel.date));
    const line = doc.getElementById('release-line');
    if (line) { line.textContent = parts.join(' · '); line.hidden = false; }

    const title = doc.getElementById('nouveautes-title');
    if (title) title.textContent = 'Nouveautés de la version ' + rel.version;
    const intro = doc.getElementById('nouveautes-intro');
    if (intro) intro.textContent = rel.notes.intro || (rel.date ? 'Version ' + rel.version + ', publiée le ' + fmtDate(rel.date) + '.' : 'Version ' + rel.version + '.');

    const grid = doc.getElementById('nouveautes-grid');
    if (grid && rel.notes.cards.length) {
      grid.textContent = '';
      rel.notes.cards.forEach((c) => {
        const art = doc.createElement('article');
        art.className = 'news-card';
        const tag = doc.createElement('span'); tag.className = 'news-tag'; tag.textContent = c.tag;
        const h = doc.createElement('h3'); renderInline(h, c.title);
        const p = doc.createElement('p'); renderInline(p, c.text);
        art.append(tag, h, p);
        grid.appendChild(art);
      });
    }
    root.dataset.release = origin;
  }

  async function load() {
    const cached = readCache();
    const age = cached ? Date.now() - cached.t : Infinity;
    if (cached && age < TTL) { applyRelease(cached.data, 'cache'); return; }
    if (cached && age < STALE_MAX) applyRelease(cached.data, 'cache');          // en attendant la réponse de GitHub
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rel = pickLatest(await res.json());
      if (!rel) throw new Error('réponse inattendue');
      writeCache(rel);
      applyRelease(rel, 'live');
    } catch (e) {
      if (!root.dataset.release) root.dataset.release = 'fallback';              // GitHub injoignable : la page garde ses textes
    }
  }
  load();
})();
