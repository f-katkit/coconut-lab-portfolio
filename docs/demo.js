/* 監視と通知のデモ（サンプルデータ）
 * 毎日の数値を「いつもの範囲」と比べ、大きく外れた日に通知する。
 * データ生成と判定は描画から分けてあり、Node でもテストできる。 */
(function (root) {
  "use strict";

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 監視する指標の種類
  const KINDS = {
    visits: {
      label: "Webサイトのアクセス数", unit: "件", weekly: true,
      make(r) { return { base: 900 + Math.round(r() * 900), noise: 0.05, jump: -(0.45 + r() * 0.2) }; },
    },
    latency: {
      label: "サイトの応答時間", unit: "ms", weekly: false,
      make(r) { return { base: 260 + Math.round(r() * 140), noise: 0.07, jump: 1.3 + r() * 1.2 }; },
    },
  };

  const N = 70, EVENT = 58;

  /** 毎日の値を作る。EVENT 日目から数日間だけ異常が続く */
  function makeSeries(seed, kind) {
    const r = rng(seed);
    const k = KINDS[kind];
    const p = k.make(r);
    const offset = Math.floor(r() * 7);
    const vals = [];
    for (let i = 0; i < N; i++) {
      const dow = (i + offset) % 7; // 5,6 を週末とする
      let v = p.base * (1 + 0.0015 * i);
      if (k.weekly && dow >= 5) v *= 0.72;
      const z = (r() + r() + r() - 1.5) / 0.5; // おおよそ正規分布
      v *= 1 + p.noise * z;
      if (i >= EVENT && i < EVENT + 4) v *= 1 + p.jump * (i === EVENT ? 1 : 0.85);
      vals.push(Math.max(1, v));
    }
    return { kind, label: k.label, unit: k.unit, weekly: k.weekly, offset, vals };
  }

  /** day 日目の値を、それより前のデータだけで判定する（未来は見ない） */
  function judge(s, day) {
    const v = s.vals;
    if (day < 35) return null;
    // 基準: 曜日の効果がある指標は直近4週の同じ曜日の平均、ない指標は直近14日の平均
    const peers = [];
    if (s.weekly) { for (let w = 1; w <= 4; w++) peers.push(v[day - 7 * w]); }
    else { for (let d = 1; d <= 14; d++) peers.push(v[day - d]); }
    const base = peers.reduce((a, b) => a + b, 0) / peers.length;
    // ばらつき: 直近28日の「基準との比」の対数のばらつき
    const devs = [];
    for (let d = day - 28; d < day; d++) {
      const pp = [];
      if (s.weekly) { for (let w = 1; w <= 4; w++) if (d - 7 * w >= 0) pp.push(v[d - 7 * w]); }
      else { for (let e = 1; e <= 14; e++) if (d - e >= 0) pp.push(v[d - e]); }
      if (pp.length < 2) continue;
      const b = pp.reduce((a, c) => a + c, 0) / pp.length;
      devs.push(Math.log(v[d] / b));
    }
    const mean = devs.reduce((a, b) => a + b, 0) / devs.length;
    const sd = Math.sqrt(devs.reduce((a, b) => a + (b - mean) ** 2, 0) / devs.length);
    const width = Math.max(4 * sd, 0.25);
    const x = Math.log(v[day] / base);
    return { base, lo: base * Math.exp(-width), hi: base * Math.exp(width), alert: Math.abs(x) > width, ratio: v[day] / base };
  }

  /** 先頭から1日ずつ判定し、最初に通知した日を返す */
  function scan(s) {
    for (let d = 35; d < s.vals.length; d++) {
      const j = judge(s, d);
      if (j && j.alert) return { day: d, j };
    }
    return null;
  }

  /** デモ再生用: 異常の初日にだけ通知が出る系列を選ぶ */
  function pick(seed, kind) {
    for (let s = seed; s < seed + 50; s++) {
      const series = makeSeries(s, kind);
      const hit = scan(series);
      if (hit && hit.day === EVENT) return { seed: s, series, hit };
    }
    return null;
  }

  const api = { rng, makeSeries, judge, scan, pick, KINDS, N, EVENT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WatchDemo = api;
})(typeof window !== "undefined" ? window : globalThis);
