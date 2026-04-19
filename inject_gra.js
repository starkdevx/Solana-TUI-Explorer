const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'cli/panels/dashboard.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove netMapWidget bug injection completely
content = content.replace(/  const netMapWidget = contrib\.map\(\s*\{[\s\S]*?hidden: true\s*\}\);\s*mainPane\.append\(netMapWidget\);\s*\n?/, '');
content = content.replace(/\n    if \(typeof netMapWidget !== "undefined"\) \{ netMapWidget\.hidden = \(idx !== 6\); \}/, '');
content = content.replace(/    \/\/ Render map widget explicitly\n    if \(typeof netMapWidget !== 'undefined'\) \{ netMapWidget\.screen\.render\(\); \}/, '    // Render map widget explicitly');

// 2. Add LAND_HEX to the top area (after CFG requires)
const landGridLogic = \
const LAND_HEX = [
  "000000007c07f00000000000000000",
  "00000077effff800c0000006000000",
  "00001808007ff8000002007f800000",
  "03fdf7dcbc3ff0003e00bfffffffa6",
  "9fffffffffffffff10800000000000",
  "07bffff838040003dfffffffffff38",
  "0000fffe3f0000209fffffffffc0c0",
  "00007fffbfc00037fffffffffff000",
  "00001ffff440001fffffffffffd000",
  "00001ffff0000078b837ffffff3000",
  "00001fffc000007017f3ffffe62000",
  "000007ffc000007f00fffffff18000",
  "000001f08000007ffff7fffff80000",
  "000000f0000001fffffa3fffe80000",
  "00000072200001ffff7e0f9e000000",
  "00000007000003ffffb8060f000000",
  "00000001100001ffffc80603040000",
  "000000003f8000fffff00004040000",
  "000000003fe00001ffe00002600000",
  "000000007ff80001ffc0000260c000",
  "000000007fff0000ff800001003800",
  "000000003fff00007f800000000000",
  "000000001ffe0000ff980000079000",
  "0000000007fe0000ff1000000ff800",
  "0000000007f000007e1000003ffe00",
  "000000000ff000003e0000003ffe00",
  "000000000fc0000038000000387c00",
  "000000000f80000000000000001802",
  "000000001e00000000000000000804",
  "000000001c00000000000000000000",
  "000000001880000000000000000000",
  "000000000000000000000000000000",
  "000000000000000000000000000000",
  "000000000000000000000000000000",
  "000000000e00000001ffe3ffffff80",
  "0000003fff0001fffffffffffffff0",
  "02ffffffc008ffffffffffffffffe0",
  "007fffffffffffffffffffffffffe0"
];
const GRA_W = 120, GRA_H = 38;
const GRA_LAND = LAND_HEX.map(hex => {
  const bits = [];
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i+2), 16);
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
  }
  return bits.slice(0, GRA_W);
});
\;
if (!content.includes('GRA_LAND')) {
  // Inject at around line 21 (after requires)
  content = content.replace(/(const {\s*DATA.*};\s*const CFG.*;\s*)/, '\\n' + landGridLogic);
}

// 3. Rewrite buildAsciiWorldMap body to use the new logic
const oldMapRoutineReg = /  \/\/ --- Render to Map Widget ---[\s\S]+?return out;\n\}/;

const newGraMapRoutine = \  // --- Render GRA String Widget ---
  let out = '';
  
  // Custom Constants for mapping
  const LAND_DOT  = '\\u25cf';
  const NODE_VAL  = '\\u25cf';
  const NODE_RPC  = '\\u25cf';
  const SPOTLIGHT = '\\u2605';
  const C_LAND = '{#4a6b8a-fg}';
  const C_END  = '{/}';
  const C_SPOT = '{yellow-fg}';
  const C_VAL  = '{cyan-fg}';

  // Screen scale 
  // We use MAP_W inside dashboard as the inner map bounds (86 chars)
  // Each map 'dot' is 2 chars wide (so exactly cols=43, rows=MAP_H=22).
  const mapCols = Math.floor(MAP_W / 2);
  const mapRows = MAP_H;

  // Render Loop
  for (let r = 0; r < mapRows; r++) {
    // Render sidebar for this row
    const rawSbLine = sb[r] || '';
    const plainLen = rawSbLine.replace(/\\{[^}]+\\}/g, '').length;
    const padding = ' '.repeat(Math.max(0, SIDE_W - plainLen - 1));
    out += \  {white-fg}¦{/}\\{white-fg}¦{/}\;

    // Render map for this row
    for (let c = 0; c < mapCols; c++) {
      // Map view c,r to internal 120x38 space
      const gc = Math.round(c / mapCols * GRA_W);
      const gr = Math.round(r / mapRows * GRA_H);
      const isLand = GRA_LAND[gr] && GRA_LAND[gr][gc];

      // Check if node exists in this pseudo-lat/lon cell
      // We look at all leaders and geoPoints that map to this internal cell
      let isSpot = false;
      let isNode = false;
      
      // Calculate inverse coordinate range approximately for leaders
      // We check our cached \leaderGrid\ (which uses older indices, so we just iterate for spot)
      for (let key in leaderGrid) {
         let l = leaderGrid[key];
         // re-evaluate cell natively
         if (l.lat && l.lon) {
           let col = Math.round((l.lon + 179) / 358 * (GRA_W - 1));
           let row = Math.round((83 - l.lat) / 166 * (GRA_H - 1));
           let rc = Math.round(col / GRA_W * mapCols);
           let rr = Math.round(row / GRA_H * mapRows);
           if (rc === c && rr === r) {
             isNode = true;
             if (l.isCurrent) isSpot = true;
           }
         }
      }
      
      if (isSpot) {
        out += C_SPOT + SPOTLIGHT + ' ' + C_END;
      } else if (isNode) {
        out += C_VAL + NODE_VAL + ' ' + C_END;
      } else if (isLand) {
        out += C_LAND + LAND_DOT + ' ' + C_END;
      } else {
        out += '  ';
      }
    }
    out += \{white-fg}¦{/}\\n\;
  }
  
  out += \  {white-fg}+\-\+{/}\\n\;
  return out;
}\;

content = content.replace(oldMapRoutineReg, newGraMapRoutine);

fs.writeFileSync(file, content, 'utf8');
console.log('Restored map engine with gra pattern!');
