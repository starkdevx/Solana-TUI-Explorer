// =============================================
// SOLANA TERMINAL CLI — Full TUI Dashboard
// F1 MARKET  F2 PRICE  F3 WALLET  F4 TOKEN
// F5 NEWS    F6 LIVE   F7 ALERTS  F8 NETWORK
// =============================================

const blessed = require('blessed');
const contrib  = require('blessed-contrib');
const chalk    = require('chalk');
const DATA     = require('../data');
const NS       = DATA.networkStats;

// ── Formatters ───────────────────────────────
const fmtPrice = v => {
  if (v >= 1000)  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1)     return '$' + v.toFixed(2);
  if (v >= 0.01)  return '$' + v.toFixed(5);
  return '$' + v.toPrecision(4);
};
const fmtPct  = v  => (v > 0 ? '+' : '') + v.toFixed(2) + '%';
const fmtChg  = v  => { const s = v > 0 ? '+' : ''; return Math.abs(v) >= 1000 ? s + v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : s + v.toFixed(4); };
const nowTime = () => new Date().toLocaleTimeString('en-US', { hour12: false });

// ── pad RAW text BEFORE chalk — only way to keep alignment ──
const pad  = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

// ── Colors (all visible on black background) ─
const G   = s => chalk.greenBright(s);
const R   = s => chalk.redBright(s);
const Y   = s => chalk.yellow(s);
const C   = s => chalk.cyanBright(s);
const W   = s => chalk.white.bold(s);
const WW  = s => chalk.white(s);
const LBL = s => chalk.cyan(s);
const SEP = s => chalk.blue(s);
const DIM = s => chalk.dim(s);

// ── Tag helpers (for blessed tags:true boxes) ─
const tG  = s => `{green-fg}${s}{/}`;
const tR  = s => `{red-fg}${s}{/}`;
const tY  = s => `{yellow-fg}${s}{/}`;
const tC  = s => `{cyan-fg}${s}{/}`;
const tW  = s => `{white-fg}{bold}${s}{/}`;
const tWW = s => `{white-fg}${s}{/}`;

// ── Progress bar ──────────────────────────────
function progressBar(pct, width = 38) {
  const filled = Math.round(pct / 100 * width);
  return chalk.greenBright('█'.repeat(filled)) + chalk.blue('░'.repeat(width - filled));
}

// ── ASCII Line Chart ─────────────────────────
// values: number[], labels: string[], height: rows, width: chart columns
function asciiLineChart(values, labels, opts = {}) {
  const { height = 7, width = 48, colFn = chalk.greenBright, axisFn = chalk.cyan, labelFn = chalk.white, axisW = 8 } = opts;
  if (!values || values.length < 2) return '  (no data)\n';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  // toRow: value → grid row index (0 = top = max)
  const toRow = v => Math.max(0, Math.min(height - 1, Math.round((1 - (v - min) / range) * (height - 1))));

  // Build empty grid
  const grid = Array.from({ length: height }, () => Array(width).fill(' '));

  const n = values.length;
  for (let i = 0; i < n; i++) {
    const x  = Math.round(i / (n - 1) * (width - 1));
    const y  = toRow(values[i]);
    if (i === 0) {
      grid[y][x] = '●';
    } else {
      const prevI = i - 1;
      const px    = Math.round(prevI / (n - 1) * (width - 1));
      const py    = toRow(values[prevI]);

      // Fill horizontal span between prevX and x
      for (let cx = px; cx <= x; cx++) {
        const t  = (x === px) ? 1 : (cx - px) / (x - px);
        const cy = Math.round(py + (y - py) * t);
        if (cx === x) {
          grid[cy][cx] = i === n - 1 ? '◆' : '●';
        } else if (cx === px) {
          // corner char
          if      (y < py) grid[cy][cx] = '╮';
          else if (y > py) grid[cy][cx] = '╯';
          else             grid[cy][cx] = '─';
        } else {
          grid[cy][cx] = grid[cy][cx] === ' ' ? '─' : grid[cy][cx];
        }
        // vertical fill between rows
        if (cy !== py && cx > px && cx <= x) {
          const yMin = Math.min(cy, py + (cy < py ? 0 : 1));
          const yMax = Math.max(cy, py + (cy < py ? 0 : 1));
          for (let vy = yMin; vy <= yMax; vy++) {
            if (grid[vy][cx] === ' ') grid[vy][cx] = '│';
          }
        }
      }
    }
  }

  // Render rows with y-axis
  let out = '';
  for (let r = 0; r < height; r++) {
    const val = max - (r / (height - 1)) * range;
    const lbl = String(Math.round(val)).padStart(axisW - 1);
    const tick = r === height - 1 ? '┼' : '┤';
    out += axisFn(lbl) + axisFn(tick) + colFn(grid[r].join('')) + '\n';
  }
  // x-axis line
  out += ' '.repeat(axisW) + axisFn('└' + '─'.repeat(width)) + '\n';
  // x-axis labels
  if (labels && labels.length > 0) {
    const step = Math.max(1, Math.floor(width / (labels.length - 1 || 1)));
    const labelRow = ' '.repeat(axisW + 1);
    out += labelRow + labels.map((l, i) => {
      const targetX = Math.round(i / (labels.length - 1) * (width - 1));
      return l;
    }).join(labelFn(' ').repeat(Math.max(1, step - 4)));
  }
  return out;
}

