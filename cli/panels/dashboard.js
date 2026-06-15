// =============================================
// SOLANA TUI EXPLORER CLI  ·  v4
// Theme: green/cyan on black (classic hacker terminal)
// Charts: solid-fill bar chart matching reference image
// =============================================

const blessed = require('blessed');
const contrib  = require('blessed-contrib');
const chalk    = require('chalk');
const readline = require('readline');
chalk.level = 3;

const { DATA, loadMarketData, loadNetworkData, loadWalletData, loadTokenData, loadNewsData } = require('../data');
const CFG = require('../config');

// Embedded land grid (120x38)
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

// Internal RPC helper from api.js — used by live section directly
const { fetchEpochInfo: _fetchEpochInfo } = require('../api');
// rpcCall helper re-exposed for live section's pollLiveStats
const https = require('https');
function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const rpcUrl = new URL(CFG.SOLANA_RPC);
    const options = {
      hostname: rpcUrl.hostname,
      path: rpcUrl.pathname + rpcUrl.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'SolanaTUIExplorer/1.0' },
      timeout: 10000,
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { const j = JSON.parse(data); if (j.error) reject(new Error(j.error.message)); else resolve(j.result); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('RPC timeout')); });
    req.write(body); req.end();
  });
}

// ─────────────────────────────────────────────
// COLOR PALETTE  (green/cyan theme)
//   G   = neon green   — positive / key values
//   C   = cyan         — labels, axes, info
//   W   = white bold   — primary data
//   WW  = white        — secondary data
//   Y   = gold/yellow  — accent headers, stats
//   DN  = soft red     — negative / down
//   GRY = light gray   — dim text (always visible)
// ─────────────────────────────────────────────
const G    = s => `{#00FF88-fg}${String(s)}{/}`;
const C    = s => `{#00FFFF-fg}${String(s)}{/}`;
const W    = s => `{white-fg}{bold}${String(s)}{/}`;
const WW   = s => `{white-fg}${String(s)}{/}`;
const Y    = s => `{#FFD700-fg}${String(s)}{/}`;
const DN   = s => `{#FF6B6B-fg}${String(s)}{/}`;
const GRY  = s => `{white-fg}${String(s)}{/}`;
// Aliases for header/accent usage
const O    = Y;
const OB   = s => `{#FFD700-fg}{bold}${String(s)}{/}`;
const LBL  = C;

// Badges
const GRN_BG = s => `{#006600-bg}{white-fg}{bold} ${String(s)} {/}`;
const RED_BG = s => `{#880000-bg}{white-fg}{bold} ${String(s)} {/}`;
const YEL_BG = s => `{#885500-bg}{white-fg}{bold} ${String(s)} {/}`;
const TL_BG  = s => `{#005566-bg}{white-fg}{bold} ${String(s)} {/}`;  // teal badge

// Separator line — cyan
const HR = (w = 90) => `{#00FFFF-fg}${'-'.repeat(w)}{/}`;

// ─────────────────────────────────────────────
// ALWAYS put fg:'white' on every box so text
// never inherits a potentially-black terminal default.
// ─────────────────────────────────────────────
const BOX   = { bg: 'black', fg: 'white' };
const BCYAN = { type: 'line', fg: '#00FFFF' };
const BDIM  = { type: 'line', fg: '#005566' };

// ─────────────────────────────────────────────
// STATE & SIMULATION ENGINE
// ─────────────────────────────────────────────
let simulatedSlot = 0;
let heartbeatInterval = null;
let current = 0; // Global tab state tracker
let validatorGeoData = null;
let validatorGeoLoading = false;

// startHeartbeat is defined inside startDashboard() where
// buildNetworkTab and screen are in scope. This stub is intentionally empty.
function startHeartbeat() { /* real impl inside startDashboard */ }

// Progress Bar
function progressBar(pct, width = 20) {
  const filled = Math.round(Math.max(0, Math.min(100, pct || 0)) / 100 * width);
  const empty  = Math.max(0, width - filled);
  return `{#00FF88-fg}${'█'.repeat(filled)}{/}{#114422-fg}${'░'.repeat(empty)}{/}`;
}

// ─────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────
const pad      = (s, n) => String(s == null ? '-' : s).padEnd(n);
const fmtPrice = v => {
  if (!v || isNaN(v)) return '-';
  if (v >= 1000)  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1)     return '$' + v.toFixed(2);
  if (v >= 0.001) return '$' + v.toFixed(5);
  return '$' + v.toExponential(3);
};
const fmtPct   = v => (v > 0 ? '+' : '') + (v || 0).toFixed(2) + '%';
const fmtVol   = s => (s && s !== '-') ? '$' + s : '-';
const nowTime  = () => new Date().toLocaleTimeString('en-US', { hour12: false });

// ─────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────
// (Already defined above)

// ─────────────────────────────────────────────
// FILLED BAR CHART
// Solid █ columns, NO gap → clean area-chart look
// matching the reference image exactly.
// ─────────────────────────────────────────────
function barFillChart(values, labels, opts = {}) {
  const {
    height  = 10,
    colW    = 2,    // 2-char wide columns
    gap     = 0,    // no gap → solid wall of bars
    axisW   = 7,
    colTag  = '#00FF88-fg',
    axisTag = '#00FFFF-fg',
    style   = 'solid', // 'solid' or 'dot'
  } = opts;

  if (!values || values.length < 2 || values.every(v => !v)) {
    return `{white-fg}  (no chart data available)\n{/}`;
  }

  const n   = values.length;
  const lo  = Math.min(...values);
  const hi  = Math.max(...values);
  const rng = (hi - lo) === 0 ? (hi || 1) : (hi - lo);

  // barH: rows filled from bottom (1 = just base, height = full column)
  const getBarH = v => Math.max(1, Math.round((v - lo) / rng * (height - 1)) + 1);

  const fmtV = v => {
    const a = Math.abs(v);
    if (a >= 10000) return (v / 1000).toFixed(0) + 'k';
    if (a >= 1000)  return Math.round(v).toString();
    if (a >= 10)    return v.toFixed(0);
    if (a >= 1)     return v.toFixed(1);
    if (a >= 0.1)   return v.toFixed(2);
    if (a >= 0.001) return v.toFixed(4);
    if (a === 0)    return '0';
    return v.toExponential(2);
  };

  let out = '';
  for (let r = 0; r < height; r++) {
    const rfb    = height - 1 - r;   // rows from bottom: 0=bottom, height-1=top
    const rowVal = lo + (rfb / (height - 1)) * rng;
    out += `{${axisTag}}${fmtV(rowVal).padStart(axisW - 1)}\u2502{/}`;
    for (let i = 0; i < n; i++) {
      if (i > 0 && gap > 0) out += ' '.repeat(gap);
      const bh = getBarH(values[i]);
      if (style === 'dot') {
        out += rfb === (bh - 1)
          ? `{${colTag}}•${' '.repeat(colW - 1)}{/}`
          : ' '.repeat(colW);
      } else {
        out += rfb < bh
          ? `{${colTag}}${'█'.repeat(colW)}{/}`
          : ' '.repeat(colW);
      }
    }
    out += '\n';
  }

  // Baseline
  const totalW = n * colW + (gap > 0 ? n * gap - gap : 0);
  out += ' '.repeat(axisW) + `{${axisTag}}\u2514${'─'.repeat(totalW)}{/}\n`;

  // X labels — show every Nth only
  if (labels && labels.length) {
    const step = Math.max(1, Math.ceil(n / 12));
    out += ' '.repeat(axisW + 1);
    for (let i = 0; i < n; i++) {
      if (i > 0 && gap > 0) out += ' '.repeat(gap);
      if (i % step === 0) {
        const l = String(labels[i] || '').substring(0, colW).padEnd(colW);
        out += `{${axisTag}}${l}{/}`;
      } else {
        out += ' '.repeat(colW);
      }
    }
    out += '\n';
  }

  return out;
}

// ─────────────────────────────────────────────
// ASCII WORLD MAP & LEADER SIDEBAR
// ─────────────────────────────────────────────
function buildAsciiWorldMap(geoPoints, leaders = []) {
  const MAP_W   = 92;
  const MAP_H   = 22;
  const SIDE_W  = 28;
  const LAT_MAX =  75;
  const LAT_MIN = -55;
  const LON_MIN = -180;
  const LON_MAX =  180;

  const latToRow = lat => Math.max(0, Math.min(MAP_H - 1, Math.round((LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * (MAP_H - 1))));
  const lonToCol = lon => Math.max(0, Math.min(MAP_W - 1, Math.round((lon - LON_MIN) / (LON_MAX - LON_MIN) * (MAP_W - 1))));

  const LAND = [
    [-168,-140, 60, 72], [-140,-120, 54, 60], [-120, -95, 49, 60],
    [-95,  -75, 43, 50], [-75,  -55, 47, 58], [-55,  -52, 46, 52],
    [-125, -100, 35, 50], [-100, -80, 25, 45], [-80,  -60, 30, 47],
    [-120,  -86, 15, 30], [-90,  -77,  8, 18], [-84,  -66,  9, 22],
    [-170, -155, 55, 65],
    [-82,  -34, -5, 12], [-81,  -50,-30,  5], [-73,  -34,-57,-28],
    [-68,  -40,-55,-25], [-80,  -72,-55,-42],
    [-10,   35, 35, 72], [-5,    30, 44, 65], [10,    30, 55, 72],
    [20,    40, 57, 70], [28,    32, 36, 42], [15,    25, 38, 42],
    [5,     15, 42, 47], [-5,     8, 43, 48],
    [-18,   50,-35, 38], [-18,   10,  4, 16], [10,    42,-10, 15],
    [28,    40,  0, 12], [40,    52,  2, 15], [38,    52,-12,  5],
    [12,    40,-36,-12],
    [28,    50, 40, 72], [50,   100, 50, 72], [100,  140, 52, 72],
    [140,  180, 50, 72], [130,  170, 42, 58], [108,  135, 18, 52],
    [60,   100, 22, 52], [44,    65, 28, 42], [52,    80,  8, 28],
    [66,    80,  8, 14],
    [95,   110,  0, 22], [100,  120,  0, 15], [105,  120, -8,  5],
    [115,  125, -4,  2], [120,  142, -8,  2],
    [124,  132, 34, 42], [130,  146, 31, 46], [88,   101, 15, 28],
    [113,  154,-44,-10], [144,  180,-45,-15], [166,  178,-47,-34],
    [-52,  -17, 60, 84], [-25,  -13, 63, 65], [-25,  -13, 63, 67]
  ];

  const grid = Array.from({ length: MAP_H }, () => new Uint8Array(MAP_W));
  for (const [minLon, maxLon, minLat, maxLat] of LAND) {
    const r1 = latToRow(maxLat), r2 = latToRow(minLat);
    const c1 = lonToCol(minLon), c2 = lonToCol(maxLon);
    for (let r = Math.min(r1,r2); r <= Math.max(r1,r2); r++)
      for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++)
        grid[r][c] = 1;
  }

  // --- Sidebar Logic ---
  const geo = validatorGeoData || {};
  const schedule = geo.leaderSchedule || [];
  const baseSlot = geo.currentSlot || 0;
  const geoLeaders = geo.leaders || [];

  const offset = simulatedSlot > 0 ? Math.max(0, simulatedSlot - baseSlot) : 0;
  const currentPubkey = schedule[offset] || null;

  // We use geoPoints natively now to project all identity markers
  // leaderGrid has been completely deprecated in the new string algo

  const resolveLeader = (pubkey) => {
    if (!pubkey) return null;
    const found = geoLeaders.find(l => l.pubkey === pubkey);
    return found || { name: pubkey.slice(0,6) + '…' + pubkey.slice(-4), city: '' };
  };

  const cur = resolveLeader(currentPubkey);
  const nextPubkeys = [];
  const seen = new Set([currentPubkey]);
  for (let i = offset + 1; i < Math.min(schedule.length, offset + 20) && nextPubkeys.length < 4; i++) {
    const p = schedule[i];
    if (p && !seen.has(p)) { nextPubkeys.push(p); seen.add(p); }
  }

  // Build Sidebar text lines (width 32)
  const padRight = (str, len) => str + ' '.repeat(Math.max(0, len - String(str).replace(/\{[^}]+\}/g, '').length));
  
  const clusterTotal = geo.totalNodes || 0;
  const vTotal = DATA.networkStats?.validators?.length || clusterTotal;
  const rpcCount = geo.rpcNodes !== undefined ? geo.rpcNodes : Math.max(0, clusterTotal - vTotal);
  
  let sb = [];
  sb.push(` {#00FFFF-fg}{bold}${vTotal}{/}  {white-fg}Validators{/}`);
  sb.push(` {#00FFFF-fg}{bold}${rpcCount}{/}  {white-fg}RPC Nodes{/}`);
  sb.push('');
  sb.push(` {#FFFFFF-bg}{#000000-fg} ⬡ SLOT ${simulatedSlot.toLocaleString()} {/}`);
  sb.push('');
  sb.push(' {white-fg}Current Leader{/}');
  if (cur) {
    sb.push(` {#00FFaa-fg}{bold} ◉ ${cur.name}{/}`);
    if (cur.city && cur.city !== '??') sb.push(`   {#00FFFF-fg}${cur.city}{/}`);
    else sb.push('');
  } else {
    sb.push(' {white-fg}Loading...{/}');
    sb.push('');
  }
  sb.push('');
  sb.push(' {white-fg}Next Leaders{/}');
  nextPubkeys.forEach(p => {
    const l = resolveLeader(p);
    sb.push(` {#FFFFFF-fg} › ${l.name}{/}`);
  });
  
  while (sb.length < MAP_H) sb.push('');

  // --- Render to String Map ---
  let out = '\n';
  
  const LAND_DOT  = '\u25cf';
  const NODE_VAL  = '\u25cf';
  const SPOTLIGHT = '\u272A'; // ✪ (Circled Star)
  const C_LAND = '{#4a6b8a-fg}'; // Exact blue-gray from gra.js
  const C_END  = '{/}';
  const C_SPOT = '{yellow-fg}';
  const C_VAL  = '{cyan-fg}';

  const mapCols = Math.floor(MAP_W / 2);
  const mapRows = Math.min(MAP_H, GRA_H);

  const geoGrid = {};
  let currentFound = false;
  for (const p of geoPoints) {
    if (p.lat && p.lon) {
      let col = Math.round((p.lon + 179) / 358 * (GRA_W - 1));
      let row = Math.round((83 - p.lat) / 166 * (GRA_H - 1));
      let rc = Math.round(col / GRA_W * mapCols);
      let rr = Math.round(row / GRA_H * mapRows);
      
      let existing = geoGrid[`${rr},${rc}`];
      let isCur = p.pubkey === currentPubkey;
      if (isCur) currentFound = true;
      if (!existing || isCur) {
         geoGrid[`${rr},${rc}`] = { ...p, isCurrent: isCur };
      }
    }
  }

  // If the current leader is not in our Top 200 resolved GeoIP subset,
  // map them deterministically via pubkey hash so the simulation heartbeat never dies.
  if (currentPubkey && !currentFound) {
    const hash = currentPubkey.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
    const fallbacks = [
      {lat: 40.71, lon: -74.01}, {lat: 37.77, lon: -122.41}, {lat: 51.51, lon: -0.13},
      {lat: 35.68, lon: 139.69}, {lat: 1.35, lon: 103.82}, {lat: -33.87, lon: 151.21},
      {lat: 52.52, lon: 13.40}, {lat: 48.86, lon: 2.35}, {lat: 22.28, lon: 114.16}
    ];
    let fb = fallbacks[hash % fallbacks.length];
    let col = Math.round((fb.lon + 179) / 358 * (GRA_W - 1));
    let row = Math.round((83 - fb.lat) / 166 * (GRA_H - 1));
    let rc = Math.round(col / GRA_W * mapCols);
    let rr = Math.round(row / GRA_H * mapRows);
    geoGrid[`${rr},${rc}`] = { pubkey: currentPubkey, isCurrent: true };
  }

  out += `  {white-fg}┌${'─'.repeat(SIDE_W)}┬${'─'.repeat(MAP_W)}┐{/}\n`;
  for (let r = 0; r < mapRows; r++) {
    const rawSbLine = sb[r] || '';
    const plainLen = rawSbLine.replace(/\{[^}]+\}/g, '').length;
    const padding = ' '.repeat(Math.max(0, SIDE_W - plainLen - 1));
    out += `  {white-fg}│{/}${rawSbLine}${padding}{white-fg}│{/}`;

    for (let c = 0; c < mapCols; c++) {
      const gc = Math.round(c / mapCols * GRA_W);
      const gr = Math.round(r / mapRows * GRA_H);
      const isLand = GRA_LAND[gr] && GRA_LAND[gr][gc];

      let isSpot = false;
      let isNode = false;
      
      const node = geoGrid[`${r},${c}`];
      if (node) {
        isNode = true;
        if (node.isCurrent) isSpot = true;
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
    out += `{white-fg}│{/}\n`;
  }
  out += `  {white-fg}└${'─'.repeat(SIDE_W)}┴${'─'.repeat(MAP_W)}┘{/}\n`;
  return out;
} // end buildAsciiWorldMap


