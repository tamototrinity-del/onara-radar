// トレース素材版キャラ描画（6軸フル変形＋タイプ切替）ブラウザ/Node共用・全12種対応。
// 見た目=VTraceパス。変形:
//   大きさ→縮尺 / 長さ→縦横比 / 湿り気→色調+にじみ / 重厚感→下ぶくれワープ / キレ→角ワープ
//   （重厚感・キレはトレースパスの座標加工。形の作り直しはしない）
//   安定感→極小の口線1本のみコード描画（元絵の線色・線幅。くちばし/鼻先種は口なし）
// データ: assets/zodiac-trace/<key>.js（種別）。Node=require, ブラウザ=ZTRACE[key] グローバル。
// charaTraceSVG(v, zi, uid)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./path-util.js'), null, true, require);
  } else {
    root.CharaTrace = factory(root.PathUtil, root.ZTRACE || {}, false, null);
  }
})(typeof self !== 'undefined' ? self : this, function (PathUtil, ZTRACE, isNode, req) {

  const NAMES = ['00_ne','01_ushi','02_tora','03_u','04_tatsu','05_mi','06_uma','07_hitsuji','08_saru','09_tori','10_inu','11_i'];
  const PERIOD_HI = 0.55, PERIOD_LO = 0.33;   // 実データ24件の3分位で均等化
  const VIEW_HALF_H = 70;
  // 枠内配置オフセット[ox,oy]（viewBox単位・造形は不変）。子丑寅卯=下げ / 午戌亥=右へ。
  const OFFSET = { 0:[0,11], 1:[0,11], 2:[0,11], 3:[0,11], 6:[11,0], 10:[11,0], 11:[11,0] };
  const _cache = {};

  function dataFor(zi) {
    const key = NAMES[zi];
    if (_cache[key]) return _cache[key];
    let d = null;
    if (isNode) { try { d = req('./assets/zodiac-trace/' + key + '.js'); } catch (e) { d = null; } }
    else d = ZTRACE[key];
    if (d) _cache[key] = d;   // 未ロード(null)はキャッシュしない（後から動的ロードされる）
    return d;
  }
  function typeKey(v) {
    const t = v.type || (v.period == null ? '野良' : v.period >= PERIOD_HI ? '王子' : v.period >= PERIOD_LO ? '王女' : '野良');
    return t === '王子' ? 'ouji' : t === '王女' ? 'oujo' : 'base';
  }

  // 形状ワープ（重厚感=下ぶくれ, キレ=角, 長さ=縦横比）。size(拡縮)は含めない＝後段でfit正規化。
  // bb（{minx,miny,maxx,maxy}）を渡すと出力座標のbboxを記録する。
  function makeMap(v, D, bb) {
    const { cx, cy, hw, hh } = D.body;
    const K = VIEW_HALF_H / hh;
    const hs = (v.heavy / 100 - 0.5);
    const sSharp = v.sharp / 100;
    const nExp = 2 + sSharp * 6;
    const nyEar = (D.earLineY - cy) / hh;
    const aspectX = 1.0 + (v.length / 100 - 0.5) * 0.6;
    const aspectY = 1.0 - (v.length / 100 - 0.5) * 0.6;
    return function (px, py) {
      let dx = px - cx, dy = py - cy;
      const ny0 = dy / hh;
      const wf = 1 + hs * (ny0 > 0 ? 0.55 * Math.min(ny0, 1.3) : 0.35 * Math.max(ny0, -1));
      dx *= wf;
      dy += hs * hh * 0.14;
      if (sSharp > 0.01) {
        const nx1 = dx / hw, ny1 = dy / hh;
        const rho = Math.min(1, Math.hypot(nx1, ny1));
        if (rho > 0.001) {
          const th = Math.atan2(ny1, nx1);
          const rSuper = Math.pow(Math.pow(Math.abs(Math.cos(th)), nExp) + Math.pow(Math.abs(Math.sin(th)), nExp), -1 / nExp);
          let fade = 1;
          if (ny1 < nyEar) fade = Math.max(0, 1 - (nyEar - ny1) * 1.2);
          const k = 1 + sSharp * (rSuper - 1) * rho * fade * 1.25;
          dx *= k; dy *= k;
        }
      }
      const x = dx * K * aspectX, y = dy * K * aspectY;
      if (bb) { if (x < bb.minx) bb.minx = x; if (x > bb.maxx) bb.maxx = x; if (y < bb.miny) bb.miny = y; if (y > bb.maxy) bb.maxy = y; }
      return [x, y];
    };
  }

  function charaTraceSVG(v, zi, uid) {
    zi = ((zi % 12) + 12) % 12;
    const D = dataFor(zi);
    if (!D) return null;
    const set = D.sets[typeKey(v)] || D.sets.base;
    const bb = { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 };
    const map = makeMap(v, D, bb);
    const aspectX = 1.0 + (v.length / 100 - 0.5) * 0.6, aspectY = 1.0 - (v.length / 100 - 0.5) * 0.6;

    let body = '';
    for (const p of set) body += `<path d="${PathUtil.mapPathCoords(p.d, map)}" fill="${p.f}"/>`;

    let mouth = '';
    if (D.face.hasMouth) {
      const K = VIEW_HALF_H / D.body.hh;
      const fc = map(D.face.mx, D.face.my);
      const mw = D.face.mw * K * aspectX;
      const off = ((v.stable - 50) / 50) * VIEW_HALF_H * 0.16 * aspectY;
      mouth = `<path d="M${(fc[0]-mw).toFixed(1)},${fc[1].toFixed(1)} Q${fc[0].toFixed(1)},${(fc[1]+off).toFixed(1)} ${(fc[0]+mw).toFixed(1)},${fc[1].toFixed(1)}" fill="none" stroke="${D.face.lineColor}" stroke-width="1.6" stroke-linecap="round"/>`;
    }

    // fit正規化: 実寸bboxを測り、size(占有率)に応じて枠(±94)へ必ず収める。
    const E = Math.max(Math.abs(bb.minx), Math.abs(bb.maxx), Math.abs(bb.miny), Math.abs(bb.maxy)) || 1;
    const target = (0.60 + 0.32 * v.size / 100) * 88;   // size小=60%, size大=92%の占有（枠に余白）
    const f = (target / E).toFixed(4);

    // にじみは中間(50)超の分だけランプ＝乾〜普通はくっきり、湿った個体だけにじむ（輪郭の不要なボケ回避）
    const wetT = (v.wet - 50) / 50, blur = Math.max(0, (v.wet - 50) / 50) * 2.2;
    let cm = null;
    if (wetT > 0) cm = `${1-0.28*wetT} 0 0 0 0  0 ${1-0.09*wetT} 0 0 ${0.02*wetT}  0 0 1 0 ${0.09*wetT}  0 0 0 1 0`;
    else if (wetT < 0) { const t=-wetT; cm = `1 0 0 0 ${0.035*t}  0 ${1-0.02*t} 0 0 ${0.008*t}  0 0 ${1-0.10*t} 0 0  0 0 0 1 0`; }
    const fid = 'tf_' + uid;
    const filter = (blur > 0.4 || cm) ? `<filter id="${fid}" x="-20%" y="-20%" width="140%" height="140%">${blur>0.4?`<feGaussianBlur stdDeviation="${blur.toFixed(2)}"/>`:''}${cm?`<feColorMatrix type="matrix" values="${cm}"/>`:''}</filter>` : '';
    const fAttr = filter ? `filter="url(#${fid})"` : '';

    const hilowColor = v.hilow > 0 ? '#ffe0e0' : v.hilow < 0 ? '#e0e8ff' : null;
    const halo = hilowColor ? `<ellipse cx="0" cy="0" rx="${VIEW_HALF_H*1.35}" ry="${VIEW_HALF_H*1.35}" fill="${hilowColor}" opacity="0.35"/>` : '';

    const foff = OFFSET[zi] || [0, 0];
    return `<defs>${filter}</defs>
      <g transform="translate(${foff[0]} ${foff[1]}) scale(${f})" ${fAttr}>
        ${halo}${body}${mouth}
      </g>`;
  }

  return { charaTraceSVG, NAMES };
});
