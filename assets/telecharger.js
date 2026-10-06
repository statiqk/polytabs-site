/* PolyTabs — page de téléchargement : trouve le dernier installeur et lance le téléchargement.
 * L'adresse de l'installeur n'est écrite nulle part dans les pages du site : elle est lue au moment du clic. */
(() => {
  'use strict';
  const REPO = 'statiqk/polytabs-releases';
  const API = 'https://api.github.com/repos/' + REPO + '/releases?per_page=100';
  const DL_PREFIX = 'https://github.com/' + REPO + '/releases/download/';
  const doc = document;
  const msg = doc.getElementById('dl-msg');
  const again = doc.getElementById('dl-again');
  const ver = doc.getElementById('dl-version');
  let target = null;

  const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const versionOf = (j) => { for (const t of [j && j.tag_name, j && j.name]) { const m = typeof t === 'string' ? /(\d+(?:\.\d+){1,3})\s*$/.exec(t.trim()) : null; if (m) return m[1]; } return null; };

  function latest(json) {
    let best = null;
    for (const j of Array.isArray(json) ? json : []) {
      if (!j || j.draft || j.prerelease) continue;
      const v = versionOf(j);
      const exe = v && Array.isArray(j.assets) && j.assets.find((a) => a && typeof a.name === 'string' && /^PolyTabs-Setup-[\w.-]+\.exe$/i.test(a.name) &&
        typeof a.browser_download_url === 'string' && a.browser_download_url.indexOf(DL_PREFIX) === 0);
      if (exe && (!best || cmp(v, best.v) > 0)) best = { v, url: exe.browser_download_url };
    }
    return best;
  }

  function start() {
    if (!target) return;
    msg.textContent = 'Le téléchargement de PolyTabs ' + target.v + ' démarre…';
    window.location.assign(target.url);
  }

  async function run() {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      target = latest(await res.json());
      if (!target) throw new Error('aucun installeur');
      if (ver) ver.textContent = target.v;
      again.hidden = false;
      start();
    } catch (e) {
      msg.textContent = 'Impossible de trouver l’installeur pour le moment (GitHub ne répond pas). Réessaie dans quelques instants.';
      again.textContent = 'Réessayer';
      again.hidden = false;
      again.onclick = (ev) => { ev.preventDefault(); again.hidden = true; msg.textContent = 'Nouvelle tentative…'; run(); };
      return;
    }
    again.onclick = (ev) => { ev.preventDefault(); start(); };
  }
  run();
})();
