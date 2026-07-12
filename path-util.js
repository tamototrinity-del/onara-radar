// VTracer出力SVGのパス操作ユーティリティ（ブラウザ/Node共用）
// VTracerは絶対座標の M/C/Z のみ・各<path>は fill と transform="translate(tx,ty)" を持つ。
// 全座標は「ペア」で並ぶので、コマンド文字はそのまま・数値ペアだけ写像する。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PathUtil = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // d文字列の全(x,y)ペアに fn を適用して返す（コマンド文字は保持）
  function mapPathCoords(d, fn) {
    const toks = d.match(/[MLCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
    let out = '', i = 0;
    while (i < toks.length) {
      const t = toks[i];
      if (/[MLCZ]/i.test(t)) { out += t + ' '; i++; }
      else {
        const x = parseFloat(t), y = parseFloat(toks[i + 1]); i += 2;
        const p = fn(x, y);
        out += (Math.round(p[0] * 10) / 10) + ' ' + (Math.round(p[1] * 10) / 10) + ' ';
      }
    }
    return out.trim();
  }

  // VTracer SVGから {f:fill, d:translateをベイクした絶対d} の配列を抽出
  function parsePaths(svg) {
    const re = /<path\s+d="([^"]*)"\s+fill="([^"]*)"(?:\s+transform="translate\(([-\d.]+),([-\d.]+)\)")?\s*\/?>/g;
    const out = [];
    let m;
    while ((m = re.exec(svg)) !== null) {
      const d = m[1], fill = m[2];
      const tx = m[3] ? parseFloat(m[3]) : 0, ty = m[4] ? parseFloat(m[4]) : 0;
      const baked = (tx || ty) ? mapPathCoords(d, (x, y) => [x + tx, y + ty]) : d;
      out.push({ f: fill, d: baked });
    }
    return out;
  }

  return { mapPathCoords, parsePaths };
});
