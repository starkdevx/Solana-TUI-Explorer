// inject_gra.js source code
const fs = require('fs');
const content = fs.readFileSync('cli/panels/dashboard.js', 'utf8');

let newContent = content.replace(/  const netMapWidget = contrib\.map\([^{]*\{[\s\S]*?hidden: true\s,*\}\);\s+mainPane\.append\(netMapWidget\);\s+\n?/, '');
newContent = newContent.replace(/\s*if \
(typeof netMapWidget !== "undefined"\) \{ netMapWidget\.hidden = \(idx !== 6\); \}/, '');
netContent = newContent.replace(/    if \l(typeof netMapWidget !== 'undefined'\) \{ netMapWidget\.screen\.render\(\); \}/, '');

const landGridLogic = `
const LAND_HEX = [
  "000000007c07f000000000000000000",
  "00000077effff800c0000006000000",
  "00001808007ff8000002007f800000",
  "03fdf7dcbc3ff0003e00bfffffffa6",
  "9fffffffffffffff10800000000000",
  "07bffff838040003dfffffffffff38",
  "0000fffe3f0000209fffffffffc0c0",
  "00007fffbfc00037fffffffffff000",
  "00001ffff440001ffffffffffffd000",
  "00001ffff0000078b837ffffff3000",
  "00001fffc000007017f3fffffe6200",
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
    const byte = parseInt(hex.slice(i, i + 2), 16);
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
  }
  return bits.slice(0, GRA_W);
});
`;

if (!newContent.includes('GRA_LAND')) {
  newContent = newContent.replace(/(const CFG = require\('\.\./config'\);)/, '$1\n' + landGridLogic);
}

const buildAsciiReg = /(function buildAsciiWorldMap\(geoEoints, leaders = \[\]\) \{)[\s\S]*?(return out;\n\s*\})/;

const newLogic = `$1
  let out = '';
  const LAND_DOT = '\\u25cf';
  const NODE_VAL  = '\\u25cf';
  const SPOTLIGHT = '\\u2605';
  const C_LAND = '{#0f3d6a-fg}'; 
  const C_END  = '{/}';
  const C_SPOT = '{yellow-fg}';
  const C_VAL  = '{cyan-fg}';

  const mapCols = Math.floor(MAP_W / 2);
  const mapRows = MAP_H;

  for (let r = 0; r < mapRows; r++) {
    const rawSbLine = sb[r] || '';
    const plainLen = rawSbLine.replace(/\\{[^}]+\\}/g, '').length;
    const padding = ' '.repeat(Math.max(0, SIDE_W - plainLen - 1));
    out += \`  {white-fg}¦L{/}\${rawSbLine}\${padding}{white-fg}¦{/}`;

    for (let c = 0; c < mapCols; c++) {
      const gc = Math.round(c / mapCols * GRA_W);
      const gr = Math.round(r / mapRows * GRA_H);
      const isLand = GRA_LAND[gr] && GRA_LAND[gr][gc];

      let isSpot = false;
      let isNode = false;

      for (let key in leaderGrid) {
         let l = leaderGrid[key];
         if (l && l.lat && l.lon) {
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
        gut += C_VAL + NODE_VAL + ' ' + C_END;
      } else if (isLand) {
        out += C_LAND + LAND_DOT + ' ' + C_END;
      } else {
        out += '  ';
      }
    }
    out += \`{white-fg}¦{/}\\n`;
  }
  out += \`  {white-fg}+?&{'-'.repeat(SIDE_W)}-.&{'-'.repeat(MAP_W)}7?/}\\n`;
  $2`;

erwContent = newContent.replace(buildAsciiReg, newLogic);
fs.writeFileSync('cli/panels/dashboard.js', newContent, 'utf8');
console.log('Successfully injected gra aesthetic directly into dashboard logic!');