// ══════════════════════════════════════════════
function startDashboard() {
  const screen = blessed.screen({
    smartCSR:    true,
    title:       'Solana Terminal',
    fullUnicode: true,
    mouse:       true,
    forceUnicode: true,
  });

  const root = blessed.box({ parent: screen, top: 0, left: 0, width: '100%', height: '100%', style: { bg: 'black' } });

  // ════════════════════════════════════════════
  // TOP BAR — clean, no blessed borders
  // ════════════════════════════════════════════

  // Row 0 — logo + ticker + clock (all pure text, no box borders)
  const topRow = blessed.box({
    parent: root, top: 0, left: 0, width: '100%', height: 1,
    tags: true, style: { bg: 'black' }
  });

  // Logo badge
  blessed.text({ parent: topRow, top: 0, left: 0, tags: true,
    content: `{black-bg}{yellow-fg}{bold} ⬡ SOLANA TERMINAL {/}{yellow-fg}│{/}` });

  // Ticker — sits to the right of logo
  const tickerBox = blessed.text({ parent: topRow, top: 0, left: 20, tags: true, content: '' });
  function refreshTicker() {
    const items = DATA.market.slice(0, 6).map(d => {
      const arrow = d.pct > 0 ? '{green-fg}▲{/}' : '{red-fg}▼{/}';
      const pctCol = d.pct > 0 ? `{green-fg}${fmtPct(d.pct)}{/}` : `{red-fg}${fmtPct(d.pct)}{/}`;
      return `{white-fg}{bold}${d.symbol}{/}{white-fg} ${fmtPrice(d.price)} ${arrow}${pctCol}{/}`;
    });
    tickerBox.setContent(items.join('  {yellow-fg}│{/}  '));
  }
  refreshTicker();

  // Clock — far right
  const clockBox = blessed.text({ parent: topRow, top: 0, right: 0, tags: true, content: '' });
  function refreshClock() {
    const now = new Date();
    const dt  = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const tm  = now.toLocaleTimeString('en-US', { hour12: false });
    clockBox.setContent(`{yellow-fg}│{/} {green-fg}◉ LIVE{/} {yellow-fg}${dt} ${tm} IST{/} {yellow-fg}│{/}{inverse} v1.0.0 {/}`);
  }
  refreshClock();
  setInterval(refreshClock, 1000);

  // Row 1 — thin yellow separator line
  const topSep = blessed.text({
    parent: root, top: 1, left: 0, width: '100%', height: 1,
    tags: true, content: `{yellow-fg}${'─'.repeat(200)}{/}`, style: { bg: 'black' }
  });

  // ════════════════════════════════════════════
  // NAV BAR — Row 2: tabs  |  Row 3: separator
  // ════════════════════════════════════════════
  const navBar = blessed.box({
    parent: root, top: 2, left: 0, width: '100%', height: 1,
    tags: true, style: { bg: 'black' }
  });
  blessed.text({ parent: navBar, top: 0, right: 0, tags: true,
    content: `{cyan-fg}HELIUS{/} {white-fg}·{/} {cyan-fg}JUPITER{/} {white-fg}·{/} {cyan-fg}BIRDEYE{/}  {green-fg}◎ MAINNET{/}` });
  const navContent = blessed.text({ parent: navBar, top: 0, left: 0, tags: true, content: '' });

  // Row 3 — thin yellow separator below nav
  const navSep = blessed.text({
    parent: root, top: 3, left: 0, width: '100%', height: 1,
    tags: true, content: `{yellow-fg}${'─'.repeat(200)}{/}`, style: { bg: 'black' }
  });

  // ════════════════════════════════════════════
  // RIGHT SIDEBAR (26 cols)
  // ════════════════════════════════════════════
  const SBW = 26;
  const sidebar = blessed.box({
    parent: root, top: 4, right: 0, width: SBW, bottom: 2,
    style: { bg: 'black' },
    border: { type: 'line', fg: 'yellow', left: true, top: false, right: false, bottom: false }
  });
  // Main pane offset stays at top:4

  const gainBox = blessed.box({ parent: sidebar, top: 0, left: 0, width: '100%', height: 10,
    label: ' {yellow-fg}▲ GAINERS{/} ', tags: true,
    border: { type: 'line', fg: 'yellow' }, style: { bg: 'black' }
  });
  function buildGainers() {
    let s = '';
    DATA.topGainers.forEach(d => {
      const bl = Math.max(0, Math.round(Math.min(d.pct / 45 * 8, 8)));
      s += W(pad(d.symbol, 8)) + G('█'.repeat(bl)) + C('░'.repeat(8 - bl)) + ' ' + G('+' + d.pct.toFixed(1) + '%') + '\n';
    });
    gainBox.setContent(s);
  }
  buildGainers();

  const lossBox = blessed.box({ parent: sidebar, top: 10, left: 0, width: '100%', height: 10,
    label: ' {yellow-fg}▼ LOSERS{/} ', tags: true,
    border: { type: 'line', fg: 'yellow' }, style: { bg: 'black' }
  });
  function buildLosers() {
    let s = '';
    DATA.topLosers.forEach(d => {
      const bl = Math.max(0, Math.round(Math.min(Math.abs(d.pct) / 15 * 8, 8)));
      s += W(pad(d.symbol, 8)) + R('█'.repeat(bl)) + C('░'.repeat(8 - bl)) + ' ' + R(d.pct.toFixed(1) + '%') + '\n';
    });
    lossBox.setContent(s);
  }
  buildLosers();

  const feedBox = blessed.box({ parent: sidebar, top: 20, left: 0, width: '100%', bottom: 0,
    label: ' {yellow-fg}● FEED{/} ', tags: true,
    border: { type: 'line', fg: 'yellow' }, style: { bg: 'black' }
  });
  const feedLog = contrib.log({
    parent: feedBox, top: 0, left: 0, width: '100%-2', height: '100%-2',
    fg: 'white', tags: true, style: { bg: 'black' }
  });

  // ════════════════════════════════════════════
  // MAIN PANE
  // ════════════════════════════════════════════
  const mainPane = blessed.box({
    parent: root, top: 4, left: 0, right: SBW, bottom: 2,
    style: { bg: 'black' }
  });

  // Track active scrollable for key routing
  let activeScroll = null;

  // Forward arrow keys to the active scrollable box
  screen.key(['up', 'k'],   () => { if (activeScroll) { activeScroll.scroll(-1); screen.render(); } });
  screen.key(['down', 'j'], () => { if (activeScroll) { activeScroll.scroll(1);  screen.render(); } });
  screen.key(['pageup'],    () => { if (activeScroll) { activeScroll.scroll(-10); screen.render(); } });
  screen.key(['pagedown'],  () => { if (activeScroll) { activeScroll.scroll(10);  screen.render(); } });
  screen.key(['home'],      () => { if (activeScroll) { activeScroll.setScrollPerc(0);   screen.render(); } });
  screen.key(['end'],       () => { if (activeScroll) { activeScroll.setScrollPerc(100); screen.render(); } });

  function makeScroll(parent, opts = {}) {
    return blessed.box({
      parent,
      scrollable:   true,
      alwaysScroll: true,
      mouse:        true,
      style: { bg: 'black', scrollbar: { bg: 'yellow' } },
      scrollbar: { ch: '│', style: { fg: 'yellow' } },
      ...opts
    });
  }

  // Tab containers
  const tabContainers = [];
  // Each tab also records its primary scrollable
  const tabScrollables = [];

  function makeTab(scrollable) {
    const t = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
    tabContainers.push(t);
    tabScrollables.push(scrollable || null); // will be set later
    return t;
  }

  // ════════════════════════════════════════════
  // F1 MARKET
  // ════════════════════════════════════════════
  const tabMarket = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabMarket);

  blessed.text({ parent: tabMarket, top: 0, left: 1, tags: true,
    content: `{yellow-fg}MARKET OVERVIEW{/}  {white-fg}— ${DATA.market.length} assets · Sorted by market cap{/}   {green-fg}⬤ LIVE{/}` });

  // Stats cards
  const statsBox = blessed.box({
    parent: tabMarket, top: 1, left: 0, right: 0, height: 6,
    tags: true, style: { bg: 'black' }, border: { type: 'line', fg: 'yellow' }
  });
  const sol = DATA.market[0];
  function buildStatsRow() {
    const [C1,C2,C3,C4] = [26,22,22,18];
    statsBox.setContent(
      ' ' + LBL(pad('SOL PRICE', C1))   + LBL(pad('DOMINANCE', C2))  + LBL(pad('NETWORK TPS', C3)) + LBL('TVL (DEFI)') + '\n' +
      ' ' + Y(pad(fmtPrice(sol.price), C1)) + C(pad('4.98%', C2))   + G(pad('4,118 /sec', C3))    + Y('$8.42B') + '\n' +
      ' ' + G(pad('▲ ' + fmtPct(sol.pct) + ' (24h)', C1)) + WW(pad('of total market cap', C2)) + WW(pad('mainnet-beta', C3)) + G('▲ +12% this wk') + '\n\n' +
      ' ' + LBL('24H HIGH: ') + G(pad(fmtPrice(sol.high), 13)) + LBL('24H LOW: ') + R(pad(fmtPrice(sol.low), 13)) + LBL('VOL: ') + C(pad('$' + sol.vol, 8)) + LBL('MCAP: ') + WW('$' + sol.mcap)
    );
  }
  buildStatsRow();

  // Market table — full scrollable
  const mktScroll = makeScroll(tabMarket, { top: 7, left: 0, right: 0, bottom: 0 });
  tabScrollables.push(mktScroll);
  const mktBox = blessed.box({ parent: mktScroll, tags: false, width: '100%', style: { bg: 'black' }, border: { type: 'line', fg: 'yellow' } });

  const MC = { sym: 9, name: 14, price: 13, pct: 12, chg: 13, vol: 9, mcap: 9 };
  function buildMarketTable() {
    let out =
      ' ' + LBL(pad('SYMBOL',  MC.sym))  + LBL(pad('NAME',   MC.name)) + LBL(pad('PRICE',  MC.price)) +
             LBL(pad('24H %',   MC.pct)) + LBL(pad('CHANGE', MC.chg))  + LBL(pad('VOLUME', MC.vol))   + LBL(pad('MKT CAP', MC.mcap)) + LBL(' 7D CHART') + '\n';
    out += SEP(' ' + '─'.repeat(96)) + '\n';
    DATA.market.forEach(d => {
      const isUp = d.pct > 0;
      const col  = isUp ? chalk.greenBright : chalk.redBright;
      const spark = DATA.sparklines[d.symbol] || '▄▄▄▄▄▄▄▄▄▄▄▄';
      out +=
        ' ' + W(pad(d.symbol, MC.sym))                          +
        WW(pad((d.name || '').substring(0, 12), MC.name))       +
        W(pad(fmtPrice(d.price), MC.price))                     +
        col(pad((isUp ? '▲ ' : '▼ ') + fmtPct(d.pct), MC.pct))+
        col(pad(fmtChg(d.change), MC.chg))                      +
        WW(pad('$' + d.vol, MC.vol))                            +
        WW(pad('$' + d.mcap, MC.mcap))                         +
        ' ' + (isUp ? G(spark) : R(spark)) + '\n';
      out += SEP(' ' + '─'.repeat(96)) + '\n';
    });
    mktBox.setContent(out);
    mktBox.height = DATA.market.length * 2 + 4;
  }
  buildMarketTable();

  // ════════════════════════════════════════════
  // F2 PRICE
  // ════════════════════════════════════════════
  const tabPrice = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabPrice);

  const priceScroll = makeScroll(tabPrice, { top: 0, left: 0, right: 0, bottom: 0 });
  tabScrollables.push(priceScroll);
  const priceInner = blessed.box({ parent: priceScroll, tags: false, width: '100%', style: { bg: 'black' } });

  function buildPriceTab() {
    const d    = DATA.market[0];
    const isUp = d.pct > 0;
    const col  = isUp ? chalk.greenBright : chalk.redBright;
    const PH   = { sym: 20, price: 16, chg: 14, high: 14, low: 14, vol: 12 };
    let out = '';

    out += Y(' PRICE DETAIL') + WW('  — SOL / USD · All Exchanges') + '\n';
    out += SEP(' ' + '═'.repeat(90)) + '\n';

    // Hero stats
    out += '\n ' + LBL(pad('SYMBOL', PH.sym)) + LBL(pad('LAST PRICE', PH.price)) + LBL(pad('24H CHANGE', PH.chg)) + LBL(pad('24H HIGH', PH.high)) + LBL(pad('24H LOW', PH.low)) + LBL('VOLUME') + '\n';
    out += ' ' + W(pad('SOL / USD', PH.sym)) + W(pad(fmtPrice(d.price), PH.price)) + col(pad((isUp ? '▲ ' : '▼ ') + fmtPct(d.pct), PH.chg)) + G(pad(fmtPrice(d.high), PH.high)) + R(pad(fmtPrice(d.low), PH.low)) + C('$' + d.vol) + '\n';
    out += ' ' + WW(pad('Solana · Binance', PH.sym)) + WW(pad('vs USD closing', PH.price)) + WW(pad('intraday', PH.chg)) + WW(pad('24h intraday', PH.high)) + '\n';
    out += '\n ' + LBL('MKT CAP: ') + W('$' + d.mcap + '    ') + LBL('DOMINANCE: ') + C('4.98%') + '    ' + LBL('CHANGE $: ') + col('$' + Math.abs(d.change).toFixed(2)) + '\n';
    out += SEP('\n ' + '─'.repeat(90)) + '\n';

    // ASCII chart
    out += '\n ' + Y(' SOL/USD — 24H INTRADAY CHART') + '\n\n';
    out += WW('  145.20 ') + G('┤') + ' '.repeat(44) + G('╭─╮') + '\n';
    out += WW('  143.80 ') + G('┤') + ' '.repeat(39) + G('╭───╯  │') + '\n';
    out += WW('  142.37 ') + G('┤──────────────────────────────────────╯') + '       ' + Y('╰── ← NOW') + '\n';
    out += WW('  141.20 ') + G('┤') + ' '.repeat(29) + G('╭────────╯') + '\n';
    out += WW('  139.60 ') + G('┤') + ' '.repeat(16) + G('╭──╮') + ' '.repeat(9) + G('│') + '\n';
    out += WW('  138.90 ') + G('┤') + ' '.repeat(7)  + G('╭──╮     │  │    ╭───╯') + '\n';
    out += WW('  137.40 ') + G('┤') + ' '.repeat(2)  + G('╭────╯  ╰─────╯  ╰────╯') + '\n';
    out += WW('  136.00 ') + G('┼───╯') + '\n';
    out += WW('           └' + '─'.repeat(50)) + '\n';
    out += C('           00:00  04:00  08:00  12:00  16:00  20:00  22:59') + '\n';
    out += SEP('\n ' + '─'.repeat(90)) + '\n';

    // Exchange breakdown
    out += '\n ' + Y(' EXCHANGE BREAKDOWN') + '\n\n';
    const EC = { name: 14, price: 15, pct: 14, vol: 12 };
    out += ' ' + LBL(pad('EXCHANGE', EC.name)) + LBL(pad('PRICE', EC.price)) + LBL(pad('24H %', EC.pct)) + LBL('VOLUME') + '\n';
    out += SEP(' ' + '─'.repeat(55)) + '\n';
    DATA.priceExchanges.forEach(e => {
      const c = e.pct > 0 ? chalk.greenBright : chalk.redBright;
      out += ' ' + W(pad(e.name, EC.name)) + WW(pad('$' + e.price.toFixed(2), EC.price)) + c(pad(fmtPct(e.pct), EC.pct)) + C(e.vol) + '\n';
    });

    priceInner.setContent(out);
    priceInner.height = 45;
  }
  buildPriceTab();

  // ════════════════════════════════════════════
  // F3 WALLET
  // ════════════════════════════════════════════
  const tabWallet = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabWallet);

  const wltScroll = makeScroll(tabWallet, { top: 0, left: 0, right: 0, bottom: 0 });
  tabScrollables.push(wltScroll);
  const wltInner = blessed.box({ parent: wltScroll, tags: false, width: '100%', style: { bg: 'black' } });

  const ww = DATA.wallet;
  function buildWalletTab() {
    let out = '';
    out += Y(' WALLET INSIGHTS') + WW('  — Portfolio analytics · PnL · Transactions') + '\n';
    out += SEP(' ' + '═'.repeat(90)) + '\n\n';

    // Address + balance header
    out += ' ' + LBL('ADDRESS:  ') + C(ww.fullAddress) + '\n\n';
    const [WC1, WC2, WC3] = [32, 28, 28];
    out += ' ' + LBL(pad('PORTFOLIO VALUE', WC1)) + LBL(pad('PNL TODAY', WC2)) + LBL('PNL (30D)') + '\n';
    out += ' ' + Y(W(pad('$' + ww.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 }), WC1))) +
           G(pad('+$' + ww.pnl.day.toFixed(2) + ' (+' + ww.pnl.dayPct.toFixed(2) + '%)', WC2)) +
           G('+$' + ww.pnl.month.toFixed(2) + ' (+' + ww.pnl.monthPct.toFixed(2) + '%)') + '\n';
    out += SEP('\n ' + '─'.repeat(90)) + '\n';

    // Holdings
    out += '\n ' + Y(' HOLDINGS') + '\n\n';
    const HC = { tok: 10, amt: 18, val: 14, pct: 7 };
    out += ' ' + LBL(pad('TOKEN', HC.tok)) + LBL(pad('AMOUNT', HC.amt)) + LBL(pad('VALUE', HC.val)) + LBL(pad('%', HC.pct)) + LBL('BAR          ') + LBL('24H CHG') + '\n';
    out += SEP(' ' + '─'.repeat(76)) + '\n';
    ww.holdings.forEach(h => {
      const col  = h.change > 0 ? chalk.greenBright : h.change < 0 ? chalk.redBright : chalk.white;
      const bLen = Math.round(h.pct / 100 * 10);
      out += ' ' + W(pad(h.token, HC.tok)) + WW(pad(String(h.amount), HC.amt)) +
             W(pad('$' + h.value.toLocaleString('en-US', { maximumFractionDigits: 2 }), HC.val)) +
             WW(pad(h.pct + '%', HC.pct)) + Y('█'.repeat(bLen)) + C('░'.repeat(10 - bLen)) + '  ' + col(fmtPct(h.change)) + '\n';
    });
    out += SEP('\n ' + '─'.repeat(90)) + '\n';

    // Transactions
    out += '\n ' + Y(' RECENT TRANSACTIONS') + '\n\n';
    const TC = { time: 10, type: 9, from: 17, to: 17, status: 12 };
    out += ' ' + LBL(pad('TIME', TC.time)) + LBL(pad('TYPE', TC.type)) + LBL(pad('FROM', TC.from)) + LBL(pad('TO', TC.to)) + LBL(pad('STATUS', TC.status)) + LBL('SIG') + '\n';
    out += SEP(' ' + '─'.repeat(82)) + '\n';
    const tColors = { SWAP: chalk.cyanBright, BUY: chalk.greenBright, SELL: chalk.redBright, STAKE: chalk.yellow, RECEIVE: chalk.magentaBright };
    ww.recentTxns.forEach(tx => {
      const tc = tColors[tx.type] || chalk.white;
      out += ' ' + WW(pad(tx.time, TC.time)) + tc(pad(tx.type, TC.type)) + WW(pad(tx.from, TC.from)) + WW(pad('→ ' + tx.to, TC.to)) + G(pad(tx.status, TC.status)) + C(tx.sig) + '\n';
    });

    wltInner.setContent(out);
    wltInner.height = 50;
  }
  buildWalletTab();

  // ════════════════════════════════════════════
  // F4 TOKEN
  // ════════════════════════════════════════════
  const tabToken = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabToken);

  const tokScroll = makeScroll(tabToken, { top: 0, left: 0, right: 0, bottom: 0 });
  tabScrollables.push(tokScroll);
  const tokInner = blessed.box({ parent: tokScroll, tags: false, width: '100%', style: { bg: 'black' } });

  const tk = DATA.token;
  function buildTokenTab() {
    let out = '';
    out += Y(' TOKEN ANALYTICS') + WW('  — ' + tk.symbol + ' · ' + tk.name) + '\n';
    out += SEP(' ' + '═'.repeat(90)) + '\n\n';

    // Hero
    const TK = { f1: 20, f2: 14, f3: 14, f4: 14, f5: 12 };
    out += ' ' + LBL(pad('TOKEN', TK.f1)) + LBL(pad('PRICE', TK.f2)) + LBL(pad('MKT CAP', TK.f3)) + LBL(pad('VOL 24H', TK.f4)) + LBL(pad('LIQUIDITY', TK.f5)) + LBL('HOLDERS') + '\n';
    out += ' ' + W(pad(tk.symbol + ' — ' + tk.name, TK.f1)) + W(pad(fmtPrice(tk.price), TK.f2)) + W(pad(tk.marketCap, TK.f3)) + C(pad(tk.volume24h, TK.f4)) + G(pad(tk.liquidity, TK.f5)) + WW(tk.holders) + '\n';
    out += ' ' + C(pad(tk.shortMint, TK.f1)) + G('▲ +' + tk.priceChange24h.toFixed(2) + '% (24h)') + '\n';
    out += '\n ' + LBL('FDV: ') + WW(pad(tk.fdv, 14)) + LBL('SUPPLY: ') + WW(pad(tk.supply, 14)) + LBL('VOL 7D: ') + C(tk.volume7d) + '\n';
    out += SEP('\n ' + '─'.repeat(90)) + '\n';

    // Risk signals
    out += '\n ' + Y(' RISK SIGNALS') + '\n\n';
    const RSK = { lvl: 9, signal: 24 };
    out += ' ' + LBL(pad('LEVEL', RSK.lvl)) + LBL(pad('SIGNAL', RSK.signal)) + LBL('DETAIL') + '\n';
    out += SEP(' ' + '─'.repeat(62)) + '\n';
    tk.riskSignals.forEach(rr => {
      const badge = rr.level === 'HIGH'   ? chalk.bgRed.black(' HIGH   ') :
                    rr.level === 'MEDIUM' ? chalk.bgYellow.black(' MEDIUM ') :
                    chalk.bgGreen.black(' LOW    ');
      out += ' ' + badge + '  ' + W(pad(rr.label, RSK.signal - 2)) + WW(rr.detail) + '\n';
    });
    out += SEP('\n ' + '─'.repeat(90)) + '\n';

    // Top holders
    out += '\n ' + Y(' TOP HOLDERS') + '\n\n';
    const HL = { rank: 7, addr: 16, label: 22, pct: 7 };
    out += ' ' + LBL(pad('RANK', HL.rank)) + LBL(pad('ADDRESS', HL.addr)) + LBL(pad('LABEL', HL.label)) + LBL(pad('PCT', HL.pct)) + LBL('STAKE BAR') + '\n';
    out += SEP(' ' + '─'.repeat(70)) + '\n';
    tk.topHolders.forEach(h => {
      const bLen = Math.round(h.pct * 2);
      out += ' ' + WW(pad('#' + h.rank, HL.rank)) + C(pad(h.address, HL.addr)) + WW(pad(h.label, HL.label)) + Y(pad(h.pct + '%', HL.pct)) + Y('█'.repeat(bLen)) + C('░'.repeat(Math.max(0, 16 - bLen))) + '\n';
    });
    out += SEP('\n ' + '─'.repeat(90)) + '\n';

    // DEX pools
    out += '\n ' + Y(' DEX POOLS') + '\n\n';
    const PL = { dex: 13, pair: 14, tvl: 14 };
    out += ' ' + LBL(pad('DEX', PL.dex)) + LBL(pad('PAIR', PL.pair)) + LBL(pad('TVL', PL.tvl)) + LBL('VOLUME') + '\n';
    out += SEP(' ' + '─'.repeat(52)) + '\n';
    tk.dexPools.forEach(p => {
      out += ' ' + W(pad(p.dex, PL.dex)) + WW(pad(p.pair, PL.pair)) + G(pad(p.tvl, PL.tvl)) + C(p.volume) + '\n';
    });

    tokInner.setContent(out);
    tokInner.height = 65;
  }
  buildTokenTab();

  // ════════════════════════════════════════════
  // F5 NEWS
  // ════════════════════════════════════════════
  const tabNews = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabNews);

  const newsScroll = makeScroll(tabNews, { top: 0, left: 0, right: 0, bottom: 0 });
  tabScrollables.push(newsScroll);
  const newsInner = blessed.box({ parent: newsScroll, tags: false, width: '100%', style: { bg: 'black' } });

  function buildNewsTab() {
    const tagBg = { WHALE: chalk.bgCyan.black, SWAP: chalk.bgMagenta.black, DATA: chalk.bgBlue.white,
                    SOCIAL: chalk.bgWhite.black, DEFI: chalk.bgGreen.black, NEW: chalk.bgYellow.black, CEX: chalk.bgRed.white };
    let out = '';
    out += Y(' TERMINAL NEWS & SIGNALS') + WW('  — ' + DATA.news.length + ' items · Sorted by recency') + '\n';
    out += SEP(' ' + '═'.repeat(100)) + '\n\n';
    out += ' ' + LBL(pad('TIME', 7)) + LBL(pad('TAG', 10)) + LBL(pad('SOURCE', 14)) + LBL('  HEADLINE') + '\n';
    out += SEP(' ' + '─'.repeat(100)) + '\n';
    DATA.news.forEach(n => {
      const bg   = tagBg[n.tag] || chalk.bgWhite.black;
      const prio = n.priority === 'high' ? R('●') : n.priority === 'medium' ? Y('○') : WW('·');
      out += ' ' + WW(pad(n.time, 7)) + bg(' ' + pad(n.tag, 7) + ' ') + '  ' + C(pad(n.source, 13)) + prio + '  ' + WW(n.text) + '\n';
      out += SEP(' ' + '─'.repeat(100)) + '\n';
    });
    newsInner.setContent(out);
    newsInner.height = DATA.news.length * 2 + 8;
  }
  buildNewsTab();

  // ════════════════════════════════════════════
  // F6 LIVE
  // ════════════════════════════════════════════
  const tabLive = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabLive);

  blessed.text({ parent: tabLive, top: 0, left: 1, tags: true,
    content: `{red-fg}● LIVE MODE{/}  {white-fg}— Streaming all on-chain events · mainnet-beta{/}` });

  const liveHero = blessed.box({ parent: tabLive, top: 1, left: 0, right: 0, height: 4,
    tags: true, style: { bg: 'black' }, border: { type: 'line', fg: 'yellow' }
  });
  liveHero.setContent(
    ' ' + tC(pad('STREAMING ASSET', 28)) + tC(pad('CURRENT PRICE', 24)) + tC('STATUS') + '\n' +
    ' ' + tY(tW(pad('SOL / USD', 28))) + tG(tW(pad('$142.37', 24))) + tG('● CONNECTED — mainnet-beta') + '\n' +
    ' ' + tWW('All DEX activity · whale alerts · snipes · new tokens')
  );

  const liveFull = contrib.log({
    parent: tabLive, top: 5, left: 0, right: 0, bottom: 0,
    fg: 'white', tags: true,
    border: { type: 'line', fg: 'yellow' },
    label: ' LIVE TX STREAM — ↑↓ to scroll ',
    style: { bg: 'black' },
    scrollable: true, mouse: true,
    scrollbar: { ch: '│', style: { fg: 'yellow' } }
  });
  tabScrollables.push(null); // F6 uses contrib.log which handles its own scroll

  // ════════════════════════════════════════════
  // F7 ALERTS
  // ════════════════════════════════════════════
  const tabAlerts = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabAlerts);

  const altScroll = makeScroll(tabAlerts, { top: 0, left: 0, right: 0, bottom: 0 });
  tabScrollables.push(altScroll);
  const altInner = blessed.box({ parent: altScroll, tags: false, width: '100%', style: { bg: 'black' } });

  function buildAlertsTab() {
    const triggered = DATA.alerts.filter(a => a.triggered).length;
    const active    = DATA.alerts.filter(a => !a.triggered).length;
    let out = '';
    out += Y(' SMART ALERTS') + WW('  — Configured triggers · Auto-fire on conditions') + '\n';
    out += SEP(' ' + '═'.repeat(90)) + '\n\n';
    out += ' ' + WW('TOTAL: ') + Y(String(DATA.alerts.length)) + '     ' + G('● ACTIVE: ' + active) + '     ' + R('● TRIGGERED: ' + triggered) + '\n';
    out += ' ' + WW('Alerts fire automatically in real-time. Use  st alerts add SOL>150  to create new alert.') + '\n';
    out += SEP('\n ' + '─'.repeat(90)) + '\n\n';

    const AL = { id: 9, tok: 8, cond: 26, created: 18, status: 10 };
    out += ' ' + LBL(pad('ID', AL.id)) + LBL(pad('TOKEN', AL.tok)) + LBL(pad('CONDITION', AL.cond)) + LBL(pad('CREATED', AL.created)) + LBL(pad('STATUS', AL.status)) + LBL('FIRED AT') + '\n';
    out += SEP(' ' + '─'.repeat(85)) + '\n';
    DATA.alerts.forEach(a => {
      const badge = a.status === 'ACTIVE' ? chalk.bgGreen.black(' ACTIVE  ') : chalk.bgRed.white(' FIRED   ');
      out += ' ' + WW(pad(a.id, AL.id)) + W(pad(a.token, AL.tok)) + WW(pad(a.condition, AL.cond)) + WW(pad(a.created, AL.created)) + badge + '  ' + (a.triggeredAt ? R(a.triggeredAt) : DIM('—')) + '\n';
    });

    altInner.setContent(out);
    altInner.height = DATA.alerts.length + 12;
  }
  buildAlertsTab();

  // ════════════════════════════════════════════
  // F8 NETWORK — DNS CLI data stats
  // ════════════════════════════════════════════
  const tabNetwork = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, style: { bg: 'black' } });
  tabContainers.push(tabNetwork);

  const netScroll = makeScroll(tabNetwork, { top: 0, left: 0, right: 0, bottom: 0 });
  tabScrollables.push(netScroll);
  const netInner = blessed.box({ parent: netScroll, tags: false, width: '100%', style: { bg: 'black' } });

  function buildNetworkTab() {
    const ep  = NS.epoch;
    const tps = NS.tps;
    const bt  = NS.blocktime;
    const sp  = NS.supply;
    const sd  = NS.stakeData;
    let out   = '';

    out += Y(' NETWORK STATS') + WW('  — Solana blockchain real-time network data') + '\n';
    out += SEP(' ' + '═'.repeat(92)) + '\n\n';

    // ── EPOCH ─────────────────────────────────
    out += ' ' + chalk.bgYellow.black(' EPOCH ') + ' ' + W('Current Epoch: ' + ep.current) + '   ' + LBL('Time Left: ') + C(ep.timeLeft) + '   ' + LBL('Slots Done: ') + WW(ep.slotsDone.toLocaleString() + ' / ' + ep.slotsTotal.toLocaleString()) + '\n';
    out += '\n ' + progressBar(ep.progress, 50) + '  ' + Y(ep.progress.toFixed(1) + '%') + '\n';
    out += ' ' + LBL('Started: ') + WW(ep.startTime) + '   ' + LBL('Ends: ') + WW(ep.endTime) + '\n';
    out += SEP('\n ' + '─'.repeat(92)) + '\n\n';

    // ── TPS ────────────────────────────────────
    out += ' ' + chalk.bgGreen.black(' TPS ') + '  ' + WW('SOLANA NETWORK TPS — Last 1 Hour') + '\n\n';
    const [TC1, TC2, TC3, TC4] = [20, 20, 20, 18];
    // Stats row
    out += ' ' + LBL(pad('CURRENT', TC1)) + LBL(pad('AVERAGE', TC2)) + LBL(pad('MAX', TC3)) + LBL('MIN') + '\n';
    out += ' ' + G(pad(tps.current + ' TPS', TC1)) + C(pad(tps.average + ' TPS', TC2)) + Y(pad(tps.maximum + ' TPS', TC3)) + R(tps.minimum + ' TPS') + '\n\n';

    // Proper line chart
    const tpsVals   = tps.history.map(h => h.value);
    const tpsLabels = tps.history.map((h, i) => (i % 3 === 0 ? h.ago.replace(' mins ago','m') : '  '));
    out += asciiLineChart(tpsVals, tpsLabels, {
      height: 7, width: 52, axisW: 7,
      colFn: chalk.greenBright, axisFn: chalk.cyan, labelFn: chalk.white
    });
    out += '\n';
    // Data table below chart
    out += ' ' + LBL(pad('TIME AGO', 14)) + LBL(pad('TPS', 8)) + LBL('TREND') + '\n';
    out += SEP(' ' + '─'.repeat(55)) + '\n';
    tps.history.forEach((h, i) => {
      const prev  = i > 0 ? tps.history[i-1].value : h.value;
      const trend = h.value > prev ? G('▲') : h.value < prev ? R('▼') : WW('─');
      const delta = i > 0 ? (h.value - prev > 0 ? G('+' + (h.value - prev)) : R(String(h.value - prev))) : WW(' —');
      out += ' ' + WW(pad(h.ago, 14)) + G(pad(String(h.value), 8)) + trend + '  ' + delta + '\n';
    });
    out += SEP('\n ' + '─'.repeat(92)) + '\n\n';

    // ── BLOCKTIME ──────────────────────────────
    out += ' ' + chalk.bgCyan.black(' BLOCKTIME ') + '  ' + WW('BLOCK TIME — Last 1 Hour') + '\n\n';
    out += ' ' + LBL(pad('CURRENT', TC1)) + LBL(pad('AVERAGE', TC2)) + LBL(pad('MAX', TC3)) + LBL('MIN') + '\n';
    out += ' ' + G(pad(bt.current + ' ms', TC1)) + C(pad(bt.average + ' ms', TC2)) + Y(pad(bt.maximum + ' ms', TC3)) + R(bt.minimum + ' ms') + '\n\n';

    // Proper line chart
    const btVals   = bt.history.map(h => parseFloat(h.value));
    const btLabels = bt.history.map((h, i) => (i % 3 === 0 ? h.ago.replace(' mins ago','m') : '  '));
    out += asciiLineChart(btVals, btLabels, {
      height: 7, width: 52, axisW: 8,
      colFn: chalk.cyanBright, axisFn: chalk.cyan, labelFn: chalk.white
    });
    out += '\n';
    // Data table
    out += ' ' + LBL(pad('TIME AGO', 14)) + LBL(pad('BLOCKTIME', 14)) + LBL('TREND') + '\n';
    out += SEP(' ' + '─'.repeat(55)) + '\n';
    bt.history.forEach((h, i) => {
      const prev  = i > 0 ? parseFloat(bt.history[i-1].value) : parseFloat(h.value);
      const curr  = parseFloat(h.value);
      const trend = curr < prev ? G('▲ faster') : curr > prev ? R('▼ slower') : WW('─ stable');
      out += ' ' + WW(pad(h.ago, 14)) + C(pad(h.value, 14)) + trend + '\n';
    });
    out += SEP('\n ' + '─'.repeat(92)) + '\n\n';

    // ── VALIDATORS ─────────────────────────────
    out += ' ' + chalk.bgMagenta.black(' VALIDATORS ') + '  ' + WW('TOP 10 SOLANA VALIDATORS BY STAKE') + '\n\n';
    const VL = { rank: 5, name: 22, stake: 12, commission: 13 };
    out += ' ' + LBL(pad('#', VL.rank)) + LBL(pad('VALIDATOR', VL.name)) + LBL(pad('STAKE', VL.stake)) + LBL(pad('COMMISSION', VL.commission)) + LBL('DELEGATORS') + '\n';
    out += SEP(' ' + '─'.repeat(68)) + '\n';
    NS.validators.forEach(v => {
      const commColor = v.commission === '100%' ? chalk.redBright : v.commission === '0%' ? chalk.greenBright : chalk.yellow;
      out += ' ' + WW(pad(String(v.rank) + '.', VL.rank)) + W(pad(v.name, VL.name)) + G(pad(v.stake + ' SOL', VL.stake)) + commColor(pad(v.commission, VL.commission)) + C(v.delegators) + '\n';
    });
    out += SEP('\n ' + '─'.repeat(92)) + '\n\n';

    // ── SOL SUPPLY ─────────────────────────────
    out += ' ' + chalk.bgBlue.white(' SOL SUPPLY ') + '  ' + WW('SOLANA SUPPLY & STAKE DATA') + '\n\n';
    out += ' ' + LBL(pad('Circulating Supply:', 22)) + C(pad(sp.circulating + 'M SOL', 16)) + progressBar(sp.circulatingPct, 28) + '  ' + Y(sp.circulatingPct + '%') + '\n';
    out += ' ' + LBL(pad('Active Staked SOL:',  22)) + G(pad(sp.staked + 'M SOL', 16))      + progressBar(sp.stakedPct, 28)      + '  ' + Y(sp.stakedPct + '%') + '\n';
    out += ' ' + LBL(pad('Total SOL Supply:',   22)) + W(sp.total + 'M SOL') + '\n\n';
    const [SC1, SC2, SC3] = [22, 22, 20];
    out += ' ' + LBL(pad('Epoch:', SC1)) + WW(pad(String(sp.epoch), SC2)) + LBL('Inflation Rate:') + '\n';
    out += ' ' + Y(pad(String(sp.epoch), SC1)) + LBL(pad('Staking APY:', SC2)) + R(sp.inflationRate + '%') + '\n';
    out += ' ' + LBL(pad('', SC1)) + G(sp.stakingApy + '%') + '\n';
    out += SEP('\n ' + '─'.repeat(92)) + '\n\n';

    // ── STAKE DATA ─────────────────────────────
    out += ' ' + chalk.bgYellow.black(' STAKE DATA ') + '  ' + WW('SOLANA NETWORK STAKING STATISTICS') + '\n\n';
    const sArr = [
      ['TOTAL STAKED',   sd.totalStaked + ' (' + sd.totalStakedUsd + ')'],
      ['ACTIVE STAKERS', sd.activeStakers],
      ['UNIQUE WALLETS', sd.uniqueWallets],
      ['BIGGEST STAKE',  sd.biggestStake],
      ['MEDIAN STAKE',   sd.medianStake],
      ['MEAN STAKE',     sd.meanStake],
      ['FILTER APY',     sd.filterApy],
      ['UPDATED',        sd.updated],
    ];
    sArr.forEach(([lbl, val]) => {
      out += ' ' + LBL(pad(lbl + ':', 20)) + WW(val) + '\n';
    });
    out += SEP('\n ' + '─'.repeat(92)) + '\n\n';

    // ── STAKE GRAPH ────────────────────────────
    out += ' ' + chalk.bgGreen.black(' STAKE GRAPH ') + '  ' + WW('STAKED SOL OVER EPOCHS') + '\n\n';

    // Line chart of epoch stake growth
    const sgVals   = NS.stakeGraph.map(g => g.sol);
    const sgLabels = NS.stakeGraph.map((g, i) => {
      if (i === 0 || i === NS.stakeGraph.length - 1) return String(g.epoch);
      if (i % 3 === 0) return String(g.epoch);
      return '    ';
    });
    out += asciiLineChart(sgVals, sgLabels, {
      height: 7, width: 52, axisW: 8,
      colFn: chalk.greenBright, axisFn: chalk.cyan, labelFn: chalk.white
    });
    out += '\n';
    // Compact epoch table below chart
    const sgMax = Math.max(...NS.stakeGraph.map(g => g.sol));
    out += ' ' + LBL(pad('EPOCH', 9)) + LBL(pad('STAKED SOL', 16)) + LBL('SHARE OF MAX') + '\n';
    out += SEP(' ' + '─'.repeat(55)) + '\n';
    NS.stakeGraph.forEach(g => {
      const isCurr = g.epoch === ep.current;
      const pct    = (g.sol / sgMax * 100).toFixed(1);
      const bar    = Math.round(g.sol / sgMax * 16);
      const rowStr = ' ' + (isCurr ? Y : WW)(pad(String(g.epoch), 9)) +
                     (isCurr ? Y : G)(pad(g.sol + 'M SOL', 16)) +
                     (isCurr ? Y : G)('█'.repeat(bar)) + C('░'.repeat(16 - bar)) +
                     ' ' + WW(pct + '%') + (isCurr ? Y(' ← current') : '') + '\n';
      out += rowStr;
    });
    out += '\n ' + LBL('Range: ') + R('MIN 80.99M') + LBL(' — ') + G('MAX 411.23M SOL') + '\n';
    out += SEP('\n ' + '─'.repeat(92)) + '\n\n';

    // ── STAKE DISTRIBUTION ─────────────────────
    out += ' ' + chalk.bgCyan.black(' STAKE DISTRIBUTION ') + '  ' + WW('AVERAGE SOL STAKED SIZES') + '\n\n';
    const DD = { range: 17, totalSol: 22, stakes: 12, wallets: 11 };
    out += ' ' + LBL(pad('SOL RANGE', DD.range)) + LBL(pad('TOTAL SOL STAKED', DD.totalSol)) + LBL(pad('NUM STAKES', DD.stakes)) + LBL(pad('WALLETS', DD.wallets)) + LBL('VALIDATORS') + '\n';
    out += SEP(' ' + '─'.repeat(80)) + '\n';
    NS.stakeDistribution.forEach(row => {
      out += ' ' + WW(pad(row.range, DD.range)) + C(pad(row.totalSol, DD.totalSol)) + WW(pad(row.stakes, DD.stakes)) + WW(pad(row.wallets, DD.wallets)) + WW(row.validators) + '\n';
    });
    out += '\n ' + DIM('Last updated: ' + new Date().toLocaleString()) + '\n';

    netInner.setContent(out);
    netInner.height = 150;
  }
  buildNetworkTab();

  // ════════════════════════════════════════════
  // BOTTOM BAR
  // ════════════════════════════════════════════
  const cmdHints = {
    market:  'st market   |   st price <TOKEN>   |   st top',
    price:   'st price SOL   |   st price BONK',
    wallet:  'st wallet <ADDRESS>   |   st wallet me',
    token:   'st token BONK   |   st token <MINT>',
    news:    'st news   |   st news --filter=whale',
    live:    'st live SOL   |   st live --all',
    alerts:  'st alerts   |   st alerts add SOL>150',
    network: 'dig @100.31.3.72 -p 5353 epoch +short   |   tps   |   blocktime   |   top-validators',
  };
  const tabKeys = ['market','price','wallet','token','news','live','alerts','network'];

  const cmdBar = blessed.box({
    parent: root, bottom: 1, left: 0, width: '100%', height: 1,
    tags: true, style: { bg: 'black' },
    content: `{yellow-fg}▶{/} {white-fg}Type a command or press / to focus...{/}`
  });
  const footer = blessed.box({
    parent: root, bottom: 0, left: 0, width: '100%', height: 1,
    tags: true, style: { bg: 'yellow', fg: 'black' }
  });

  // ════════════════════════════════════════════
  // TAB SWITCHING
  // ════════════════════════════════════════════
  let currentTab = 0;
  const allTabs = [tabMarket, tabPrice, tabWallet, tabToken, tabNews, tabLive, tabAlerts, tabNetwork];
  const allScrolls = [mktScroll, priceScroll, wltScroll, tokScroll, newsScroll, null, altScroll, netScroll];

  function activateTab(idx) {
    currentTab = idx;
    allTabs.forEach((t, i) => (i === idx ? t.show() : t.hide()));

    // Set active scroll reference for key routing
    activeScroll = allScrolls[idx] || null;
    if (activeScroll) activeScroll.setScrollPerc(0);

    const tabLabels = ['MARKET','PRICE','WALLET','TOKEN','NEWS','LIVE','ALERTS','NETWORK'];
    let nav = '';
    tabLabels.forEach((name, i) => {
      if (i === idx) nav += ` {yellow-bg}{black-fg} F${i+1} {/}{yellow-fg} ${name} {/}`;
      else           nav += ` {white-bg}{black-fg} F${i+1} {/}{white-fg} ${name} {/}`;
    });
    navContent.setContent(nav);

    const fLine = tabLabels.map((n, i) => `{bold}F${i+1}{/} ${n}`).join('  ');
    footer.setContent(` ${fLine}   {right}↑↓ PgUp/PgDn scroll  ESC QUIT  {bold}SOLANA TERMINAL ◎{/}`);
    cmdBar.setContent(`{yellow-fg}▶{/} {white-fg}${cmdHints[tabKeys[idx]] || ''}{/}`);
    screen.render();
  }

  screen.key(['f1'], () => activateTab(0));
  screen.key(['f2'], () => activateTab(1));
  screen.key(['f3'], () => activateTab(2));
  screen.key(['f4'], () => activateTab(3));
  screen.key(['f5'], () => activateTab(4));
  screen.key(['f6'], () => activateTab(5));
  screen.key(['f7'], () => activateTab(6));
  screen.key(['f8'], () => activateTab(7));
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  activateTab(0);

  // ════════════════════════════════════════════
  // LIVE INTERVALS
  // ════════════════════════════════════════════
  const typeColors = { SWAP:'cyanBright', BUY:'greenBright', WHALE:'cyan', ALERT:'yellowBright', NEW:'magentaBright' };
  const typeBadge  = { SWAP:'SWAP ', BUY:'BUY  ', WHALE:'WHALE', ALERT:'ALERT', NEW:'NEW  ' };

  DATA.liveFeed.slice(0, 8).forEach(e => {
    const col   = chalk[typeColors[e.type] || 'white'];
    const badge = typeBadge[e.type] || e.type;
    feedLog.log(`{white-fg}${nowTime()}{/}  ${col(badge)} {white-fg}${e.text.substring(0, 22)}{/}`);
    liveFull.log(`{white-fg}${nowTime()}{/}  ${col(badge)} {white-fg}${e.text}{/}`);
  });

  setInterval(() => {
    const idx   = Math.floor(Math.random() * DATA.liveFeed.length);
    const e     = DATA.liveFeed[idx];
    const col   = chalk[typeColors[e.type] || 'white'];
    const badge = typeBadge[e.type] || e.type;

    feedLog.log(`{white-fg}${nowTime()}{/}  ${col(badge)} {white-fg}${e.text.substring(0, 22)}{/}`);
    liveFull.log(`{white-fg}${nowTime()}{/}  ${col(badge)} {white-fg}${e.text}{/}`);

    DATA.market[0].price = Math.max(130, DATA.market[0].price + (Math.random() - 0.48) * 0.4);
    if (currentTab === 0) { buildMarketTable(); buildStatsRow(); }

    refreshTicker();
    screen.render();
  }, 2000);

  screen.render();
}

module.exports = { startDashboard };
module.exports = { startDashboard };