// ─────────────────────────────────────────────
// CANDLESTICK CHART
// Native OHLC ASCII rendering with Wicks and Bodies
// ─────────────────────────────────────────────
function candleChart(candles, opts = {}) {
  const { height = 10, colW = 1, gap = 1, axisW = 9, axisTag = '#005533-fg', timeframe = '1H' } = opts;

  if (!candles || candles.length < 2 || !candles[0].h) {
    return `{white-fg}  (no candle data available)\n{/}`;
  }

  const n = candles.length;
  const lo = Math.min(...candles.map(c => c.l));
  const hi = Math.max(...candles.map(c => c.h));
  const rng = (hi - lo) === 0 ? (hi || 1) : (hi - lo);

  const getRow = v => Math.min(height - 1, Math.max(0, Math.round((v - lo) / rng * (height - 1))));

  const fmtV = v => {
    const a = Math.abs(v);
    if (a >= 10000) return (v / 1000).toFixed(0) + 'k';
    if (a >= 1000)  return Math.round(v).toString();
    if (a >= 10)    return v.toFixed(0);
    if (a >= 1)     return v.toFixed(1);
    if (a >= 0.1)   return v.toFixed(2);
    if (a >= 0.001) return v.toFixed(4);
    if (a === 0)    return '0';
    return v.toExponential(2);
  };

  let out = '';
  const totalW = n * colW + (gap > 0 ? n * gap - gap : 0);
  
  out += `  {#447766-fg}┌${'─'.repeat(axisW)}┬${'─'.repeat(totalW + 2)}┐{/}\n`;
  
  if (opts.priceChanges) {
    const fmtP = (p) => p !== undefined ? (p >= 0 ? `{#00FF88-fg}+${p.toFixed(2)}%{/}` : `{#FF6B6B-fg}${p.toFixed(2)}%{/}`) : '—';
    const pcLines = `  {#88AAAA-fg}5M:{/} ${fmtP(opts.priceChanges.m5)}    {#88AAAA-fg}1H:{/} ${fmtP(opts.priceChanges.h1)}    {#88AAAA-fg}6H:{/} ${fmtP(opts.priceChanges.h6)}    {#88AAAA-fg}24H:{/} ${fmtP(opts.priceChanges.h24)}`;
    
    // Calculate padding manually to account for tags correctly
    const pureLen = pcLines.replace(/\{[\w#\/\-]+\}/g, '').length;
    const padR = Math.max(0, (totalW + 2) - pureLen);
    
    out += `  {#447766-fg}│${' '.repeat(axisW)}│{/}${pcLines}${' '.repeat(padR)}{#447766-fg}│{/}\n`;
    out += `  {#447766-fg}├${'─'.repeat(axisW)}┼${'─'.repeat(totalW + 2)}┤{/}\n`;
  }

  for (let rfb = height - 1; rfb >= 0; rfb--) {
    const rowVal = lo + (rfb / (height - 1)) * rng;
    // Only print Y-label every 3 rows
    const yLabel = (rfb % 3 === 0 || rfb === height - 1 || rfb === 0) 
      ? fmtV(rowVal).padStart(axisW) 
      : ' '.repeat(axisW);
      
    out += `  {#447766-fg}│{/}{${axisTag}}${yLabel}{/}{#447766-fg}│ {/}`;
    
    for (let i = 0; i < n; i++) {
        if (i > 0 && gap > 0) out += ' '.repeat(gap);
        const c = candles[i];
        
        const rHigh = getRow(c.h);
        const rLow  = getRow(c.l);
        const rOpen = getRow(c.o);
        const rClose= getRow(c.c);
        
        const topB = Math.max(rOpen, rClose);
        const botB = Math.min(rOpen, rClose);
        
        const isBull = c.c >= c.o;
        const color = isBull ? '{#00FF88-fg}' : '{#FF6B6B-fg}';
        
        let char = ' ';
        if (rfb <= topB && rfb >= botB) {
           char = '█'; // body
        } else if (rfb <= rHigh && rfb >= rLow) {
           char = '│'; // wick
        }
        
        out += `${color}${char.repeat(colW)}{/}`;
    }
    out += ` {#447766-fg}│{/}\n`;
  }

  // Baseline
  out += `  {#447766-fg}├${'─'.repeat(axisW)}┼${'─'.repeat(totalW + 2)}┤{/}\n`;

  // X labels absolute array
  let xChars = new Array(totalW).fill(' ');
  for (let i = 0; i < n; i++) {
    let anchor = i * (colW + gap);
    
    let lbl = '';
    const c = candles[i];
    if (c && c.t) {
      const d = new Date(c.t * 1000);
      if (timeframe === '5M' && i % 6 === 0) {
        lbl = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
      } else if (timeframe === '1H' && i % 6 === 0) {
        lbl = d.getHours().toString().padStart(2, '0') + ':00';
      } else if (timeframe === '1D' && i % 4 === 0) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        lbl = `${months[d.getMonth()]} ${d.getDate()}`;
      }
    }

    if (lbl) {
      let fits = true;
      for (let j = 0; j < lbl.length; j++) {
         if (anchor + j >= totalW || xChars[anchor + j] !== ' ') fits = false;
      }
      if (fits) {
         for (let j = 0; j < lbl.length; j++) {
             xChars[anchor + j] = lbl[j];
         }
      }
    }
  }
  
  const xStr = xChars.join('');
  out += `  {#447766-fg}│${' '.repeat(axisW)}│{/} {${axisTag}}${xStr}{/} {#447766-fg}│{/}\n`;
  out += `  {#447766-fg}└${'─'.repeat(axisW)}┴${'─'.repeat(totalW + 2)}┘{/}\n`;

  return out;
}


// ─────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────
function errorBanner(msg) {
  return `\n ${RED_BG('ERROR')}  {#FF6B6B-fg}${msg}{/}\n\n {white-fg}Press{/} {#FFD700-fg}R{/} {white-fg}to retry    {/}{white-fg}up/down to scroll{/}\n`;
}
function loadingBanner(msg) {
  return `\n ${TL_BG('LOADING')}  {#00FFFF-fg}${msg || 'Fetching live data...'}{/}\n\n {white-fg}Connecting to Solana mainnet & DexScreener...{/}\n`;
}

// ── Animated Loader ───────────────────────────────────────
// Usage: const stop = createAnimatedLoader(screen, someBox, 'Fetching...');
// Call stop() when done to clean up.
function createAnimatedLoader(screen, box, msg, tips) {
  const SPINNER = ['\u28fe', '\u28f7', '\u28ef', '\u28df', '\u287f', '\u28bf', '\u28fb', '\u28fd'];
  const BARS    = ['▁','▂','▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃','▂'];
  const COLORS  = ['#00FF88', '#00FFCC', '#00CCFF', '#00AAFF', '#0088FF', '#00AAFF', '#00CCFF', '#00FFCC'];
  const TIPS = tips || [
    'Connecting to Solana mainnet-beta...',
    'Querying DexScreener API...',
    'Syncing live blockchain data...',
    'Aggregating market intelligence...',
  ];
  let frame = 0;
  let tipIdx = 0;

  function render() {
    const spin  = SPINNER[frame % SPINNER.length];
    const clr   = COLORS[frame % COLORS.length];
    const bar   = BARS.slice(Math.max(0, (frame % BARS.length) - 5), (frame % BARS.length) + 1).join('');
    const tip   = TIPS[tipIdx % TIPS.length];
    const barFull = Array.from({length: 40}, (_, i) => BARS[(frame + i) % BARS.length]).join('');

    let out = '';
    out += '\n';
    out += `  {${clr}-fg}${barFull}{/}\n`;
    out += '\n';
    out += `  {${clr}-fg}{bold}${spin}{/}  {white-fg}{bold}${msg}{/}\n`;
    out += '\n';
    out += `  {white-fg}${tip}{/}\n`;
    out += '\n';
    out += `  {${clr}-fg}${barFull}{/}\n`;

    if (box && !box.destroyed) {
      box.setContent(out);
      if (screen && !screen.destroyed) screen.render();
    }
    frame++;
    if (frame % 20 === 0) tipIdx++;
  }

  render();
  const iv = setInterval(render, 100);
  return function stop() { clearInterval(iv); };
}


// ─────────────────────────────────────────────
// GUI INPUT — pure blessed prompt for easy pasting
// ─────────────────────────────────────────────
function getLineInput(screen, promptText, cb) {
  const form = blessed.form({
    parent: screen, keys: true, left: 'center', top: 'center',
    width: 60, height: 5, style: BOX,
    border: { type: 'line', fg: '#00FFFF' },
    label: ` {#FFD700-fg} INPUT REQUIRED {/} `,
    tags: true
  });
  blessed.text({ parent: form, top: 0, left: 1, content: promptText, style: BOX });
  const input = blessed.textbox({
    parent: form, top: 1, left: 1, right: 1, height: 1,
    keys: true, inputOnFocus: true, style: { bg: '#002222', fg: '#00FF88' }
  });
  input.on('submit', (val) => { form.destroy(); screen.render(); cb((val || '').trim()); });
  input.on('cancel', () =>    { form.destroy(); screen.render(); cb(''); });
  screen.append(form);
  input.focus();
  input.readInput(); // CRITICAL: Tells blessed to actually accept keyboard strokes
  screen.render();
}

function getSelectionMenu(screen, promptText, options, cb) {
  const form = blessed.form({
    parent: screen, keys: true, left: 'center', top: 'center',
    width: 40, height: options.length + 4, style: BOX,
    border: { type: 'line', fg: '#00FFFF' },
    label: ` {#FFD700-fg} ${promptText} {/} `,
    tags: true
  });

  const list = blessed.list({
    parent: form, top: 1, left: 1, right: 1, bottom: 1,
    keys: true, interactive: true,
    items: options.map(o => `  ▶  ${o}  `),
    style: {
      selected: { bg: '#00FF88', fg: 'black', bold: true },
      item: { fg: 'white', bg: '#001A0D' }
    }
  });

  list.on('select', (el, selected) => { form.destroy(); screen.render(); cb(options[selected]); });
  list.on('cancel', () =>             { form.destroy(); screen.render(); cb(''); });
  list.key(['escape', 'q', 'C-c'], () => { form.destroy(); screen.render(); cb(''); });

  screen.append(form);
  list.focus();
  screen.render();
}

// ══════════════════════════════════════════════════════════
function startDashboard() {
  let localList;
  const screen = blessed.screen({
    smartCSR: true, title: 'Solana TUI Explorer',
    fullUnicode: true, mouse: true, forceUnicode: true,
  });

  const root = blessed.box({
    parent: screen, top: 0, left: 0, width: '100%', height: '100%',
    style: BOX,
  });

  // ─────────────────────────────────────────────
  // TOP BAR — single premium header band
  // ─────────────────────────────────────────────
  const topRow = blessed.box({
    parent: root, top: 0, left: 0, width: '100%', height: 1,
    tags: true,
    style: { bg: '#002E1A', fg: 'white' },
  });

  // Logo — left
  blessed.text({ parent: topRow, top: 0, left: 0, tags: true,
    style: { bg: '#002E1A' },
    content: ' {#00FF88-fg}{bold}⬡ SOLANA TUI EXPLORER{/}  {#336655-fg}│{/}  {#668877-fg}On-Chain Developer Inspection TUI{/}' });

  // Live dot + clock — right
  const clockBox = blessed.text({ parent: topRow, top: 0, right: 0, tags: true,
    style: { bg: '#002E1A' }, content: '' });
  function refreshClock() {
    const now = new Date();
    const dt  = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const tm  = now.toLocaleTimeString('en-US', { hour12: false });
    clockBox.setContent(`{#00FF88-fg}● LIVE{/}  {#99CCBB-fg}${dt}  ${tm}{/}  {#004D33-bg}{#00FF88-fg}{bold} v1.0 {/} `);
  }
  refreshClock();
  setInterval(refreshClock, 1000);

  // Ticker — kept as stub so callers don't break
  function refreshTicker() {}

  // Divider row 1 — bright thin line
  blessed.text({ parent: root, top: 1, left: 0, width: '100%', height: 1, tags: true, style: BOX,
    content: `{#00FF88-fg}${'━'.repeat(400)}{/}` });

  // ─────────────────────────────────────────────
  // NAV BAR (row 2)
  // ─────────────────────────────────────────────
  const navBar = blessed.box({
    parent: root, top: 2, left: 0, width: '100%', height: 1,
    tags: true, style: { bg: '#001A0D', fg: 'white' },
  });
  blessed.text({ parent: navBar, top: 0, right: 1, tags: true,
    style: { bg: '#001A0D' },
    content: '{#00FF88-fg}● MAINNET{/}' });
  const navContent = blessed.text({ parent: navBar, top: 0, left: 0, tags: true,
    style: { bg: '#001A0D', fg: 'white' }, content: '' });

  // Divider row 3 — dim thin line
  blessed.text({ parent: root, top: 3, left: 0, width: '100%', height: 1, tags: true, style: BOX,
    content: `{#005533-fg}${'─'.repeat(400)}{/}` });

  // ─────────────────────────────────────────────
  // RIGHT SIDEBAR (Disabled for full-width layout)
  // ─────────────────────────────────────────────
  const SBW = 0;
  const feedLog = { log: () => {} };
  /*
  const sidebar = blessed.box({
    parent: root, top: 4, right: 0, width: SBW, bottom: 2,
    style: BOX,
    border: { type: 'line', fg: '#00FFFF', left: true, top: false, right: false, bottom: false },
  });

  const gainBox = blessed.box({
    parent: sidebar, top: 0, left: 0, width: '100%', height: 10,
    label: ' {#00FF88-fg}{bold}TOP GAINERS{/} ', tags: true,
    border: BCYAN, style: BOX,
  });
  function buildGainers() {
    if (!DATA.topGainers.length) { gainBox.setContent(WW(' No gainers presently')); return; }
    let s = '';
    DATA.topGainers.slice(0, 5).forEach(d => {
      const bl = Math.max(0, Math.round(Math.min(d.pct / 40 * 10, 10)));
      s += W(pad(d.symbol, 10)) +
           `{#0EF20A-fg}${'▆'.repeat(bl)}{/}{#c3e3c5-fg}${'▆'.repeat(10 - bl)}{/}` +
           ' ' + G('+' + d.pct.toFixed(1) + '%') + '\n';
    });
    gainBox.setContent(s);
  }

  const lossBox = blessed.box({
    parent: sidebar, top: 10, left: 0, width: '100%', height: 10,
    label: ' {#FF6B6B-fg}{bold}TOP LOSERS{/} ', tags: true,
    border: BCYAN, style: BOX,
  });
  function buildLosers() {
    if (!DATA.topLosers.length) { lossBox.setContent(WW(' No negative pairs')); return; }
    let s = '';
    DATA.topLosers.slice(0, 5).forEach(d => {
      const bl = Math.max(0, Math.round(Math.min(Math.abs(d.pct) / 15 * 10, 10)));
      s += W(pad(d.symbol, 10)) +
           `{#941234-fg}${'▆'.repeat(bl)}{/}{#c3e3c5-fg}${'▆'.repeat(10 - bl)}{/}` +
           ' ' + DN(d.pct.toFixed(1) + '%') + '\n';
    });
    lossBox.setContent(s);
  }

  const feedBox = blessed.box({
    parent: sidebar, top: 20, left: 0, width: '100%', bottom: 0,
    label: ' {#FFD700-fg}{bold}LIVE FEED{/} ', tags: true,
    border: BCYAN, style: BOX,
  });
  const feedLog = contrib.log({
    parent: feedBox, top: 0, left: 0, width: '100%-2', height: '100%-2',
    fg: 'white', tags: true, style: BOX,
  });
  */

  // ─────────────────────────────────────────────
  // MAIN PANE
  // ─────────────────────────────────────────────
  const mainPane = blessed.box({ parent: root, top: 4, left: 0, right: SBW, bottom: 2, style: BOX });

  let current = 0;
  let activeModal = null;

  screen.key(['up', 'k'],   () => {
    if (activeModal) { activeModal.scroll(-1); screen.render(); return; }
    if (current === 3 && DATA.news.length > 0) {
      newsSelected = Math.max(0, newsSelected - 1);
      buildNewsTab(); screen.render();
    } else if (current === 5 && localList) {
      // Let the focused list handle arrow/j/k keys natively
    } else {
      activeScroll?.scroll(-1); screen.render();
    }
  });
  screen.key(['down', 'j'], () => {
    if (activeModal) { activeModal.scroll(1); screen.render(); return; }
    if (current === 3 && DATA.news.length > 0) {
      newsSelected = Math.min(DATA.news.length - 1, newsSelected + 1);
      buildNewsTab(); screen.render();
    } else if (current === 5 && localList) {
      // Let the focused list handle arrow/j/k keys natively
    } else {
      activeScroll?.scroll(1); screen.render();
    }
  });
  screen.key(['pageup'],    () => { 
    if (activeModal) { activeModal.scroll(-10); screen.render(); return; }
    activeScroll?.scroll(-10); screen.render(); 
  });
  screen.key(['pagedown'],  () => { 
    if (activeModal) { activeModal.scroll(10); screen.render(); return; }
    activeScroll?.scroll(10);  screen.render(); 
  });
  screen.key(['home'],      () => { 
    if (activeModal) { activeModal.setScrollPerc(0); screen.render(); return; }
    activeScroll?.setScrollPerc(0);   screen.render(); 
  });
  screen.key(['end'],       () => { 
    if (activeModal) { activeModal.setScrollPerc(100); screen.render(); return; }
    activeScroll?.setScrollPerc(100); screen.render(); 
  });
  screen.key(['enter', 'return'], () => {
    if (!activeModal && current === 3 && DATA.news.length > 0) {
      showNewsDetail(DATA.news[newsSelected]);
    }
  });

  function mkScroll(parent, extra = {}) {
    return blessed.box({
      parent, scrollable: true, alwaysScroll: true, mouse: true, tags: true,
      style: { ...BOX, scrollbar: { bg: '#00FFFF' } },
      scrollbar: { ch: '│', style: { fg: '#00FFFF' } },
      ...extra,
    });
  }
  const mkBox = (parent, extra = {}) => blessed.box({ parent, tags: true, style: BOX, ...extra });





  // ══════════════════════════════════════════════════════════
  // F3  WALLET
  // ══════════════════════════════════════════════════════════
  const tabWallet = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  const wltScroll = mkScroll(tabWallet, { top: 0, left: 0, right: 0, bottom: 0 });
  const wltBox    = mkBox(wltScroll, { width: '100%-2' });

  let walletAddr = null, walletLoading = false, walletError = null;

  function buildWalletTab() {
    let out = '';
    out += OB(' WALLET INSIGHTS') + `  ${WW('Portfolio analytics | Transaction history')}  ${walletAddr ? GRY('I=change  R=refresh') : C('Press i to enter wallet address')}\n`;
    out += HR(92) + '\n\n';

    if (!walletAddr) {
      out += `\n ${TL_BG('NO WALLET LOADED')}\n\n`;
      out += ` ${WW('Enter a Solana wallet address to view live balances & transactions.')}\n\n`;
      out += ` ${C('Type')} ${W(' i ')} ${C('on your keyboard to enter a Solana wallet address')}\n\n`;
      out += ` ${LBL('Example:  ')}${GRY('7xKkPmVn8RqwZ2jLfBd4uYtX1sCo9HGe5Ap3mNpQ')}\n\n`;
      wltBox.setContent(out); wltBox.height = 16; return;
    }
    if (walletLoading) {
      if (!buildWalletTab._stopLoader) {
        buildWalletTab._stopLoader = createAnimatedLoader(screen, wltBox,
          'Fetching wallet from Solana RPC...',
          ['Querying token accounts...', 'Resolving token mint addresses...', 'Fetching USD values via DexScreener...', 'Building portfolio summary...']);
      }
      wltBox.height = 14; return;
    }
    if (buildWalletTab._stopLoader) { buildWalletTab._stopLoader(); buildWalletTab._stopLoader = null; }
    if (walletError) {
      out += errorBanner(walletError);
      out += ` ${LBL('Address: ')}${C(walletAddr)}\n\n`;
      out += ` ${WW('Press')} ${C('I')} ${WW('to try a different address')}\n`;
      wltBox.setContent(out); wltBox.height = 16; return;
    }

    const ww = DATA.wallet;
    if (!ww) return;

    out += ` ${LBL('WALLET:')} ${C(ww.fullAddress)} ${GRY('(Mainnet RPC)')}\n`;
    out += ` ${LBL('ASSETS:')} ${W(ww.holdings.length + ' tokens')}  ${GRY('│')}  ${LBL('IDENT:')} ${W(ww.address)}\n`;
    out += ` ${LBL('PORTFOLIO:')} {#00FF88-fg}{bold}$${ww.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{/}\n`;
    out += HR(92) + '\n\n';

    // Holdings
    out += ` ${TL_BG(' HOLDINGS ')}  ${WW(ww.holdings.length + ' assets via Solana RPC')}\n\n`;
    out += ' ' + LBL(pad('TOKEN', 10)) + LBL(pad('AMOUNT', 22)) + LBL(pad('USD VALUE', 18)) + LBL(pad('ALLOC%', 8)) + LBL('WEIGHT') + '\n';
    out += HR(78) + '\n';
    ww.holdings.forEach(h => {
      const barF = Math.round((h.pct || 0) / 100 * 14);
      const barE = Math.max(0, 14 - barF);
      const val  = h.value > 0
        ? `{#00FF88-fg}{bold}$${h.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}{/}`
        : GRY('price unavailable   ');
      const vLen = h.value > 0 ? ('$' + h.value.toFixed(2)).length : 17;
      out += ' ' + W(pad(h.token, 10)) +
             WW(pad(String(h.amount), 22)) +
             val + ' '.repeat(Math.max(1, 18 - vLen)) +
             Y(pad((h.pct || 0).toFixed(1) + '%', 8)) +
             `{#00FF88-fg}${'█'.repeat(barF)}{/}{#114422-fg}${'░'.repeat(barE)}{/}\n`;
    });
    out += HR(92) + '\n\n';

    // ── FairScale Reputation & Trust Section ──
    if (ww.fairScale && !ww.fairScale.error) {
      const fs = ww.fairScale;
      const score = Math.round(fs.fairscore || 0);
      const tier = (fs.tier || 'bronze').toLowerCase();
      
      const TIER_CONFIG = {
        diamond:  { clr: '{#E5E4E2-fg}', bg: '{#333333-bg}', sym: '💎' },
        platinum: { clr: '{#7FFFD4-fg}', bg: '{#002222-bg}', sym: '💠' },
        gold:     { clr: '{#FFD700-fg}', bg: '{#222200-bg}', sym: '📀' },
        silver:   { clr: '{#C0C0C0-fg}', bg: '', sym: '💿' },
        bronze:   { clr: '{#CD7F32-fg}', bg: '{#111111-bg}', sym: '🔘' }
      };
      const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
      
      out += ` ${TL_BG(' REPUTATION ')}  ${cfg.bg}${cfg.clr}{bold} ${cfg.sym} ${tier.toUpperCase()}{/}{/}  ${WW('│  FairScale Score:')} ${cfg.clr}{bold}${score}/100{/}  ${WW('│  Humanity:')} ${fs.verified_human ? G('VERIFIED') : Y('PROBABLE')}\n`;
      
      // Achievements
      if (fs.badges && fs.badges.length > 0) {
        const icons = {
          'lst_staker': '🔒', 'sol_maxi': '💰', 'no_dumper': '💎', 'diamond_hands': '💎',
          'net_accumulator': '📈', 'active_trader': '🔥', 'diversified': '🌀',
          'social_connected': '🔗', 'active_tweeter': '🔔', 'content_creator': '🎨', 'positive_vibes': '😁'
        };

        out += ` ${LBL('Achievements:')}\n `;
        let rowLen = 0;
        fs.badges.slice(0, 8).forEach(b => {
          const icon = icons[b.id] || '🏅';
          const bClr = b.tier === 'gold' ? '{#FFD700-fg}' : b.tier === 'silver' ? '{#C0C0C0-fg}' : '{#CD7F32-fg}';
          const badgeStr = `{#111111-bg}${bClr}${icon} ${b.label}{/}`;
          
          // Safer wrap logic based on character count (ignoring tags roughly)
          if (rowLen + b.label.length > 60) { out += '\n '; rowLen = 0; }
          out += badgeStr + '  ';
          rowLen += b.label.length + 6;
        });
        out += '\n';
      }

      // Action Item
      if (fs.actions && fs.actions.length > 0) {
        const action = fs.actions[0];
        const actPrio = action.priority === 'high' ? '{#FF6B6B-fg}' : '{#FFD700-fg}';
        const label = action.label.substring(0, 30);
        const desc = action.description.substring(0, 50);
        out += ` ${actPrio}●{/} ${W('TRUST SIGNAL:')} ${W(label)} — ${GRY(desc)}\n`;
      }
      out += ` ${HR(92)}\n\n`;
    } else if (ww.fairScale?.error) {
      out += ` ${GRY('FairScale reputation data currently unavailable for this wallet.')}\n\n`;
    }

    // Transactions
    out += ` ${TL_BG(' RECENT TRANSACTIONS ')}  ${WW('Last 5 via Solana RPC')}\n\n`;
    out += ' ' + LBL(pad('TIME', 12)) + LBL(pad('TYPE', 10)) + LBL(pad('STATUS', 14)) + LBL('SIGNATURE') + '\n';
    out += HR(66) + '\n';
    (ww.recentTxns || []).forEach(tx => {
      const st = tx.status === 'CONFIRMED' ? GRN_BG('CONFIRMED') : RED_BG('FAILED');
      out += ' ' + WW(pad(tx.time, 12)) + C(pad(tx.type, 10)) + st + '  ' + GRY(tx.sig) + '\n';
    });
    if (!ww.recentTxns?.length) out += ` ${WW('No recent transactions found.')}\n`;
    out += `\n ${GRY('Full history: solscan.io/account/' + ww.fullAddress)}\n`;
    wltBox.setContent(out);
    wltBox.height = Math.max(32, 24 + (ww.holdings?.length || 0) + (ww.recentTxns?.length || 0) + 8);
  }

  async function loadWallet(address) {
    walletAddr = address; walletLoading = true; walletError = null;
    buildWalletTab(); screen.render();
    try {
      await loadWalletData(address);
      walletLoading = false;
    } catch (e) {
      walletLoading = false;
      walletError = e.message.substring(0, 80);
    }
    buildWalletTab(); wltScroll.setScrollPerc(0); screen.render();
  }

  // ══════════════════════════════════════════════════════════
  // F4  TOKEN
  // ══════════════════════════════════════════════════════════
  const tabToken  = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  const tokScroll = mkScroll(tabToken, { top: 0, left: 0, width: '100%', bottom: 0 });
  const tokBox    = mkBox(tokScroll, { width: '100%-2' });

  let tokenTimeframe = '1H';
  let tokenQuery = null, tokenLoading = false, tokenError = null;

  function buildTokenTab() {
    const tk  = DATA.token;
    let out   = '';
    out += OB(' TOKEN ANALYTICS') + `  ${WW(tk ? tk.symbol + ' / ' + tk.name : 'No Token Selected')}  ${tokenQuery ? GRY('i=search  r=refresh  t=change timeframe') : C('Press I to enter token')}\n`;
    out += HR(92) + '\n';

    if (!tokenQuery) {
      out += `\n ${TL_BG('NO TOKEN SELECTED')}\n\n`;
      out += ` ${WW('Enter a token mint address or symbol.')}\n\n`;
      out += ` ${C('Type')} ${W(' i ')} ${C('on your keyboard to search a token')}\n\n`;
      out += ` ${LBL('Symbols:')}  ${G('BONK')}   ${G('WIF')}   ${G('JUP')}   ${G('SOL')}   ${G('RAY')}\n`;
      out += ` ${LBL('Mint:   ')}  ${GRY('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')}\n\n`;
      
      if (DATA.tokenSocials && DATA.tokenSocials.length > 0) {
        out += `\n ${TL_BG('GLOBAL SOLANA X/TWITTER FEED')}  ${WW('Auto-updating global Solana stream')}\n\n`;
        DATA.tokenSocials.forEach(s => {
          const timeStr = s.date.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
          out += `  {#1DA1F2-fg}[${timeStr}] {/} ` + W(s.title.substring(0, 85)) + `\n`;
          out += `  ${GRY('╰─ Source: ' + s.source)}\n\n`;
        });
        out += HR(68) + '\n';
      }

      tokBox.setContent(out); 
      tokBox.height = out.split('\n').length + 2; 
      return;
    }
    if (tokenLoading) {
      if (!buildTokenTab._stopLoader) {
        buildTokenTab._stopLoader = createAnimatedLoader(screen, tokBox,
          'Fetching token data from DexScreener...',
          ['Looking up token metadata...', 'Fetching liquidity pools...', 'Pulling price history data...', 'Calculating risk profile...']);
      }
      tokBox.height = 14; return;
    }
    if (buildTokenTab._stopLoader) { buildTokenTab._stopLoader(); buildTokenTab._stopLoader = null; }
    if (tokenError) {
      out += errorBanner(tokenError);
      out += ` ${LBL('Query: ')}${C(tokenQuery)}\n\n`;
      out += ` ${WW('Press')} ${C('I')} ${WW('to try a different token')}\n`;
      tokBox.setContent(out); tokBox.height = 16; return;
    }
    if (!tk) return;

    const W1=8,  W2=12, W3=9, W4=10, W5=10, W6=11, W7=10, W8=9;

    out += `\n ${TL_BG('TOKEN OVERVIEW')}  ${WW(tk.name + '   Mint: ' + (tk.shortMint || tk.mint || '—'))}\n`;
    
    out += '  {#447766-fg}┌' + '─'.repeat(W1+1) + '┬' + '─'.repeat(W2+1) + '┬' + '─'.repeat(W3+1) + '┬' + '─'.repeat(W4+1) + '┬' + '─'.repeat(W5+1) + '┬' + '─'.repeat(W6+1) + '┬' + '─'.repeat(W7+1) + '┬' + '─'.repeat(W8+1) + '┐{/}\n';
    out += '  {#447766-fg}│{/} ' + LBL(pad('SYMBOL', W1)) + '{#447766-fg}│{/} ' + LBL(pad('PRICE', W2)) + '{#447766-fg}│{/} ' + LBL(pad('24H %', W3)) 
           + '{#447766-fg}│{/} ' + LBL(pad('MKT CAP', W4)) + '{#447766-fg}│{/} ' + LBL(pad('FDV', W5)) + '{#447766-fg}│{/} ' + LBL(pad('LIQUIDITY', W6)) + '{#447766-fg}│{/} ' + LBL(pad('VOL 24H', W7)) + '{#447766-fg}│{/} ' + LBL(pad('HOLDERS', W8)) + '{#447766-fg}│{/}\n';
    out += '  {#447766-fg}├' + '─'.repeat(W1+1) + '┼' + '─'.repeat(W2+1) + '┼' + '─'.repeat(W3+1) + '┼' + '─'.repeat(W4+1) + '┼' + '─'.repeat(W5+1) + '┼' + '─'.repeat(W6+1) + '┼' + '─'.repeat(W7+1) + '┼' + '─'.repeat(W8+1) + '┤{/}\n';
    
    const pcStr = tk.priceChange24h >= 0 
      ? `{#00FF88-fg}` + pad('+' + tk.priceChange24h.toFixed(2) + '%', W3) + `{/}` 
      : `{#FF6B6B-fg}` + pad(tk.priceChange24h.toFixed(2) + '%', W3) + `{/}`;
      
    out += '  {#447766-fg}│{/} ' + W(pad(tk.symbol.substring(0, W1), W1)) 
           + '{#447766-fg}│{/} ' + `{#00FF88-fg}{bold}${pad(fmtPrice(tk.price), W2)}{/}` 
           + '{#447766-fg}│{/} ' + pcStr
           + '{#447766-fg}│{/} ' + W(pad(tk.marketCap, W4)) 
           + '{#447766-fg}│{/} ' + W(pad(tk.fdv || tk.marketCap, W5)) 
           + '{#447766-fg}│{/} ' + WW(pad(tk.liquidity, W6)) 
           + '{#447766-fg}│{/} ' + C(pad(tk.volume24h, W7)) 
           + '{#447766-fg}│{/} ' + W(pad(String(tk.holders), W8)) + '{#447766-fg}│{/}\n';
    out += '  {#447766-fg}└' + '─'.repeat(W1+1) + '┴' + '─'.repeat(W2+1) + '┴' + '─'.repeat(W3+1) + '┴' + '─'.repeat(W4+1) + '┴' + '─'.repeat(W5+1) + '┴' + '─'.repeat(W6+1) + '┴' + '─'.repeat(W7+1) + '┴' + '─'.repeat(W8+1) + '┘{/}\n\n';

    let socCards = [];
    if (tk.socialInfo?.websites?.length) {
       socCards.push(`{#002222-bg}{#00FFFF-fg} Website {/} ${W(tk.socialInfo.websites[0].url.replace('https://',''))}`);
    }
    if (tk.socialInfo?.socials?.length) {
       tk.socialInfo.socials.forEach(s => {
          let type = s.type.toUpperCase();
          let color = type === 'TWITTER' ? '{#1DA1F2-fg}' : type === 'TELEGRAM' ? '{#0088cc-fg}' : '{#00FFFF-fg}';
          socCards.push(`{#001111-bg}${color} ${type} {/} ${W(s.url.replace('https://','').replace('http://',''))}`);
       });
    }
    if (socCards.length > 0) {
      out += ` ${TL_BG('TOKEN METADATA')}  ${WW('Verified Web & Social Links')}\n`;
      out += '  ' + socCards.join('    ') + '\n\n';
    }

    if (tk.historicalCandles && tk.historicalCandles.length > 0) {
      const maxLen = 42; 
      const slicedCandles = tk.historicalCandles.slice(-maxLen);
      
      out += ` ${TL_BG('PRICE HISTORY')}  ${WW(`Chart Timeframe: [${tokenTimeframe}] (press t to change)`)}\n`;

      const chartStr = candleChart(slicedCandles, {
        height: 14, colW: 1, gap: 1, axisW: 9, 
        axisTag: '#00AAAA-fg',
        timeframe: tokenTimeframe,
        priceChanges: tk.extPriceChange
      });
      out += chartStr + '\n';
    } else {
      out += `  {#FF6B6B-fg}(No chart data available for this timeframe. Automatically syncing...){/}\n\n`;
    }

    const buys = tk.txns?.h24?.buys || 0;
    const sells = tk.txns?.h24?.sells || 0;
    const txns24 = buys + sells || 1;
    
    const rawVol = tk.extVolume?.h24 || 0;
    const bVol = (buys / txns24) * rawVol;
    const sVol = (sells / txns24) * rawVol;
    
    const makers = Math.floor(txns24 * 0.045) || 1;
    const buyers = Math.floor(makers * (buys / txns24));
    const sellers = makers - buyers;

    const fmtNum = (v) => Math.round(v).toLocaleString();
    const fmtVol2 = (v) => {
      if (!v) return '0';
      if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
      if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
      if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
      return v.toFixed(2);
    };

    const drawSplitBar = (v1, v2, w) => {
      const top = v1 + v2 || 1;
      const L1 = Math.max(1, Math.round((v1/top) * (w - 1)));
      const L2 = Math.max(1, (w - 1) - L1);
      return `{#00FF88-fg}${'▄'.repeat(L1)}{/} {#FF6B6B-fg}${'▄'.repeat(L2)}{/}`;
    };

    out += ` ${TL_BG('24H TRANSPARENCY & FLOW')}  ${WW('Derived on-chain DEX flow')}\n`;
    
    const cw1 = 16, cw2 = 18;
    const barW = 32;
    const rw = barW + 8; // Right column width
    
    const padStr = (s, w) => s + ' '.repeat(Math.max(0, w - s.replace(/\{[\w#\/\-]+\}/g, '').length));

    const right1a = padStr(GRY(pad('BUYS', cw2)) + GRY('SELLS'), rw);
    const right1b = padStr(G(pad(fmtNum(buys), cw2)) + DN(fmtNum(sells)), rw);
    const right1c = padStr(drawSplitBar(buys, sells, barW), rw);

    const right2a = padStr(GRY(pad('BUY VOL', cw2)) + GRY('SELL VOL'), rw);
    const right2b = padStr(G(pad('$' + fmtVol2(bVol), cw2)) + DN('$' + fmtVol2(sVol)), rw);
    const right2c = padStr(drawSplitBar(bVol, sVol, barW), rw);

    const right3a = padStr(GRY(pad('BUYERS', cw2)) + GRY('SELLERS'), rw);
    const right3b = padStr(G(pad(fmtNum(buyers), cw2)) + DN(fmtNum(sellers)), rw);
    const right3c = padStr(drawSplitBar(buyers, sellers, barW), rw);

    const row1 = '  {#447766-fg}│{/} ' + LBL(pad('TXNS', cw1)) + '{#447766-fg}│{/} ' + right1a + '{#447766-fg}│{/}\n' +
                 '  {#447766-fg}│{/} ' + W(pad(fmtNum(txns24), cw1)) + '{#447766-fg}│{/} ' + right1b + '{#447766-fg}│{/}\n' +
                 '  {#447766-fg}│{/} ' + ' '.repeat(cw1) + '{#447766-fg}│{/} ' + right1c + '{#447766-fg}│{/}\n';

    const row2 = '  {#447766-fg}│{/} ' + LBL(pad('VOLUME', cw1)) + '{#447766-fg}│{/} ' + right2a + '{#447766-fg}│{/}\n' +
                 '  {#447766-fg}│{/} ' + W(pad('$' + fmtVol2(rawVol), cw1)) + '{#447766-fg}│{/} ' + right2b + '{#447766-fg}│{/}\n' +
                 '  {#447766-fg}│{/} ' + ' '.repeat(cw1) + '{#447766-fg}│{/} ' + right2c + '{#447766-fg}│{/}\n';

    const row3 = '  {#447766-fg}│{/} ' + LBL(pad('MAKERS', cw1)) + '{#447766-fg}│{/} ' + right3a + '{#447766-fg}│{/}\n' +
                 '  {#447766-fg}│{/} ' + W(pad(fmtNum(makers), cw1)) + '{#447766-fg}│{/} ' + right3b + '{#447766-fg}│{/}\n' +
                 '  {#447766-fg}│{/} ' + ' '.repeat(cw1) + '{#447766-fg}│{/} ' + right3c + '{#447766-fg}│{/}\n';

    out += `  {#447766-fg}┌${'─'.repeat(cw1+2)}┬${'─'.repeat(rw + 2)}┐{/}\n`;
    out += row1;
    out += `  {#447766-fg}├${'─'.repeat(cw1+2)}┼${'─'.repeat(rw + 2)}┤{/}\n`;
    out += row2;
    out += `  {#447766-fg}├${'─'.repeat(cw1+2)}┼${'─'.repeat(rw + 2)}┤{/}\n`;
    out += row3;
    out += `  {#447766-fg}└${'─'.repeat(cw1+2)}┴${'─'.repeat(rw + 2)}┘{/}\n\n`;

    out += ` ${TL_BG('RISK SIGNALS')}  ${WW('Derived from on-chain DEX data')}\n\n`;
    out += ' ' + LBL(pad('LEVEL', 12)) + LBL(pad('SIGNAL', 28)) + LBL('DETAIL') + '\n';
    out += HR(68) + '\n';
    (tk.riskSignals || []).forEach(rr => {
      const badge =
        rr.level === 'HIGH'   ? RED_BG('HIGH  ') :
        rr.level === 'MEDIUM' ? YEL_BG('MEDIUM') : GRN_BG('LOW   ');
      out += ' ' + badge + '  ' + W(pad(rr.label, 28)) + WW(rr.detail) + '\n';
    });
    out += HR(92) + '\n';

    // ─────────────────────── RUGCHECK SECTION ───────────────────────
    if (tk.rugCheck) {
      const rc = tk.rugCheck;
      const isGood   = rc.riskLevel === 'GOOD';
      const isDanger = rc.riskLevel === 'DANGER';
      const isWarn   = rc.riskLevel === 'WARN';

      // Badge colors
      const badgeBg   = isDanger ? '{#FF0033-bg}{white-fg}' : isWarn ? '{#FF8800-bg}{black-fg}' : '{#00AA44-bg}{white-fg}';
      const badgeText = isDanger ? '  ⚠  DANGER  ' : isWarn ? '  ⚠  WARN  ' : '  ✓  GOOD  ';
      const badgeEnd  = '{/}';

      const scoreColor = isDanger ? '{#FF6B6B-fg}' : isWarn ? '{#FFD700-fg}' : '{#00FF88-fg}';
      const lpColor    = rc.lpLockedPct >= 80 ? '{#00FF88-fg}' : rc.lpLockedPct >= 40 ? '{#FFD700-fg}' : '{#FF6B6B-fg}';

      out += `\n ${TL_BG('RUGCHECK ANALYSIS')}  ${WW('Token security audit via RugCheck.xyz')}\n\n`;

      // Score badge row
      out += `  ${badgeBg}{bold}${badgeText}{/}${badgeEnd}  `;
      out += `${scoreColor}Rug Score: ${rc.normalised} / 100{/}   `;
      const safeLpPct = Math.min(100, Math.max(0, rc.lpLockedPct));
      out += `${lpColor}LP Locked: ${safeLpPct.toFixed(2)}%{/}\n`;

      const mintStr = rc.hasMint ? RED_BG('YES') : GRN_BG(' NO');
      const freezeStr = rc.hasFreeze ? RED_BG('YES') : GRN_BG(' NO');
      
      const holdPct = rc.creatorBalance > 0 ? (rc.creatorBalance / (tk.rawSupply || 1)) * 100 : 0;
      const creatorStr = holdPct < 0.01 ? GRN_BG(' SOLD 100% ') : YEL_BG(` HOLDING ${holdPct.toFixed(1)}% `);

      out += `\n  ${LBL('Mintable:')} ${mintStr}   ${LBL('Freezable:')} ${freezeStr}   ${LBL('Creator Balance:')} ${creatorStr}\n\n`;

      if (rc.risks.length === 0) {
        out += `  {#00FF88-fg}✓ No risk factors detected{/}\n`;
      } else {
        // Risk flags table
        const rw1 = 10, rw2 = 28, rw3 = 36;
        out += '  {#447766-fg}┌' + '─'.repeat(rw1+1) + '┬' + '─'.repeat(rw2+1) + '┬' + '─'.repeat(rw3+1) + '┐{/}\n';
        out += '  {#447766-fg}│{/} ' + LBL(pad('SEVERITY', rw1)) + '{#447766-fg}│{/} ' + LBL(pad('RISK NAME', rw2)) + '{#447766-fg}│{/} ' + LBL(pad('DESCRIPTION', rw3)) + '{#447766-fg}│{/}\n';
        out += '  {#447766-fg}├' + '─'.repeat(rw1+1) + '┼' + '─'.repeat(rw2+1) + '┼' + '─'.repeat(rw3+1) + '┤{/}\n';
        rc.risks.forEach(r => {
          const lvl = (r.level || '').toLowerCase();
          const badge =
            lvl === 'danger' ? RED_BG('DANGER') :
            lvl === 'warn'   ? YEL_BG(' WARN ') :
                               GRN_BG(' INFO ');
          const nameStr = pad((r.name || '').substring(0, rw2), rw2);
          const descStr = pad((r.description || '').substring(0, rw3), rw3);
          const nameColor = lvl === 'danger' ? '{#FF6B6B-fg}' : lvl === 'warn' ? '{#FFD700-fg}' : '{#00FF88-fg}';
          out += '  {#447766-fg}│{/} ' + badge + ' {#447766-fg}│{/} ' + `${nameColor}${nameStr}{/}` + ' {#447766-fg}│{/} ' + GRY(descStr) + ' {#447766-fg}│{/}\n';
        });
        out += '  {#447766-fg}└' + '─'.repeat(rw1+1) + '┴' + '─'.repeat(rw2+1) + '┴' + '─'.repeat(rw3+1) + '┘{/}\n';
      }
      out += '\n';
    }

    out += `\n ${TL_BG('DEX LIQUIDITY POOLS')}  ${WW((tk.dexPools?.length || 0) + ' pairs via DexScreener')}\n\n`;
    out += ' ' + LBL(pad('DEX', 16)) + LBL(pad('PAIR', 20)) + LBL(pad('LIQUIDITY', 18)) + LBL('24H VOLUME') + '\n';
    out += HR(68) + '\n';
    (tk.dexPools || []).forEach(p => {
      out += ' ' + W(pad(p.dex, 16)) + WW(pad(p.pair, 20)) + G(pad(p.tvl, 18)) + C(p.volume) + '\n';
    });

    if (tk.topHolders && tk.topHolders.length > 0) {
      const sumPct = tk.topHolders.reduce((s, h) => s + h.pct, 0);
      out += `\n ${TL_BG('TOP 10 HOLDERS')}  ${WW(`Top 10 own ${sumPct.toFixed(2)}%`)}\n\n`;
      out += ' ' + LBL(pad('RANK', 8)) + LBL(pad('ADDRESS', 18)) + LBL(pad('% SHARE', 14)) + LBL(pad('AMOUNT', 16)) + LBL('VALUE (USD)') + '\n';
      out += HR(68) + '\n';
      tk.topHolders.forEach(h => {
        out += ' ' + GRY(pad('#' + h.rank, 8)) + W(pad(h.address, 18)) + G(pad(h.pct.toFixed(2) + '%', 14)) + WW(pad(fmtNum(h.amount), 16)) + C('$' + fmtVol2(h.value)) + '\n';
      });
      out += HR(68) + '\n';
    }

    if (DATA.tokenSocials && DATA.tokenSocials.length > 0) {
      out += `\n ${TL_BG('X / TWITTER FEED')}  ${WW('Aggregated via decentralized RSS')}\n\n`;
      DATA.tokenSocials.forEach(s => {
        const timeStr = s.date.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
        out += `  {#1DA1F2-fg}[${timeStr}] {/} ` + W(s.title.substring(0, 85)) + `\n`;
        out += `  ${GRY('╰─ Source: ' + s.source)}\n\n`;
      });
      out += HR(68) + '\n';
    }

    out += `\n ${GRY('Details:  dexscreener.com/solana/' + tk.mint)}\n`;
    tokBox.setContent(out);
    tokBox.height = out.split('\n').length + 2;
  }

  async function loadToken(mintOrSymbol, tf) {
    if (mintOrSymbol) tokenQuery = mintOrSymbol;
    if (tf) tokenTimeframe = tf;
    tokenLoading = true; tokenError = null;
    buildTokenTab(); screen.render();
    try {
      await loadTokenData(tokenQuery, tokenTimeframe);
      tokenLoading = false;
    } catch (e) {
      tokenLoading = false;
      tokenError = e.message.substring(0, 80);
    }
    buildTokenTab(); tokScroll.setScrollPerc(0); screen.render();
  }



  // ══════════════════════════════════════════════════════════
  // F8  NETWORK
  // ══════════════════════════════════════════════════════════
  const tabNetwork = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  const netScroll  = mkScroll(tabNetwork, { top: 0, left: 0, right: 0, bottom: 0 });
  const netBox     = mkBox(netScroll, { width: '100%-2' });

  // netHasData = true once the first successful network+geo load completes.
  // After that, we NEVER show the spinner — old data stays visible during refresh.
  let netLoading = true, netError = null, netHasData = false;

  function buildNetworkTab(fromHeartbeat = false) {
    let out = '';
    out += OB(' NETWORK STATS') + '  ' + WW('Solana blockchain  \u2502  Real-time RPC data') + '\n';
    out += HR(88) + '\n\n';

    // Only show spinner when there is truly no data yet (first boot)
    if (netLoading && !netHasData && !fromHeartbeat) {
      if (!buildNetworkTab._stopLoader) {
        buildNetworkTab._stopLoader = createAnimatedLoader(screen, netBox,
          'Fetching epoch, TPS & validators...',
          ['Querying Solana RPC for epoch info...', 'Sampling recent TPS data...', 'Fetching block time samples...', 'Loading validator gossip data...', 'Compiling supply metrics...']);
      }
      netBox.height = 12; return;
    }
    if (buildNetworkTab._stopLoader) { buildNetworkTab._stopLoader(); buildNetworkTab._stopLoader = null; }
    // Show errors only if we have no prior data to display
    if (netError && !netHasData && !fromHeartbeat) { out += errorBanner(netError); netBox.setContent(out); netBox.height = 12; return; }

    // ── VALIDATOR WORLD MAP + LEADER RIBBON ──
    out += ' ' + TL_BG(' VALIDATOR DISTRIBUTION - WORLD MAP ') + '\n';
    out += ' ' + GRY('Node positions via gossip IP geolocation  (getClusterNodes + ip-api.com)') + '\n\n';
    if (validatorGeoLoading) {
      out += '  ' + Y('Geolocating validators via IP...') + ' ' + GRY('(~5s)') + '\n\n';
    } else if (validatorGeoData === null) {
      out += '  ' + GRY('Loading on first open...') + '\n\n';
    } else if (validatorGeoData.totalNodes === 0) {
      out += '  ' + DN('Could not fetch validator node list.') + '\n\n';
    } else {
      const geo = validatorGeoData;
      const sampleSize = geo.sampleSize || 135;
      const resolvedPct = geo.geoPoints.length > 0 ? ((geo.geoPoints.length / sampleSize) * 100).toFixed(0) : 0;

      out += '  ' + C('Status') + ' ' + W('LIVE RADAR ACTIVE') + '\n\n';
      // World Radar Map (includes Leader Sidebar)
      out += buildAsciiWorldMap(geo.geoPoints, geo.leaders);
      out += '\n';

      // TOP REGIONS
      out += ' ' + TL_BG(' TOP REGIONS ') + '\n\n';
      const cols = 3, padN = 22;
      const cRows = Math.ceil((geo.countryList || []).length / cols);
      for (let r = 0; r < cRows; r++) {
        let row = '  ';
        for (let c = 0; c < cols; c++) {
          const entry = (geo.countryList || [])[r + c * cRows];
          if (entry) {
            const pct = ((entry[1] / geo.geoPoints.length) * 100).toFixed(0);
            row += C(pad(entry[0], padN)) + W(pad(String(entry[1]) + ' nodes', 12)) + progressBar(parseFloat(pct), 14) + ' ' + Y(pct + '%') + '  ';
          }
        }
        out += row + '\n';
      }
      out += '\n';
    }
    out += HR(88) + '\n\n';

    // ── STATIC STATS (only rebuilds on full refresh) ──
    const ns = DATA.networkStats || {};
    const ep  = ns.epoch     || {};
    const tps = ns.tps       || { current: 0, average: 0, maximum: 0, minimum: 0, history: [] };
    const bt  = ns.blocktime || { current: 0, average: 0, maximum: 0, minimum: 0, history: [] };
    const sp  = ns.supply    || { circulating: 0, staked: 0, total: 0, circulatingPct: 0, stakedPct: 0, epoch: 0, inflationRate: 0, stakingApy: 0 };
    const sd  = ns.stakeData || { totalStaked: '?', filterApy: '?', updated: '?' };
    const validators = ns.validators || [];
    const T = 20;

    // ── EPOCH ──
    if (ep && ep.current !== undefined) {
      out += ' ' + TL_BG('EPOCH') + '  ' + W('Epoch ' + ep.current) + '   ' + LBL('Time left:') + ' ' + C(ep.timeLeft || '?') + '   ' + LBL('Slots:') + ' ' + WW(((ep.slotsDone || 0)).toLocaleString() + ' / ' + ((ep.slotsTotal || 0)).toLocaleString()) + '\n\n';
      out += ' ' + progressBar(ep.progress || 0, 52) + '  ' + G((ep.progress || 0).toFixed(1) + '%') + '\n';
      out += ' ' + LBL('Absolute slot:') + ' ' + WW((ep.absoluteSlot || 0).toLocaleString()) + '   ' + GRY('Est. end: ' + (ep.endTime || '?')) + '\n';
      out += HR(88) + '\n\n';
    }

    // ── TPS ──
    out += ' ' + TL_BG('TPS') + '  ' + WW('Transactions per second  \u2502  Recent performance samples') + '\n\n';
    out += ' ' + LBL(pad('CURRENT', T)) + LBL(pad('AVERAGE', T)) + LBL(pad('MAX', T)) + LBL('MIN') + '\n';
    out += ' ' + G(pad(tps.current + ' TPS', T)) + C(pad(tps.average + ' TPS', T)) + Y(pad(tps.maximum + ' TPS', T)) + DN(tps.minimum + ' TPS') + '\n\n';
    if (tps.history && tps.history.length > 0) {
      out += barFillChart(
        tps.history.map(function(h) { return h.value; }),
        tps.history.map(function(h) { return h.ago.replace(' mins ago', 'm'); }),
        { height: 10, colW: 3, gap: 0, axisW: 6, colTag: '#00FF88-fg', axisTag: '#00FFFF-fg' }
      ) + '\n';
      out += ' ' + LBL(pad('INTERVAL', 14)) + LBL(pad('TPS', 10)) + LBL('DELTA') + '\n';
      out += HR(44) + '\n';
      tps.history.forEach(function(h, i) {
        const prev  = i > 0 ? tps.history[i - 1].value : h.value;
        const delta = i > 0 ? h.value - prev : 0;
        const dt    = delta > 0 ? G('+' + delta) : delta < 0 ? DN(String(delta)) : GRY('\u2500');
        out += ' ' + WW(pad(h.ago, 14)) + G(pad(String(h.value), 10)) + dt + '\n';
      });
    }
    out += HR(88) + '\n\n';

    // ── BLOCKTIME ──
    out += ' ' + TL_BG('BLOCKTIME') + '  ' + WW('Block time in milliseconds  \u2502  Recent samples') + '\n\n';
    out += ' ' + LBL(pad('CURRENT', T)) + LBL(pad('AVERAGE', T)) + LBL(pad('MAX', T)) + LBL('MIN') + '\n';
    out += ' ' + G(pad(bt.current + ' ms', T)) + C(pad(bt.average + ' ms', T)) + Y(pad(bt.maximum + ' ms', T)) + DN(bt.minimum + ' ms') + '\n\n';
    if (bt.history && bt.history.length > 0) {
      out += barFillChart(
        bt.history.map(function(h) { return parseFloat(h.value); }),
        bt.history.map(function(h) { return h.ago.replace(' mins ago', 'm'); }),
        { height: 10, colW: 3, gap: 0, axisW: 8, colTag: '#00FFFF-fg', axisTag: '#00FFFF-fg' }
      ) + '\n';
      bt.history.forEach(function(h) {
        out += ' ' + WW(pad(h.ago, 14)) + C(h.value + ' ms') + '\n';
      });
    }
    out += HR(88) + '\n\n';

    // ── VALIDATORS ──
    out += ' ' + TL_BG('VALIDATORS') + '  ' + WW('Top 10 by stake  \u2502  getVoteAccounts') + '\n\n';
    out += ' ' + LBL(pad('#', 5)) + LBL(pad('VOTE KEY', 22)) + LBL(pad('STAKE (SOL)', 18)) + LBL('COMMISSION') + '\n';
    out += HR(60) + '\n';
    validators.forEach(function(v) {
      const cc = v.commission === '100%' ? DN(v.commission) : v.commission === '0%' ? G(v.commission) : Y(v.commission);
      out += ' ' + WW(pad(v.rank + '.', 5)) + C(pad(v.name, 22)) + G(pad(v.stake, 18)) + cc + '\n';
    });
    out += HR(88) + '\n\n';

    // ── SOL SUPPLY ──
    out += ' ' + TL_BG('SOL SUPPLY') + '  ' + WW('via getSupply  \u2502  mainnet-beta') + '\n\n';
    out += ' ' + LBL(pad('Circulating:', 22)) + C(pad(sp.circulating + 'M SOL', 16)) + ' ' + progressBar(sp.circulatingPct, 28) + ' ' + Y(sp.circulatingPct + '%') + '\n';
    out += ' ' + LBL(pad('Est. Staked:', 22)) + G(pad(sp.staked + 'M SOL', 16)) + ' ' + progressBar(sp.stakedPct, 28) + ' ' + Y(sp.stakedPct + '%') + '\n';
    out += ' ' + LBL(pad('Total supply:', 22)) + W(sp.total + 'M SOL') + '\n\n';
    out += ' ' + LBL(pad('Epoch:', 22)) + WW(String(sp.epoch)) + '    ' + LBL('Inflation:') + ' ' + DN(sp.inflationRate + '%') + '\n';
    out += ' ' + LBL(pad('Est. Staking APY:', 22)) + G(sp.stakingApy + '%') + '\n';
    out += HR(88) + '\n\n';

    // ── STAKE DATA ──
    out += ' ' + TL_BG('STAKE DATA') + '\n\n';
    [['Total Est. Staked', sd.totalStaked], ['Est. Staking APY', sd.filterApy], ['Last updated', sd.updated]].forEach(function(pair) {
      out += ' ' + LBL(pad(pair[0] + ':', 24)) + WW(pair[1]) + '\n';
    });
    out += '\n ' + GRY('Last refreshed: ' + new Date().toLocaleString()) + '\n';
    netBox.setContent(out);
    netBox.height = 255;
  }

  // ── Validator Geo Loader (lazy, triggered on first F7 open) ──

  async function loadValidatorGeoData(isSilent = false) {
    if (validatorGeoLoading) return;
    validatorGeoLoading = true;
    if (!isSilent) { buildNetworkTab(); screen.render(); }
    try {
      const { fetchValidatorGeoData } = require('../api');
      validatorGeoData = await fetchValidatorGeoData();
      // ALWAYS anchor simulatedSlot to the real chain slot on (re)load
      simulatedSlot = validatorGeoData.currentSlot;
    } catch(e) {
      validatorGeoData = { totalNodes: 0, geoPoints: [], countryList: [], leaders: [] };
    } finally {
      validatorGeoLoading = false;
      buildNetworkTab(); screen.render();
    }
  }

  // ──────────────────────────────────────────────────────────────
  // HEARTBEAT ENGINE — defined HERE so buildNetworkTab and screen
  // are in scope via closure. Module-level stub above is a no-op.
  // ──────────────────────────────────────────────────────────────
  function startHeartbeat() {
    if (heartbeatInterval) return; // idempotent
    heartbeatInterval = setInterval(() => {
      try {
        if (current !== 6) return; // only run when on Network tab
        const geo = validatorGeoData;
        if (!geo || !geo.leaderSchedule || geo.leaderSchedule.length === 0) return;

        // +1 slot per 400ms tick. Leaders get 4 consecutive slots each,
        // so the displayed validator name changes every 4 ticks (~1.6 s).
        simulatedSlot += 1;

        // Re-anchor if we've exhausted the 5000-slot buffer
        const offset = simulatedSlot - geo.currentSlot;
        if (offset < 0 || offset >= geo.leaderSchedule.length) {
          simulatedSlot = geo.currentSlot;
          return; // skip render this tick
        }

        buildNetworkTab(true); // fast path: renders ribbon+map only
        screen.render();
      } catch (e) {
        // Swallow errors so interval never dies silently
      }
    }, 400);
  }

    // ══════════════════════════════════════════════════════════
    // F8  ASK AI TERMINAL ASSISTANT
    // ══════════════════════════════════════════════════════════
    const tabAI = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
    const aiLog = mkScroll(tabAI, { top: 0, left: 0, right: 0, bottom: 4 });
    
    // Status Bar for AI
    const aiStatus = blessed.box({
      parent: tabAI, bottom: 0, left: 0, width: '100%', height: 4,
      tags: true, style: { border: { fg: '#333333' } }, border: 'line',
      content: ` {#9945FF-fg}{bold}AI STATUS:{/} {#00FF88-fg}READY{/}  │  {white-fg}Powered by Groq Llama 3.3{/}\n ${W('Press "i" to ask the Solana TUI Explorer AI a question...')}`
    });

    let aiHistory = [];

    function buildAITab() {
      if (aiLog.getContent() === '') {
        aiLog.setContent(`\n ${TL_BG(' SOLANA TUI EXPLORER AI ')}  ${WW('Welcome to the Solana TUI Explorer AI assistant.')}\n\n ${GRY('Ask about Solana validator networks, accounts, tokens, or transaction errors.')}\n\n ${GRY('─────────────────────────────────────────────────────────────────────────────')}\n\n`);
      }
    }

    async function handleAIQuery(query) {
      if (!query) return;
      
      aiLog.setContent(aiLog.getContent() + ` {#00FFFF-fg}{bold}USER: ${query}{/}\n\n`);
      aiStatus.setContent(` {#9945FF-fg}{bold}AI STATUS:{/} {#FFD700-fg}THINKING...{/}\n ${GRY('Analyzing query via Groq Llama-3.3...')}`);
      screen.render();

      try {
        const { fetchAIResponse } = require('../api');
        const response = await fetchAIResponse(query, aiHistory.slice(-6));
        
        // Add to history for context
        aiHistory.push({ role: 'user', content: query });
        aiHistory.push({ role: 'assistant', content: response });

        // Pretty print response
        const formattedResp = response.match(/.{1,95}(\s|$)/g).join('\n ');
        aiLog.setContent(aiLog.getContent() + ` {#9945FF-fg}{bold}AI:{/} \n ${W(formattedResp)}\n\n ${GRY('─────────────────────────────────────────────────────────────────────────────')}\n\n`);
        aiStatus.setContent(` {#9945FF-fg}{bold}AI STATUS:{/} {#00FF88-fg}READY{/}  │  {white-fg}Tokens: ~${Math.round(response.length/4)}{/}\n ${W('Press "i" to ask another question...')}`);
      } catch (e) {
        aiLog.setContent(aiLog.getContent() + ` {#FF6B6B-fg}{bold}ERROR:{/} ${e.message}\n\n`);
        aiStatus.setContent(` {#9945FF-fg}{bold}AI STATUS:{/} {#FF6B6B-fg}ERROR{/}\n ${W('Check your GROQ_API_KEY in .env')}`);
      }
      
      aiLog.setScrollPerc(100);
      screen.render();
    }

    // ══════════════════════════════════════════════════════════
    // F9  BLOCKCHAIN EXPLORER (TX INSPECTOR)
    // ══════════════════════════════════════════════════════════
    const tabExplorer = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
    const expScroll = mkScroll(tabExplorer, { top: 0, left: 0, right: 0, bottom: 0 });
    const expBox    = mkBox(expScroll, { width: '100%-2' });

    let expTxQuery = null;

    function buildExplorerTab() {
      let out = '';
      out += Object.keys(DATA.explorer.details || {}).length > 0 ? OB(' TRANSACTION INSPECTOR') : OB(' BLOCKCHAIN EXPLORER');
      out += `  ${WW('Deep Parse | Instructions | Profiling')}  ${expTxQuery ? GRY('I=search  R=refresh') : C('Press i to enter signature')}\n`;
      out += HR(88) + '\n\n';

      if (DATA.explorer.error) {
        out += errorBanner(DATA.explorer.error) + `\n ${WW('Press')} ${C('I')} ${WW('to search another transaction.')}\n`;
        expBox.setContent(out); return;
      }

      if (DATA.explorer.loading) {
        expBox.setContent(out + `\n\n ${TL_BG(' FETCHING TRANSACTION ')}\n\n ${Y('Analyzing blocks via high-capacity public RPC...')}\n`);
        return;
      }

      if (!expTxQuery && (!DATA.explorer.list || DATA.explorer.list.length === 0)) {
        out += `\n ${TL_BG(' NETWORK ACTIVITY STREAM ')}\n\n ${WW('Fetching recent global transactions...')}\n`;
        expBox.setContent(out); return;
      }

      if (!expTxQuery) {
        out += ` ${LBL('LATEST TRANSACTIONS')}  ${GRY('(System Program Activity)')}\n`;
        out += ' ' + LBL(pad('TIME', 12)) + LBL(pad('STATUS', 10)) + LBL(pad('SLOT', 12)) + LBL('SIGNATURE') + '\n';
        out += HR(88) + '\n';
        DATA.explorer.list.forEach(tx => {
           const st = tx.status === 'SUCCESS' ? GRN_BG(' SUCCESS ') : RED_BG(' FAILE D ');
           out += ' ' + W(pad(tx.time, 12)) + st + ' ' + pad(String(tx.slot), 12) + C(tx.signature) + '\n';
        });
        out += `\n ${C('Type')} ${W(' i ')} ${C('to inspect a specific transaction deep-dive.')}\n`;
        expBox.setContent(out);
        expBox.height = 25;
        return;
      }

      const tx = DATA.explorer.details;
      if (!tx) return;

      // Overview Section
      out += ` ${TL_BG(' OVERVIEW ')}\n\n`;
      const statusBtn = tx.success ? GRN_BG(' Success ') : RED_BG(' Failed ');
      out += `  ${LBL(pad('Signature', 15))} ${C(tx.signature)}\n`;
      out += `  ${LBL(pad('Result', 15))} ${statusBtn}\n`;
      out += `  ${LBL(pad('Timestamp', 15))} ${W(tx.timestamp)}\n`;
      out += `  ${LBL(pad('Status', 15))} ${W('FINALIZED')}\n`;
      out += `  ${LBL(pad('Slot', 15))} ${W(tx.slot)}\n`;
      out += `  ${LBL(pad('Fee (SOL)', 15))} ${W('◎' + tx.fee)}\n`;
      out += `  ${LBL(pad('Compute Units', 15))} ${W(tx.cuConsumed)}\n`;
      out += `  ${LBL(pad('Version', 15))} ${W(tx.version)}\n\n`;

      // Account Inputs
      out += ` ${TL_BG(` ACCOUNT INPUT(S) (${(tx.accounts||[]).length}) `)}\n\n`;
      out += '   ' + LBL(pad('#', 3)) + LBL(pad('ADDRESS', 44)) + LBL(pad('CHANGE (SOL)', 12)) + LBL(pad('DETAILS', 20)) + '\n';
      out += ' ' + HR(80) + '\n';
      (tx.accounts || []).forEach((acc, i) => {
        let chg = String(acc.change);
        let chgClr = chg === '0' ? GRY(pad('0', 11)) : chg.startsWith('-') ? `{#FF6B6B-fg}${pad(chg, 11)}{/}` : `{#00FF88-fg}${pad('+'+chg, 11)}{/}`;
        let badges = '';
        if (acc.feePayer) badges += '{#0066CC-bg}{#FFFFFF-fg} Payer {/} ';
        if (acc.signer) badges += '{#336699-bg}{#FFFFFF-fg} Signer {/} ';
        if (acc.writable) badges += '{#800080-bg}{#FFFFFF-fg} Writable {/} ';
        if (acc.program) badges += '{#0055AA-bg}{#FFFFFF-fg} Program {/} ';
        
        out += '   ' + W(pad(String(i+1), 3)) + C(pad(acc.pubkey, 44)) + chgClr + ' ' + badges + '\n';
      });
      out += '\n';

      // Instructions
      out += ` ${TL_BG(' INSTRUCTIONS ')}\n\n`;
      (tx.instructions || []).forEach((ix) => {
        out += `   {#114422-bg}{#00FF88-fg} #${ix.index} {/} {bold}${ix.name}{/}\n`;
        out += `   ${pad(W('Program'), 25)}${C(ix.programId)}\n`;
        if (ix.parsedParams && ix.parsedParams.length > 0) {
           ix.parsedParams.forEach(p => {
              out += `   ${pad(GRY(p.key), 25)}${C(p.value)}\n`;
           });
        } else if (ix.data) {
           out += `   ${pad(GRY('Data'), 25)}${GRY(ix.data)}\n`;
        }
        out += '\n';
      });

      // Trace (Logs)
      out += ` ${TL_BG(' PROGRAM EXECUTION TRACE ')}\n\n`;
      if (!tx.logs || tx.logs.length === 0) {
         out += `   ${GRY('No logs available.')}\n\n`;
      } else {
         tx.logs.forEach(l => {
           let icon = '{white-fg}│{/} ', clrLine = l;
           if (l.includes('invoke')) { icon = `{#00FFFF-fg}> {/}`; clrLine = `{#00FFFF-fg}${l}{/}`; }
           else if (l.includes('success')) { icon = `{#00FF88-fg}* {/}`; clrLine = `{#00FF88-fg}${l}{/}`; }
           else if (l.includes('failed') || l.includes('Error')) { icon = `{#FF6B6B-fg}X {/}`; clrLine = `{#FF6B6B-fg}${l}{/}`; }
           else if (l.includes('consumed')) { icon = `{#FFD700-fg}! {/}`; clrLine = `{#FFD700-fg}${l}{/}`; }
           else if (l.includes('log:')) { icon = `{#AAAAAA-fg}i {/}`; clrLine = `{#AAAAAA-fg}${l}{/}`; }
           else if (l.includes('return')) { icon = `{#9945FF-fg}# {/}`; clrLine = `{#9945FF-fg}${l}{/}`; }
           
           out += `   ${icon} ${clrLine}\n`;
         });
         out += '\n';
      }

      // CU Profiling (Stacked Multi-Color Bar)
      out += `\n\n ${TL_BG(' COMPUTE UNIT PROFILING ')}\n\n`;
      out += `   ${LBL('Total Consumption:')} ${W(tx.cuConsumed.toLocaleString() + ' CU')}\n\n`;
      
      const BAR_WIDTH = 85;
      const MAX_CU = 1400000;
      const colors = ['#00FF88', '#00CCBB', '#0099FF', '#9945FF', '#FFD700', '#FF6B6B', '#FF00FF', '#00FFFF'];
      
      if (tx.cuUsage && tx.cuUsage.length > 0) {
         let barStr = '   ';
         let legendRows = [];
         let currentRow = '   ';

         tx.cuUsage.forEach((usage, idx) => {
            const clr = colors[idx % colors.length];
            const segW = Math.max(1, Math.round((usage.consumed / MAX_CU) * BAR_WIDTH));
            barStr += `{${clr}-bg} ${'{/}'}`.repeat(segW);
            
            const item = `{${clr}-fg}■{/} ${W('#' + (idx+1))} ${GRY(usage.consumed.toLocaleString())}`;
            
            if (currentRow.replace(/{[^}]+}/g, '').length + item.replace(/{[^}]+}/g, '').length > 82) {
               legendRows.push(currentRow);
               currentRow = '   ' + item + '    ';
            } else {
               currentRow += item + '    ';
            }
         });
         legendRows.push(currentRow);
         
         const visibleBarLen = barStr.replace(/{[^}]+}/g, '').length;
         if (visibleBarLen < BAR_WIDTH) {
            barStr += `${' '.repeat(BAR_WIDTH - visibleBarLen)}{/}`;
         }
         
         out += barStr + '\n\n' + legendRows.join('\n') + '\n';
      } else {
         const fullBar = Math.min(BAR_WIDTH, Math.round((tx.cuConsumed / MAX_CU) * BAR_WIDTH) || 5);
         out += `   {#00FF88-bg}${' '.repeat(fullBar)}{/}\n`;
      }

      expBox.setContent(out);
      expBox.height = 60 + (tx.accounts||[]).length + (tx.instructions||[]).length * 6 + (tx.logs||[]).length + 15;
    }

    async function loadExplorerDetails(sig) {
      expTxQuery = sig;
      DATA.explorer.loading = true;
      buildExplorerTab(); screen.render();
      const { loadExplorerDetails } = require('../data');
      await loadExplorerDetails(sig);
      buildExplorerTab(); screen.render();
    }

    async function refreshExplorerList() {
      expTxQuery = null;
      DATA.explorer.loading = true;
      buildExplorerTab(); screen.render();
      const { loadExplorerList } = require('../data');
      await loadExplorerList();
      buildExplorerTab(); screen.render();
    }

    // ══════════════════════════════════════════════════════════
    // F6  LITESVM LOCALHOST TESTING
    // ══════════════════════════════════════════════════════════
    const tabLocalTest = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });

    // Left List Pane for transactions
    localList = blessed.list({
      parent: tabLocalTest,
      top: 2,
      left: 1,
      width: '40%',
      bottom: 1,
      keys: true,
      vi: true,
      mouse: true,
      interactive: true,
      border: 'line',
      label: ' {#00FF88-fg}{bold}LITESVM TRANSACTIONS{/} ',
      tags: true,
      style: {
        border: { fg: '#00FF88' },
        selected: { bg: '#00FF88', fg: 'black', bold: true },
        item: { fg: 'white', bg: '#001A0D' }
      }
    });

    // Right Details Pane scroll wrapper & text box
    const localDetailScroll = mkScroll(tabLocalTest, {
      top: 2,
      right: 1,
      width: '58%',
      bottom: 1,
      border: 'line',
      style: { border: { fg: '#00FFFF' } },
      label: ' {#00FFFF-fg}{bold}TRANSACTION LOGS & DETAILS{/} ',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      interactive: true
    });
    const localDetailBox = mkBox(localDetailScroll, { width: '100%-2' });

    let localTransactions = [];
    let localSelectedIdx = 0;

    function findSessionPath() {
      const fs = require('fs');
      const path = require('path');
      
      let rawPath = CFG.LITESVM_SESSION_PATH;
      if (process.platform === 'linux' && (rawPath.startsWith('\\\\') || rawPath.startsWith('//'))) {
        let normalized = rawPath.replace(/\\/g, '/');
        normalized = normalized.replace(/^\/\/wsl\.localhost\/[^\/]+/, '');
        normalized = normalized.replace(/^\/\/wsl\$\/[^\/]+/, '');
        rawPath = normalized;
      }

      let sessionPath = path.resolve(process.cwd(), rawPath);
      if (fs.existsSync(sessionPath)) return sessionPath;

      const parentPath = path.resolve(process.cwd(), '../litesvm-session.json');
      if (fs.existsSync(parentPath)) return parentPath;

      const grandPath = path.resolve(process.cwd(), '../../litesvm-session.json');
      if (fs.existsSync(grandPath)) return grandPath;

      try {
        const parentDir = path.dirname(process.cwd());
        const siblings = fs.readdirSync(parentDir);
        for (const sibling of siblings) {
          const siblingPath = path.resolve(parentDir, sibling, 'litesvm-session.json');
          if (fs.existsSync(siblingPath)) {
            return siblingPath;
          }
        }
      } catch (e) {}

      return sessionPath;
    }

    // Load data from litesvm-session.json
    function loadLocalTestData() {
      const fs = require('fs');
      const sessionPath = findSessionPath();

      if (!fs.existsSync(sessionPath)) {
        localTransactions = [];
        buildLocalTestTabEmpty();
        return;
      }

      try {
        const fileContent = fs.readFileSync(sessionPath, 'utf8');
        const lines = fileContent.split('\n').filter(l => l.trim() !== '');
        
        localTransactions = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        }).filter(t => t !== null);

        buildLocalTestTabContent();
      } catch (err) {
        localTransactions = [];
        localDetailBox.setContent(`\n ${RED_BG('ERROR')}  {#FF6B6B-fg}Failed to read session file: ${err.message}{/}\n`);
        localDetailBox.height = 5;
        screen.render();
      }
    }

    function buildLocalTestTabEmpty() {
      localList.hide();
      localDetailScroll.hide();
      
      // Welcome helper pane
      const helpBox = blessed.box({
        parent: tabLocalTest,
        top: 2,
        left: 2,
        right: 2,
        bottom: 1,
        tags: true,
        style: BOX,
        content: `\n ${TL_BG(' LITESVM LOCAL TESTING ')}  ${WW('Record and inspect in-memory Rust test transactions')}\n\n` +
          ` ${C('Status:')} {#FF6B6B-fg}No session logs found at '${CFG.LITESVM_SESSION_PATH}'{/}\n\n` +
          ` ${WW('LiteSVM executes entirely in-memory during tests, so transaction logs disappear when tests exit.')}\n` +
          ` ${WW('To capture and view transactions here, wrap LiteSVM in your Rust test suite using our logger:')}\n\n` +
          ` ${GRY('1. Copy our wrapper module into your test suite:')}\n` +
          `    ${W('tests/litesvm_explorer.rs')}\n\n` +
          ` ${GRY('2. Use the wrapper instead of LiteSVM directly in your tests:')}\n` +
          `    {#00FF88-fg}#[test]\n` +
          `    fn test_escrow() {\n` +
          `        let mut svm = ExplorerLiteSVM::new(); // logs automatically\n` +
          `        svm.send_transaction(tx).unwrap();\n` +
          `    }{/}\n\n` +
          ` ${GRY('3. Run your tests with:')}\n` +
          `    ${W('cargo test')}\n\n` +
          ` ${WW('This tab will automatically watch the session file and render transaction CPIs & logs in real-time!')}`
      });
      tabLocalTest._helpBox = helpBox;
      screen.render();
    }

    function buildLocalTestTabContent() {
      if (tabLocalTest._helpBox) {
        tabLocalTest._helpBox.destroy();
        delete tabLocalTest._helpBox;
      }

      localList.show();
      localDetailScroll.show();

      if (localTransactions.length === 0) {
        localList.setItems([`  No transactions recorded yet  `]);
        localDetailBox.setContent(`\n ${WW('Run cargo test in your project to see transaction details.')}\n`);
        localDetailBox.height = 5;
        screen.render();
        return;
      }

      const items = localTransactions.map((tx, idx) => {
        const statusIcon = tx.status === 'Success' ? '{#00FF88-fg}✓{/}' : '{#FF6B6B-fg}✗{/}';
        const signatureShort = tx.signature.slice(0, 12) + '…' + tx.signature.signature || tx.signature.slice(-8);
        const sigFinal = tx.signature.length > 20 ? (tx.signature.slice(0, 12) + '…' + tx.signature.slice(-8)) : tx.signature;
        return `  ${statusIcon}  ${sigFinal}  ${GRY(new Date(tx.timestamp * 1000).toLocaleTimeString())}`;
      });

      localList.setItems(items);
      
      if (localSelectedIdx >= localTransactions.length) {
        localSelectedIdx = localTransactions.length - 1;
      }
      localList.select(localSelectedIdx);
      renderLocalDetail(localTransactions[localSelectedIdx]);
      screen.render();
    }

    function renderLocalDetail(tx) {
      if (!tx) {
        localDetailBox.setContent('');
        return;
      }

      const statusBg = tx.status === 'Success' ? GRN_BG(' SUCCESS ') : RED_BG(' FAILED ');
      const timeStr = new Date(tx.timestamp * 1000).toLocaleString();

      let out = '';
      out += ` ${statusBg}  ${W(tx.signature)}\n`;
      out += ` ${LBL('Execution Time:')} ${WW(timeStr)}\n`;
      out += ` ${LBL('Compute Units:')} ${Y(tx.compute_units.toLocaleString())} CU\n`;
      if (tx.error) {
        out += ` ${LBL('Error Code:')}    {#FF6B6B-fg}{bold}${tx.error}{/}\n`;
      }
      out += HR(80) + '\n\n';

      out += ` ${TL_BG(' PROGRAM EXECUTION LOGS ')}\n\n`;
      if (tx.logs && tx.logs.length > 0) {
        tx.logs.forEach(log => {
          let color = '{white-fg}';
          if (log.includes('failed')) color = '{#FF6B6B-fg}';
          else if (log.includes('success')) color = '{#00FF88-fg}';
          else if (log.includes('Instruction:')) color = '{#00FFFF-fg}{bold}';
          
          out += `  ${color}${log}{/}\n`;
        });
      } else {
        out += `  ${GRY('(No program logs generated)')}\n`;
      }

      localDetailBox.setContent(out);
      localDetailBox.height = out.split('\n').length + 5;
      localDetailScroll.setScrollPerc(0);
      screen.render();
    }

    localList.on('select item', (el, idx) => {
      localSelectedIdx = idx;
      if (localTransactions[idx]) {
        renderLocalDetail(localTransactions[idx]);
      }
    });

    // Toggle focus between Left and Right panes with Tab or Left/Right arrows
    localList.key(['tab', 'right'], () => {
      localDetailScroll.focus();
    });

    localDetailScroll.key(['tab', 'left'], () => {
      localList.focus();
    });

    localList.on('click', () => {
      localList.focus();
    });

    localDetailScroll.on('click', () => {
      localDetailScroll.focus();
    });

    // Dynamic border highlight on focus for visual clarity
    localList.on('focus', () => {
      localList.style.border.fg = '#00FF88';
      localList.setLabel(' {#00FF88-fg}{bold}LITESVM TRANSACTIONS{/} ');
      localDetailScroll.style.border.fg = '#335555';
      localDetailScroll.setLabel(' {#335555-fg}TRANSACTION LOGS & DETAILS{/} ');
      screen.render();
    });

    localList.on('blur', () => {
      localList.style.border.fg = '#224433';
      localList.setLabel(' {#224433-fg}LITESVM TRANSACTIONS{/} ');
      screen.render();
    });

    localDetailScroll.on('focus', () => {
      localDetailScroll.style.border.fg = '#00FFFF';
      localDetailScroll.setLabel(' {#00FFFF-fg}{bold}TRANSACTION LOGS & DETAILS{/} ');
      localList.style.border.fg = '#224433';
      localList.setLabel(' {#224433-fg}LITESVM TRANSACTIONS{/} ');
      screen.render();
    });

    localDetailScroll.on('blur', () => {
      localDetailScroll.style.border.fg = '#335555';
      localDetailScroll.setLabel(' {#335555-fg}TRANSACTION LOGS & DETAILS{/} ');
      screen.render();
    });

    let localInterval = null;
    let lastMtime = 0;
    let lastSize = 0;

    function watchLocalSessionFile() {
      const fs = require('fs');
      
      if (localInterval) return;

      localInterval = setInterval(() => {
        const sessionPath = findSessionPath();
        if (fs.existsSync(sessionPath)) {
          try {
            const stat = fs.statSync(sessionPath);
            const mtime = stat.mtimeMs;
            const size = stat.size;
            if (mtime !== lastMtime || size !== lastSize) {
              lastMtime = mtime;
              lastSize = size;
              loadLocalTestData();
            }
          } catch (e) {}
        } else {
          if (lastSize !== 0) {
            lastMtime = 0;
            lastSize = 0;
            loadLocalTestData();
          }
        }
      }, 1000);
    }
  
    const hints = [
      'Solana RPC stats  │  Validator World Map  │  R=refresh  │  30s auto-refresh',
      'I=enter wallet address  │  R=refresh  │  arrows=scroll',
      'I=enter token mint or symbol  │  R=refresh  │  arrows=scroll  │  T=change timeframe',
      'Ask the Solana Developer AI assistant  │  I=ask a question',
      'Blockchain deep-dive  │  I=inspect signature  │  R=refresh live feed',
      'LiteSVM session monitor  │  TAB/Arrows=switch pane  │  arrows/vi=scroll  │  R=refresh'
    ];
  const cmdBar = blessed.box({
    parent: root, bottom: 1, left: 0, width: '100%', height: 1,
    tags: true, style: BOX,
    content: `{#00FFFF-fg}▶{/} {white-fg}Connecting to Solana RPC...{/}`,
  });
  const footer = blessed.box({
    parent: root, bottom: 0, left: 0, width: '100%', height: 1,
    tags: true, style: { bg: '#003333', fg: 'white' },
  });

  // ─────────────────────────────────────────────
  // TAB MANAGEMENT
  // ─────────────────────────────────────────────
  const allTabs    = [tabNetwork, tabWallet, tabToken, tabAI, tabExplorer, tabLocalTest];
  const allScrolls = [netScroll, wltScroll, tokScroll, aiLog, expScroll, localDetailScroll];

  function activateTab(idx) {
    current = idx;
    allTabs.forEach((t, i) => (i === idx ? t.show() : t.hide()));
    activeScroll = allScrolls[idx] || null;
    if (activeScroll) activeScroll.setScrollPerc(0);

    // Lazy-load validator geo data on first Network tab open (idx 0 = F1)
    if (idx === 0 && validatorGeoData === null && !validatorGeoLoading) {
      loadValidatorGeoData();
      startHeartbeat();
    }

    if (idx === 4 && !expTxQuery && (!DATA.explorer.list || DATA.explorer.list.length === 0)) {
       refreshExplorerList();
    }

    if (idx === 5) {
      loadLocalTestData();
      watchLocalSessionFile();
      localList.focus();
    }

    const names = ['NETWORK', 'ACCOUNT', 'TOKEN', 'ASK AI', 'EXPLORER', 'LITESVM'];
    let nav = '';
    names.forEach((n, i) => {
      nav += i === idx
        ? ` {#FFFFFF-fg}{#0066CC-bg}{bold} F${i+1} ${n} {/}`
        : ` {#002222-bg}{#00FFFF-fg} F${i+1} {/}{white-fg} ${n} {/}`;
    });
    navContent.setContent(nav);

    const fLine = names.map((n, i) => `{#00FFFF-fg}{bold}F${i+1}{/} {white-fg}${n}{/}`).join('  ');
    footer.setContent(` {white-fg}${fLine}    I=input  R=refresh  ↑↓=scroll  ESC=quit   SOLANA DEV EXPLORER{/}`);
    cmdBar.setContent(`{#00FFFF-fg}▶{/} {white-fg}${hints[idx] || ''}{/}`);
    screen.render();
  }

  screen.key(['f1'], () => activateTab(0));
  screen.key(['f2'], () => activateTab(1));
  screen.key(['f3'], () => activateTab(2));
  screen.key(['f4'], () => activateTab(3));
  screen.key(['f5'], () => activateTab(4));
  screen.key(['f6'], () => activateTab(5));
  screen.key(['escape', 'q', 'Q', 'C-c'], (ch, key) => {
    if (key && key.name === 'c' && key.ctrl) return process.exit(0);
    if (activeModal) {
      activeModal.destroy();
      activeModal = null;
      screen.render();
      return;
    }
    process.exit(0);
  });

  screen.key(['i', 'I'], () => {
    if (current === 1) { // Wallet tab
      getLineInput(screen, 'Enter Solana wallet address (base58 public key):', addr => {
        if (addr) loadWallet(addr); else buildWalletTab(); screen.render();
      });
    } else if (current === 2) { // Token tab
      getLineInput(screen, 'Enter token mint address or symbol (e.g. BONK / WIF / JUP):', val => {
        if (val) loadToken(val); else buildTokenTab(); screen.render();
      });
    } else if (current === 3) { // AI tab
      getLineInput(screen, 'ASK SOLANA DEV AI:', query => {
        if (query) handleAIQuery(query);
      });
    } else if (current === 4) { // Explorer tab
      getLineInput(screen, 'Enter Transaction Signature to inspect (base58):', sig => {
        if (sig) loadExplorerDetails(sig); else refreshExplorerList();
      });
    }
  });

  screen.key(['r', 'R'], () => {
    if (current === 0) refreshNetwork();
    else if (current === 1 && walletAddr) loadWallet(walletAddr);
    else if (current === 2 && tokenQuery) loadToken(tokenQuery);
    else if (current === 3) buildAITab();
    else if (current === 4) { if (expTxQuery) loadExplorerDetails(expTxQuery); else refreshExplorerList(); }
    else if (current === 5) loadLocalTestData();
  });

  screen.key(['t', 'T'], () => {
    if (current === 2 && tokenQuery && !tokenLoading) {
      getSelectionMenu(screen, 'SELECT TIMEFRAME', ['5M', '1H', '1D'], val => {
        if (val) {
          loadToken(null, val);
        } else {
          buildTokenTab(); screen.render();
        }
      });
    }
  });

  // ─────────────────────────────────────────────
  // DATA LOADERS
  // ─────────────────────────────────────────────
  async function refreshNetwork(isSilent = false) {
    // If we already have data, refresh silently (no spinner, old data stays)
    const showSpinner = !netHasData && !isSilent;
    if (showSpinner) {
      netLoading = true; netError = null;
      buildNetworkTab(); screen.render();
    } else {
      netLoading = true; netError = null; // flag as loading but don't re-render spinner
    }
    try {
      await loadNetworkData();
      netLoading = false;
      netHasData = true; // mark that we have real data now
    } catch (e) {
      netLoading = false;
      netError = e.message.substring(0, 80);
    }
    buildNetworkTab(); screen.render();
  }

  // ─────────────────────────────────────────────
  // BOOT SEQUENCE
  // ─────────────────────────────────────────────
  activateTab(0);
  buildNetworkTab();
  buildWalletTab(); buildTokenTab(); buildAITab();
  
  // 15-minute silent resync of geo+schedule data (keeps heartbeat in sync with chain)
  setInterval(() => {
    if (!validatorGeoLoading) {
      loadValidatorGeoData(true); // silent = no loading spinner
    }
  }, 15 * 60 * 1000); // 15 minutes

  screen.render();

  // Initial data loads
  Promise.all([refreshNetwork()]).then(() => screen.render());
  setInterval(refreshNetwork, CFG.NETWORK_REFRESH_MS);
}

module.exports = { startDashboard };
