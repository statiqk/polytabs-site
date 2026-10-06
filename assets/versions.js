/* PolyTabs — page « Notes de version ».
 * Lit les publications de GitHub (une seule requête, cache d'une heure) et affiche l'historique complet.
 * Si GitHub ne répond pas, la page lit releases.json (hébergé avec le site). Aucun HTML des notes n'est jamais injecté dans la page. */
(() => {
  'use strict';
  const REPO = 'statiqk/polytabs-releases';
  const API = 'https://api.github.com/repos/' + REPO + '/releases?per_page=100';
  const HTML_PREFIX = 'https://github.com/' + REPO + '/';
  const DL_PREFIX = HTML_PREFIX + 'releases/download/';
  const CACHE_KEY = 'polytabs-site:versions:v1';
  const TTL = 60 * 60 * 1000;
  const STALE_MAX = 7 * 24 * 60 * 60 * 1000;
  const SHOWN = /nouveaut|correction|am[ée]lioration|fonctionnalit/i;      // « Technique », « À retenir », « Connu » ne sont pas affichés
  const MAX_ITEMS = 40;
  const doc = document;
  const list = doc.getElementById('versions-list');
  const status = doc.getElementById('versions-status');
  if (!list) return;

  /* ------------------------------------------------ versions */
  const AT_END = /(\d+(?:\.\d+){1,3})\s*$/;
  const VERSION_RE = /^\d+(?:\.\d+){1,3}$/;
  const versionOf = (j) => { for (const t of [j && j.tag_name, j && j.name]) { const m = typeof t === 'string' ? AT_END.exec(t.trim()) : null; if (m) return m[1]; } return null; };
  const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const clean = (s) => String(s).replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim();
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };

  function renderInline(parent, text) {
    const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]*\))/g;
    let last = 0, m;
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

  /* Notes (Markdown) → { intro, sections: [{ title, items: [{ title, text }] }] } */
  function parseNotes(md) {
    const out = { intro: '', sections: [] };
    let cur = null, inSections = false, count = 0;
    for (const raw of String(md).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        if (h[1].length >= 3) { inSections = true; const t = clean(h[2]); cur = SHOWN.test(t) ? { title: t, items: [] } : null; if (cur) out.sections.push(cur); }
        continue;
      }
      const b = /^[-*]\s+(.*)$/.exec(line);
      if (b) {
        if (!cur || count >= MAX_ITEMS) continue;
        const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(b[1]);
        let title = m ? clean(m[1]).replace(/[.:]+$/, '') : '';
        if (title.length > 90) title = '';
        cur.items.push({ title, text: (m ? m[2] : b[1]).slice(0, 600) });
        count++;
      } else if (!inSections && !out.intro) {
        out.intro = clean(line).slice(0, 300);
      }
    }
    out.sections = out.sections.filter((s) => s.items.length);
    return out;
  }

  const okUrl = (u, prefix) => u === null || (typeof u === 'string' && u.indexOf(prefix) === 0);

  function normalize(j) {
    if (!j || typeof j !== 'object' || j.draft || j.prerelease) return null;
    const v = versionOf(j);
    if (!v || !VERSION_RE.test(v)) return null;
    const assets = Array.isArray(j.assets) ? j.assets : [];
    const exe = assets.find((a) => a && typeof a.name === 'string' && /^PolyTabs-Setup-[\w.-]+\.exe$/i.test(a.name) &&
      typeof a.browser_download_url === 'string' && a.browser_download_url.indexOf(DL_PREFIX) === 0);
    return {
      version: v,
      date: typeof j.published_at === 'string' && !isNaN(Date.parse(j.published_at)) ? j.published_at : null,
      download: exe ? exe.browser_download_url : null,
      size: exe && Number.isFinite(exe.size) && exe.size > 0 ? exe.size : null,
      htmlUrl: typeof j.html_url === 'string' && j.html_url.indexOf(HTML_PREFIX) === 0 ? j.html_url : null,
      notes: parseNotes(typeof j.body === 'string' ? j.body.slice(0, 20000) : '')
    };
  }

  function fromGitHub(json) {
    const byVersion = new Map();
    for (const j of Array.isArray(json) ? json : []) {
      const r = normalize(j);
      if (r && (!byVersion.has(r.version) || (Date.parse(r.date) || 0) > (Date.parse(byVersion.get(r.version).date) || 0))) byVersion.set(r.version, r);
    }
    return [...byVersion.values()];
  }

  /* Vérifie une liste déjà normalisée (cache local ou releases.json) : une valeur inattendue fait ignorer l'entrée. */
  function sane(r) {
    return !!r && typeof r === 'object' && VERSION_RE.test(String(r.version)) &&
      (r.date === null || (typeof r.date === 'string' && !isNaN(Date.parse(r.date)))) &&
      okUrl(r.download === undefined ? null : r.download, DL_PREFIX) && okUrl(r.htmlUrl === undefined ? null : r.htmlUrl, HTML_PREFIX) &&
      (r.size === null || r.size === undefined || Number.isFinite(r.size)) &&
      !!r.notes && typeof r.notes.intro === 'string' && Array.isArray(r.notes.sections) &&
      r.notes.sections.every((s) => s && typeof s.title === 'string' && Array.isArray(s.items) &&
        s.items.every((i) => i && typeof i.title === 'string' && typeof i.text === 'string'));
  }
  const saneList = (a) => (Array.isArray(a) ? a.filter(sane) : []);

  const readCache = () => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); const d = c && typeof c.t === 'number' ? saneList(c.data) : []; return d.length ? { t: c.t, data: d } : null; } catch (e) { return null; } };
  const writeCache = (data) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* sans importance */ } };

  /* ------------------------------------------------ affichage */
  const el = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const kindOf = (t) => (/correction/i.test(t) ? 'fix' : 'new');

  function body(r, latest) {
    const wrap = el('div', 'ver-body');
    if (r.notes.intro) wrap.appendChild(el('p', 'ver-intro', r.notes.intro));
    if (!r.notes.sections.length) {
      const p = el('p', 'ver-intro', 'Le détail de cette version est sur GitHub.');
      wrap.appendChild(p);
    }
    r.notes.sections.forEach((s) => {
      const sec = el('section', 'ver-sec');
      sec.dataset.kind = kindOf(s.title);
      sec.appendChild(el('h4', 'ver-sec-title', s.title));
      const ul = el('ul', 'ver-items');
      s.items.forEach((i) => {
        const li = el('li');
        if (i.title) { const t = el('strong', 'ver-item-title'); renderInline(t, i.title); li.appendChild(t); }
        if (i.text) { const p = el('span', 'ver-item-text'); renderInline(p, i.text); li.appendChild(p); }
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      wrap.appendChild(sec);
    });
    const links = el('div', 'ver-links');
    if (latest) { const a = el('a', 'ver-dl', 'Télécharger cette version' + (r.size ? ' (' + Math.round(r.size / 1048576) + ' Mo)' : '')); a.href = 'telecharger.html'; links.appendChild(a); }
    if (links.childNodes.length) wrap.appendChild(links);
    return wrap;
  }

  function head(r, latest) {
    const h = el('div', 'ver-head');
    h.appendChild(el('span', 'ver-num', 'v' + r.version));
    if (latest) h.appendChild(el('span', 'ver-badge', 'Dernière version'));
    if (r.date) { const t = el('time', 'ver-date', fmtDate(r.date)); t.dateTime = r.date; h.appendChild(t); }
    return h;
  }

  // Page principale : les 6 dernières versions. Page « archives » (data-page="archives") : toutes les autres.
  const PER_PAGE = 6;
  const ARCHIVE = doc.body.dataset.page === 'archives';
  let all = [];

  function render(rels) {
    all = rels.slice().sort((a, b) => cmp(b.version, a.version));
    list.textContent = '';
    if (!all.length) return false;
    const shown = ARCHIVE ? all.slice(PER_PAGE) : all.slice(0, PER_PAGE);
    doc.querySelectorAll('[data-version]').forEach((e) => { e.textContent = all[0].version; });
    const more = doc.getElementById('versions-more');
    if (more) more.hidden = all.length <= PER_PAGE;
    if (redirectFromHash()) return true;
    if (!shown.length) { say('Il n\u2019y a pas encore de versions plus anciennes.'); return true; }
    say('');
    // sommaire : une puce pour chacune des 3 dernières versions
    const toc = doc.getElementById('versions-toc');
    if (toc) {
      toc.textContent = '';
      shown.slice(0, 3).forEach((r) => { const a = el('a', 'toc-chip', r.version); a.href = '#v' + r.version; toc.appendChild(a); });
      toc.hidden = false;
    }
    shown.forEach((r, i) => {
      const id = 'v' + r.version;
      if (!ARCHIVE && i === 0) {
        const art = el('article', 'ver ver--latest'); art.id = id;
        art.appendChild(head(r, true)); art.appendChild(body(r, true));
        list.appendChild(art);
      } else {
        const d = el('details', 'ver'); d.id = id;
        const s = el('summary', 'ver-sum'); s.appendChild(head(r, false));
        const first = r.notes.intro || (r.notes.sections[0] && r.notes.sections[0].items[0] && (r.notes.sections[0].items[0].title || ''));
        if (first) s.appendChild(el('span', 'ver-teaser', first));
        d.append(s, body(r, false));
        list.appendChild(d);
      }
    });
    openFromHash();
    return true;
  }

  const hashId = () => { let h = ''; try { h = decodeURIComponent((location.hash || '').slice(1)); } catch (e) { /* adresse mal formée */ } return /^v\d+(\.\d+){1,3}$/.test(h) ? h : ''; };

  // Un lien vers une version qui se trouve sur l'autre page (ex. versions.html#v1.0.2) y est renvoyé.
  function redirectFromHash() {
    const id = hashId();
    if (!id) return false;
    const idx = all.findIndex((r) => 'v' + r.version === id);
    if (idx < 0) return false;
    const onArchive = idx >= PER_PAGE;
    if (onArchive === ARCHIVE) return false;
    location.replace((onArchive ? 'versions-archives.html' : 'versions.html') + '#' + id);
    return true;
  }

  function openFromHash() {
    const id = hashId();
    const t = id && doc.getElementById(id);
    if (!t) return;
    if (t.tagName === 'DETAILS') t.open = true;
    t.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', openFromHash);

  function say(msg) { if (status) { status.textContent = msg; status.hidden = !msg; } }

  /* ------------------------------------------------ chargement : cache → GitHub → releases.json */
  async function getJSON(url, opts) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(url, Object.assign({ signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }, opts));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  async function load() {
    const cached = readCache();
    const age = cached ? Date.now() - cached.t : Infinity;
    let shown = false;
    if (cached && age < STALE_MAX) shown = render(cached.data);
    if (cached && age < TTL) return;
    try {
      const rels = fromGitHub(await getJSON(API, { headers: { Accept: 'application/vnd.github+json' } }));
      if (!rels.length) throw new Error('réponse inattendue');
      writeCache(rels); render(rels);
      return;
    } catch (e) { /* on passe au secours */ }
    try {
      const rels = saneList(await getJSON('releases.json'));
      if (rels.length) { if (!shown) render(rels); say(shown ? '' : 'GitHub est injoignable : voici la copie de secours (elle peut ne pas contenir la toute dernière version).'); return; }
    } catch (e) { /* rien de plus à tenter */ }
    if (!shown) say('Impossible de charger les notes de version pour le moment. Elles restent consultables sur GitHub.');
  }
  load();
})();
