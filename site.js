(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const eur = (v) => '€' + Math.round(v).toLocaleString('en-US');
  const NS = 'http://www.w3.org/2000/svg';

  /* Land mask from the demo: 144 x 60 grid, 4 cells per hex digit */
  const MASK = '000003c034003fff00000006007ff80080008040007c6fe01ffe000000061dfffff7f80007ffffd43b381ff80001fe05ebfffffffffff3fffffffc3e1fc04007fd3fffffffffffff00fffffff51c1f00800f7ffffffffffffffe03ffffffc0600e00003e7ffffffffffffef801e07fffe07e0000003e7fffffffffff808000801ffff87e00000214fffffffffffe038000000ffffeff80000d1fffffffffffff0300000007ffffffc00003ffffffffffffff0000000003fffff4e00003ffffffffffffff0000000003fffffc000001fff5f7fffffffe0000000003fffff0000001ebe0effffffffc4000000003ffffe000000f86f6f3fffffff08000000001ffffc000000f029ff3fffffe208000000001ffffc0000000f007ffffffff1300000000007fff80000007f003ffffffff0400000000005ffe0000000ffeebffffffff8000000000003fc10000000fffffefffffff8000000000000f810000003ffffdf3ffffff00000000000007800000003ffffdfe1ffffe80000000000003880000007ffffeff0fe7e000000000000003d81800003ffffefe07c3d000000000000000780000007fffff780781e0800000000000000e0000007fffffe00301f0c0000000000000002800003fffff9003016000000000000000017f00001ffffff000010020000000000000007f80000fbffff000808000000000000000007ff000000fffe00001860000000000000000fff000000fffc00000ce0000000000000000fffc00000fff800000ce8c00000000000000ffff80000fff0000004083c0000000000000ffffc00007ff0000002001e0000000000000ffffc00007ff00000001a0800000000000007fff800007ff0000000000000000000000007fff000007ff100000000c000000000000001fff000007ff300000007e400000000000000fff000007fc300000007fe00000000000000fff000007fc60000003fff00000000000000ffc000003fc60000007fff00000000000000ff8000003f800000007fff80000000000001ff0000001f800000003fff80000000000001ff0000001f000000003fff80000000000001fe0000001c000000003c3f80000000000001f80000000000000000000f00000000000001f00000000000000000000200200000000003c00000000000000000000200400000000001c00000000000000000000000800000000003800000000000000000000001000000000003800000000000000000000000000000000003080000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000200000000000600004400000000000000000400000000047ff1fffffff80000000000003e000005ffffffe7fffffffff000000101ffbf00007fffffffffffffffffe0';

  /* Example catalogue, from the demo (illustrative estimates from Prague, EUR) */
  const PLACES = {
    santorini: { name: 'Oia, Santorini', short: 'Oia', country: 'Greece', lat: 36.46, lng: 25.38, fl: 260, stay: [70, 140, 260], day: [40, 70, 120], cats: ['islands'] },
    machu: { name: 'Machu Picchu', short: 'Machu Picchu', country: 'Peru', lat: -13.16, lng: -72.54, fl: 1100, stay: [40, 90, 250], day: [40, 70, 130], cats: ['nature', 'adventure', 'culture'] },
    inari: { name: 'Fushimi Inari, Kyoto', short: 'Fushimi Inari', country: 'Japan', lat: 34.97, lng: 135.77, fl: 850, stay: [45, 110, 260], day: [45, 75, 140], cats: ['culture', 'nature'] },
    burj: { name: 'Burj Khalifa, Dubai', short: 'Burj Khalifa', country: 'UAE', lat: 25.2, lng: 55.27, fl: 380, stay: [60, 150, 350], day: [50, 90, 180], cats: ['cities'] },
    taj: { name: 'Taj Mahal, Agra', short: 'Taj Mahal', country: 'India', lat: 27.18, lng: 78.04, fl: 520, stay: [25, 70, 200], day: [25, 45, 100], cats: ['culture'] },
    plitvice: { name: 'Plitvice Lakes', short: 'Plitvice Lakes', country: 'Croatia', lat: 44.87, lng: 15.58, fl: 90, stay: [45, 100, 180], day: [30, 55, 95], cats: ['nature', 'adventure'] },
    sagrada: { name: 'Sagrada Família, Barcelona', short: 'Sagrada Família', country: 'Spain', lat: 41.4, lng: 2.17, fl: 140, stay: [55, 110, 220], day: [35, 60, 110], cats: ['cities', 'culture'] },
    szechenyi: { name: 'Széchenyi Baths, Budapest', short: 'Széchenyi Baths', country: 'Hungary', lat: 47.52, lng: 19.08, fl: 40, stay: [35, 75, 160], day: [25, 45, 90], cats: ['cities', 'wellness'] },
    europa: { name: 'Europa-Park', short: 'Europa-Park', country: 'Germany', lat: 48.27, lng: 7.72, fl: 110, stay: [60, 150, 260], day: [75, 95, 140], cats: [] },
    disney: { name: 'Disneyland Paris', short: 'Disneyland Paris', country: 'France', lat: 48.87, lng: 2.78, fl: 150, stay: [80, 160, 320], day: [90, 120, 170], cats: [] },
    rijks: { name: 'Rijksmuseum, Amsterdam', short: 'Rijksmuseum', country: 'Netherlands', lat: 52.36, lng: 4.89, fl: 130, stay: [75, 150, 290], day: [45, 75, 130], cats: [] },
    colosseum: { name: 'Colosseum, Rome', short: 'Colosseum', country: 'Italy', lat: 41.89, lng: 12.49, fl: 120, stay: [55, 115, 230], day: [35, 60, 110], cats: [] }
  };
  const SHOWN = ['santorini', 'machu', 'inari', 'burj', 'taj', 'plitvice', 'sagrada', 'szechenyi'];
  const PROFILES = [
    { name: 'Student', tier: 0, flight: 0.7, stay: 0.45, day: 0.7, personal: 10, blurb: 'Hostel dorms, cheapest transport, street food and free sights.' },
    { name: 'Budget', tier: 0, flight: 1, stay: 1, day: 1, personal: 0, blurb: 'Affordable, practical rooms and simple meals.' },
    { name: 'Standard', tier: 1, flight: 1.25, stay: 1, day: 1, personal: 0, blurb: 'Balanced comfort and value: 3-star stays, regular meals.', tag: 'Balanced' },
    { name: 'Comfort+', tier: 2, flight: 2, stay: 1, day: 1, personal: 0, blurb: 'Premium stays, flexible fares and paid experiences.' }
  ];
  function estimate(k, pr, nights) {
    const p = PLACES[k], days = nights + 1;
    const transport = Math.round(p.fl * pr.flight);
    const stay = Math.round(p.stay[pr.tier] * pr.stay * nights);
    const daily = Math.round(p.day[pr.tier] * pr.day * days);
    const personal = Math.round(pr.personal * days);
    const tax = Math.round((transport + stay + daily + personal) * 0.08);
    return { transport, stay, daily, personal, tax, total: transport + stay + daily + personal + tax };
  }

  /* ---------- illustrated scenes (viewBox 300 x 330) ---------- */
  const svgWrap = (inner, defs) => '<svg viewBox="0 0 300 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + (defs ? '<defs>' + defs + '</defs>' : '') + inner + '</svg>';
  const grad = (id, stops) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' + stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>').join('') + '</linearGradient>';
  const SCENES = {
    santorini: () => '<svg viewBox="0 0 300 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#santorini" width="300" height="330"/></svg>',
    machu: () => svgWrap(
      '<rect width="300" height="330" fill="url(#g-machu)"/><circle cx="220" cy="92" r="26" fill="#FFF3CF" opacity=".9"/>' +
      '<g fill="#fff" opacity=".85"><ellipse cx="70" cy="86" rx="46" ry="10"/><ellipse cx="108" cy="78" rx="30" ry="9"/><ellipse cx="240" cy="150" rx="40" ry="8"/></g>' +
      '<path d="M0 190 L50 140 L95 175 L150 120 L210 178 L260 138 L300 170 V330 H0Z" fill="#8DB5A6"/>' +
      '<path d="M120 330 L170 150 L196 60 L214 150 L270 330Z" fill="#3F7261"/><path d="M196 60 L214 150 L240 250 L206 160Z" fill="#2F5B4B" opacity=".55"/>' +
      '<path d="M0 250 Q90 215 170 240 T300 225 V330 H0Z" fill="#5E9477"/>' +
      '<g fill="#D8D0B4"><rect x="86" y="236" width="70" height="9" rx="2"/><rect x="74" y="246" width="94" height="9" rx="2"/><rect x="60" y="256" width="120" height="9" rx="2"/><rect x="102" y="224" width="26" height="12" rx="2"/><rect x="132" y="228" width="18" height="8" rx="2"/></g>' +
      '<path d="M0 285 Q100 262 190 282 T300 270 V330 H0Z" fill="#2F5B4B"/>',
      grad('g-machu', [[0, '#9ED4E6'], [0.7, '#F7E6C6'], [1, '#FBE9D0']])),
    inari: () => {
      let g = '<rect width="300" height="330" fill="url(#g-inari)"/><circle cx="150" cy="120" r="48" fill="#FFD9A0" opacity=".8"/><path d="M0 170 Q70 130 150 160 T300 140 V330 H0Z" fill="#4A2133"/><path d="M138 330 L146 175 H154 L162 330Z" fill="#6B3042"/>';
      for (let i = 7; i >= 0; i--) {
        const s = Math.pow(0.8, i), h = 215 * s, w = 130 * s, bottom = 330 - (1 - s) * 120 - 4, top = bottom - h, cx = 150;
        g += '<g fill="' + (i > 3 ? '#C23A2E' : '#E0452F') + '"><rect x="' + (cx - w / 2 - 14 * s) + '" y="' + top + '" width="' + (w + 28 * s) + '" height="' + 15 * s + '" rx="' + 3 * s + '"/><rect x="' + (cx - w / 2 + 4 * s) + '" y="' + (top + 34 * s) + '" width="' + (w - 8 * s) + '" height="' + 10 * s + '"/><rect x="' + (cx - w / 2) + '" y="' + top + '" width="' + 17 * s + '" height="' + h + '"/><rect x="' + (cx + w / 2 - 17 * s) + '" y="' + top + '" width="' + 17 * s + '" height="' + h + '"/></g><rect x="' + (cx - w / 2 - 14 * s) + '" y="' + top + '" width="' + (w + 28 * s) + '" height="' + 4 * s + '" fill="#2A1620"/>';
      }
      return svgWrap(g, grad('g-inari', [[0, '#3D5A80'], [0.45, '#EE8C5E'], [1, '#F7C873']]));
    },
    burj: () => svgWrap(
      '<rect width="300" height="330" fill="url(#g-burj)"/><circle cx="215" cy="190" r="34" fill="#FFE2A0"/>' +
      '<g fill="#12233F"><rect x="10" y="230" width="30" height="100"/><rect x="44" y="205" width="26" height="125"/><rect x="74" y="245" width="34" height="85"/><rect x="190" y="220" width="30" height="110"/><rect x="224" y="196" width="28" height="134"/><rect x="256" y="238" width="44" height="92"/></g>' +
      '<path d="M146 40 L150 8 L154 40 L160 90 L168 150 L180 330 H120 L132 150 L140 90Z" fill="#0E1C36"/><path d="M150 8 L154 40 L160 90 L168 150 L180 330 H150Z" fill="#1B3358"/>' +
      '<g fill="#F7C873" opacity=".85"><rect x="15" y="240" width="4" height="4"/><rect x="24" y="256" width="4" height="4"/><rect x="50" y="222" width="4" height="4"/><rect x="58" y="244" width="4" height="4"/><rect x="198" y="236" width="4" height="4"/><rect x="232" y="214" width="4" height="4"/><rect x="238" y="240" width="4" height="4"/><rect x="266" y="256" width="4" height="4"/></g>' +
      '<rect y="290" width="300" height="40" fill="#0B1A33"/><path d="M0 306 H300 M0 318 H300" stroke="#F7C873" stroke-opacity=".25"/>',
      grad('g-burj', [[0, '#1B2A49'], [0.55, '#E86A48'], [0.85, '#F7C873']])),
    taj: () => svgWrap(
      '<rect width="300" height="330" fill="url(#g-taj)"/><circle cx="60" cy="80" r="22" fill="#FFF1D6" opacity=".9"/>' +
      '<g fill="#FBFBF8"><rect x="86" y="150" width="14" height="96"/><rect x="200" y="150" width="14" height="96"/><rect x="40" y="188" width="12" height="58"/><rect x="248" y="188" width="12" height="58"/><rect x="104" y="196" width="92" height="50"/><circle cx="150" cy="170" r="38"/><rect x="146" y="116" width="8" height="18"/><circle cx="93" cy="146" r="9"/><circle cx="207" cy="146" r="9"/><circle cx="46" cy="184" r="7"/><circle cx="254" cy="184" r="7"/></g>' +
      '<path d="M134 246 V220 a16 16 0 0 1 32 0 V246Z" fill="#C9D6D6"/><rect x="0" y="246" width="300" height="12" fill="#E7D9C8"/>' +
      '<rect y="258" width="300" height="72" fill="#8EC9D4"/><g fill="#FBFBF8" opacity=".35"><circle cx="150" cy="320" r="38"/><rect x="104" y="268" width="92" height="30"/></g>' +
      '<g fill="#3F7261"><ellipse cx="20" cy="240" rx="9" ry="30"/><ellipse cx="280" cy="240" rx="9" ry="30"/></g>',
      grad('g-taj', [[0, '#F6B8A3'], [0.8, '#FBE3CC'], [1, '#FBEBD0']])),
    plitvice: () => svgWrap(
      '<rect width="300" height="330" fill="url(#g-plit)"/>' +
      '<path d="M0 150 Q60 100 130 140 T300 120 V330 H0Z" fill="#4E8A5E"/><path d="M0 190 Q90 150 170 185 T300 170 V330 H0Z" fill="#2F6B49"/>' +
      '<rect x="40" y="200" width="150" height="34" rx="16" fill="#35BDB5"/><rect x="120" y="244" width="150" height="34" rx="16" fill="#4FD3C6"/><rect x="30" y="288" width="190" height="44" rx="18" fill="#2AA8AE"/>' +
      '<g fill="#fff" opacity=".9"><rect x="150" y="216" width="8" height="30" rx="3"/><rect x="164" y="218" width="5" height="28" rx="2"/><rect x="100" y="258" width="8" height="32" rx="3"/><rect x="224" y="258" width="6" height="30" rx="2"/></g>' +
      '<g fill="#1F4E36"><path d="M0 330 V250 l16 -42 16 42 V330Z"/><path d="M262 330 V240 l18 -46 20 46 V330Z"/><path d="M236 330 V270 l12 -30 12 30 V330Z"/></g>',
      grad('g-plit', [[0, '#BFEAE0'], [1, '#EAF8EF']])),
    sagrada: () => {
      let st = '';
      [[30, 40], [80, 90], [250, 60], [270, 120], [210, 30], [120, 24], [180, 70]].forEach((p) => { st += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.8" fill="#fff" opacity=".8"/>'; });
      const spire = (x, top, w) => '<path d="M' + (x - w / 2) + ' 280 L' + (x - w / 2 + 2) + ' ' + (top + 40) + ' L' + x + ' ' + top + ' L' + (x + w / 2 - 2) + ' ' + (top + 40) + ' L' + (x + w / 2) + ' 280Z" fill="#E9B44C"/><path d="M' + x + ' ' + top + ' L' + (x + w / 2 - 2) + ' ' + (top + 40) + ' L' + (x + w / 2) + ' 280 H' + x + 'Z" fill="#C98F2A" opacity=".6"/><circle cx="' + x + '" cy="' + (top - 4) + '" r="5" fill="#F2603F"/>';
      return svgWrap('<rect width="300" height="330" fill="url(#g-sag)"/><circle cx="238" cy="70" r="20" fill="#FFF3CF"/>' + st +
        spire(70, 120, 34) + spire(112, 70, 34) + spire(188, 70, 34) + spire(230, 120, 34) + spire(150, 30, 40) +
        '<rect x="40" y="270" width="220" height="60" fill="#B9822A"/><g fill="#7B531A"><rect x="64" y="284" width="16" height="30" rx="8"/><rect x="104" y="284" width="16" height="30" rx="8"/><rect x="142" y="280" width="16" height="34" rx="8"/><rect x="180" y="284" width="16" height="30" rx="8"/><rect x="220" y="284" width="16" height="30" rx="8"/></g>',
        grad('g-sag', [[0, '#14213D'], [1, '#3D5A80']]));
    },
    szechenyi: () => svgWrap(
      '<rect width="300" height="330" fill="url(#g-sz)"/>' +
      '<rect x="30" y="140" width="240" height="120" fill="#F6C945"/><rect x="110" y="110" width="80" height="150" fill="#F2BC2C"/><path d="M120 110 a30 30 0 0 1 60 0Z" fill="#5FA391"/><rect x="146" y="64" width="8" height="18" fill="#5FA391"/>' +
      '<path d="M60 140 a24 24 0 0 1 48 0Z M192 140 a24 24 0 0 1 48 0Z" fill="#5FA391"/>' +
      '<g fill="#B88A12"><rect x="50" y="170" width="12" height="22" rx="6"/><rect x="78" y="170" width="12" height="22" rx="6"/><rect x="210" y="170" width="12" height="22" rx="6"/><rect x="238" y="170" width="12" height="22" rx="6"/><rect x="126" y="150" width="12" height="26" rx="6"/><rect x="162" y="150" width="12" height="26" rx="6"/><rect x="144" y="200" width="14" height="60" rx="7"/></g>' +
      '<rect y="258" width="300" height="72" fill="#5CC8D6"/><path d="M0 280 Q40 270 80 280 T160 280 T240 280 T300 280 M0 304 Q40 294 80 304 T160 304 T240 304 T300 304" stroke="#fff" stroke-opacity=".5" fill="none" stroke-width="3"/>' +
      '<g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"><path d="M70 250 q-12 -18 0 -36 q12 -18 0 -36"/><path d="M230 250 q-12 -18 0 -36 q12 -18 0 -36"/></g>',
      grad('g-sz', [[0, '#CFEAF0'], [1, '#FFF5DF']]))
  };

  /* ---------- dotted map ---------- */
  const xy = (p) => [(p.lng + 180) / 2.5, (75 - p.lat) / 2.5];
  function dotsMarkup() {
    let i = 0, h = '';
    for (let r = 0; r < 60; r++) for (let c = 0; c < 144; c += 4) {
      const n = parseInt(MASK[i++], 16);
      for (let b = 0; b < 4; b++) if (n & (8 >> b)) h += '<circle class="dot" cx="' + (c + b + 0.5) + '" cy="' + (r + 0.5) + '" r=".38"/>';
    }
    return h;
  }
  const DOTS = dotsMarkup();
  function pin(k, s, color, label, extra, fs, left) {
    const p = xy(PLACES[k]), x = p[0], y = p[1];
    const text = label ? '<text x="' + (left ? x - s * 1.5 : x + s * 1.5) + '" y="' + (y - s * 0.7) + '"' + (left ? ' text-anchor="end"' : '') + (fs ? ' style="font-size:' + fs + 'px;stroke-width:' + fs * 0.24 + 'px"' : '') + '>' + PLACES[k].short.replace('Disneyland ', 'Disney ').replace('Széchenyi Baths', 'Széchenyi') + '</text>' : '';
    return '<g class="pin' + (extra || '') + '" data-k="' + k + '"><path d="M' + (x - s * 0.7) + ' ' + (y - s * 0.8) + 'L' + x + ' ' + y + 'L' + (x + s * 0.7) + ' ' + (y - s * 0.8) + 'Z" fill="' + color + '"/><circle cx="' + x + '" cy="' + (y - s * 1.2) + '" r="' + s + '" fill="' + color + '" stroke="#fff" stroke-width="' + s * 0.2 + '"/>' + text + '</g>';
  }
  const GRAD_KEYS = ['sagrada', 'disney', 'rijks', 'szechenyi', 'colosseum'];
  const BUCKET = ['machu', 'inari', 'burj', 'taj', 'plitvice', 'europa'];

  function initMiniMaps() {
    $$('svg[data-map]').forEach((svg) => {
      const vb = svg.getAttribute('viewBox').split(' ').map(Number), s = Math.max(vb[2] / 38, 0.85);
      let pins = '';
      if (svg.dataset.pins === 'grad') pins = GRAD_KEYS.map((k) => pin(k, s, '#1E9C8E')).join('') + pin('santorini', s, '#F2603F');
      if (svg.dataset.pin) pins = pin(svg.dataset.pin, s, '#F2603F');
      svg.innerHTML = DOTS.replace(/class="dot"/g, 'fill="#BFD7D3"') + pins;
    });
  }

  function initBigMap() {
    const svg = $('#bigmap'), box = $('#mapbig'), list = $('#maplist');
    const all = Object.keys(PLACES);
    const EUROPE = ['sagrada', 'disney', 'rijks', 'szechenyi', 'colosseum', 'europa', 'plitvice', 'santorini'];
    const VBS = { all: [0, -4, 144, 68], grad: [58, 3, 28, 14.5], bucket: [0, -4, 144, 68] };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const std = PROFILES[2];
    let vb = VBS.all.slice(), current = 'all', raf = 0;

    function draw() {
      const set = current === 'grad' ? GRAD_KEYS : current === 'bucket' ? BUCKET : all;
      const s = vb[2] / 70, zoomed = vb[2] < 100, fs = zoomed ? 0.54 : 2.5;
      const pins = set.map((k) => pin(k, s, BUCKET.includes(k) ? '#F7C873' : '#3CC4B3', current === 'grad' || !EUROPE.includes(k), '', fs, k === 'sagrada' || (!zoomed && k === 'burj'))).join('');
      svg.setAttribute('viewBox', vb.join(' '));
      svg.innerHTML = DOTS + '<g>' + pins + '</g>';
      $$('.pin', svg).forEach((g) => { g.style.transitionDelay = '0ms'; });
    }
    function renderList() {
      const set = current === 'grad' ? GRAD_KEYS : current === 'bucket' ? BUCKET : all;
      list.innerHTML = '<h3 style="color:inherit;font-size:18px;margin-bottom:6px">' + (current === 'grad' ? 'Grad Trip' : current === 'bucket' ? 'Bucket list' : 'All saves') + '</h3><p style="opacity:.7;font-size:13px;margin-bottom:10px">4 nights, Standard, estimated</p>' +
        set.map((k) => '<div class="mli" data-k="' + k + '"><i style="background:' + (BUCKET.includes(k) ? '#F7C873' : '#3CC4B3') + '"></i><span>' + PLACES[k].short + '<small>' + PLACES[k].country + '</small></span><b>' + eur(estimate(k, std, 4).total) + '</b></div>').join('');
    }
    function go(next) {
      current = next;
      renderList();
      const to = VBS[next].slice(), from = vb.slice();
      cancelAnimationFrame(raf);
      if (reduce) { vb = to; draw(); return; }
      const t0 = performance.now(), ms = 800;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        vb = from.map((v, i) => v + (to[i] - v) * e);
        draw();
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    $$('#colls .chip').forEach((b) => b.addEventListener('click', () => {
      $$('#colls .chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
      go(b.dataset.c);
    }));
    list.addEventListener('mouseover', (e) => {
      const row = e.target.closest('.mli'); if (!row) return;
      $$('.pin', svg).forEach((g) => g.classList.toggle('hl', g.dataset.k === row.dataset.k));
    });
    list.addEventListener('mouseleave', () => $$('.pin', svg).forEach((g) => g.classList.remove('hl')));
    draw(); renderList();
    return box;
  }

  /* ---------- destinations ---------- */
  function initDestinations() {
    const cats = [['all', 'All'], ['islands', 'Islands'], ['cities', 'Cities'], ['nature', 'Nature'], ['culture', 'Culture'], ['adventure', 'Adventure'], ['wellness', 'Wellness']];
    const grid = $('#dgrid'), bar = $('#dfilters');
    const std = PROFILES[2];
    grid.innerHTML = SHOWN.map((k) => {
      const p = PLACES[k], e = estimate(k, std, 4);
      return '<article class="dest rv" data-cats="' + p.cats.join(' ') + '"><div class="pic">' + SCENES[k]() + '<div class="nm"><b>' + p.short + '</b><span>' + p.country + '</span></div></div>' +
        '<div class="bt"><div><small>4 nights, Standard</small><b>' + eur(e.total) + '</b> <span class="est" style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;background:var(--soft);color:var(--muted);border-radius:4px;padding:1px 5px;font-weight:700">est</span></div><span aria-hidden="true" style="color:var(--coral);font-weight:700">View ›</span></div>' +
        '<a class="cover" href="demo.html" aria-label="' + p.name + ', ' + p.country + '"></a>' +
        '<button class="heart" type="button" aria-pressed="false" aria-label="Save ' + p.short + '"><svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#i-heart"/></svg></button></article>';
    }).join('');
    bar.innerHTML = cats.map((c, i) => '<button type="button" class="chip" aria-pressed="' + (i === 0) + '" data-c="' + c[0] + '">' + c[1] + '</button>').join('');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', bar).forEach((x) => x.setAttribute('aria-pressed', x === b));
      $$('.dest', grid).forEach((d) => { d.hidden = !(b.dataset.c === 'all' || d.dataset.cats.split(' ').includes(b.dataset.c)); });
    });
    grid.addEventListener('click', (e) => {
      const h = e.target.closest('.heart'); if (!h) return;
      h.setAttribute('aria-pressed', h.getAttribute('aria-pressed') !== 'true');
    });
  }

  /* ---------- profiles ---------- */
  function initProfiles() {
    const sel = $('#pdest'), nights = $('#pn'), grid = $('#pgrid');
    sel.innerHTML = SHOWN.map((k) => '<option value="' + k + '">' + PLACES[k].name + '</option>').join('');
    function render() {
      const k = sel.value, n = +nights.value;
      const es = PROFILES.map((p) => estimate(k, p, n)), max = Math.max.apply(null, es.map((e) => e.total));
      grid.innerHTML = PROFILES.map((p, i) => {
        const e = es[i];
        return '<article class="pc' + (p.tag ? ' pop' : '') + '">' + (p.tag ? '<span class="tag">' + p.tag + '</span>' : '') + '<h3>' + p.name + '</h3><div class="ps">' + eur(e.total) + '</div>' +
          '<div class="bar"><i style="width:' + Math.round(e.total / max * 100) + '%"></i></div><p>' + p.blurb + '</p><ul>' +
          '<li>Transport <b>' + eur(e.transport) + '</b></li><li>Accommodation <b>' + eur(e.stay) + '</b></li><li>Food, local travel, activities <b>' + eur(e.daily) + '</b></li>' +
          (e.personal ? '<li>Personal spending <b>' + eur(e.personal) + '</b></li>' : '') + '<li>Taxes and extras <b>' + eur(e.tax) + '</b></li></ul></article>';
      }).join('');
    }
    sel.addEventListener('change', render); nights.addEventListener('change', render); render();
  }

  /* ---------- holiday form ---------- */
  function initForm() {
    const budget = $('#hb'), out = $('#hbo'), mode = $('#hmode');
    const modeLabel = () => { const group = mode.children[1].getAttribute('aria-pressed') === 'true'; $('label[for=hb]').firstChild.textContent = group ? 'Total group budget ' : 'Budget per person '; budget.max = group ? 10000 : 2500; out.textContent = eur(budget.value); };
    budget.addEventListener('input', () => { out.textContent = eur(budget.value); });
    [mode, $('#hprof')].forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      Array.from(g.children).forEach((x) => x.setAttribute('aria-pressed', x === b));
      if (g === mode) modeLabel();
    }));
    $$('.chips', $('#hform')).forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
    }));
    $$('.levels button').forEach((b) => b.addEventListener('click', () => {
      const l = +b.dataset.level;
      $$('.levels button').forEach((x) => x.setAttribute('aria-selected', x === b));
      $('#ex1').classList.toggle('show', l >= 1); $('#ex2').classList.toggle('show', l >= 2);
    }));
  }

  /* ---------- chrome ---------- */
  function initChrome() {
    const nav = $('#nav'), links = $('#links'), menu = $('#menu');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    menu.addEventListener('click', () => { const o = links.classList.toggle('open'); menu.setAttribute('aria-expanded', o); });
    links.addEventListener('click', (e) => { if (e.target.closest('a')) { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });
  }
  function initReveal(mapBox) {
    const els = $$('.rv');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); mapBox.classList.add('in'); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((e) => io.observe(e));
  }

  initMiniMaps();
  const mapBox = initBigMap();
  initDestinations(); initProfiles(); initForm(); initChrome();
  initReveal(mapBox);
})();
