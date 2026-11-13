// Спільна поведінка сторінок Mini App: тема Telegram, навігація, іконки бренду, точне введення і кнопки −/+ біля повзунків,
// перемикання «форма → результат», мікроанімації (дорахунок цифр, відгук HapticFeedback), нижня панель.
(function () {
  const root = document.documentElement;
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTg = !!(tg && tg.platform && tg.platform !== 'unknown');
  const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const UI = window.UI = { inTg, still };

  // ---------- Тема ----------
  // У Telegram беремо його схему (вона може не збігатися із системною), інакше діє prefers-color-scheme.
  // Світла тема — завжди кольори бренду. Темна — нейтральна: фон/картка/текст із Telegram themeParams, якщо вони придатні.
  const lum = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null;
    const c = [0, 2, 4].map(i => { const v = parseInt(m[1].substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const TP = ['--bg', '--card', '--fg', '--muted'];
  function theme() {
    try {
      const dark = inTg && tg.colorScheme === 'dark';
      if (inTg && (tg.colorScheme === 'dark' || tg.colorScheme === 'light')) root.setAttribute('data-theme', tg.colorScheme);
      TP.forEach(k => root.style.removeProperty(k));
      if (dark) {
        const tp = tg.themeParams || {}, bg = tp.secondary_bg_color, card = tp.section_bg_color || tp.bg_color, fg = tp.text_color, mut = tp.subtitle_text_color || tp.hint_color;
        if (lum(bg) != null && lum(card) != null && lum(bg) < 0.08 && lum(card) < 0.12 && cr(fg, card) >= 7 && cr(fg, bg) >= 7) {
          root.style.setProperty('--bg', bg); root.style.setProperty('--card', card); root.style.setProperty('--fg', fg);
          if (cr(mut, card) >= 4.5 && cr(mut, bg) >= 4.5) root.style.setProperty('--muted', mut);
        }
      }
      if (inTg) {
        const cs = getComputedStyle(root), bg = cs.getPropertyValue('--bg').trim(), card = cs.getPropertyValue('--card').trim();
        const hex = !tg.isVersionAtLeast || tg.isVersionAtLeast('6.9');
        // старі клієнти не приймають довільний колір шапки — тоді беремо найближчий системний
        try { tg.setHeaderColor && tg.setHeaderColor(hex && bg ? bg : 'secondary_bg_color'); } catch (e) { try { tg.setHeaderColor('secondary_bg_color'); } catch (e2) {} }
        try { tg.setBackgroundColor && tg.setBackgroundColor(bg || 'secondary_bg_color'); } catch (e) { try { tg.setBackgroundColor('secondary_bg_color'); } catch (e2) {} }
        try { if (card && tg.setBottomBarColor) tg.setBottomBarColor(card); } catch (e) {}
      }
    } catch (e) {}
  }
  theme();
  try { if (inTg && tg.onEvent) tg.onEvent('themeChanged', theme); } catch (e) {}

  // ---------- Відгук ----------
  let lastTick = 0;
  UI.tick = () => { const t = Date.now(); if (t - lastTick < 35) return; lastTick = t; try { inTg && tg.HapticFeedback && tg.HapticFeedback.selectionChanged(); } catch (e) {} };
  UI.tap = k => { try { inTg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} };

  // ---------- Навігація ----------
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

  // ---------- Іконки у стилі знака: одна товста лінія, круглі кути; «дах» — лише у щита ----------
  const IC = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    plane: '<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>',
    shield: '<path d="M12 2.8l7.5 3.6v5.1c0 4.4-3 7.8-7.5 9.5-4.5-1.7-7.5-5.1-7.5-9.5V6.4z"/><path d="M8.8 12l2.3 2.3 4.2-4.4"/>',
    med: '<path d="M12 2.8l7.5 3.6v5.1c0 4.4-3 7.8-7.5 9.5-4.5-1.7-7.5-5.1-7.5-9.5V6.4z"/><path d="M12 8.5v6M9 11.5h6"/>',
    car: '<path d="M19 17h2a1 1 0 0 0 1-1v-3a2 2 0 0 0-1.5-1.9L16 10l-2.2-2.3A2.5 2.5 0 0 0 12 7H5a1.6 1.6 0 0 0-1.4.9L2.2 10.8A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l3 3"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
    minus: '<path d="M6 12h12"/>',
    plus: '<path d="M6 12h12M12 6v12"/>',
    up: '<circle cx="12" cy="12" r="9"/><path d="M12 16.5v-9M8.5 11L12 7.5l3.5 3.5"/>',
    sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.500 9.500z"/><path d="M15.5 9a4.200 4.200 0 0 1 0 6M18 6.500a7.800 7.800 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.500 9.500z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.600-5.900"/><path d="M4 4.500v4h4"/>'
  };
  UI.icon = (name, px, sw) => `<svg class="ic" viewBox="0 0 24 24" width="${px || 20}" height="${px || 20}" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || ''}</svg>`;
  // Знак «ФП»: кругла «Ф» + «П» з дахом і вирізаною стрілкою (brand/znak-hibryd-bez-fonu-*.svg)
  UI.mark = h => `<svg class="mk" viewBox="-4 136 412 240" width="${Math.round((h || 14) * 412 / 240)}" height="${h || 14}" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M0 256a95 95 0 1 0 190 0a95 95 0 1 0 -190 0ZM48 256a47 47 0 1 1 94 0a47 47 0 1 1 -94 0Z"/><rect x="71" y="142" width="48" height="228" rx="15"/><path d="M242 370A26 26 0 0 1 216 344L216 196.35A20 20 0 0 1 226 179.03L294 139.77A20 20 0 0 1 314 139.77L382 179.03A20 20 0 0 1 392 196.35L392 344A26 26 0 0 1 366 370L343 370A9 9 0 0 1 334 361L334 250A4 4 0 0 1 338 246L351.22 246A4 4 0 0 0 354.02 239.15L308.2 194.13A6 6 0 0 0 299.8 194.13L253.98 239.15A4 4 0 0 0 256.78 246L270 246A4 4 0 0 1 274 250L274 361A9 9 0 0 1 265 370Z"/></svg>`;
  // Мотив бренду для темної картки результату: кільця монети
  UI.deco = () => '<svg class="deco" viewBox="0 0 240 240" fill="none" stroke="#fff" aria-hidden="true">' +
    [34, 62, 90, 118].map((r, i) => `<circle cx="120" cy="120" r="${r}" stroke-width="13" opacity="${(0.075 - i * 0.012).toFixed(3)}"/>`).join('') + '</svg>';
  // Головна кнопка запису: підпис «Безкоштовно · без зобов'язань» — другим рядком усередині (єдине місце, де це сказано, крім кроку 3)
  UI.cta = () => `<span class="l1">${UI.icon('phone', 19, 2.2)}Записатися на консультацію</span><span class="l2">Безкоштовно · без зобов'язань</span>`;
  // «Що буде після запису»: step2 — свій для кожного калькулятора
  UI.steps = step2 => `<div class="card"><h2>Що буде після запису</h2><ol class="steps"><li>Передзвонимо, коли вам зручно</li><li>${step2}</li><li>Рішення за вами — консультація ні до чого не зобов'язує</li></ol>` +
    `<p class="trust">Консультації проводять фінансові консультанти команди «Твій фінансовий план».</p></div>`;
  UI.brand = () => `<p class="brand">${UI.mark(13)}<span>Твій фінансовий план</span></p>`;
  UI.fine = t => `<p class="fine">${UI.mark(12)}<span>${t}</span></p>`;
  function hydrate(el) {
    (el || document).querySelectorAll('[data-ic]').forEach(e => { e.outerHTML = UI.icon(e.dataset.ic, +e.dataset.px || 20); });
    (el || document).querySelectorAll('[data-mk]').forEach(e => { e.outerHTML = UI.mark(+e.dataset.mk || 14); });
    (el || document).querySelectorAll('[data-brand]').forEach(e => { e.outerHTML = UI.brand(); });
    (el || document).querySelectorAll('[data-deco]').forEach(e => { e.outerHTML = UI.deco(); });
    (el || document).querySelectorAll('[data-cta]').forEach(e => { e.removeAttribute('data-cta'); e.innerHTML = UI.cta(); });
    (el || document).querySelectorAll('[data-steps]').forEach(e => { e.outerHTML = UI.steps(e.dataset.steps); });
    (el || document).querySelectorAll('[data-fine]').forEach(e => { e.outerHTML = UI.fine(e.innerHTML); });
  }
  UI.hydrate = hydrate;

  // ---------- Дорахунок цифр (≈450 мс), вимикається з prefers-reduced-motion ----------
  // UI.count(el, число, fmt[, from]) — fmt(n) повертає текст; from — з якого значення почати (типово з попереднього)
  UI.count = function (el, to, fmt, from) {
    if (!el) return;
    fmt = fmt || (n => String(Math.round(n)));
    cancelAnimationFrame(el._raf || 0);
    const a = from != null ? from : el._cv;
    if (still() || a == null || a === to || !isFinite(a) || !isFinite(to)) { el._cv = to; el.textContent = fmt(to); return; }
    const t0 = performance.now(), ms = 450;
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el._cv = a + (to - a) * e;
      el.textContent = fmt(k >= 1 ? to : el._cv);
      if (k < 1) el._raf = requestAnimationFrame(step); else el._cv = to;
    };
    el._cv = a; el._raf = requestAnimationFrame(step);
  };

  // ---------- Форма ↔ результат ----------
  // UI.setView('form'|'res', back): керує нижньою панеллю (body[data-view]) і кнопкою «Назад» у Telegram
  let backFn = null, backOn = false;
  UI.setView = function (v, back) {
    document.body.setAttribute('data-view', v);
    backFn = v === 'res' ? back : null;
    try {
      const bb = inTg && tg.BackButton;
      if (bb) {
        if (!backOn && bb.onClick) { bb.onClick(() => { if (backFn) backFn(); }); backOn = true; }
        if (backFn) bb.show(); else bb.hide();
      }
    } catch (e) {}
  };
  // плавна поява блоків результату
  UI.enter = el => { if (!el || still()) return; el.classList.remove('view-in'); void el.offsetWidth; el.classList.add('view-in'); };

  // ---------- Поля біля повзунків ----------
  const nums = [], steps = [];
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
  // Кнопки −/+ обабіч повзунка: крок = крок повзунка; утримання — швидка зміна
  function bindStep(range) {
    if (range.closest('.sl')) return;
    const box = document.createElement('div'); box.className = 'sl';
    range.parentNode.insertBefore(box, range);
    const name = range.getAttribute('aria-label') || '';
    const mk = (d, ic, lbl) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'stp-b'; b.innerHTML = UI.icon(ic, 20, 2.2);
      b.setAttribute('aria-label', lbl + (name ? ': ' + name.toLowerCase() : '')); b._d = d; return b; };
    const minus = mk(-1, 'minus', 'Зменшити'), plus = mk(1, 'plus', 'Збільшити');
    box.appendChild(minus); box.appendChild(range); box.appendChild(plus);
    const upd = () => { minus.disabled = +range.value <= +range.min; plus.disabled = +range.value >= +range.max; };
    const go = d => {
      const st = +range.step || 1, lo = +range.min, hi = +range.max, v = Math.min(hi, Math.max(lo, +range.value + d * st));
      if (v === +range.value) return false;
      range.value = v; range.dispatchEvent(new Event('input', { bubbles: true })); return true;
    };
    [minus, plus].forEach(b => {
      let t1 = 0, t2 = 0, held = false;
      const stop = () => { clearTimeout(t1); clearInterval(t2); };
      b.addEventListener('pointerdown', e => { if (e.button) return; held = true; go(b._d);
        stop(); t1 = setTimeout(() => { t2 = setInterval(() => { if (!go(b._d)) stop(); }, 70); }, 420); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, stop));
      // click без pointerdown — клавіатура чи допоміжні технології
      b.addEventListener('click', () => { if (held) { held = false; return; } go(b._d); });
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
    let last = range.value;
    range.addEventListener('input', () => { upd(); if (range.value !== last) { last = range.value; UI.tick(); } });
    steps.push(upd); upd();
  }
  UI.syncNums = () => { nums.forEach(f => f()); steps.forEach(f => f()); };

  function init() {
    hydrate();
    document.querySelectorAll('input[type=range]').forEach(bindStep);
    document.querySelectorAll('input.num[data-for]').forEach(bindNum);
    // відгук: вибір (чипи, вкладки, тумблери) і легкий удар на кнопках
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('button,label.toggle');
      if (!t) return;
      if (t.matches('.btn,.dock-link,.dock-go,.linkbtn')) UI.tap('light');
      else if (!t.matches('.stp-b')) UI.tick();
    });
    // навігація: якщо вкладки не вміщаються — затухання з того боку, де є ще
    const nav = document.querySelector('.nav'), ni = nav && nav.querySelector('.nav-in');
    if (ni) {
      const upd = () => {
        nav.classList.toggle('more-l', ni.scrollLeft > 4);
        nav.classList.toggle('more-r', ni.scrollLeft + ni.clientWidth < ni.scrollWidth - 4);
      };
      const on = ni.querySelector('.on');
      if (on && ni.scrollWidth > ni.clientWidth) ni.scrollLeft = Math.max(0, on.offsetLeft - (ni.clientWidth - on.offsetWidth) / 2);
      ni.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
      try { document.fonts && document.fonts.ready.then(upd); } catch (e) {}
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
