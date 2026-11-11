// Надсилання розрахунку в бота з будь-якої сторінки Mini App.
// • Відкрито кнопкою внизу чату: initData порожній, працює лише Telegram sendData.
// • Відкрито з меню / посилання / інлайн-кнопки: є initData — шлемо на сервер бота (/api/webapp_data).
// • Поза Telegram — відкриваємо бота за посиланням.
window.toBot = async function (data, start) {
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTg = !!(tg && tg.platform && tg.platform !== 'unknown');
  const q = new URLSearchParams(location.search);
  const api = (q.get('api') || 'https://pensionplan-bot.onrender.com').replace(/\/$/, '');
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
  const seen = {};
  const PAGES = { 'save.html': 'save', 'invest.html': 'invest', 'game.html': 'game' };
  window.trackOpen = function (c) {
    if (!c || seen[c]) return;
    seen[c] = 1;
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      const q = new URLSearchParams(location.search);
      const api = (q.get('api') || 'https://pensionplan-bot.onrender.com').replace(/\/$/, '');
      const init = tg && tg.initData;
      if (!init && !q.get('tu')) return;
      const headers = { 'Content-Type': 'text/plain' };
      if (init) headers['X-Init-Data'] = init;
      fetch(api + '/api/track', { method: 'POST', headers, keepalive: true,
        body: JSON.stringify({ c, tu: q.get('tu') || '', ts: q.get('ts') || '' }) }).catch(() => {});
    } catch (e) {}
  };
  const page = location.pathname.split('/').pop() || 'index.html';
  const auto = PAGES[page];
  if (auto) window.addEventListener('load', () => window.trackOpen(auto));
})();
