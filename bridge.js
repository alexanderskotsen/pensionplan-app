// Надсилання розрахунку в бота з будь-якої сторінки Mini App.
// 1) через сервер бота (/api/webapp_data) — працює, як би людина не відкрила Mini App (кнопка, меню, посилання);
// 2) запасний варіант — Telegram sendData (працює лише при відкритті кнопкою внизу чату);
// 3) поза Telegram — відкриваємо бота за посиланням.
window.toBot = async function (data, start) {
  const tg = window.Telegram && window.Telegram.WebApp;
  const q = new URLSearchParams(location.search);
  // Якщо сторінку відкрили старою кнопкою без параметрів — беремо адреси за замовчуванням.
  const api = (q.get('api') || 'https://pensionplan-bot.onrender.com').replace(/\/$/, '');
  const bot = q.get('bot') || 'tviy_finplan_bot';
  if (tg && tg.initData) {
    if (api) {
      try {
        const r = await fetch(api + '/api/webapp_data', { method: 'POST', headers: { 'X-Init-Data': tg.initData, 'Content-Type': 'text/plain' }, body: data });
        if (r.ok) { try { tg.close(); } catch (e) {} return true; }
      } catch (e) {}
    }
    try { tg.sendData(data); return true; } catch (e) {}
  }
  if (bot) {
    const u = 'https://t.me/' + bot + (start ? '?start=' + start : '');
    try { if (tg && tg.openTelegramLink && tg.initData) { tg.openTelegramLink(u); return true; } } catch (e) {}
    location.href = u; return true;
  }
  return false;
};
