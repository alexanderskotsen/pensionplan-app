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
