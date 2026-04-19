// =============================================
// SOLANA TERMINAL CLI — Live Data Store
// This module holds the current live state.
// dashboard.js calls loadMarketData(), loadNetworkData(), etc.
// Each returns the updated store or throws on failure.
// =============================================

const API = require('./api');
const CFG = require('./config');
const { fetchNewsAggregated } = API;

// ── Live data store ────────────────────────────────────
const DATA = {
  // Populated by loadMarketData()
  market:      [],
  topGainers:  [],
  topLosers:   [],
  sparklines:  {},
  chartData:   { x: [], y: [] },
  priceExchanges: [], // not available from DexScreener — show empty

  // Populated by loadNetworkData()
  networkStats: null,

  // Populated on demand by loadWalletData(address)
  wallet: null,

  // Populated on demand by loadTokenData(mintOrSymbol)
  token: null,

  // Static/dummy — live feed is simulated from on-chain data
  liveFeed: [
    { type: 'SWAP',  text: 'SWAP  10,420,000 BONK → 243.8 SOL  via Jupiter  [4kXm...9nQr]'    },
    { type: 'BUY',   text: 'BUY   2,400 WIF ($6,888) on Raydium  [7pLn...2wKs]'               },
    { type: 'WHALE', text: 'WHALE  50,000 SOL moved from Binance  [2rMk...8vPt]'               },
    { type: 'SWAP',  text: 'SWAP  84,200 USDC → 590 SOL  via Orca  [9sNp...5hJu]'             },
    { type: 'ALERT', text: 'VOL SPIKE  BONK +5% in 45min — unusual activity'                   },
    { type: 'BUY',   text: 'BUY   120,000,000 BONK ($2,809) large wallet  [6tQr...1dCv]'      },
    { type: 'SWAP',  text: 'SWAP  500 JUP → 402 USDC  via Jupiter  [3mNk...7rQs]'             },
    { type: 'WHALE', text: 'WHALE  15,000 SOL staked  new validator  [8vLq...1uRp]'            },
  ],

  // Explorer Tab state
  explorer: {
    list: [], 
    details: null, 
    loading: false, 
    error: null 
  },

  // Alerts are static (no free alert API available)
  alerts: [
    { id: 'ALT001', token: 'SOL',  condition: 'PRICE > $150',        status: 'ACTIVE',    triggered: false, created: '04-14 09:00', triggeredAt: null        },
    { id: 'ALT002', token: 'BONK', condition: 'VOL SPIKE > 50%/1h',  status: 'TRIGGERED', triggered: true,  created: '04-14 10:30', triggeredAt: '22:18:03'  },
    { id: 'ALT003', token: 'WIF',  condition: 'PRICE > $3.00',       status: 'ACTIVE',    triggered: false, created: '04-14 11:15', triggeredAt: null        },
    { id: 'ALT004', token: 'ANY',  condition: 'WHALE > $500K move',  status: 'TRIGGERED', triggered: true,  created: '04-14 08:00', triggeredAt: '21:47:22'  },
    { id: 'ALT005', token: 'JUP',  condition: 'PRICE < $1.00',       status: 'ACTIVE',    triggered: false, created: '04-13 18:00', triggeredAt: null        },
  ],

  // Populated by loadNewsData() — live aggregated news
  news: [],
  newsLastUpdated: null,
  newsLoading: false,
};

// ═════════════════════════════════════════════════════════
// LOAD FUNCTIONS — called by dashboard.js
// ═════════════════════════════════════════════════════════

async function loadMarketData() {
  const [result, macro] = await Promise.all([
    API.fetchMarketData(),
    API.fetchCMCMacroData()
  ]);
  DATA.market      = result.market;
  DATA.topGainers  = result.topGainers;
  DATA.topLosers   = result.topLosers;
  DATA.sparklines  = result.sparklines;
  DATA.chartData   = result.chartData;
  DATA.macro       = macro || {
    marketCap: 0, marketCapChange: 0, globalVolume: 0, globalVolumeChange: 0,
    fearGreedValue: 50, fearGreedClass: 'Neutral', altcoinIndex: 35
  };
  return DATA;
}

async function loadNetworkData() {
  const [epoch, tpsData, blocktimeData, validators, supply] = await Promise.all([
    API.fetchEpochInfo(),
    API.fetchTPS(),
    API.fetchBlocktime(),
    API.fetchValidators(),
    API.fetchSupply(),
  ]);

  supply.epoch = epoch.current;

  // Build networkStats in the shape dashboard.js expects
  DATA.networkStats = {
    epoch,
    tps:      tpsData,
    blocktime: blocktimeData,
    validators,
    supply,
    stakeData: {
      totalStaked:    supply.staked.toFixed(1) + 'M SOL',
      totalStakedUsd: '$' + (supply.staked * (DATA.market.find(m => m.symbol === 'SOL')?.price || 0) / 1e3).toFixed(1) + 'B',
      activeStakers:  '—',
      uniqueWallets:  '—',
      biggestStake:   '—',
      medianStake:    '—',
      meanStake:      '—',
      filterApy:      supply.stakingApy + '%',
      updated:        'just now',
    },
    // Stake graph — approximate from epoch data
    stakeGraph: Array.from({ length: 8 }, (_, i) => ({
      epoch: epoch.current - (7 - i) * 50,
      sol:   parseFloat((supply.staked * (0.95 + Math.random() * 0.1)).toFixed(2)),
    })).concat([{ epoch: epoch.current, sol: supply.staked }]),
    stakeDistribution: [], // Would need a staking indexer
  };
  return DATA;
}

async function loadWalletData(address) {
  const [result, score] = await Promise.all([
    API.fetchWalletData(address),
    API.fetchFairScaleScore(address)
  ]);
  result.fairScale = score;
  DATA.wallet     = result;
  return DATA;
}

async function loadTokenData(mintOrSymbol, timeframe) {
  const [result, socials] = await Promise.all([
    API.fetchTokenData(mintOrSymbol, timeframe),
    API.fetchTwitterRSS(mintOrSymbol)
  ]);
  DATA.token = result;
  DATA.tokenSocials = socials;
  return DATA;
}

async function loadNewsData() {
  DATA.newsLoading = true;
  const [items, defaultSocials] = await Promise.all([
    API.fetchNewsAggregated(),
    API.fetchTwitterRSS('solana')
  ]);
  DATA.news = items;
  if (defaultSocials) DATA.tokenSocials = defaultSocials;
  DATA.newsLastUpdated = new Date();
  DATA.newsLoading = false;
  return DATA;
}

// ── Explorer Data Loaders ─────────────────────────────────
async function loadExplorerList() {
  DATA.explorer.loading = true;
  try {
    const list = await API.fetchLatestTransactions();
    DATA.explorer.list = list;
    DATA.explorer.error = null;
  } catch (e) {
    DATA.explorer.error = e.message;
  }
  DATA.explorer.loading = false;
  return DATA;
}

async function loadExplorerDetails(signature) {
  DATA.explorer.loading = true;
  DATA.explorer.details = null;
  try {
    const details = await API.fetchTransactionDetails(signature);
    if (details.error) throw new Error(details.error);
    DATA.explorer.details = details;
    DATA.explorer.error = null;
  } catch (e) {
    DATA.explorer.error = e.message;
  }
  DATA.explorer.loading = false;
  return DATA;
}

module.exports = { DATA, loadMarketData, loadNetworkData, loadWalletData, loadTokenData, loadNewsData, loadExplorerList, loadExplorerDetails };
