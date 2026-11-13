// Орієнтовна модель накопичувального страхування життя (гривня).
// Відкалібрована 10.11.2026 на ~120 розрахунках тарифного калькулятора (класична програма і дитяча).
// Сирих тарифів тут немає — лише згладжена формула; похибка премії ≈0,7% у середньому, до ~2,5%.
// Та сама модель — у tariff.py бота. Міняєш тут — міняй і там.
(function (root) {
  const P = {
    i: 0.0291, L: 0.1362, bM: -9.0493, bF: -10.0385, b1: 0.0703, k: 2.5298, fee: 55, // дорослі
    ci: 0.0131, cL: 0.0851,           // дитяча програма (премія не залежить від батьків і статі)
    dB0: 0.0395, dB1: 0.00022, dO0: 0.064, dO1: 0.00027, // надбавка бонусу: сценарії 9% і 12%, росте зі строком
    freq: 1.0                         // «відкладаю X на місяць» = X×12 на рік (рішення власника 13.11.2026)
  };
  const sdd = (n, i) => { let s = 0; for (let t = 0; t < n; t++) s += Math.pow(1 + i, n - t); return s; };
  // річна премія за 1 грн гарантованої суми
  function rateAdult(age, sex, n) {
    const b0 = sex === 'm' ? P.bM : P.bF;
    let mc = 0; for (let t = 0; t < n; t++) mc += Math.exp(b0 + P.b1 * (age + t)) * Math.pow(1 + P.i, n - t);
    return ((1 + P.L) + P.k * mc) / sdd(n, P.i);
  }
  const rateChild = n => (1 + P.cL) / sdd(n, P.ci);
  // дохідність, з якою внески P (на початку року) за n років дають F
  function irr(p, n, F) {
    let lo = -0.3, hi = 0.3;
    for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (p * sdd(n, m) > F) hi = m; else lo = m; }
    return (lo + hi) / 2;
  }
  // annual — річний внесок у грн; повертає гарантовану суму, базовий і оптимістичний прогноз
  function project(annual, n, rate) {
    const net = Math.max(0, annual - P.fee), guar = net / rate;
    const g = irr(annual, n, guar), dB = Math.min(0.049, P.dB0 + P.dB1 * n), dO = Math.min(0.076, P.dO0 + P.dO1 * n);
    return { guar, base: annual * sdd(n, g + dB), opt: annual * sdd(n, g + dO), cover: guar,
             annual, rBase: g + dB, rOpt: g + dO,
             at: y => annual * sdd(Math.min(y, n), g + dB) };  // базовий прогноз на кінець року y
  }
  // pay — внесок за період; freq 'm' (щомісяця) або 'y' (раз на рік)
  const toAnnual = (pay, freq) => freq === 'y' ? pay : pay * 12 / P.freq;
  const fromAnnual = (annual, freq) => freq === 'y' ? annual : annual * P.freq / 12;
  function adult(pay, freq, age, sex, n) {
    const a = toAnnual(pay, freq), r = project(a, n, rateAdult(age, sex, n));
    r.paid = pay * (freq === 'y' ? 1 : 12) * n; return r;
  }
  function child(pay, freq, n) {
    const a = toAnnual(pay, freq), r = project(a, n, rateChild(n));
    r.paid = pay * (freq === 'y' ? 1 : 12) * n; return r;
  }
  // скільки вносити, щоб базовий прогноз = goal (модель майже лінійна за сумою)
  function payFor(goal, freq, fn) {
    const one = fn(freq === 'y' ? 10000 : 1000);
    const k = one.base / (freq === 'y' ? 10000 : 1000);
    return goal / k;
  }
  // Разовий внесок (дорослі): ціна 1 грн гарантованої суми і прогноз
  const PS = { i: 0.0344, L: 0.0603, k: 0.898, dBase: 0.051, dOpt: 0.079 };
  function rateSingle(age, sex, n) {
    const b0 = sex === 'm' ? P.bM : P.bF;
    let mc = 0; for (let t = 0; t < n; t++) mc += Math.exp(b0 + P.b1 * (age + t)) * Math.pow(1 + PS.i, n - t);
    return ((1 + PS.L) + PS.k * mc) / Math.pow(1 + PS.i, n);
  }
  function single(amount, age, sex, n) {
    const guar = amount / rateSingle(age, sex, n), g = Math.pow(guar / amount, 1 / n) - 1;
    return { guar, cover: guar, paid: amount, base: amount * Math.pow(1 + g + PS.dBase, n), opt: amount * Math.pow(1 + g + PS.dOpt, n),
             at: y => amount * Math.pow(1 + g + PS.dBase, Math.min(y, n)) };
  }
  // Звільнення від внесків у дитячій програмі (якщо з батьком/матір'ю щось станеться — внески платить страховик).
  // Річна доплата на 1 грн гарантованої суми за віком батька; для матері ≈ ×0,41. Батьку — до 55 років.
  const W = [[25, 0.00279], [35, 0.0052], [45, 0.01163], [55, 0.01556]];
  function waiver(parentAge, parentSex, guar) {
    const a = Math.min(55, Math.max(18, parentAge));
    let w = W[0][1];
    for (let j = 0; j < W.length - 1; j++) if (a >= W[j][0]) w = W[j][1] + (W[j + 1][1] - W[j][1]) * Math.min(1, (a - W[j][0]) / 10);
    if (a < 25) w = W[0][1];
    return guar * w * (parentSex === 'f' ? 0.41 : 1);
  }
  const T = { P, sdd, rateAdult, rateChild, irr, project, adult, child, payFor, toAnnual, fromAnnual, rateSingle, single, waiver };
  if (typeof module !== 'undefined') module.exports = T; else root.Tariff = T;
})(this);
