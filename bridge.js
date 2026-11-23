/* Адреса сервера бота лише з дозволених доменів: чужий ?api= не отримає initData (рецензія 23.11.2026). */
window.safeApi = function (u) { u = (u || '').replace(/\/$/, ''); return /^https:\/\/([a-z0-9-]+\.)*(tviyfinplan\.com\.ua|57\.129\.193\.181\.sslip\.io)$/.test(u) ? u : 'https://app.tviyfinplan.com.ua'; };
// Надсилання розрахунку в бота з будь-якої сторінки Mini App.
// • Відкрито кнопкою внизу чату: initData порожній, працює лише Telegram sendData.
// • Відкрито з меню / посилання / інлайн-кнопки: є initData — шлемо на сервер бота (/api/webapp_data).
// • Поза Telegram — відкриваємо бота за посиланням.
window.toBot = async function (data, start) {
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTg = !!(tg && tg.platform && tg.platform !== 'unknown');
  const q = new URLSearchParams(location.search);
  const api = window.safeApi(q.get('api'));
  const bot = q.get('bot') || 'tviy_finplan_bot';
  if (inTg && !tg.initData) {
    try { tg.sendData(data); return true; } catch (e) {}
  }
  if (inTg && tg.initData) {
    try {
      const r = await fetch(api + '/api/webapp_data', { method: 'POST', headers: { 'X-Init-Data': tg.initData, 'Content-Type': 'text/plain' }, body: data });
      if (r.ok) { try { tg.close(); } catch (e) {} return true; }
    } catch (e) {}
    try { tg.sendData(data); return true; } catch (e) {}
  }
  const u = 'https://t.me/' + bot + (start ? '?start=' + start : '');
  if (inTg) { try { tg.openTelegramLink(u); return true; } catch (e) {} }
  location.href = u; return true;
};

// Аналітика: хто відкрив який калькулятор (подія open_<calc> у боті). Людина нічого не помічає.
// initData є не завжди (кнопка внизу чату його не дає) — тоді беремо підписаний tu/ts з посилання.
(function () {
  const seen = {}, sent = {};
  const PAGES = { 'save.html': 'save', 'invest.html': 'invest', 'game.html': 'game' };
  // d — цифри екрана результату (лише з res_<calc>): бот підставить їх у повідомлення після результату й картку заявки;
  // якщо людина змінила дані й відкрила результат ще раз, цифри надсилаємо знову (подію бот не дублює)
  window.trackOpen = function (c, d) {
    if (!c) return;
    const sig = d ? JSON.stringify(d) : '';
    if (seen[c] && (!d || sent[c] === sig)) return;
    seen[c] = 1; sent[c] = sig;
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      const q = new URLSearchParams(location.search);
      const api = window.safeApi(q.get('api'));
      const init = tg && tg.initData;
      if (!init && !q.get('tu')) return;
      const headers = { 'Content-Type': 'text/plain' };
      if (init) headers['X-Init-Data'] = init;
      fetch(api + '/api/track', { method: 'POST', headers, keepalive: true,
        body: JSON.stringify(d ? { c, d, tu: q.get('tu') || '', ts: q.get('ts') || '' } : { c, tu: q.get('tu') || '', ts: q.get('ts') || '' }) }).catch(() => {});
    } catch (e) {}
  };
  const page = location.pathname.split('/').pop() || 'index.html';
  const auto = PAGES[page];
  if (auto) window.addEventListener('load', () => window.trackOpen(auto));
})();

// Повторна перевірка підписки на канал (вимикач settings.gate_recheck у боті): людина, яка пройшла вхід через канал
// і вийшла з нього, замість калькулятора бачить екран «підпишіться». Сервер відповідає ok=false лише коли це відомо точно;
// без initData / tu (сайт, браузер), при помилці чи для команди калькулятор працює як завжди.
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const q = new URLSearchParams(location.search);
  const init = tg && tg.initData;
  if (!init && !q.get('tu')) return;
  const api = window.safeApi(q.get('api'));
  let box = null;
  const unlock = () => { if (box) { box.remove(); box = null; document.documentElement.classList.remove('gate-locked'); } };
  function lock(url, again) {
    if (!box) {
      const st = document.createElement('style');
      st.textContent = '#gateLock{position:fixed;inset:0;z-index:1000;background:var(--bg,#F6F3EF);color:var(--fg,#1B1620);display:flex;align-items:center;justify-content:center;padding:24px 20px;overflow:auto;font-family:inherit}' +
        '#gateLock .gl{max-width:420px;width:100%;text-align:center;display:grid;gap:14px}' +
        '#gateLock h1{font-size:22px;line-height:1.25;margin:0;font-weight:800;letter-spacing:-.01em}' +
        '#gateLock p{margin:0;font-size:16px;line-height:1.45;color:var(--muted,#5F5A66)}' +
        '#gateLock button{width:100%;min-height:54px;border-radius:16px;font:inherit;font-size:17px;font-weight:700;border:0;cursor:pointer}' +
        '#gateLock .g1{background:var(--ink,#1B1620);color:var(--ink-on,#fff)}' +
        '#gateLock .g2{background:none;color:var(--fg,#1B1620);border:1.5px solid var(--ctl,#7C7882);min-height:48px;font-size:16px}' +
        '#gateLock .gn{color:var(--fg,#1B1620);font-weight:600}html.gate-locked,html.gate-locked body{overflow:hidden}';
      document.head.appendChild(st);
      box = document.createElement('div'); box.id = 'gateLock'; box.setAttribute('role', 'dialog');
      box.innerHTML = '<div class="gl"><h1>Калькулятори відкриваються для підписників</h1>' +
        '<p>Підпишіться на канал «Твій\u00a0фінансовий\u00a0план», і\u00a0калькулятор відкриється одразу.</p>' +
        '<button type="button" class="g1" id="gateSub">Підписатися</button>' +
        '<button type="button" class="g2" id="gateChk">Перевірити підписку</button><p class="gn" id="gateNote" hidden></p></div>';
      document.body.appendChild(box);
      document.documentElement.classList.add('gate-locked');
      box.querySelector('#gateSub').onclick = () => {
        const u = box.dataset.url; if (!u) return;
        if (tg && tg.openTelegramLink && /^https:\/\/t\.me\//.test(u)) { try { tg.openTelegramLink(u); return; } catch (e) {} }
        try { if (!window.open(u, '_blank')) location.href = u; } catch (e) { location.href = u; }
      };
      box.querySelector('#gateChk').onclick = () => check(true);
    }
    box.dataset.url = url || '';
    const n = box.querySelector('#gateNote');
    n.hidden = !again; n.textContent = again ? 'Поки не бачимо підписки. Підпишіться на канал і натисніть ще раз.' : '';
  }
  function check(again) {
    const headers = { 'Content-Type': 'text/plain' };
    if (init) headers['X-Init-Data'] = init;
    fetch(api + '/api/gate', { method: 'POST', headers, body: JSON.stringify({ tu: q.get('tu') || '', ts: q.get('ts') || '' }) })
      .then(r => r.json()).then(d => { if (d && d.ok === false) lock(d.url, again); else unlock(); }).catch(unlock);
  }
  window.gateCheck = check;
  if (document.body) check(false); else document.addEventListener('DOMContentLoaded', () => check(false));
  // повернулась із каналу в Mini App: перевіряємо ще раз сама, без кнопки
  document.addEventListener('visibilitychange', () => { if (box && !document.hidden) check(false); });
})();
