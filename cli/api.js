// =============================================
// SOLANA TERMINAL CLI — API Layer
//   • CoinDesk Data API — BTC, ETH, SOL (accurate spot prices)
//   • DexScreener       — Solana-native tokens
//   • Solana public RPC — network stats and wallet data
// =============================================

const https = require('https');
const CFG = require('./config');
const { SOLANA_RPC, DEXSCREENER_BASE, TOKEN_MINTS, TOKEN_NAMES, MARKET_SYMBOLS,
        COINDESK_BASE, COINDESK_MARKET, COINDESK_API_KEY,
        COINDESK_SYMBOLS, DEX_SYMBOLS } = CFG;

// ── Generic HTTPS GET ─────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'SolanaTerminal/1.0',
        'Accept':     'application/json',
      },
      timeout: 12000,
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsGet(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ── Solana RPC POST ──────────────────────────────────────
function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const options = {
      hostname: new URL(SOLANA_RPC).hostname,
      path:     '/',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent':     'SolanaTerminal/1.0',
      },
      timeout: 15000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message || 'RPC error'));
          resolve(json.result);
        } catch (e) {
          reject(new Error('RPC JSON parse error: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('RPC timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Formatters ───────────────────────────────────────────
function fmtVol(usd) {
  if (usd >= 1e9) return (usd / 1e9).toFixed(2) + 'B';
  if (usd >= 1e6) return (usd / 1e6).toFixed(1) + 'M';
  if (usd >= 1e3) return (usd / 1e3).toFixed(0) + 'K';
  return usd.toFixed(0);
}

function fmtMcap(usd) {
  if (usd >= 1e12) return (usd / 1e12).toFixed(2) + 'T';
  if (usd >= 1e9)  return (usd / 1e9).toFixed(2) + 'B';
  if (usd >= 1e6)  return (usd / 1e6).toFixed(1) + 'M';
  return usd.toFixed(0);
}

function fmtSol(lamports) {
  return (lamports / 1e9).toFixed(4);
}

// ── Pick best pair (highest liquidity in USD) ─────────────
// For USD-denominated tokens (SOL, wBTC, etc.) prefer USDC/USDT quote pairs
const USD_QUOTES = new Set(['USDC','USDT','USD']);
function bestPair(pairs, preferUsd = false) {
  if (!pairs || !pairs.length) return null;
  if (preferUsd) {
    // Prefer pairs quoted in a stablecoin with priceUsd > 0.01
    const usdPairs = pairs.filter(p =>
      USD_QUOTES.has(p.quoteToken?.symbol?.toUpperCase()) && parseFloat(p.priceUsd) > 0.01
    );
    if (usdPairs.length) {
      return usdPairs.reduce((best, p) =>
        (p.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? p : best, usdPairs[0]);
    }
  }
  // Fallback: highest liquidity pair with a valid priceUsd
  const validPairs = pairs.filter(p => parseFloat(p.priceUsd) > 0);
  if (!validPairs.length) return pairs[0];
  return validPairs.reduce((best, p) =>
    (p.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? p : best, validPairs[0]);
}

// ═════════════════════════════════════════════════════════
// MARKET DATA
//   CoinDesk  → BTC, ETH, SOL  (accurate spot prices)
//   DexScreener→ Solana-native tokens (BONK, WIF, JUP …)
// ═════════════════════════════════════════════════════════

// ── CoinDesk: spot tick for multiple instruments ──────────
// Endpoint: GET /spot/v1/latest/tick?market=coinbase&instruments=BTC-USD,ETH-USD,SOL-USD
// Returns full OHLCV + 24h stats per instrument.
async function fetchCoinDeskPrices(symbols) {
  const instruments = symbols.map(s => `${s}-USD`).join(',');
  const url = `${COINDESK_BASE}/spot/v1/latest/tick?market=${COINDESK_MARKET}&instruments=${instruments}&apply_mapping=true`;

  const headers = {
    'User-Agent': 'SolanaTerminal/1.0',
    'Accept':     'application/json',
  };
  if (COINDESK_API_KEY) headers['Coindesk-Api-Key'] = COINDESK_API_KEY;

  const data = await new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchCoinDeskPrices(symbols));  // follow redirect
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`CoinDesk HTTP ${res.statusCode}`));
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('CoinDesk JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('CoinDesk timeout')); });
  });

  const COIN_NAMES = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana' };
  const result = [];

  for (const sym of symbols) {
    const key  = `${sym}-USD`;
    const tick = data?.Data?.[key];
    if (!tick) continue;

    const price  = tick.PRICE || 0;
    const pct    = tick.MOVING_24_HOUR_CHANGE_PERCENTAGE || 0;         // 24h rolling %
    const vol    = tick.MOVING_24_HOUR_QUOTE_VOLUME || 0;              // 24h USD volume
    const high   = tick.MOVING_24_HOUR_HIGH || price;
    const low    = tick.MOVING_24_HOUR_LOW  || price;
    const open24 = tick.MOVING_24_HOUR_OPEN || price;

    const supplies = { BTC: 19_700_000, ETH: 120_000_000, SOL: 460_000_000 };
    const mcapNum  = supplies[sym] ? (supplies[sym] * price) : 0;

    result.push({
      symbol: sym,
      name:   COIN_NAMES[sym] || sym,
      price,
      change: parseFloat((price - open24).toFixed(2)),
      pct:    parseFloat(pct.toFixed(4)),
      vol:    fmtVol(vol),
      mcap:   mcapNum ? fmtMcap(mcapNum) : '—',
      high,
      low,
      source: 'coindesk',
    });
  }

  return result;
}

// ── DexScreener: batch fetch for Solana-native tokens ─────
async function fetchDexTokenPrices(symbols) {
  const mints = symbols.map(s => TOKEN_MINTS[s]).filter(Boolean);
  if (!mints.length) return [];

  const CHUNK = 10;
  const allPairs = [];
  for (let i = 0; i < mints.length; i += CHUNK) {
    const chunk = mints.slice(i, i + CHUNK).join(',');
    const data  = await httpsGet(`${DEXSCREENER_BASE}/latest/dex/tokens/${chunk}`);
    if (data?.pairs) allPairs.push(...data.pairs);
    if (i + CHUNK < mints.length) await new Promise(r => setTimeout(r, 400));
  }

  const USD_QUOTES = new Set(['USDC','USDT','USD']);
  const byMint = {};
  allPairs.forEach(p => {
    const addr = p.baseToken?.address;
    if (!addr) return;
    if (!byMint[addr]) byMint[addr] = [];
    byMint[addr].push(p);
  });

  const result = [];
  for (const sym of symbols) {
    const mint  = TOKEN_MINTS[sym];
    if (!mint || !byMint[mint]) continue;

    const pairs = byMint[mint];
    // Prefer USD-quoted pairs; pick highest liquidity among those
    const usdPairs  = pairs.filter(p => USD_QUOTES.has(p.quoteToken?.symbol?.toUpperCase()) && parseFloat(p.priceUsd) > 0);
    const pool      = usdPairs.length ? usdPairs : pairs.filter(p => parseFloat(p.priceUsd) > 0);
    if (!pool.length) continue;
    const best      = pool.reduce((a, b) => (a.liquidity?.usd || 0) > (b.liquidity?.usd || 0) ? a : b);

    const price = parseFloat(best.priceUsd || 0);
    if (price <= 0) continue;
    const pct      = parseFloat(best.priceChange?.h24 || 0);
    const totalVol = pairs.reduce((s, p) => s + (p.volume?.h24 || 0), 0);

    result.push({
      symbol: sym,
      name:   TOKEN_NAMES[sym] || best.baseToken?.name || sym,
      price,
      change: parseFloat((pct * price / 100).toFixed(price >= 1 ? 2 : 8)),
      pct,
      vol:    fmtVol(totalVol || best.volume?.h24 || 0),
      mcap:   fmtMcap(best.marketCap || best.fdv || 0),
      high:   price * (1 + Math.max(0, pct) / 100),
      low:    price * (1 - Math.max(0, -pct) / 100),
      source: 'dexscreener',
    });
  }
  return result;
}

const CG_IDS = {
  SOL: 'solana', BTC: 'bitcoin', ETH: 'ethereum',
  BONK: 'bonk', WIF: 'dogwifcoin', JUP: 'jupiter-exchange-solana',
  PYTH: 'pyth-network', RAY: 'raydium', ORCA: 'orca',
  DRIFT: 'drift-protocol', POPCAT: 'popcat', FARTCOIN: 'fartcoin',
  TRUMP: 'official-trump'
};
let cachedSparklines = {};
let lastSparkFetch = 0;

async function fetchSparklines() {
  const now = Date.now();
  if (now - lastSparkFetch < 120000 && Object.keys(cachedSparklines).length > 0) {
    return cachedSparklines;
  }
  const ids = Object.values(CG_IDS).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true`;
  try {
    const data = await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject).on('timeout', reject);
    });
    if (Array.isArray(data)) {
      data.forEach(c => {
        const sym = Object.keys(CG_IDS).find(k => CG_IDS[k] === c.id);
        if (sym && c.sparkline_in_7d?.price) {
          cachedSparklines[sym] = c.sparkline_in_7d.price.slice(-24); // last 24h
        }
      });
      lastSparkFetch = now;
    }
  } catch (e) { /* silently fallback to cache */ }
  return cachedSparklines;
}

// ── Unified market fetch ────────────────────────────────────
async function fetchMarketData() {
  // Run both sources + sparklines in parallel
  const [coinDeskData, dexData, sparkData] = await Promise.allSettled([
    fetchCoinDeskPrices(COINDESK_SYMBOLS),
    fetchDexTokenPrices(DEX_SYMBOLS),
    fetchSparklines()
  ]);

  const cdMarket  = coinDeskData.status  === 'fulfilled' ? coinDeskData.value  : [];
  const dexMarket = dexData.status       === 'fulfilled' ? dexData.value       : [];

  if (!cdMarket.length) console.warn('[api] CoinDesk fetch failed; SOL/BTC/ETH prices may be missing');
  if (!dexMarket.length) console.warn('[api] DexScreener fetch failed; token prices may be missing');

  // Merge: CoinDesk coins first, then DexScreener tokens, in MARKET_SYMBOLS order
  const allData = [...cdMarket, ...dexMarket];
  const finalSpark = (sparkData.status === 'fulfilled') ? sparkData.value : cachedSparklines;
  allData.forEach(d => {
    if (finalSpark[d.symbol]) d.sparkArray = finalSpark[d.symbol];
  });
  const market  = MARKET_SYMBOLS
    .map(sym => allData.find(m => m.symbol === sym))
    .filter(Boolean);

  // Top gainers/losers
  const sorted     = [...market].sort((a, b) => b.pct - a.pct);
  const topGainers = sorted.slice(0, 5).filter(m => m.pct > 0).map(m => ({ symbol: m.symbol, pct: m.pct, sparkArray: m.sparkArray }));
  const topLosers  = [...market].sort((a, b) => a.pct - b.pct).slice(0, 5).filter(m => m.pct < 0).map(m => ({ symbol: m.symbol, pct: m.pct, sparkArray: m.sparkArray }));

  // Chart data for F2 price tab (SOL 24h — approximate from pct + high/low)
  const solEntry = market.find(m => m.symbol === 'SOL');
  const solPrice = solEntry?.price || 0;
  const solPct   = solEntry?.pct   || 0;
  const solLow   = solEntry?.low   || solPrice * 0.98;
  const solHigh  = solEntry?.high  || solPrice * 1.02;
  const chartData = {
    x: ['24h', '20h', '16h', '12h', '8h', '4h', '2h', '1h', 'Now'],
    y: (() => {
      // Build a plausible intraday curve using open→range→close
      const open = solPrice * (1 - solPct / 100);
      const pts  = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        // Sine wave through price range to simulate intraday movement
        const wave  = Math.sin(t * Math.PI * 1.5) * (solHigh - solLow) * 0.4;
        const trend = open + (solPrice - open) * t;
        pts.push(Math.max(solLow, Math.min(solHigh, trend + wave)));
      }
      return pts;
    })(),
  };

  return { market, topGainers, topLosers, chartData };
}

// ═════════════════════════════════════════════════════════
// TOKEN DATA — DexScreener for single token (F4)
// ═════════════════════════════════════════════════════════
async function fetchTokenData(mintOrSymbol) {
  // Resolve symbol → mint if needed
  let mint = mintOrSymbol;
  if (TOKEN_MINTS[mintOrSymbol?.toUpperCase()]) {
    mint = TOKEN_MINTS[mintOrSymbol.toUpperCase()];
  }

  const data = await httpsGet(`${DEXSCREENER_BASE}/latest/dex/tokens/${mint}`);
  if (!data?.pairs?.length) throw new Error('Token not found on DexScreener');

  // Sort pairs by volume desc
  const pairs = data.pairs.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
  const top   = pairs[0];

  const price          = parseFloat(top.priceUsd || 0);
  const priceChange24h = parseFloat(top.priceChange?.h24 || 0);
  const symbol         = top.baseToken?.symbol || mintOrSymbol;
  const name           = top.baseToken?.name   || symbol;

  // Aggregate liquidity + volume across all pairs
  const totalLiq = pairs.reduce((s, p) => s + (p.liquidity?.usd || 0), 0);
  const totalVol = pairs.reduce((s, p) => s + (p.volume?.h24 || 0), 0);

  // DEX pools (top 5 by volume)
  const dexPools = pairs.slice(0, 5).map(p => ({
    dex:    p.dexId?.charAt(0).toUpperCase() + p.dexId?.slice(1) || '—',
    pair:   (p.baseToken?.symbol || '?') + '/' + (p.quoteToken?.symbol || '?'),
    tvl:    '$' + fmtVol(p.liquidity?.usd || 0),
    volume: '$' + fmtVol(p.volume?.h24 || 0),
  }));

  // Risk signals — derived from on-chain stats
  const riskSignals = [
    {
      level:  totalLiq < 100000 ? 'HIGH' : totalLiq < 500000 ? 'MEDIUM' : 'LOW',
      label:  'Liquidity Depth',
      detail: 'Total DEX liquidity: $' + fmtVol(totalLiq),
    },
    {
      level:  Math.abs(priceChange24h) > 30 ? 'HIGH' : Math.abs(priceChange24h) > 15 ? 'MEDIUM' : 'LOW',
      label:  'Volatility',
      detail: Math.abs(priceChange24h).toFixed(1) + '% move in 24h',
    },
    {
      level:  pairs.length < 2 ? 'HIGH' : pairs.length < 4 ? 'MEDIUM' : 'LOW',
      label:  'DEX Concentration',
      detail: pairs.length + ' active trading pairs',
    },
  ];

  const shortMint = mint.length > 12 ? mint.slice(0, 6) + '...' + mint.slice(-4) : mint;

  return {
    symbol,
    name,
    mint,
    shortMint,
    price,
    priceChange24h,
    liquidity:   '$' + fmtVol(totalLiq),
    holders:     '—',   // DexScreener doesn't expose holders
    volume24h:   '$' + fmtVol(totalVol),
    volume7d:    '—',
    marketCap:   '$' + fmtMcap(top.marketCap || top.fdv || 0),
    fdv:         '$' + fmtMcap(top.fdv || 0),
    supply:      '—',
    topHolders:  [],    // Would need separate indexer API
    riskSignals,
    dexPools,
    rawPairs: pairs,
  };
}

// ═════════════════════════════════════════════════════════
// NETWORK — Solana public RPC
// ═════════════════════════════════════════════════════════

async function fetchEpochInfo() {
  const info = await rpcCall('getEpochInfo');
  const progress  = (info.slotIndex / info.slotsInEpoch) * 100;
  const slotsLeft = info.slotsInEpoch - info.slotIndex;
  // Each slot ~0.4s
  const secsLeft  = slotsLeft * 0.4;
  const hoursLeft = Math.floor(secsLeft / 3600);
  const minsLeft  = Math.floor((secsLeft % 3600) / 60);

  return {
    current:    info.epoch,
    progress:   parseFloat(progress.toFixed(1)),
    timeLeft:   `${hoursLeft}h ${minsLeft}m`,
    slotsDone:  info.slotIndex,
    slotsTotal: info.slotsInEpoch,
    startTime:  'Epoch ' + info.epoch + ' start',
    endTime:    `~${hoursLeft}h ${minsLeft}m remaining`,
    absoluteSlot: info.absoluteSlot,
  };
}

async function fetchTPS() {
  // getRecentPerformanceSamples returns samples of ~60s each
  const samples = await rpcCall('getRecentPerformanceSamples', [10]);
  if (!samples || !samples.length) throw new Error('No TPS samples');

  const tpsValues = samples.map(s =>
    s.samplePeriodSecs > 0 ? Math.round(s.numTransactions / s.samplePeriodSecs) : 0
  );

  const history = tpsValues.slice().reverse().map((val, i) => ({
    ago:   `${(tpsValues.length - i) + 1} mins ago`,
    value: val,
  }));

  return {
    current: tpsValues[0] || 0,
    average: Math.round(tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length),
    maximum: Math.max(...tpsValues),
    minimum: Math.min(...tpsValues),
    history,
  };
}

async function fetchBlocktime() {
  // Use recent performance samples for blocktime estimate
  const samples = await rpcCall('getRecentPerformanceSamples', [10]);
  if (!samples || !samples.length) throw new Error('No blocktime samples');

  const btValues = samples.map(s =>
    s.numSlots > 0 ? parseFloat((s.samplePeriodSecs * 1000 / s.numSlots).toFixed(2)) : 400
  );

  const history = btValues.slice().reverse().map((val, i) => ({
    ago:   `${(btValues.length - i) + 1} mins ago`,
    value: val.toFixed(2) + ' ms',
  }));

  return {
    current: btValues[0] || 0,
    average: parseFloat((btValues.reduce((a, b) => a + b, 0) / btValues.length).toFixed(2)),
    maximum: Math.max(...btValues),
    minimum: Math.min(...btValues),
    history,
  };
}

async function fetchValidators() {
  const result = await rpcCall('getVoteAccounts');
  const current = result?.current || [];

  // Sort by activated stake desc, take top 10
  const top = current
    .sort((a, b) => b.activatedStake - a.activatedStake)
    .slice(0, 10);

  return top.map((v, i) => ({
    rank:        i + 1,
    name:        v.votePubkey.slice(0, 8) + '...',
    stake:       (v.activatedStake / 1e9).toFixed(2) + 'M',
    commission:  v.commission + '%',
    delegators:  '—',
  }));
}

async function fetchSupply() {
  const result = await rpcCall('getSupply');
  const supply  = result?.value;
  if (!supply) throw new Error('No supply data');

  // supply values are in lamports (1 SOL = 1e9 lamports)
  // Express in millions (M) for display
  const total       = parseFloat((supply.total       / 1e9 / 1e6).toFixed(1)); // millions of SOL
  const circulating = parseFloat((supply.circulating / 1e9 / 1e6).toFixed(1)); // millions of SOL
  const circulatingPct = parseFloat((circulating / total * 100).toFixed(1));

  // Approximate staked: ~65% of circulating (Solana historical avg)
  const stakedPct = 65.4;
  const staked    = parseFloat((circulating * stakedPct / 100).toFixed(1));

  return {
    circulating,
    circulatingPct,
    staked,
    stakedPct,
    total,
    epoch:         0, // filled from epochInfo
    stakingApy:    7.07,
    inflationRate: 4.58,
  };
}

// ═════════════════════════════════════════════════════════
// WALLET — Solana public RPC (jsonParsed)
// ═════════════════════════════════════════════════════════

async function fetchWalletData(address) {
  // 1. SOL balance
  const balResult = await rpcCall('getBalance', [address]);
  const solBalance = parseFloat(fmtSol(balResult?.value || 0));

  // 2. SPL token accounts
  const tokenAccounts = await rpcCall('getTokenAccountsByOwner', [
    address,
    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
    { encoding: 'jsonParsed' },
  ]);

  const accounts = tokenAccounts?.value || [];

  // Build holdings from token accounts
  const rawHoldings = [];
  for (const acc of accounts) {
    const info   = acc.account?.data?.parsed?.info;
    if (!info) continue;
    const mint   = info.mint;
    const amount = parseFloat(info.tokenAmount?.uiAmountString || '0');
    if (amount === 0) continue;
    rawHoldings.push({ mint, amount });
  }

  // Lookup prices for each mint via DexScreener (batch if possible)
  const mintAddresses = rawHoldings.map(h => h.mint).slice(0, 20); // cap at 20 tokens
  let priceMap = {};

  if (mintAddresses.length > 0) {
    try {
      const CHUNK = 10;
      for (let i = 0; i < mintAddresses.length; i += CHUNK) {
        const chunk = mintAddresses.slice(i, i + CHUNK).join(',');
        const dxData = await httpsGet(`${DEXSCREENER_BASE}/latest/dex/tokens/${chunk}`);
        (dxData?.pairs || []).forEach(p => {
          const m = p.baseToken?.address;
          if (m && !priceMap[m]) {
            priceMap[m] = parseFloat(p.priceUsd || 0);
          }
        });
        if (i + CHUNK < mintAddresses.length) await new Promise(r => setTimeout(r, 300));
      }
    } catch (_) { /* price lookup best-effort */ }
  }

  // Get SOL price — prefer USDC/USDT quoted pair
  let solPrice = 0;
  try {
    const dxSol = await httpsGet(`${DEXSCREENER_BASE}/latest/dex/tokens/${TOKEN_MINTS.SOL}`);
    const solPair = bestPair(dxSol?.pairs, true);
    solPrice = parseFloat(solPair?.priceUsd || 0);
    if (priceMap && solPrice > 0) priceMap[TOKEN_MINTS.SOL] = solPrice;
  } catch (_) { solPrice = 0; }

  // Build holdings list
  const solValue = solBalance * solPrice;
  const holdings = [
    {
      token: 'SOL',
      amount: solBalance.toFixed(4),
      value: solValue,
      pct: 0,
      change: 0,
    },
  ];

  for (const h of rawHoldings) {
    const price = priceMap[h.mint] || 0;
    const value = h.amount * price;
    if (value < 0.01 && h.amount > 0 && price === 0) continue; // skip zero-price dust
    const sym = Object.entries(TOKEN_MINTS).find(([, m]) => m === h.mint)?.[0];
    holdings.push({
      token:  sym || h.mint.slice(0, 6) + '...',
      amount: h.amount >= 1000 ? h.amount.toLocaleString('en-US', { maximumFractionDigits: 0 }) : h.amount.toFixed(4),
      value,
      pct: 0,
      change: 0,
    });
  }

  // Sort by value desc
  holdings.sort((a, b) => b.value - a.value);

  // Calculate portfolio total & allocation percentages
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  holdings.forEach(h => {
    h.pct = totalValue > 0 ? parseFloat((h.value / totalValue * 100).toFixed(1)) : 0;
  });

  // 3. Recent transactions  
  const sigsResult = await rpcCall('getSignaturesForAddress', [address, { limit: 5 }]);
  const sigs       = sigsResult || [];

  // Parse transactions (simplified — just extract sig + time)
  const recentTxns = sigs.map((s, i) => ({
    time:   s.blockTime ? new Date(s.blockTime * 1000).toLocaleTimeString('en-US', { hour12: false }) : '—',
    type:   'TX',
    from:   address.slice(0, 8) + '...',
    to:     '—',
    status: s.err ? 'FAILED' : 'CONFIRMED',
    sig:    s.signature.slice(0, 6) + '...' + s.signature.slice(-4),
  }));

  const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);

  return {
    address:     shortAddr,
    fullAddress: address,
    totalValue,
    pnl: { day: 0, dayPct: 0, month: 0, monthPct: 0 }, // PNL needs historical price — omit for now
    holdings,
    recentTxns,
    solPrice,
  };
}

// ═════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════
module.exports = {
  fetchMarketData,
  fetchTokenData,
  fetchEpochInfo,
  fetchTPS,
  fetchBlocktime,
  fetchValidators,
  fetchSupply,
  fetchWalletData,
};
