// 十二支キャラ描画モジュール（ブラウザ/Node共用）
// 正データ: 十二支キャラ基本デザイン.png（丸い塊＋輪郭線＋フラットな点目）をSVGパラメトリック化。
// 変形は6スコアで全種共通: 大きさ→縮尺 / 長さ→縦横比 / 湿り気→にじみ・色調 / 重厚感→下ぶくれ / キレ→角 / 安定感→口。
// charaSVG(v, zi, uid) : v={size,length,wet,heavy,sharp,stable,hilow}, zi=干支index(0=子..11=亥), uid=filter id衝突回避用
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Chara = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // hexカラー線形補間（湿り気の色調シフト・輪郭色生成用）
  function mix(a, b, t) {
    const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
    const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
    const c = pa.map((x,i)=>Math.round(x + (pb[i]-x)*t));
    return '#' + c.map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  // 干支ごとの基本色・特徴色（参照PNG準拠）
  const CFG = [
    { name:'子',   base:'#c9c5c1', earIn:'#f2c4c4', tail:'#e0a8a0' },
    { name:'丑',   base:'#f4f1ea', horn:'#e8cf9a', patch:'#b9b5ad', tuft:'#8a8680' },
    { name:'寅',   base:'#f2c05c', stripe:'#7a5a20', earIn:'#6a4a20', tail:'#e0a844', tip:'#6a4a20' },
    { name:'卯',   base:'#f6d8dc', earIn:'#f0a8b8' },
    { name:'辰',   base:'#a5d29c', belly:'#f2ead0', horn:'#e8c87a', fin:'#6fae67' },
    { name:'巳',   base:'#a9cd92', belly:'#f2ead0' },
    { name:'午',   base:'#bb8f66', mane:'#7a5636', muzzle:'#ecd4b2' },
    { name:'未',   base:'#f8f3e6', horn:'#e8c87a' },
    { name:'申',   base:'#ad8566', face:'#eed2b2' },
    { name:'酉',   base:'#f9f6ef', comb:'#e05548', beak:'#e8b84a', feet:'#e8b84a' },
    { name:'戌',   base:'#dcbb8d', earIn:'#eec2ae', muzzle:'#f8efe0' },
    { name:'亥',   base:'#a98069', snout:'#dba393', tusk:'#fffdf5' },
  ];
  function charaSVG(v, zi, uid) {
    zi = ((zi % 12) + 12) % 12;
    const cfg = CFG[zi];

    // ---- 共通ジオメトリ（全種同一の変形コア） ----
    const scale    = 0.6 + (v.size / 100) * 0.8;
    const aspectY  = 1.0 - (v.length / 100 - 0.5) * 0.6;
    const aspectX  = 1.0 + (v.length / 100 - 0.5) * 0.6;
    const heavyF   = v.heavy / 100;
    const gravityY = (heavyF - 0.5) * 8;
    const cornerR  = 30 - (v.sharp / 100) * 25;
    const wetBlur  = (v.wet / 100) * 3;
    const bw = 52 * aspectX, bh = 48 * aspectY;
    const cx = 0, cy = gravityY;
    const topW = bw * (1 - 0.25 * heavyF);
    const botW = bw * (1 + 0.30 * heavyF);
    const t = cy - bh, b = cy + bh;
    const earR  = 13 * aspectX * 0.9;
    const earY  = cy - bh * 0.7;
    const earLX = cx - topW * 0.72;
    const earRX = cx + topW * 0.72;
    const eyeY  = cy - bh * 0.08;
    const eyeLX = cx - bw * 0.30, eyeRX = cx + bw * 0.30;
    const eyeSize = 4.3;
    const noseY = cy + bh * 0.18;
    const tailX = cx + botW, tailY = cy + bh * 0.6;

    // 湿り気の色調（湿→青み / 乾→暖色）を基本色に連続ミックス
    const wetT = (v.wet - 50) / 50; // -1..1
    const bodyColor = wetT > 0 ? mix(cfg.base, '#9fb8d0', wetT * 0.45)
                               : mix(cfg.base, '#d8c8a0', -wetT * 0.30);
    const dark = mix(bodyColor, '#000000', 0.22);
    // 輪郭線（参照PNGの暗色アウトライン。基本色由来の暖色ダーク）
    const line = mix(mix(cfg.base, '#3a322c', 0.62), bodyColor, 0.15);
    const LW = 1.7;
    const o  = `stroke="${line}" stroke-width="${LW}" stroke-linejoin="round"`;
    const o2 = `stroke="${line}" stroke-width="${LW*0.8}" stroke-linejoin="round"`;

    const filterId = 'blur_' + uid;
    const filterStr  = wetBlur > 0.5 ? `<filter id="${filterId}"><feGaussianBlur stdDeviation="${wetBlur}"/></filter>` : '';
    const filterAttr = wetBlur > 0.5 ? `filter="url(#${filterId})"` : '';
    const hilowColor = v.hilow > 0 ? '#ffe0e0' : v.hilow < 0 ? '#e0e8ff' : null;
    const halo = hilowColor ? `<ellipse cx="${cx}" cy="${cy}" rx="${bw*1.25}" ry="${bh*1.25}" fill="${hilowColor}" opacity="0.35"/>` : '';

    function bodyPath(cr) {
      if (cr > 20) {
        const midY = cy + bh * 0.30 * heavyF;
        return `<path d="M${cx},${t} C${cx+topW},${t} ${cx+botW},${cy-bh*0.12} ${cx+botW},${midY} C${cx+botW},${cy+bh*0.74} ${cx+botW*0.55},${b} ${cx},${b} C${cx-botW*0.55},${b} ${cx-botW},${cy+bh*0.74} ${cx-botW},${midY} C${cx-botW},${cy-bh*0.12} ${cx-topW},${t} ${cx},${t} Z"/>`;
      }
      const rr = Math.max(cr, 4);
      const tl=cx-topW, tr=cx+topW, bl=cx-botW, br=cx+botW;
      return `<path d="M${tl+rr},${t} L${tr-rr},${t} Q${tr},${t} ${tr},${t+rr} L${br},${b-rr} Q${br},${b} ${br-rr},${b} L${bl+rr},${b} Q${bl},${b} ${bl},${b-rr} L${tl},${t+rr} Q${tl},${t} ${tl+rr},${t} Z"/>`;
    }

    // ---- 共通パーツ ----
    const mouthColor = mix(line, '#c07070', 0.4);
    const mouth = v.stable > 60
      ? `<path d="M${cx-bw*0.11},${cy+bh*0.30} Q${cx},${cy+bh*0.38} ${cx+bw*0.11},${cy+bh*0.30}" stroke="${mouthColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      : v.stable < 40
      ? `<path d="M${cx-bw*0.11},${cy+bh*0.36} Q${cx},${cy+bh*0.28} ${cx+bw*0.11},${cy+bh*0.36}" stroke="${mouthColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      : `<line x1="${cx-bw*0.09}" y1="${cy+bh*0.32}" x2="${cx+bw*0.09}" y2="${cy+bh*0.32}" stroke="${mouthColor}" stroke-width="1.6" stroke-linecap="round"/>`;

    // フラットな点目（参照PNG準拠・ハイライト無し）
    const eyes = `
      <ellipse cx="${eyeLX}" cy="${eyeY}" rx="${eyeSize*0.85}" ry="${eyeSize}" fill="#3a3430"/>
      <ellipse cx="${eyeRX}" cy="${eyeY}" rx="${eyeSize*0.85}" ry="${eyeSize}" fill="#3a3430"/>`;

    const defaultNose = '';
    const belly = `<ellipse cx="${cx}" cy="${cy+bh*(0.15+0.22*heavyF)}" rx="${Math.min(bw*0.52*(1+0.3*heavyF), botW*0.9)}" ry="${bh*0.38}" fill="rgba(255,255,255,0.25)"/>`;

    function roundEars(x1, x2, y, r, color, inner) {
      return `
      <ellipse cx="${x1}" cy="${y}" rx="${r}" ry="${r*0.95}" fill="${color}" ${o} ${filterAttr}/>
      <ellipse cx="${x2}" cy="${y}" rx="${r}" ry="${r*0.95}" fill="${color}" ${o} ${filterAttr}/>
      ${inner ? `<ellipse cx="${x1}" cy="${y}" rx="${r*0.55}" ry="${r*0.5}" fill="${inner}"/>
      <ellipse cx="${x2}" cy="${y}" rx="${r*0.55}" ry="${r*0.5}" fill="${inner}"/>` : ''}`;
    }
    function triEar(x, y, r, rot, color, inner) {
      const d = `M${x-r},${y+r} Q${x},${y-r*1.7} ${x+r},${y+r} Q${x},${y+r*0.5} ${x-r},${y+r} Z`;
      const d2 = `M${x-r*0.45},${y+r*0.5} Q${x},${y-r*0.55} ${x+r*0.45},${y+r*0.5} Q${x},${y+r*0.28} ${x-r*0.45},${y+r*0.5} Z`;
      return `<g transform="rotate(${rot} ${x} ${y})"><path d="${d}" fill="${color}" ${o} ${filterAttr}/>${inner?`<path d="${d2}" fill="${inner}"/>`:''}</g>`;
    }
    function handsFeet(handColor, footColor) {
      return `
      <ellipse cx="${cx-bw*1.0}" cy="${cy+bh*0.1}" rx="${bw*0.17}" ry="${bh*0.13}" fill="${handColor}" ${o2}/>
      <ellipse cx="${cx+bw*1.0}" cy="${cy+bh*0.1}" rx="${bw*0.17}" ry="${bh*0.13}" fill="${handColor}" ${o2}/>
      <ellipse cx="${cx-botW*0.42}" cy="${cy+bh*1.0}" rx="${bw*0.22*(1+0.5*heavyF)}" ry="${bh*0.14*(1+0.2*heavyF)}" fill="${footColor}" ${o2}/>
      <ellipse cx="${cx+botW*0.42}" cy="${cy+bh*1.0}" rx="${bw*0.22*(1+0.5*heavyF)}" ry="${bh*0.14*(1+0.2*heavyF)}" fill="${footColor}" ${o2}/>`;
    }

    // ---- 干支別パーツ ----
    let back = '', front = '', nose = defaultNose, tail = '', limbs = handsFeet(bodyColor, bodyColor);
    let bellyStr = belly;

    switch (zi) {
      case 0: { // 子（ねずみ）: 頭上の大きな丸耳＋ピンクの細尻尾
        const ex = topW * 0.55, ey = t - earR * 0.35;
        back = roundEars(cx-ex, cx+ex, ey, earR*1.15, bodyColor, cfg.earIn);
        tail = `<path d="M${tailX*0.85},${tailY+bh*0.2} Q${tailX*1.45},${tailY+bh*0.25} ${tailX*1.55},${tailY-bh*0.15} Q${tailX*1.6},${tailY-bh*0.35} ${tailX*1.45},${tailY-bh*0.3}" stroke="${cfg.tail}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
        break;
      }

      case 1: { // 丑（うし）: 黄色い角＋グレー横耳＋ぶち＋房付き尻尾
        back = `
          <path d="M${cx-topW*0.45},${t+1} Q${cx-topW*0.65},${t-earR*1.0} ${cx-topW*0.9},${t-earR*0.75}" stroke="${cfg.horn}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
          <path d="M${cx+topW*0.45},${t+1} Q${cx+topW*0.65},${t-earR*1.0} ${cx+topW*0.9},${t-earR*0.75}" stroke="${cfg.horn}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
          ${roundEars(earLX-earR*0.3, earRX+earR*0.3, earY+earR*0.2, earR*0.9, cfg.patch, null)}`;
        front = `<path d="M${cx+topW*0.15},${t+LW*0.9} Q${cx+topW*0.9},${t+bh*0.02} ${cx+topW*0.75},${cy-bh*0.4} Q${cx+topW*0.45},${cy-bh*0.55} ${cx+topW*0.15},${t+LW*0.9} Z" fill="${cfg.patch}" opacity="0.9"/>`;
        tail = `<path d="M${tailX*0.85},${tailY} Q${tailX*1.35},${tailY-bh*0.2} ${tailX*1.25},${tailY-bh*0.65}" stroke="${cfg.patch}" stroke-width="3" fill="none" stroke-linecap="round"/>
                <ellipse cx="${tailX*1.26}" cy="${tailY-bh*0.72}" rx="4" ry="5" fill="${cfg.tuft}"/>`;
        break;
      }

      case 2: { // 寅（とら）: 額の縞＋縞尻尾（dasharrayでバンド）
        back = roundEars(earLX, earRX, earY-earR*0.2, earR*0.85, bodyColor, cfg.earIn);
        const sw = bw * 0.05;
        front = `
          <path d="M${cx},${t+bh*0.05} l0,${bh*0.18}" stroke="${cfg.stripe}" stroke-width="${sw}" stroke-linecap="round"/>
          <path d="M${cx-bw*0.17},${t+bh*0.08} l0,${bh*0.13}" stroke="${cfg.stripe}" stroke-width="${sw}" stroke-linecap="round"/>
          <path d="M${cx+bw*0.17},${t+bh*0.08} l0,${bh*0.13}" stroke="${cfg.stripe}" stroke-width="${sw}" stroke-linecap="round"/>
          <path d="M${cx-bw*0.95},${cy+bh*0.05} l${bw*0.14},0 M${cx-bw*0.93},${cy+bh*0.22} l${bw*0.12},0" stroke="${cfg.stripe}" stroke-width="${sw*0.8}" stroke-linecap="round"/>
          <path d="M${cx+bw*0.95},${cy+bh*0.05} l${-bw*0.14},0 M${cx+bw*0.93},${cy+bh*0.22} l${-bw*0.12},0" stroke="${cfg.stripe}" stroke-width="${sw*0.8}" stroke-linecap="round"/>`;
        const tailD = `M${tailX*0.85},${tailY} Q${tailX*1.35},${tailY-bh*0.25} ${tailX*1.15},${tailY-bh*0.85}`;
        tail = `<path d="${tailD}" stroke="${cfg.tail}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
                <path d="${tailD}" stroke="${cfg.tip}" stroke-width="5.5" fill="none" stroke-linecap="butt" stroke-dasharray="4.5 7"/>`;
        break;
      }

      case 3: { // 卯（うさぎ）: 長い立ち耳＋白い丸尻尾
        const ex = topW * 0.42, eyTop = t - earR * 1.45;
        back = `
          <g transform="rotate(-7 ${cx-ex} ${eyTop})">
            <ellipse cx="${cx-ex}" cy="${eyTop}" rx="${earR*0.62}" ry="${earR*1.95}" fill="${bodyColor}" ${o} ${filterAttr}/>
            <ellipse cx="${cx-ex}" cy="${eyTop+earR*0.2}" rx="${earR*0.32}" ry="${earR*1.35}" fill="${cfg.earIn}"/>
          </g>
          <g transform="rotate(7 ${cx+ex} ${eyTop})">
            <ellipse cx="${cx+ex}" cy="${eyTop}" rx="${earR*0.62}" ry="${earR*1.95}" fill="${bodyColor}" ${o} ${filterAttr}/>
            <ellipse cx="${cx+ex}" cy="${eyTop+earR*0.2}" rx="${earR*0.32}" ry="${earR*1.35}" fill="${cfg.earIn}"/>
          </g>`;
        nose = `<ellipse cx="${cx}" cy="${noseY}" rx="${bw*0.05}" ry="${bh*0.03}" fill="#e08898"/>`;
        tail = `<circle cx="${cx+botW*0.98}" cy="${cy+bh*0.6}" r="${bw*0.14}" fill="#fdf8f6" ${o2}/>`;
        break;
      }

      case 4: { // 辰（たつ）: 枝角＋頬ヒレ＋長いヒゲ＋クリーム腹（横線）＋ワニ風尻尾
        const hx = topW * 0.42;
        back = `
          <path d="M${cx-hx},${t+2} L${cx-hx-3},${t-earR*1.25} M${cx-hx-3},${t-earR*0.7} L${cx-hx-10},${t-earR*1.1}" stroke="${cfg.horn}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M${cx+hx},${t+2} L${cx+hx+3},${t-earR*1.25} M${cx+hx+3},${t-earR*0.7} L${cx+hx+10},${t-earR*1.1}" stroke="${cfg.horn}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M${cx-bw*0.8},${cy-bh*0.35} l${-bw*0.28},${-bh*0.12} l${bw*0.05},${bh*0.2} l${-bw*0.22},${-bh*0.02} l${bw*0.12},${bh*0.2} Z" fill="${cfg.fin}" ${o2} ${filterAttr}/>
          <path d="M${cx+bw*0.8},${cy-bh*0.35} l${bw*0.28},${-bh*0.12} l${-bw*0.05},${bh*0.2} l${bw*0.22},${-bh*0.02} l${-bw*0.12},${bh*0.2} Z" fill="${cfg.fin}" ${o2} ${filterAttr}/>`;
        bellyStr = `
          <path d="M${cx-bw*0.52},${cy+bh*0.98} Q${cx-bw*0.55},${cy+bh*0.1} ${cx},${cy+bh*0.08} Q${cx+bw*0.55},${cy+bh*0.1} ${cx+bw*0.52},${cy+bh*0.98} Z" fill="${cfg.belly}" ${o2}/>
          <path d="M${cx-bw*0.42},${cy+bh*0.36} h${bw*0.84} M${cx-bw*0.46},${cy+bh*0.58} h${bw*0.92} M${cx-bw*0.42},${cy+bh*0.8} h${bw*0.84}" stroke="#d8c898" stroke-width="1.8" stroke-linecap="round"/>`;
        front = `
          <path d="M${cx-bw*0.14},${noseY+bh*0.02} Q${cx-bw*0.7},${noseY+bh*0.1} ${cx-bw*1.05},${noseY-bh*0.12}" stroke="${cfg.fin}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M${cx+bw*0.14},${noseY+bh*0.02} Q${cx+bw*0.7},${noseY+bh*0.1} ${cx+bw*1.05},${noseY-bh*0.12}" stroke="${cfg.fin}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        nose = `<ellipse cx="${cx-bw*0.06}" cy="${noseY-bh*0.04}" rx="1.9" ry="1.5" fill="#5a7a52"/><ellipse cx="${cx+bw*0.06}" cy="${noseY-bh*0.04}" rx="1.9" ry="1.5" fill="#5a7a52"/>`;
        tail = `<path d="M${tailX*0.85},${tailY} Q${tailX*1.3},${tailY-bh*0.28} ${tailX*1.14},${tailY-bh*0.75}" stroke="${cfg.fin}" stroke-width="5" fill="none" stroke-linecap="round"/>
                <path d="M${tailX*1.14},${tailY-bh*0.75} l-5,-4 l7.5,-2 Z" fill="${cfg.fin}"/>`;
        break;
      }

      case 5: { // 巳（へび）: 手足なし・クリーム腹（横線）・とぐろ尻尾・ちろっと舌
        limbs = '';
        bellyStr = `
          <path d="M${cx-bw*0.5},${cy+bh*0.98} Q${cx-bw*0.53},${cy+bh*0.12} ${cx},${cy+bh*0.1} Q${cx+bw*0.53},${cy+bh*0.12} ${cx+bw*0.5},${cy+bh*0.98} Z" fill="${cfg.belly}" ${o2}/>
          <path d="M${cx-bw*0.4},${cy+bh*0.38} h${bw*0.8} M${cx-bw*0.44},${cy+bh*0.6} h${bw*0.88} M${cx-bw*0.4},${cy+bh*0.82} h${bw*0.8}" stroke="#d8c898" stroke-width="1.8" stroke-linecap="round"/>`;
        nose = `<ellipse cx="${cx-bw*0.05}" cy="${noseY-bh*0.04}" rx="1.7" ry="1.4" fill="#5a7a52"/><ellipse cx="${cx+bw*0.05}" cy="${noseY-bh*0.04}" rx="1.7" ry="1.4" fill="#5a7a52"/>`;
        front = `<path d="M${cx-bw*0.72},${cy+bh*0.1} q-6,1 -9,-2 m9,2 q-5,3 -9,2" stroke="#e05548" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
        tail = `<path d="M${cx+botW*0.35},${b-1} Q${cx+botW*1.4},${b-bh*0.02} ${cx+botW*1.2},${b-bh*0.5} Q${cx+botW*1.05},${b-bh*0.88} ${cx+botW*0.78},${b-bh*0.62}" stroke="${bodyColor}" stroke-width="8" fill="none" stroke-linecap="round" ${filterAttr}/>
                <path d="M${cx+botW*0.35},${b-1} Q${cx+botW*1.4},${b-bh*0.02} ${cx+botW*1.2},${b-bh*0.5} Q${cx+botW*1.05},${b-bh*0.88} ${cx+botW*0.78},${b-bh*0.62}" stroke="${line}" stroke-width="${LW}" fill="none" stroke-linecap="round" opacity="0.5"/>`;
        break;
      }

      case 6: { // 午（うま）: 三角耳＋たてがみ＋大きな鼻先＋ふさ尻尾
        back = triEar(earLX, earY-earR*0.7, earR*0.85, -18, bodyColor, cfg.muzzle)
             + triEar(earRX, earY-earR*0.7, earR*0.85, 18, bodyColor, cfg.muzzle);
        front = `
          <path d="M${cx-bw*0.3},${t+bh*0.16} Q${cx-bw*0.12},${t-bh*0.14} ${cx+bw*0.05},${t+bh*0.02} Q${cx+bw*0.28},${t-bh*0.1} ${cx+bw*0.32},${t+bh*0.16} Q${cx},${t+bh*0.28} ${cx-bw*0.3},${t+bh*0.16} Z" fill="${cfg.mane}" ${o2} ${filterAttr}/>
          <ellipse cx="${cx}" cy="${cy+bh*0.3}" rx="${bw*0.36}" ry="${bh*0.24}" fill="${cfg.muzzle}" ${o2}/>`;
        nose = `<ellipse cx="${cx-bw*0.13}" cy="${cy+bh*0.26}" rx="2.1" ry="1.7" fill="#6a4a3a"/><ellipse cx="${cx+bw*0.13}" cy="${cy+bh*0.26}" rx="2.1" ry="1.7" fill="#6a4a3a"/>`;
        tail = `<path d="M${tailX*0.88},${tailY} Q${tailX*1.35},${tailY-bh*0.1} ${tailX*1.28},${tailY-bh*0.68}" stroke="${cfg.mane}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
        break;
      }

      case 7: { // 未（ひつじ）: もこもこ輪郭＋渦巻き角
        // もこもこ: 上半身の輪郭に沿って毛玉circleを背面に並べる（topW〜bwに追従）
        let wool = '';
        const bumps = 7;
        for (let k = 0; k < bumps; k++) {
          const a = (-80 + 160 * k / (bumps - 1)) * Math.PI / 180; // -80°..80°（上半分）
          const w = topW + (bw - topW) * Math.abs(Math.sin(a));
          const px = cx + Math.sin(a) * w * 0.98;
          const py = cy - Math.cos(a) * bh * 0.98;
          wool += `<circle cx="${px}" cy="${py}" r="${bw*0.17}" fill="${bodyColor}" ${o2} ${filterAttr}/>`;
        }
        back = `
          ${wool}
          <circle cx="${cx-topW*1.0}" cy="${cy-bh*0.5}" r="${earR*0.62}" fill="none" stroke="${cfg.horn}" stroke-width="5"/>
          <circle cx="${cx+topW*1.0}" cy="${cy-bh*0.5}" r="${earR*0.62}" fill="none" stroke="${cfg.horn}" stroke-width="5"/>`;
        tail = `<circle cx="${cx+botW*0.95}" cy="${cy+bh*0.6}" r="${bw*0.11}" fill="${bodyColor}" ${o2}/>`;
        break;
      }

      case 8: { // 申（さる）: 丸耳（内=肌色）＋顔の肌色パッチ＋くるん尻尾
        back = roundEars(earLX-earR*0.2, earRX+earR*0.2, earY, earR*0.95, bodyColor, cfg.face);
        front = `
          <path d="M${cx-bw*0.44},${cy-bh*0.18} Q${cx-bw*0.44},${cy-bh*0.48} ${cx-bw*0.16},${cy-bh*0.42} Q${cx},${cy-bh*0.38} ${cx+bw*0.16},${cy-bh*0.42} Q${cx+bw*0.44},${cy-bh*0.48} ${cx+bw*0.44},${cy-bh*0.18} Q${cx+bw*0.46},${cy+bh*0.3} ${cx},${cy+bh*0.38} Q${cx-bw*0.46},${cy+bh*0.3} ${cx-bw*0.44},${cy-bh*0.18} Z" fill="${cfg.face}" ${o2}/>`;
        tail = `<path d="M${tailX*0.85},${tailY} Q${tailX*1.42},${tailY-bh*0.05} ${tailX*1.32},${tailY-bh*0.5} Q${tailX*1.24},${tailY-bh*0.82} ${tailX*1.02},${tailY-bh*0.62}" stroke="${dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
        break;
      }

      case 9: { // 酉（にわとり）: 赤いトサカ＋黄色いくちばし＋肉垂＋黄色い足
        back = `
          <circle cx="${cx}" cy="${t-bh*0.08}" r="${bw*0.115}" fill="${cfg.comb}" ${o2}/>
          <circle cx="${cx-bw*0.19}" cy="${t-bh*0.0}" r="${bw*0.095}" fill="${cfg.comb}" ${o2}/>
          <circle cx="${cx+bw*0.19}" cy="${t-bh*0.0}" r="${bw*0.095}" fill="${cfg.comb}" ${o2}/>`;
        nose = `
          <path d="M${cx-bw*0.1},${noseY-bh*0.03} L${cx},${noseY-bh*0.09} L${cx+bw*0.1},${noseY-bh*0.03} L${cx},${noseY+bh*0.04} Z" fill="${cfg.beak}" ${o2}/>
          <ellipse cx="${cx}" cy="${noseY+bh*0.12}" rx="${bw*0.05}" ry="${bh*0.055}" fill="${cfg.comb}"/>`;
        limbs = handsFeet(bodyColor, cfg.feet);
        break;
      }

      case 10: { // 戌（いぬ・柴犬）: 三角耳（ピンク内）＋白い頬・鼻先＋黒鼻＋くるん尻尾
        back = triEar(earLX, earY-earR*0.85, earR*1.0, -14, bodyColor, cfg.earIn)
             + triEar(earRX, earY-earR*0.85, earR*1.0, 14, bodyColor, cfg.earIn)
             + `<circle cx="${cx+botW*0.9}" cy="${cy-bh*0.18}" r="${bw*0.13}" fill="none" stroke="${dark}" stroke-width="5"/>`;
        front = `<path d="M${cx-bw*0.4},${cy+bh*0.06} Q${cx-bw*0.44},${cy+bh*0.55} ${cx},${cy+bh*0.55} Q${cx+bw*0.44},${cy+bh*0.55} ${cx+bw*0.4},${cy+bh*0.06} Q${cx},${cy+bh*0.28} ${cx-bw*0.4},${cy+bh*0.06} Z" fill="${cfg.muzzle}"/>`;
        nose = `<ellipse cx="${cx}" cy="${noseY-bh*0.01}" rx="${bw*0.06}" ry="${bh*0.042}" fill="#4a3c30"/>`;
        tail = '';
        break;
      }

      case 11: { // 亥（いのしし）: 小さめ三角耳＋大きな豚鼻＋牙＋ちょろ尻尾
        back = triEar(earLX*0.95, earY-earR*0.6, earR*0.8, -24, bodyColor, cfg.snout)
             + triEar(earRX*0.95, earY-earR*0.6, earR*0.8, 24, bodyColor, cfg.snout);
        nose = `
          <ellipse cx="${cx}" cy="${noseY}" rx="${bw*0.17}" ry="${bh*0.105}" fill="${cfg.snout}" ${o2}/>
          <ellipse cx="${cx-bw*0.06}" cy="${noseY}" rx="1.8" ry="2.4" fill="#8f5f57"/>
          <ellipse cx="${cx+bw*0.06}" cy="${noseY}" rx="1.8" ry="2.4" fill="#8f5f57"/>
          <path d="M${cx-bw*0.26},${noseY+bh*0.1} l-4,-7 l7,2.5 Z" fill="${cfg.tusk}" ${o2}/>
          <path d="M${cx+bw*0.26},${noseY+bh*0.1} l4,-7 l-7,2.5 Z" fill="${cfg.tusk}" ${o2}/>`;
        tail = `<path d="M${tailX*0.88},${tailY} q7,-4 5,-10 q-2,-5 2,-8" stroke="${dark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
        break;
      }
    }

    return `
    <defs>${filterStr}</defs>
    <g transform="scale(${scale})">
      ${halo}
      ${back}
      <g fill="${bodyColor}" ${o} ${filterAttr}>${bodyPath(cornerR)}</g>
      ${bellyStr}
      ${front}
      ${eyes}
      ${nose}
      ${mouth}
      ${limbs}
      ${tail}
    </g>`;
  }

  return { charaSVG, CFG };
});
