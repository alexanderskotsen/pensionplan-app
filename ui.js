// Спільна поведінка сторінок Mini App: тема Telegram, навігація, точне введення біля повзунків, нижня панель.
(function () {
  const root = document.documentElement;
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTg = !!(tg && tg.platform && tg.platform !== 'unknown');

  // Тема: у Telegram беремо його схему (вона може не збігатися із системною), інакше діє prefers-color-scheme.
  function theme() {
    try {
      if (inTg && (tg.colorScheme === 'dark' || tg.colorScheme === 'light')) root.setAttribute('data-theme', tg.colorScheme);
      if (inTg) {
        const cs = getComputedStyle(root), bg = cs.getPropertyValue('--bg').trim(), card = cs.getPropertyValue('--card').trim();
        if (bg) { tg.setHeaderColor && tg.setHeaderColor(bg); tg.setBackgroundColor && tg.setBackgroundColor(bg); }
        if (card && tg.setBottomBarColor) tg.setBottomBarColor(card);
      }
    } catch (e) {}
  }
  theme();
  try { if (inTg && tg.onEvent) tg.onEvent('themeChanged', theme); } catch (e) {}

  // Перехід між сторінками зі збереженням параметрів (bot, api, v, tu, ts, pa, pn, pw).
  // amt/yrs/sx — разове передзаповнення save.html з пенсійного калькулятора, далі не тягнемо.
  window.navGo = function (page, tab, extra) {
    const q = new URLSearchParams(location.search);
    ['tab', 'amt', 'yrs', 'sx'].forEach(k => q.delete(k));
    if (tab) q.set('tab', tab);
    if (extra) Object.keys(extra).forEach(k => q.set(k, extra[k]));
    const s = q.toString();
    location.href = page + (s ? '?' + s : '');
  };

  const UI = window.UI = {};
  const nums = [];
  const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  // Поле <input class="num" data-for="idПовзунка">: показує значення повзунка, дає ввести число вручну (у межах повзунка).
  function bindNum(inp) {
    const range = document.getElementById(inp.dataset.for);
    if (!range) return;
    const show = () => {
      if (document.activeElement !== inp) inp.value = fmtN(+range.value);
      inp.style.width = Math.max(2, inp.value.length) + 0.6 + 'ch';
    };
    const apply = (n, clamp) => {
      const lo = +range.min, hi = +range.max;
      if (isNaN(n)) return;
      if (n < lo || n > hi) { if (!clamp) return; n = Math.min(hi, Math.max(lo, n)); }
      if (+range.value === n) return;
      range.value = n;
      range.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const read = () => { const d = inp.value.replace(/\D/g, ''); return d ? +d : NaN; };
    inp.addEventListener('focus', () => { inp.value = String(+range.value); show(); try { inp.select(); } catch (e) {} });
    inp.addEventListener('input', () => { inp.style.width = Math.max(2, inp.value.length) + 0.6 + 'ch'; apply(read(), false); });
    inp.addEventListener('blur', () => { apply(read(), true); show(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
    range.addEventListener('input', show);
    const box = inp.closest('.numbox');
    if (box) box.addEventListener('click', e => { if (e.target !== inp) inp.focus(); });
    nums.push(show); show();
  }
  UI.syncNums = () => nums.forEach(f => f());

  function init() {
    document.querySelectorAll('input.num[data-for]').forEach(bindNum);
    // навігація: якщо вкладки не вміщаються — затемнення з того боку, де є ще
    const nav = document.querySelector('.nav'), ni = nav && nav.querySelector('.nav-in');
    if (ni) {
      const upd = () => {
        nav.classList.toggle('more-l', ni.scrollLeft > 4);
        nav.classList.toggle('more-r', ni.scrollLeft + ni.clientWidth < ni.scrollWidth - 4);
      };
      const on = ni.querySelector('.on');
      if (on && ni.scrollWidth > ni.clientWidth) ni.scrollLeft = Math.max(0, on.offsetLeft - (ni.clientWidth - on.offsetWidth) / 2);
      ni.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
      UI.navUpd = upd;
    }
    // нижня панель: контент не ховається під нею; під час введення з клавіатури панель прибираємо
    const dock = document.querySelector('.dock');
    if (dock) {
      document.body.classList.add('has-dock');
      const pad = () => { if (dock.offsetHeight) document.body.style.paddingBottom = dock.offsetHeight + 20 + 'px'; };
      try { new ResizeObserver(pad).observe(dock); } catch (e) {}
      window.addEventListener('resize', pad); pad();
      const typing = el => el && el.tagName === 'INPUT' && /^(text|number|tel)$/.test(el.type);
      document.addEventListener('focusin', e => { if (typing(e.target)) document.body.classList.add('kb'); });
      document.addEventListener('focusout', e => { if (typing(e.target)) document.body.classList.remove('kb'); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
