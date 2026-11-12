/* PolyTabs — espace membre : connexion par e-mail + code à 6 chiffres (même compte que l'appli), liste des appareils, changement d'adresse, suppression du compte.
 * Aucune bibliothèque, aucun cookie : la session est gardée dans le stockage local de ce navigateur. Seule la clé PUBLIQUE est ici ; les données sont protégées côté serveur. */
(() => {
  'use strict';
  const URL_API = 'https://qcogqpwjhtutxpyhrcld.supabase.co', KEY = 'sb_publishable_XoDSg1mKCph5ruluOBHvBQ_gKIxXymt', SK = 'polytabs-site-session';
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text !== undefined) x.textContent = text; return x; };
  const page = document.body.dataset.page;

  // ---- session ----
  const getS = () => { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { return null; } };
  const setS = (s) => { try { if (s) localStorage.setItem(SK, JSON.stringify(s)); else localStorage.removeItem(SK); } catch (e) { /* stockage bloqué */ } };
  const mem = { s: null };
  const cur = () => mem.s || getS();
  function saveSession(r) {
    const s = { at: r.access_token, rt: r.refresh_token, exp: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600), email: (r.user && r.user.email) || (cur() && cur().email) || '' };
    mem.s = s; setS(s); return s;
  }
  async function api(path, o) {
    o = o || {}; let res;
    try { res = await fetch(URL_API + path, { method: o.method || 'GET', headers: Object.assign({ apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (o.token || KEY) }, o.headers || {}), body: o.body === undefined ? undefined : JSON.stringify(o.body) }); }
    catch (e) { throw { code: 'network', message: 'Pas de connexion à Internet.' }; }
    const t = await res.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
    if (!res.ok) { const m = (j && (j.msg || j.message || j.error_description || j.error)) || ('Erreur ' + res.status); let code = 'http'; if (res.status === 401 || res.status === 403) code = 'auth'; if (res.status === 429 || /rate limit|seconds/i.test(m)) code = 'rate'; throw { code, status: res.status, message: m }; }
    return j;
  }
  async function token() {
    const s = cur(); if (!s) throw { code: 'signedout' };
    if (s.exp - 60 > Math.floor(Date.now() / 1000)) return s.at;
    try { const r = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.rt } }); return saveSession(r).at; }
    catch (e) { if (e.code === 'auth' || e.status === 400) { mem.s = null; setS(null); throw { code: 'signedout' }; } throw e; }
  }
  const rest = async (p, o) => api('/rest/v1/' + p, Object.assign({ token: await token() }, o || {}));
  const MSG = { network: 'Pas de connexion à Internet.', rate: 'Trop d’essais : patiente une minute puis réessaie.', badcode: 'Code incorrect ou expiré.' };
  const msgOf = (e) => MSG[e && e.code] || (e && e.message) || 'Une erreur est survenue.';
  const ago = (iso) => { if (!iso) return 'jamais'; const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000); if (s < 45) return 'à l’instant'; if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min'; if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h'; return 'il y a ' + Math.round(s / 86400) + ' j'; };
  const validMail = (m) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(m);

  // Icône de l'application (la même que le favicon et l'appli)
  const logo = () => { const d = el('div', 'ac-logo'); const i = el('img'); i.src = 'assets/icon-512.png'; i.alt = 'PolyTabs'; i.width = 72; i.height = 72; d.appendChild(i); return d; };

  // ---- champ à 6 chiffres ----
  function codeBoxes(onDone) {
    const box = el('div', 'ac-codes'); const ins = [];
    for (let i = 0; i < 6; i++) { const x = el('input'); x.inputMode = 'numeric'; x.maxLength = 1; x.autocomplete = i === 0 ? 'one-time-code' : 'off'; x.setAttribute('aria-label', 'Chiffre ' + (i + 1) + ' sur 6'); ins.push(x); box.appendChild(x); }
    const val = () => ins.map(x => x.value).join('');
    const fill = (digits) => { digits.split('').slice(0, 6).forEach((d, i) => { ins[i].value = d; }); (ins[Math.min(digits.length, 5)]).focus(); if (val().length === 6) onDone(val()); };
    ins.forEach((x, i) => {
      x.addEventListener('input', () => { x.value = x.value.replace(/\D/g, '').slice(-1); if (x.value && i < 5) ins[i + 1].focus(); if (val().length === 6) onDone(val()); });
      x.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !x.value && i > 0) { ins[i - 1].focus(); ins[i - 1].value = ''; } });
      x.addEventListener('paste', (e) => { const d = (e.clipboardData.getData('text') || '').replace(/\D/g, ''); if (d) { e.preventDefault(); fill(d); } });
    });
    return { box, clear: () => { ins.forEach(x => { x.value = ''; }); ins[0].focus(); }, focus: () => ins[0].focus() };
  }

  // ---- page de connexion ----
  function loginPage() {
    const host = $('#ac-root'); let email = '';
    // Arrivée depuis l'appli (« Ouvrir mon espace sur le site ») : le jeton est dans le fragment (#h=…), il n'est jamais envoyé au serveur du site.
    const hm = /^#h=([A-Za-z0-9_-]{16,200})$/.exec(location.hash || '');
    if (hm) {
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* sans effet */ }
      const c = el('div', 'ac-card'); c.append(logo(), el('h1', '', 'Connexion en cours…'), el('p', 'sub', 'On t’ouvre ton espace PolyTabs.')); host.appendChild(c);
      api('/auth/v1/verify', { method: 'POST', body: { type: 'magiclink', token_hash: hm[1] } }).then((r) => {
        if (!r || !r.access_token) throw { code: 'badcode' };
        saveSession(r); try { sessionStorage.setItem('polytabs-from-app', '1'); } catch (e) { /* sans effet */ } location.replace('compte.html');
      }).catch((e) => { host.textContent = ''; stepEmail(e && e.code === 'network' ? msgOf(e) : 'Le lien de l’appli a expiré ou a déjà servi. Reconnecte-toi ici, ou clique de nouveau sur « Ouvrir mon espace sur le site » dans l’appli.'); });
      return;
    }
    if (cur()) { location.replace('compte.html'); return; }
    function stepEmail(note) {
      host.textContent = ''; const c = el('div', 'ac-card');
      c.append(logo(), el('h1', '', 'Connecte-toi à PolyTabs'), el('p', 'sub', 'Le même compte que dans l’appli. Pas de compte ? Il sera créé automatiquement.'));
      const lab = el('label', 'ac-lab', 'Adresse e-mail'); const inp = el('input', 'ac-in'); inp.type = 'email'; inp.autocomplete = 'email'; inp.placeholder = 'toi@exemple.fr'; inp.value = email; lab.appendChild(inp);
      const msg = el('div', 'ac-msg', note || ''); msg.setAttribute('role', 'status');
      const go = el('button', 'ac-btn', 'Recevoir un code'); go.type = 'button';
      go.addEventListener('click', async () => {
        email = inp.value.trim().toLowerCase(); if (!validMail(email)) { msg.textContent = 'Adresse e-mail invalide.'; msg.className = 'ac-msg bad'; return; }
        go.disabled = true; msg.textContent = 'Envoi…'; msg.className = 'ac-msg';
        try { await api('/auth/v1/otp', { method: 'POST', body: { email, create_user: true, data: { app: 'polytabs' } } }); stepCode(); }
        catch (e) { go.disabled = false; msg.textContent = msgOf(e); msg.className = 'ac-msg bad'; }
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); });
      const ou = el('div', 'ac-fine', '— ou —');
      const pw = el('input', 'ac-in'); pw.type = 'password'; pw.autocomplete = 'current-password'; pw.placeholder = 'Mot de passe'; pw.setAttribute('aria-label', 'Mot de passe');
      const pgo = el('button', 'ac-btn ac-btn--ghost', 'Se connecter avec le mot de passe'); pgo.type = 'button';
      const doPw = async () => {
        email = inp.value.trim().toLowerCase(); if (!validMail(email)) { msg.textContent = 'Adresse e-mail invalide.'; msg.className = 'ac-msg bad'; return; }
        if (!pw.value) { msg.textContent = 'Entre ton mot de passe.'; msg.className = 'ac-msg bad'; return; }
        pgo.disabled = true; msg.textContent = 'Connexion…'; msg.className = 'ac-msg';
        try { const r = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: pw.value } }); saveSession(r); location.replace('compte.html'); }
        catch (e) { pgo.disabled = false; msg.textContent = e.code === 'network' || e.code === 'rate' ? msgOf(e) : 'E-mail ou mot de passe incorrect. Pas de mot de passe ? Utilise le code.'; msg.className = 'ac-msg bad'; }
      };
      pgo.addEventListener('click', doPw); pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') doPw(); });
      c.append(lab, go, ou, pw, pgo, msg, el('p', 'ac-fine', 'Pas de mot de passe à retenir : un code à 6 chiffres t’est envoyé par e-mail.')); host.appendChild(c); inp.focus();
    }
    function stepCode() {
      host.textContent = ''; const c = el('div', 'ac-card'); let busy = false;
      const msg = el('div', 'ac-msg'); msg.setAttribute('role', 'status');
      const cb = codeBoxes(async (code) => {
        if (busy) return; busy = true; msg.textContent = 'Vérification…'; msg.className = 'ac-msg';
        try { const r = await api('/auth/v1/verify', { method: 'POST', body: { email, token: code, type: 'email' } }); saveSession(r); location.replace('compte.html'); }
        catch (e) { busy = false; msg.textContent = e.status === 403 || e.status === 400 || e.status === 422 ? MSG.badcode : msgOf(e); msg.className = 'ac-msg bad'; cb.clear(); }
      });
      const p = el('p', 'sub'); p.append('Un code à 6 chiffres vient d’être envoyé à ', Object.assign(el('b'), { textContent: email }));
      const again = el('button', 'ac-link', 'Renvoyer le code'); again.type = 'button'; again.addEventListener('click', async () => { msg.textContent = 'Envoi…'; try { await api('/auth/v1/otp', { method: 'POST', body: { email, create_user: true, data: { app: 'polytabs' } } }); msg.textContent = 'Nouveau code envoyé.'; msg.className = 'ac-msg ok'; } catch (e) { msg.textContent = msgOf(e); msg.className = 'ac-msg bad'; } });
      const chg = el('button', 'ac-link', 'Changer d’adresse'); chg.type = 'button'; chg.addEventListener('click', () => stepEmail());
      const row = el('div', 'ac-row'); row.style.justifyContent = 'center'; row.append(again, chg);
      c.append(logo(), el('h1', '', 'Entre le code reçu'), p, cb.box, msg, row, el('p', 'ac-fine', 'Code valable 10 minutes. Rien reçu ? Regarde dans les indésirables.')); host.appendChild(c); cb.focus();
    }
    stepEmail();
  }

  // ---- espace membre ----
  async function accountPage() {
    if (!cur()) { location.replace('connexion.html'); return; }
    const main = $('#ac-main'), tabs = Array.from(document.querySelectorAll('.ac-tab'));
    let email = cur().email || '';
    const show = (id) => { tabs.forEach(t => t.setAttribute('aria-current', String(t.dataset.tab === id))); document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== id; }); if (id === 'devices') loadDevices(); };
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
    try { if (sessionStorage.getItem('polytabs-from-app')) { sessionStorage.removeItem('polytabs-from-app'); const ok = $('#ac-app-ok'); if (ok) ok.textContent = 'Connecté avec l’appli.'; } } catch (e) { /* sans effet */ }
    const appBtn = $('#ac-app-btn');
    if (appBtn) appBtn.addEventListener('click', async () => {
      const msg = $('#ac-app-msg'); const say = (t, bad) => { msg.textContent = t; msg.className = 'ac-msg' + (bad ? ' bad' : ''); };
      appBtn.disabled = true; say('Préparation…');
      let h; try { const r = await api('/functions/v1/polytabs-handoff', { method: 'POST', token: await token(), body: {} }); h = r && r.token_hash; if (!h) throw { code: 'http' }; }
      catch (e) { appBtn.disabled = false; if (e && e.code === 'signedout') { location.replace('connexion.html'); return; } say(msgOf(e), true); return; }
      let left = false; const gone = () => { left = true; };
      window.addEventListener('blur', gone, { once: true }); document.addEventListener('visibilitychange', gone, { once: true });
      say('Ouverture de l’appli… autorise l’ouverture de PolyTabs si ton navigateur le demande.');
      location.href = 'polytabs://login?h=' + encodeURIComponent(h);
      setTimeout(() => {
        appBtn.disabled = false; if (left) { say('Si l’appli s’est ouverte, c’est fait.'); return; }
        msg.textContent = ''; msg.className = 'ac-msg bad'; msg.append('Rien ne s’est ouvert ? L’appli n’est peut-être pas installée, ou la dernière version est nécessaire. ', Object.assign(el('a'), { href: 'telecharger.html', textContent: 'Télécharger PolyTabs' }), '.');
      }, 4000);
    });
    $('#ac-signout').addEventListener('click', async () => { try { const t = cur() && cur().at; if (t) await api('/auth/v1/logout?scope=local', { method: 'POST', token: t }); } catch (e) { /* hors ligne */ } mem.s = null; setS(null); location.replace('connexion.html'); });
    const out = (e) => { if (e && e.code === 'signedout') { location.replace('connexion.html'); return true; } return false; };
    try { const u = await api('/auth/v1/user', { token: await token() }); email = u.email || email; } catch (e) { if (out(e)) return; }
    $('#ac-email').textContent = email;
    // changer l'adresse
    const chBox = $('#ac-change'), chBtn = $('#ac-change-btn');
    chBtn.addEventListener('click', () => {
      chBtn.hidden = true; chBox.hidden = false; chBox.textContent = '';
      const lab = el('label', 'ac-lab', 'Nouvelle adresse e-mail'), inp = el('input', 'ac-in'); inp.type = 'email'; inp.autocomplete = 'email'; lab.appendChild(inp);
      const msg = el('div', 'ac-msg'); msg.setAttribute('role', 'status'); const go = el('button', 'ac-btn ac-btn--auto', 'Envoyer le code'); go.type = 'button';
      const cancel = el('button', 'ac-link', 'Annuler'); cancel.type = 'button'; cancel.addEventListener('click', () => { chBox.hidden = true; chBtn.hidden = false; });
      const row = el('div', 'ac-row'); row.append(go, cancel); chBox.append(lab, row, msg);
      go.addEventListener('click', async () => {
        const nm = inp.value.trim().toLowerCase(); if (!validMail(nm)) { msg.textContent = 'Adresse e-mail invalide.'; msg.className = 'ac-msg bad'; return; }
        go.disabled = true; msg.textContent = 'Envoi…'; msg.className = 'ac-msg';
        try { await api('/auth/v1/user', { method: 'PUT', token: await token(), body: { email: nm } }); } catch (e) { go.disabled = false; if (!out(e)) { msg.textContent = msgOf(e); msg.className = 'ac-msg bad'; } return; }
        chBox.textContent = ''; const m2 = el('div', 'ac-msg'); const cb = codeBoxes(async (code) => {
          m2.textContent = 'Vérification…'; m2.className = 'ac-msg';
          try { const r = await api('/auth/v1/verify', { method: 'POST', body: { email: nm, token: code, type: 'email_change' } }); if (r && r.access_token) saveSession(r); email = nm; $('#ac-email').textContent = nm; chBox.hidden = true; chBtn.hidden = false; $('#ac-change-ok').textContent = 'Adresse changée. Utilise-la dès maintenant dans l’appli aussi.'; }
          catch (e) { m2.textContent = MSG.badcode; m2.className = 'ac-msg bad'; cb.clear(); }
        });
        chBox.append(el('p', 'ac-fine', 'Un code à 6 chiffres a été envoyé à ' + nm + ' (si ton compte demande aussi une confirmation sur l’ancienne adresse, valide-la d’abord).'), cb.box, m2); cb.focus();
      });
      inp.focus();
    });
    // appareils
    const list = $('#ac-devices'); let confirmId = null;
    async function loadDevices() {
      list.textContent = ''; list.appendChild(el('p', 'ac-fine', 'Chargement…'));
      let rows; try { rows = await rest('polytabs_devices?select=id,name,platform,app_version,last_sync_at,revoked&revoked=eq.false&order=created_at.asc'); } catch (e) { if (out(e)) return; list.textContent = ''; list.appendChild(el('p', 'ac-msg bad', msgOf(e))); return; }
      list.textContent = '';
      if (!rows.length) { list.appendChild(el('p', 'ac-fine', 'Aucun appareil pour l’instant. Connecte-toi dans l’appli PolyTabs pour l’ajouter ici.')); return; }
      rows.forEach(d => {
        const r = el('div', 'ac-dev'), tx = el('div', 'ac-dev-tx'); tx.append(el('div', 'ac-dev-name', d.name || 'PC'), el('div', 'ac-dev-sub', 'PolyTabs ' + (d.app_version || '?') + ' · synchronisé ' + ago(d.last_sync_at))); r.appendChild(tx);
        if (confirmId === d.id) {
          const no = el('button', 'ac-btn ac-btn--ghost ac-btn--auto', 'Annuler'), yes = el('button', 'ac-btn ac-btn--danger ac-btn--auto', 'Retirer'); no.type = yes.type = 'button';
          no.addEventListener('click', () => { confirmId = null; loadDevices(); });
          yes.addEventListener('click', async () => { yes.disabled = true; try { await rest('polytabs_devices?id=eq.' + encodeURIComponent(d.id), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { revoked: true } }); } catch (e) { if (out(e)) return; } confirmId = null; loadDevices(); });
          r.append(no, yes);
        } else { const b = el('button', 'ac-link', 'Retirer'); b.type = 'button'; b.addEventListener('click', () => { confirmId = d.id; loadDevices(); }); r.appendChild(b); }
        list.appendChild(r);
      });
      list.appendChild(el('p', 'ac-fine', '« Retirer » déconnecte l’appareil : ses données restent sur ce PC, mais il ne se synchronise plus.'));
    }
    // mot de passe (optionnel)
    const pwBtn = $('#ac-pw-btn'), pwBox = $('#ac-pw-box'), pwOk = $('#ac-pw-ok');
    pwBtn.addEventListener('click', () => {
      pwBtn.hidden = true; pwBox.hidden = false; pwBox.textContent = ''; pwOk.textContent = '';
      const l1 = el('label', 'ac-lab', 'Nouveau mot de passe (8 caractères minimum)'), p1 = el('input', 'ac-in'); p1.type = 'password'; p1.autocomplete = 'new-password'; l1.appendChild(p1);
      const l2 = el('label', 'ac-lab', 'Confirme le mot de passe'), p2 = el('input', 'ac-in'); p2.type = 'password'; p2.autocomplete = 'new-password'; l2.appendChild(p2);
      const msg = el('div', 'ac-msg'); msg.setAttribute('role', 'status');
      const check = () => { if (!p1.value && !p2.value) { msg.textContent = ''; msg.className = 'ac-msg'; } else if (p1.value.length < 8) { msg.textContent = '8 caractères minimum.'; msg.className = 'ac-msg'; } else if (p1.value !== p2.value) { msg.textContent = 'Les deux mots de passe ne correspondent pas.'; msg.className = 'ac-msg bad'; } else { msg.textContent = 'Les deux mots de passe correspondent.'; msg.className = 'ac-msg ok'; } };
      p1.addEventListener('input', check); p2.addEventListener('input', check);
      const go = el('button', 'ac-btn ac-btn--auto', 'Enregistrer'); go.type = 'button';
      const cancel = el('button', 'ac-link', 'Annuler'); cancel.type = 'button'; cancel.addEventListener('click', () => { pwBox.hidden = true; pwBtn.hidden = false; });
      go.addEventListener('click', async () => {
        if (p1.value.length < 8 || p1.value !== p2.value) { check(); if (p1.value.length < 8) { msg.textContent = '8 caractères minimum.'; msg.className = 'ac-msg bad'; } return; }
        go.disabled = true; msg.textContent = 'Enregistrement…'; msg.className = 'ac-msg';
        try { await api('/auth/v1/user', { method: 'PUT', token: await token(), body: { password: p1.value } }); pwBox.hidden = true; pwBtn.hidden = false; pwOk.textContent = 'Mot de passe enregistré.'; }
        catch (e) { go.disabled = false; if (!out(e)) { msg.textContent = msgOf(e); msg.className = 'ac-msg bad'; } }
      });
      const row = el('div', 'ac-row'); row.append(go, cancel); pwBox.append(l1, l2, msg, row); p1.focus();
    });
    // suppression du compte
    const delBtn = $('#ac-del-btn'), delBox = $('#ac-del-box');
    delBtn.addEventListener('click', () => {
      delBtn.hidden = true; delBox.hidden = false; delBox.textContent = '';
      delBox.appendChild(el('p', 'ac-fine', 'Tes données de synchronisation (panneaux, favoris, réglages, appareils) seront effacées définitivement. Tes PC gardent leurs panneaux, mais ne se synchronisent plus. Pour confirmer, tape SUPPRIMER.'));
      const inp = el('input', 'ac-in'); inp.setAttribute('aria-label', 'Tape SUPPRIMER pour confirmer'); inp.autocomplete = 'off';
      const msg = el('div', 'ac-msg'); const go = el('button', 'ac-btn ac-btn--danger ac-btn--auto', 'Supprimer définitivement'); go.type = 'button'; go.disabled = true;
      const cancel = el('button', 'ac-link', 'Annuler'); cancel.type = 'button'; cancel.addEventListener('click', () => { delBox.hidden = true; delBtn.hidden = false; });
      inp.addEventListener('input', () => { go.disabled = inp.value.trim() !== 'SUPPRIMER'; });
      go.addEventListener('click', async () => {
        go.disabled = true; msg.textContent = 'Suppression…'; msg.className = 'ac-msg';
        try { await api('/functions/v1/polytabs-delete-account', { method: 'POST', token: await token(), body: { confirm: true } }); mem.s = null; setS(null); location.replace('index.html'); }
        catch (e) { if (out(e)) return; go.disabled = false; msg.textContent = msgOf(e); msg.className = 'ac-msg bad'; }
      });
      const row = el('div', 'ac-row'); row.append(go, cancel); delBox.append(inp, row, msg); inp.focus();
    });
    show('account');
  }
  if (page === 'login') loginPage(); else if (page === 'account') accountPage();
})();
