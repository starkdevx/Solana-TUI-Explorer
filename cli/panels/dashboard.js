// =============================================
// SOLANA TERMINAL CLI  ·  v4
// Theme: green/cyan on black (classic hacker terminal)
// Charts: solid-fill bar chart matching reference image
// =============================================

const blessed = require('blessed');
const contrib  = require('blessed-contrib');
const chalk    = require('chalk');
const readline = require('readline');
chalk.level = 3;

const { DATA, loadMarketData, loadNetworkData, loadWalletData, loadTokenData } = require('../data');
const CFG = require('../config');

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
const GRY  = s => `{#999999-fg}${String(s)}{/}`;
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
function progressBar(pct, width = 36) {
  const filled = Math.round(Math.max(0, Math.min(100, pct || 0)) / 100 * width);
  const empty  = Math.max(0, width - filled);
  return `{#00FF88-fg}${'█'.repeat(filled)}{/}{#114422-fg}${'░'.repeat(empty)}{/}`;
}

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
  } = opts;

  if (!values || values.length < 2 || values.every(v => !v)) {
    return `{white-fg}  (no chart data available)\n{/}`;
  }

  const n   = values.length;
  const lo  = Math.min(...values);
  const hi  = Math.max(...values);
  const rng = Math.max(hi - lo, 1);

  // barH: rows filled from bottom (1 = just base, height = full column)
  const getBarH = v => Math.max(1, Math.round((v - lo) / rng * (height - 1)) + 1);

  const fmtV = v => {
    const a = Math.abs(v);
    if (a >= 10000) return (v / 1000).toFixed(0) + 'k';
    if (a >= 1000)  return Math.round(v).toString();
    if (a >= 10)    return v.toFixed(0);
    return v.toFixed(1);
  };

  let out = '';
  for (let r = 0; r < height; r++) {
    const rfb    = height - 1 - r;   // rows from bottom: 0=bottom, height-1=top
    const rowVal = lo + (rfb / (height - 1)) * rng;
    out += `{${axisTag}}${fmtV(rowVal).padStart(axisW - 1)}\u2502{/}`;
    for (let i = 0; i < n; i++) {
      if (i > 0 && gap > 0) out += ' '.repeat(gap);
      const bh = getBarH(values[i]);
      out += rfb < bh
        ? `{${colTag}}${'█'.repeat(colW)}{/}`
        : ' '.repeat(colW);
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
// BANNERS
// ─────────────────────────────────────────────
function errorBanner(msg) {
  return `\n ${RED_BG('ERROR')}  {#FF6B6B-fg}${msg}{/}\n\n {white-fg}Press{/} {#FFD700-fg}R{/} {white-fg}to retry    {/}{#999999-fg}up/down to scroll{/}\n`;
}
function loadingBanner(msg) {
  return `\n ${TL_BG('LOADING')}  {#00FFFF-fg}${msg || 'Fetching live data...'}{/}\n\n {white-fg}Connecting to Solana mainnet & DexScreener...{/}\n`;
}

// ─────────────────────────────────────────────
// GUI INPUT — pure blessed prompt for easy pasting
// ─────────────────────────────────────────────
function getLineInput(screen, promptText, cb) {
  const form = blessed.form({
    parent: screen, keys: true, left: 'center', top: 'center',
    width: 60, height: 5, style: BOX,
    border: { type: 'line', fg: '#00FFFF' },
    label: ` {#FFD700-fg} INPUT REQUIRED {/} `
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

// ══════════════════════════════════════════════════════════
function startDashboard() {
  const screen = blessed.screen({
    smartCSR: true, title: 'Solana Terminal',
    fullUnicode: true, mouse: true, forceUnicode: true,
  });

  const root = blessed.box({
    parent: screen, top: 0, left: 0, width: '100%', height: '100%',
    style: BOX,
  });

  // ─────────────────────────────────────────────
  // TOP BAR (rows 0-1)
  // ─────────────────────────────────────────────
  const topRow = blessed.box({ parent: root, top: 0, left: 0, width: '100%', height: 2, tags: true, style: BOX });

  blessed.text({ parent: topRow, top: 0, left: 1, tags: true, style: BOX,
    content: '{#00FF88-fg}{bold} ▶ SOLANA TERMINAL{/}' });
  blessed.text({ parent: topRow, top: 1, left: 1, tags: true, style: BOX,
    content: '{#00FFFF-fg}   REAL-TIME INTELLIGENCE  ·  DexScreener + Solana RPC{/}' });

  // Ticker (price strip in top bar)
  const tickerBox = blessed.text({ parent: topRow, top: 0, left: 25, tags: true, content: '', style: BOX });
  function refreshTicker() {
    if (!DATA.market.length) return;
    const parts = DATA.market.filter(d => ['BTC','ETH','SOL'].includes(d.symbol)).map(d => {
      const col = d.pct > 0 ? '#00FF88-fg' : '#FF6B6B-fg';
      return `{white-fg}{bold}${d.symbol}{/} {white-fg}${fmtPrice(d.price)}{/} {${col}}${fmtPct(d.pct)}{/}`;
    });
    tickerBox.setContent(parts.join('  {#226644-fg}│{/}  '));
  }

  // Clock (top-right)
  const clockBox = blessed.text({ parent: topRow, top: 0, right: 1, tags: true, content: '', style: BOX });
  function refreshClock() {
    const now = new Date();
    const dt  = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const tm  = now.toLocaleTimeString('en-US', { hour12: false });
    clockBox.setContent(`{#00FF88-fg}LIVE{/}  {#00FFFF-fg}${dt} ${tm}{/}  {#005566-bg}{white-fg} v1.0 {/}`);
  }
  refreshClock();
  setInterval(refreshClock, 1000);

  // Divider row 2 — green
  blessed.text({ parent: root, top: 2, left: 0, width: '100%', height: 1, tags: true, style: BOX,
    content: `{#00FF88-fg}${'═'.repeat(300)}{/}` });

  // ─────────────────────────────────────────────
  // NAV BAR (row 3)
  // ─────────────────────────────────────────────
  const navBar = blessed.box({ parent: root, top: 3, left: 0, width: '100%', height: 1, tags: true, style: BOX });
  blessed.text({ parent: navBar, top: 0, right: 2, tags: true, style: BOX,
    content: '{#00FFFF-fg}DexScreener · Solana-RPC{/}  {#00FF88-fg}● MAINNET{/}' });
  const navContent = blessed.text({ parent: navBar, top: 0, left: 0, tags: true, content: '', style: BOX });

  // Divider row 4 — dimmer green
  blessed.text({ parent: root, top: 4, left: 0, width: '100%', height: 1, tags: true, style: BOX,
    content: `{#00CC66-fg}${'═'.repeat(300)}{/}` });

  // ─────────────────────────────────────────────
  // RIGHT SIDEBAR
  // ─────────────────────────────────────────────
  const SBW = 28;
  const sidebar = blessed.box({
    parent: root, top: 5, right: 0, width: SBW, bottom: 2,
    style: BOX,
    border: { type: 'line', fg: '#00FFFF', left: true, top: false, right: false, bottom: false },
  });

  const gainBox = blessed.box({
    parent: sidebar, top: 0, left: 0, width: '100%', height: 10,
    label: ' {#00FF88-fg}{bold}TOP GAINERS{/} ', tags: true,
    border: BCYAN, style: BOX,
  });
  function getLineSpark(dataArr, w) {
    if (!dataArr || !dataArr.length) return '─'.repeat(w);
    const min = Math.min(...dataArr), max = Math.max(...dataArr), rng = (max-min)||1;
    const chars = '._-~^';
    let out = '';
    for(let i=0; i<w; i++) {
       const idx = Math.floor(i * dataArr.length / w);
       const norm = Math.max(0, Math.min(1, (dataArr[idx] - min) / rng));
       out += chars[Math.floor(norm * 4.99)];
    }
    return out;
  }

  function buildGainers() {
    if (!DATA.topGainers.length) { gainBox.setContent(WW(' No gainers presently')); return; }
    let s = '';
    DATA.topGainers.slice(0, 5).forEach(d => {
      const spk = getLineSpark(d.sparkArray, 8);
      s += W(pad(d.symbol, 10)) + `{#00FF88-fg}${spk}{/}  ` + G('+' + d.pct.toFixed(1) + '%') + '\n';
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
      const spk = getLineSpark(d.sparkArray, 8);
      s += W(pad(d.symbol, 10)) + `{#FF6B6B-fg}${spk}{/}  ` + DN(d.pct.toFixed(1) + '%') + '\n';
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

  // ─────────────────────────────────────────────
  // MAIN PANE
  // ─────────────────────────────────────────────
  const mainPane = blessed.box({ parent: root, top: 5, left: 0, right: SBW, bottom: 2, style: BOX });

  let activeScroll = null;
  screen.key(['up', 'k'],   () => { activeScroll?.scroll(-1);  screen.render(); });
  screen.key(['down', 'j'], () => { activeScroll?.scroll(1);   screen.render(); });
  screen.key(['pageup'],    () => { activeScroll?.scroll(-10); screen.render(); });
  screen.key(['pagedown'],  () => { activeScroll?.scroll(10);  screen.render(); });
  screen.key(['home'],      () => { activeScroll?.setScrollPerc(0);   screen.render(); });
  screen.key(['end'],       () => { activeScroll?.setScrollPerc(100); screen.render(); });

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
  // F1  MARKET
  // ══════════════════════════════════════════════════════════
  const tabMarket = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  blessed.text({ parent: tabMarket, top: 0, left: 1, tags: true, style: BOX,
    content: `{#00FF88-fg}{bold}MARKET OVERVIEW{/}  {white-fg}Live DEX prices  │  ${CFG.MARKET_SYMBOLS.length} assets  │  DexScreener{/}   {#00FF88-fg}● LIVE{/}` });

  // SOL stat card
  const statsBox = blessed.box({
    parent: tabMarket, top: 1, left: 0, right: 0, height: 5,
    tags: true, style: BOX, border: BCYAN,
  });
  function buildStatsRow() {
    const sol = DATA.market.find(m => m.symbol === 'SOL');
    if (!sol) { statsBox.setContent(`\n${loadingBanner('Connecting to DexScreener...')}`); return; }
    const pctStr = fmtPct(sol.pct);
    const pctTag = sol.pct >= 0 ? `{#00FF88-fg}${pctStr}{/}` : `{#FF6B6B-fg}${pctStr}{/}`;
    const C1 = 22, C2 = 22, C3 = 20;
    statsBox.setContent(
      ' ' + LBL(pad('SOL PRICE', C1))           + LBL(pad('24H CHANGE', C2))       + LBL(pad('VOLUME 24H', C3)) + LBL('MKT CAP')    + '\n' +
      ' ' + `{#00FF88-fg}{bold}${pad(fmtPrice(sol.price), C1)}{/}` +
             pctTag + ' '.repeat(Math.max(1, C2 - pctStr.length)) +
             Y(pad(fmtVol(sol.vol), C3))         + WW('$' + (sol.mcap || '-'))                                   + '\n' +
      ' ' + GRY(pad('via DexScreener/USDC', C1)) + GRY(pad('24h rolling', C2))     + GRY(pad('total DEX', C3))  + GRY('fully diluted')
    );
  }

  // Market table
  const mktScroll = mkScroll(tabMarket, { top: 6, left: 0, right: 0, bottom: 0 });
  const mktBox    = mkBox(mktScroll, { width: '100%-2' });

  const MC = [8, 14, 14, 11, 10, 9];
  function buildMarketTable() {
    if (!DATA.market.length) {
      mktBox.setContent(loadingBanner('Fetching live prices from DexScreener...'));
      mktBox.height = 10; return;
    }
    const ts  = new Date().toLocaleTimeString('en-US', { hour12: false });
    let out   = '';
    out += TL_BG('PRICE TABLE') + `  ${WW('Live DEX prices')}  ${GRY('updated ' + ts)}\n`;
    out += HR(82) + '\n';
    out += ' ' + LBL(pad('SYMBOL', MC[0])) + LBL(pad('NAME',    MC[1])) +
           LBL(pad('PRICE',        MC[2])) + LBL(pad('24H %',   MC[3])) +
           LBL(pad('VOLUME',       MC[4])) + LBL(pad('MKT CAP', MC[5])) + LBL('MOMENTUM') + '\n';
    out += HR(82) + '\n';

    DATA.market.forEach(d => {
      const isUp   = d.pct > 0;
      const pctStr = fmtPct(d.pct);
      const pctTag = isUp ? `{#00FF88-fg}${pctStr}{/}` : `{#FF6B6B-fg}${pctStr}{/}`;
      const nameS  = (d.name || d.symbol).substring(0, MC[1] - 1);
      const priceS = fmtPrice(d.price);
      const volS   = fmtVol(d.vol);
      const mcapS  = '$' + (d.mcap || '-');

      // Momentum 1-line solid bar graph (REAL historical data)
      let spk = '';
      const c = isUp ? '{#00FF88-fg}' : '{#FF6B6B-fg}';
      
      if (d.sparkArray && d.sparkArray.length > 0) {
        // Map true 24h historical array to 12 chars
        // Using up to ▆ (5/8 block) so top of cell is ALWAYS empty for padding
        const src = d.sparkArray;
        // downsample to 12 points
        const points = [];
        for(let i=0; i<12; i++) {
            const idx = Math.floor(i * src.length / 12);
            points.push(src[idx]);
        }
        const min = Math.min(...points);
        const max = Math.max(...points);
        const rng = max - min || 1;
        
        points.forEach(v => {
          const norm = (v - min) / rng;
          if (norm < 0.2)      spk += '\u2581'; // acts as baseline anchor
          else if (norm < 0.4) spk += '▂';
          else if (norm < 0.6) spk += '▄';
          else if (norm < 0.8) spk += '▅';
          else                 spk += '▆'; // Cap at ▆ to create built-in vertical spacing
        });
      } else {
        // Fallback smooth curve capped at ▆
        for(let i=0; i<12; i++) {
          let norm = isUp ? (0.2 + (i/11)*0.8) : (1.0 - (i/11)*0.8);
          if (norm < 0.2)      spk += '\u2581';
          else if (norm < 0.4) spk += '▂';
          else if (norm < 0.6) spk += '▄';
          else if (norm < 0.8) spk += '▅';
          else                 spk += '▆';
        }
      }

      out += ' ' +
        W(pad(d.symbol, MC[0])) +
        `{#00FFFF-fg}${pad(nameS, MC[1])}{/}` +
        `{#00FF88-fg}{bold}${pad(priceS, MC[2])}{/}` +
        pctTag + ' '.repeat(Math.max(1, MC[3] - pctStr.length)) +
        WW(pad(volS,  MC[4])) +
        WW(pad(mcapS, MC[5])) +
        c + spk + '{/}\n';
    });

    mktBox.setContent(out);
    mktBox.height = DATA.market.length + 5;
  }



  // ══════════════════════════════════════════════════════════
  // F3  WALLET
  // ══════════════════════════════════════════════════════════
  const tabWallet = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  const wltScroll = mkScroll(tabWallet, { top: 0, left: 0, right: 0, bottom: 0 });
  const wltBox    = mkBox(wltScroll, { width: '100%-2' });

  let walletAddr = null, walletLoading = false, walletError = null;

  function buildWalletTab() {
    let out = '';
    out += OB(' WALLET INSIGHTS') + `  ${WW('Portfolio analytics | Transaction history')}  ${walletAddr ? GRY('I=change  R=refresh') : C('Press I to enter wallet address')}\n`;
    out += HR(92) + '\n\n';

    if (!walletAddr) {
      out += `\n ${TL_BG('NO WALLET LOADED')}\n\n`;
      out += ` ${WW('Enter a Solana wallet address to view live balances & transactions.')}\n\n`;
      out += ` ${C('Type')} ${W(' i ')} ${C('on your keyboard to enter a Solana wallet address')}\n\n`;
      out += ` ${LBL('Example:  ')}${GRY('7xKkPmVn8RqwZ2jLfBd4uYtX1sCo9HGe5Ap3mNpQ')}\n\n`;
      wltBox.setContent(out); wltBox.height = 16; return;
    }
    if (walletLoading) {
      out += loadingBanner('Fetching wallet from Solana RPC...');
      out += ` ${LBL('Address: ')}${C(walletAddr)}\n`;
      wltBox.setContent(out); wltBox.height = 14; return;
    }
    if (walletError) {
      out += errorBanner(walletError);
      out += ` ${LBL('Address: ')}${C(walletAddr)}\n\n`;
      out += ` ${WW('Press')} ${C('I')} ${WW('to try a different address')}\n`;
      wltBox.setContent(out); wltBox.height = 16; return;
    }

    const ww = DATA.wallet;
    if (!ww) return;

    out += ` ${LBL('WALLET ADDRESS')}\n`;
    out += ` ${C(ww.fullAddress)}\n`;
    out += ` ${GRY('Solana mainnet-beta via public RPC')}\n\n`;
    out += ` {#00FF88-fg}{bold}$${ww.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{/}  ${WW('Total Portfolio Value (USD)')}\n\n`;

    out += ' ' + LBL(pad('ASSETS', 22))       + LBL('SHORT ADDRESS')   + '\n';
    out += ' ' + WW(pad(ww.holdings.length + ' tokens', 22)) + WW(ww.address) + '\n';
    out += HR(92) + '\n';

    // Holdings
    out += `\n ${TL_BG('HOLDINGS')}  ${WW(ww.holdings.length + ' assets from Solana RPC')}\n\n`;
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
    out += HR(92) + '\n';

    // Transactions
    out += `\n ${TL_BG('RECENT TRANSACTIONS')}  ${WW('Last 5 via Solana RPC')}\n\n`;
    out += ' ' + LBL(pad('TIME', 12)) + LBL(pad('TYPE', 10)) + LBL(pad('STATUS', 14)) + LBL('SIGNATURE') + '\n';
    out += HR(66) + '\n';
    (ww.recentTxns || []).forEach(tx => {
      const st = tx.status === 'CONFIRMED' ? GRN_BG('CONFIRMED') : RED_BG('FAILED');
      out += ' ' + WW(pad(tx.time, 12)) + C(pad(tx.type, 10)) + st + '  ' + GRY(tx.sig) + '\n';
    });
    if (!ww.recentTxns?.length) out += ` ${WW('No recent transactions found.')}\n`;
    out += `\n ${GRY('Full history:  solscan.io/account/' + ww.fullAddress)}\n`;
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
  const tokScroll = mkScroll(tabToken, { top: 0, left: 0, right: 0, bottom: 0 });
  const tokBox    = mkBox(tokScroll, { width: '100%-2' });

  let tokenQuery = null, tokenLoading = false, tokenError = null;

  function buildTokenTab() {
    const tk  = DATA.token;
    let out   = '';
    out += OB(' TOKEN ANALYTICS') + `  ${WW(tk ? tk.symbol + ' / ' + tk.name : 'No Token Selected')}  ${tokenQuery ? GRY('I=change  R=refresh') : C('Press I to enter token')}\n`;
    out += HR(92) + '\n';

    if (!tokenQuery) {
      out += `\n ${TL_BG('NO TOKEN SELECTED')}\n\n`;
      out += ` ${WW('Enter a token mint address or symbol.')}\n\n`;
      out += ` ${C('Type')} ${W(' i ')} ${C('on your keyboard to search a token')}\n\n`;
      out += ` ${LBL('Symbols:')}  ${G('BONK')}   ${G('WIF')}   ${G('JUP')}   ${G('SOL')}   ${G('RAY')}\n`;
      out += ` ${LBL('Mint:   ')}  ${GRY('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')}\n`;
      tokBox.setContent(out); tokBox.height = 16; return;
    }
    if (tokenLoading) {
      out += loadingBanner('Fetching token data from DexScreener...');
      out += ` ${LBL('Query: ')}${C(tokenQuery)}\n`;
      tokBox.setContent(out); tokBox.height = 14; return;
    }
    if (tokenError) {
      out += errorBanner(tokenError);
      out += ` ${LBL('Query: ')}${C(tokenQuery)}\n\n`;
      out += ` ${WW('Press')} ${C('I')} ${WW('to try a different token')}\n`;
      tokBox.setContent(out); tokBox.height = 16; return;
    }
    if (!tk) return;

    const H = 20;
    out += `\n ${TL_BG('TOKEN OVERVIEW')}\n\n`;
    out += '  ' + LBL(pad('TOKEN',    H)) + LBL(pad('PRICE',  H))    + LBL(pad('MKT CAP', H)) + LBL('VOLUME 24H') + '\n';
    out += '  ' + W(pad(tk.symbol,    H)) + `{#00FF88-fg}{bold}${pad(fmtPrice(tk.price), H)}{/}` + W(pad(tk.marketCap, H)) + C(tk.volume24h) + '\n';
    out += '  ' + GRY(tk.name || '-') + '\n';
    const pc = tk.priceChange24h >= 0
      ? `{#00FF88-fg}+${tk.priceChange24h.toFixed(2)}% (24h){/}`
      : `{#FF6B6B-fg}${tk.priceChange24h.toFixed(2)}% (24h){/}`;
    out += '  ' + GRY(tk.shortMint) + '   ' + pc + '\n\n';
    out += '  ' + LBL(pad('LIQUIDITY', H)) + LBL('FDV') + '\n';
    out += '  ' + WW(pad(tk.liquidity, H)) + WW(tk.fdv) + '\n';
    out += HR(92) + '\n';

    out += `\n ${TL_BG('RISK SIGNALS')}  ${WW('Derived from on-chain DEX data')}\n\n`;
    out += ' ' + LBL(pad('LEVEL', 12)) + LBL(pad('SIGNAL', 28)) + LBL('DETAIL') + '\n';
    out += HR(68) + '\n';
    (tk.riskSignals || []).forEach(rr => {
      const badge =
        rr.level === 'HIGH'   ? RED_BG('HIGH  ') :
        rr.level === 'MEDIUM' ? YEL_BG('MEDIUM') : GRN_BG('LOW   ');
      out += ' ' + badge + '  ' + W(pad(rr.label, 28)) + WW(rr.detail) + '\n';
    });
    out += HR(92) + '\n';

    out += `\n ${TL_BG('DEX LIQUIDITY POOLS')}  ${WW((tk.dexPools?.length || 0) + ' pairs via DexScreener')}\n\n`;
    out += ' ' + LBL(pad('DEX', 16)) + LBL(pad('PAIR', 20)) + LBL(pad('LIQUIDITY', 18)) + LBL('24H VOLUME') + '\n';
    out += HR(68) + '\n';
    (tk.dexPools || []).forEach(p => {
      out += ' ' + W(pad(p.dex, 16)) + WW(pad(p.pair, 20)) + G(pad(p.tvl, 18)) + C(p.volume) + '\n';
    });
    out += `\n ${GRY('Details:  dexscreener.com/solana/' + tk.mint)}\n`;
    tokBox.setContent(out);
    tokBox.height = Math.max(34, 24 + (tk.riskSignals?.length || 0) + (tk.dexPools?.length || 0) + 6);
  }

  async function loadToken(mintOrSymbol) {
    tokenQuery = mintOrSymbol; tokenLoading = true; tokenError = null;
    buildTokenTab(); screen.render();
    try {
      await loadTokenData(mintOrSymbol);
      tokenLoading = false;
    } catch (e) {
      tokenLoading = false;
      tokenError = e.message.substring(0, 80);
    }
    buildTokenTab(); tokScroll.setScrollPerc(0); screen.render();
  }

  // ══════════════════════════════════════════════════════════
  // F5  NEWS
  // ══════════════════════════════════════════════════════════
  const tabNews    = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  const newsScroll = mkScroll(tabNews, { top: 0, left: 0, right: 0, bottom: 0 });
  const newsBox    = mkBox(newsScroll, { width: '100%-2' });

  function buildNewsTab() {
    let out = '';
    out += OB(' TERMINAL NEWS & SIGNALS') + `  ${WW(DATA.news.length + ' items')}\n`;
    out += HR(98) + '\n\n';
    out += ' ' + LBL(pad('TIME', 7)) + LBL(pad('TAG', 10)) + LBL(pad('SOURCE', 14)) + LBL('HEADLINE') + '\n';
    out += HR(98) + '\n';
    DATA.news.forEach(n => {
      const tagBgMap = {
        WHALE: '{#004488-bg}{white-fg}', SWAP: '{#440077-bg}{white-fg}',
        DATA:  '{#004466-bg}{white-fg}', SOCIAL: '{#333333-bg}{white-fg}',
        DEFI:  '{#004422-bg}{white-fg}', NEW: '{#664400-bg}{white-fg}',
        CEX:   '{#440000-bg}{white-fg}',
      };
      const bg   = tagBgMap[n.tag] || '{#222222-bg}{white-fg}';
      const prio = n.priority === 'high' ? DN('*') : n.priority === 'medium' ? Y('o') : GRY('.');
      out += ' ' + WW(pad(n.time, 7)) + `${bg} ${pad(n.tag || '', 7)} {/}  ` + C(pad(n.source, 13)) + prio + '  ' + WW(n.text) + '\n';
      out += HR(98) + '\n';
    });
    newsBox.setContent(out);
    newsBox.height = DATA.news.length * 2 + 8;
  }

  // ══════════════════════════════════════════════════════════
  // F6  LIVE
  // ══════════════════════════════════════════════════════════
  const tabLive = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  blessed.text({ parent: tabLive, top: 0, left: 1, tags: true, style: BOX,
    content: `{#00FF88-fg}LIVE MODE{/}  {white-fg}Streaming on-chain events  │  mainnet-beta{/}` });

  const liveHero = blessed.box({ parent: tabLive, top: 1, left: 0, right: 0, height: 4, tags: true, style: BOX, border: BCYAN });
  function updateLiveHero() {
    const sol = DATA.market.find(m => m.symbol === 'SOL');
    liveHero.setContent(
      `\n {#00FFFF-fg}${pad('ASSET', 28)}PRICE              STATUS{/}\n` +
      ` {#FFD700-fg}{bold}${pad('SOL / USD', 28)}{/}` +
      `{#00FF88-fg}{bold}${pad(sol ? fmtPrice(sol.price) : '...', 20)}{/}` +
      `{#00FF88-fg}CONNECTED  mainnet-beta{/}`
    );
  }
  updateLiveHero();

  const liveFull = contrib.log({
    parent: tabLive, top: 5, left: 0, right: 0, bottom: 0,
    fg: 'white', tags: true, style: BOX, border: BCYAN,
    label: ' {#FFD700-fg}LIVE TX STREAM{/} ',
    scrollable: true, mouse: true,
    scrollbar: { ch: '│', style: { fg: '#00FFFF' } },
  });

  // ══════════════════════════════════════════════════════════
  // F7  ALERTS
  // ══════════════════════════════════════════════════════════
  const tabAlerts = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  const altScroll = mkScroll(tabAlerts, { top: 0, left: 0, right: 0, bottom: 0 });
  const altBox    = mkBox(altScroll, { width: '100%-2' });

  function buildAlertsTab() {
    const fired  = DATA.alerts.filter(a => a.triggered).length;
    const active = DATA.alerts.filter(a => !a.triggered).length;
    let out = '';
    out += OB(' SMART ALERTS') + `  ${WW('Configured price triggers')}\n`;
    out += HR(86) + '\n\n';
    out += ` ${WW('TOTAL: ')}${C(String(DATA.alerts.length))}     ${G('ACTIVE: ' + active)}     ${DN('TRIGGERED: ' + fired)}\n\n`;
    out += ' ' + LBL(pad('ID', 9)) + LBL(pad('TOKEN', 8)) + LBL(pad('CONDITION', 26)) + LBL(pad('CREATED', 18)) + LBL(pad('STATUS', 12)) + LBL('FIRED AT') + '\n';
    out += HR(82) + '\n';
    DATA.alerts.forEach(a => {
      const badge = a.status === 'ACTIVE' ? GRN_BG('ACTIVE') : RED_BG('FIRED');
      out += ' ' + WW(pad(a.id, 9)) + W(pad(a.token, 8)) + WW(pad(a.condition, 26)) + WW(pad(a.created, 18)) + badge + '  ' + (a.triggeredAt ? DN(a.triggeredAt) : GRY('-')) + '\n';
    });
    altBox.setContent(out);
    altBox.height = DATA.alerts.length + 10;
  }

  // ══════════════════════════════════════════════════════════
  // F8  NETWORK
  // ══════════════════════════════════════════════════════════
  const tabNetwork = blessed.box({ parent: mainPane, width: '100%', height: '100%', hidden: true, tags: true, style: BOX });
  const netScroll  = mkScroll(tabNetwork, { top: 0, left: 0, right: 0, bottom: 0 });
  const netBox     = mkBox(netScroll, { width: '100%-2' });

  let netLoading = true, netError = null;

  function buildNetworkTab() {
    let out = '';
    out += OB(' NETWORK STATS') + `  ${WW('Solana blockchain  │  Real-time RPC data')}\n`;
    out += HR(88) + '\n\n';
    if (netLoading) { out += loadingBanner('Fetching epoch, TPS, validators...'); netBox.setContent(out); netBox.height = 12; return; }
    if (netError)   { out += errorBanner(netError); netBox.setContent(out); netBox.height = 12; return; }

    const { epoch: ep, tps, blocktime: bt, supply: sp, stakeData: sd, validators } = DATA.networkStats;

    // ── EPOCH ──
    out += ` ${TL_BG('EPOCH')}  ${W('Epoch ' + ep.current)}   ${LBL('Time left:')} ${C(ep.timeLeft)}   ${LBL('Slots:')} ${WW((ep.slotsDone || 0).toLocaleString() + ' / ' + (ep.slotsTotal || 0).toLocaleString())}\n\n`;
    out += ' ' + progressBar(ep.progress, 52) + `  ${G(ep.progress.toFixed(1) + '%')}\n`;
    out += ` ${LBL('Absolute slot:')} ${WW((ep.absoluteSlot || 0).toLocaleString())}   ${GRY('Est. end: ' + ep.endTime)}\n`;
    out += HR(88) + '\n\n';

    // ── TPS CHART ── solid green bars
    out += ` ${TL_BG('TPS')}  ${WW('Transactions per second  │  Recent performance samples')}\n\n`;
    const T = 20;
    out += ' ' + LBL(pad('CURRENT', T)) + LBL(pad('AVERAGE', T)) + LBL(pad('MAX', T)) + LBL('MIN') + '\n';
    out += ' ' + G(pad(tps.current + ' TPS', T)) + C(pad(tps.average + ' TPS', T)) + Y(pad(tps.maximum + ' TPS', T)) + DN(tps.minimum + ' TPS') + '\n\n';
    out += barFillChart(
      tps.history.map(h => h.value),
      tps.history.map(h => h.ago.replace(' mins ago', 'm')),
      { height: 10, colW: 3, gap: 0, axisW: 6, colTag: '#00FF88-fg', axisTag: '#00FFFF-fg' }
    ) + '\n';
    out += ' ' + LBL(pad('INTERVAL', 14)) + LBL(pad('TPS', 10)) + LBL('DELTA') + '\n';
    out += HR(44) + '\n';
    tps.history.forEach((h, i) => {
      const prev  = i > 0 ? tps.history[i - 1].value : h.value;
      const delta = i > 0 ? h.value - prev : 0;
      const dt    = delta > 0 ? G('+' + delta) : delta < 0 ? DN(String(delta)) : GRY('─');
      out += ' ' + WW(pad(h.ago, 14)) + G(pad(String(h.value), 10)) + dt + '\n';
    });
    out += HR(88) + '\n\n';

    // ── BLOCKTIME CHART ── solid cyan bars
    out += ` ${TL_BG('BLOCKTIME')}  ${WW('Block time in milliseconds  │  Recent samples')}\n\n`;
    out += ' ' + LBL(pad('CURRENT', T)) + LBL(pad('AVERAGE', T)) + LBL(pad('MAX', T)) + LBL('MIN') + '\n';
    out += ' ' + G(pad(bt.current + ' ms', T)) + C(pad(bt.average + ' ms', T)) + Y(pad(bt.maximum + ' ms', T)) + DN(bt.minimum + ' ms') + '\n\n';
    out += barFillChart(
      bt.history.map(h => parseFloat(h.value)),
      bt.history.map(h => h.ago.replace(' mins ago', 'm')),
      { height: 10, colW: 3, gap: 0, axisW: 8, colTag: '#00FFFF-fg', axisTag: '#00FFFF-fg' }
    ) + '\n';
    bt.history.forEach(h => {
      out += ' ' + WW(pad(h.ago, 14)) + C(h.value + ' ms') + '\n';
    });
    out += HR(88) + '\n\n';

    // ── VALIDATORS ──
    out += ` ${TL_BG('VALIDATORS')}  ${WW('Top 10 by stake  │  getVoteAccounts')}\n\n`;
    out += ' ' + LBL(pad('#', 5)) + LBL(pad('VOTE KEY', 22)) + LBL(pad('STAKE (SOL)', 18)) + LBL('COMMISSION') + '\n';
    out += HR(60) + '\n';
    (validators || []).forEach(v => {
      const cc = v.commission === '100%' ? DN(v.commission) : v.commission === '0%' ? G(v.commission) : Y(v.commission);
      out += ' ' + WW(pad(v.rank + '.', 5)) + C(pad(v.name, 22)) + G(pad(v.stake, 18)) + cc + '\n';
    });
    out += HR(88) + '\n\n';

    // ── SOL SUPPLY ──
    out += ` ${TL_BG('SOL SUPPLY')}  ${WW('via getSupply  │  mainnet-beta')}\n\n`;
    out += ` ${LBL(pad('Circulating:', 22))}${C(pad(sp.circulating + 'M SOL', 16))} ${progressBar(sp.circulatingPct, 28)} ${Y(sp.circulatingPct + '%')}\n`;
    out += ` ${LBL(pad('Est. Staked:', 22))}${G(pad(sp.staked + 'M SOL', 16))} ${progressBar(sp.stakedPct, 28)} ${Y(sp.stakedPct + '%')}\n`;
    out += ` ${LBL(pad('Total supply:', 22))}${W(sp.total + 'M SOL')}\n\n`;
    out += ` ${LBL(pad('Epoch:', 22))}${WW(String(sp.epoch))}    ${LBL('Inflation:')} ${DN(sp.inflationRate + '%')}\n`;
    out += ` ${LBL(pad('Est. Staking APY:', 22))}${G(sp.stakingApy + '%')}\n`;
    out += HR(88) + '\n\n';

    // ── STAKE DATA ──
    out += ` ${TL_BG('STAKE DATA')}\n\n`;
    [['Total Est. Staked', sd.totalStaked], ['Est. Staking APY', sd.filterApy], ['Last updated', sd.updated]].forEach(([l, v]) => {
      out += ` ${LBL(pad(l + ':', 24))}${WW(v)}\n`;
    });
    out += `\n ${GRY('Last refreshed: ' + new Date().toLocaleString())}\n`;

    netBox.setContent(out);
    netBox.height = 130;
  }

  // ─────────────────────────────────────────────
  // BOTTOM BARS
  // ─────────────────────────────────────────────
  const hints = [
    'DexScreener prices  │  30s auto-refresh  │  R=refresh now',
    'I=enter wallet address  │  R=refresh  │  arrows=scroll',
    'I=enter token mint or symbol  │  R=refresh  │  arrows=scroll',
    'Terminal news & signals  │  arrows=scroll',
    'Live event stream  │  arrows=scroll',
    'Smart alerts  │  R=refresh',
    'Solana RPC stats  │  R=refresh  │  30s auto-refresh',
  ];
  const cmdBar = blessed.box({
    parent: root, bottom: 1, left: 0, width: '100%', height: 1,
    tags: true, style: BOX,
    content: `{#00FFFF-fg}▶{/} {white-fg}Connecting to DexScreener and Solana RPC...{/}`,
  });
  const footer = blessed.box({
    parent: root, bottom: 0, left: 0, width: '100%', height: 1,
    tags: true, style: { bg: '#003333', fg: 'white' },
  });

  // ─────────────────────────────────────────────
  // TAB MANAGEMENT
  // ─────────────────────────────────────────────
  let current = 0;
  const allTabs    = [tabMarket, tabWallet, tabToken, tabNews, tabLive, tabAlerts, tabNetwork];
  const allScrolls = [mktScroll, wltScroll, tokScroll, newsScroll, null, altScroll, netScroll];

  function activateTab(idx) {
    current = idx;
    allTabs.forEach((t, i) => (i === idx ? t.show() : t.hide()));
    let activeScroll = allScrolls[idx] || null;
    if (activeScroll) activeScroll.setScrollPerc(0);

    const names = ['MARKET','WALLET','TOKEN','NEWS','LIVE','ALERTS','NETWORK'];
    let nav = '';
    names.forEach((n, i) => {
      nav += i === idx
        ? ` {#00FF88-bg}{black-fg}{bold} F${i+1} ${n} {/}`
        : ` {#002222-bg}{#00FFFF-fg} F${i+1} {/}{white-fg} ${n} {/}`;
    });
    navContent.setContent(nav);

    const fLine = names.map((n, i) => `{#00FFFF-fg}{bold}F${i+1}{/} {white-fg}${n}{/}`).join('  ');
    footer.setContent(` {white-fg}${fLine}    I=input  R=refresh  ↑↓=scroll  ESC=quit   SOLANA TERMINAL{/}`);
    cmdBar.setContent(`{#00FFFF-fg}▶{/} {white-fg}${hints[idx] || ''}{/}`);
    screen.render();
  }

  screen.key(['f1'], () => activateTab(0));
  screen.key(['f2'], () => activateTab(1));
  screen.key(['f3'], () => activateTab(2));
  screen.key(['f4'], () => activateTab(3));
  screen.key(['f5'], () => activateTab(4));
  screen.key(['f6'], () => activateTab(5));
  screen.key(['f7'], () => activateTab(6));
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  screen.key(['i', 'I'], () => {
    if (current === 2) {
      getLineInput(screen, 'Enter Solana wallet address (base58 public key):', addr => {
        if (addr) loadWallet(addr); else buildWalletTab(); screen.render();
      });
    } else if (current === 3) {
      getLineInput(screen, 'Enter token mint address or symbol (e.g. BONK / WIF / JUP):', val => {
        if (val) loadToken(val); else buildTokenTab(); screen.render();
      });
    }
  });

  screen.key(['r', 'R'], () => {
    if (current === 0) refreshMarket();
    else if (current === 1 && walletAddr) loadWallet(walletAddr);
    else if (current === 2 && tokenQuery) loadToken(tokenQuery);
    else if (current === 6) refreshNetwork();
  });

  // ─────────────────────────────────────────────
  // LIVE FEED (sidebar + F6 stream)
  // ─────────────────────────────────────────────
  const tBadge = { SWAP: '>> SWAP', BUY: '++ BUY ', WHALE: '** WHALE', ALERT: '!! ALERT', NEW: '** NEW ' };
  const tColor = { SWAP: '#00FFFF-fg', BUY: '#00FF88-fg', WHALE: '#FFD700-fg', ALERT: '#FF6B6B-fg', NEW: '#00FFFF-fg' };

  DATA.liveFeed.slice(0, 5).forEach(e => {
    const col = tColor[e.type] || 'white-fg';
    feedLog.log(`{#999999-fg}${nowTime()}{/}  {${col}}${tBadge[e.type] || e.type}{/}  {white-fg}${e.text.substring(0, 22)}{/}`);
    liveFull.log(`{#999999-fg}${nowTime()}{/}  {${col}}${tBadge[e.type] || e.type}{/}  {white-fg}${e.text}{/}`);
  });

  setInterval(() => {
    const e   = DATA.liveFeed[Math.floor(Math.random() * DATA.liveFeed.length)];
    const col = tColor[e.type] || 'white-fg';
    feedLog.log(`{#999999-fg}${nowTime()}{/}  {${col}}${tBadge[e.type] || e.type}{/}  {white-fg}${e.text.substring(0, 22)}{/}`);
    liveFull.log(`{#999999-fg}${nowTime()}{/}  {${col}}${tBadge[e.type] || e.type}{/}  {white-fg}${e.text}{/}`);
    screen.render();
  }, 3000);

  // ─────────────────────────────────────────────
  // DATA LOADERS
  // ─────────────────────────────────────────────
  async function refreshMarket() {
    try {
      await loadMarketData();
      refreshTicker(); buildMarketTable(); buildStatsRow();
      buildGainers(); buildLosers(); updateLiveHero();
    } catch (e) {
      mktBox.setContent(errorBanner('Market data: ' + e.message.substring(0, 60)));
      mktBox.height = 10;
    }
    screen.render();
  }

  async function refreshNetwork() {
    netLoading = true; netError = null;
    buildNetworkTab(); screen.render();
    try {
      await loadNetworkData();
      netLoading = false;
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
  buildNewsTab(); buildAlertsTab();
  buildMarketTable(); buildStatsRow(); buildNetworkTab();
  buildWalletTab(); buildTokenTab();
  screen.render();

  Promise.all([refreshMarket(), refreshNetwork()]).then(() => screen.render());
  setInterval(refreshMarket,  CFG.MARKET_REFRESH_MS);
  setInterval(refreshNetwork, CFG.NETWORK_REFRESH_MS);
}

module.exports = { startDashboard };
