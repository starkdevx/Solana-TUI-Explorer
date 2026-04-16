// =============================================
// SOLANA TERMINAL — STATIC DUMMY DATA
// =============================================

const DATA = {

  // ── Market Overview ─────────────────────────────
  market: [
    { symbol: 'SOL',   name: 'Solana',         price: 142.37, change: +2.31, pct: +1.65, vol: '2.1B',  mcap: '65.8B',  high: 145.20, low: 138.90 },
    { symbol: 'BTC',   name: 'Bitcoin',         price: 67420,  change: +742,  pct: +1.11, vol: '38.4B', mcap: '1.32T',  high: 68100,  low: 65900  },
    { symbol: 'ETH',   name: 'Ethereum',        price: 3241,   change: -13.4, pct: -0.41, vol: '14.2B', mcap: '389B',   high: 3312,   low: 3198   },
    { symbol: 'BONK',  name: 'Bonk',            price: 0.00002341, change: +0.0000089, pct: +38.21, vol: '890M', mcap: '1.62B', high: 0.0000251, low: 0.0000169 },
    { symbol: 'WIF',   name: 'dogwifhat',       price: 2.87,   change: +0.52, pct: +22.11, vol: '420M', mcap: '2.87B',  high: 3.01,   low: 2.34   },
    { symbol: 'JUP',   name: 'Jupiter',         price: 1.24,   change: +0.08, pct: +6.89, vol: '210M', mcap: '1.68B',  high: 1.31,   low: 1.15   },
    { symbol: 'PYTH',  name: 'Pyth Network',    price: 0.412,  change: -0.038, pct: -8.44, vol: '88M',  mcap: '567M',   high: 0.461,  low: 0.398  },
    { symbol: 'RAY',   name: 'Raydium',         price: 4.21,   change: +0.31, pct: +7.94, vol: '145M', mcap: '1.11B',  high: 4.38,   low: 3.89   },
    { symbol: 'MEME',  name: 'Memecoin',        price: 0.0328, change: +0.0041, pct: +14.27, vol: '62M', mcap: '328M', high: 0.0349, low: 0.0281  },
    { symbol: 'ORCA',  name: 'Orca',            price: 3.94,   change: -0.18, pct: -4.38, vol: '44M',  mcap: '394M',   high: 4.14,   low: 3.82   },
    { symbol: 'DRIFT', name: 'Drift Protocol',  price: 0.881,  change: +0.043, pct: +5.13, vol: '38M',  mcap: '528M',  high: 0.902,  low: 0.832  },
    { symbol: 'RENDER',name: 'Render',          price: 7.63,   change: +0.44, pct: +6.12, vol: '122M', mcap: '3.02B',  high: 7.88,   low: 7.14   },
    { symbol: 'POPCAT',name: 'Popcat',          price: 0.541,  change: +0.09, pct: +19.97, vol: '210M', mcap: '541M', high: 0.572,  low: 0.449  },
    { symbol: 'FARTCOIN',name:'Fartcoin',       price: 0.129,  change: +0.021, pct: +19.44, vol: '89M', mcap: '129M', high: 0.141,  low: 0.107  },
    { symbol: 'TRUMP', name: 'Official Trump',  price: 14.82,  change: -1.21, pct: -7.55, vol: '312M', mcap: '2.96B',  high: 16.44,  low: 14.61  },
  ],

  // ── Top Movers ──────────────────────────────────
  topGainers: [
    { symbol: 'BONK',    pct: +38.21 },
    { symbol: 'POPCAT',  pct: +19.97 },
    { symbol: 'FARTCOIN',pct: +19.44 },
    { symbol: 'WIF',     pct: +22.11 },
    { symbol: 'MEME',    pct: +14.27 },
  ],
  topLosers: [
    { symbol: 'PYTH',  pct: -8.44 },
    { symbol: 'TRUMP', pct: -7.55 },
    { symbol: 'ORCA',  pct: -4.38 },
    { symbol: 'ETH',   pct: -0.41 },
    { symbol: 'MNGO',  pct: -11.22 },
  ],

  // ── Wallet Data ─────────────────────────────────
  wallet: {
    address: '7xKkP...3mNpQ',
    fullAddress: '7xKkPmVn8RqwZ2jLfBd4uYtX1sCo9HGe5Ap3mNpQ',
    totalValue: 28420.50,
    pnl: { day: +1240.30, dayPct: +4.56, month: +4320.80, monthPct: +17.92 },
    holdings: [
      { token: 'SOL',    amount: 142.38,      value: 20261.20, pct: 71.3, change: +1.65  },
      { token: 'BONK',   amount: '24,500,000', value: 573.45,  pct: 2.0,  change: +38.21 },
      { token: 'JUP',    amount: 2104,         value: 2608.96, pct: 9.2,  change: +6.89  },
      { token: 'WIF',    amount: 820,          value: 2353.40, pct: 8.3,  change: +22.11 },
      { token: 'RENDER', amount: 98.4,         value: 750.79,  pct: 2.6,  change: +6.12  },
      { token: 'USDC',   amount: 1872.70,      value: 1872.70, pct: 6.6,  change: 0.00   },
    ],
    recentTxns: [
      { time: '22:41:03', type: 'SWAP',    from: '500 JUP',  to: '402 USDC',  status: 'CONFIRMED', sig: '4kXm...9nQr' },
      { time: '21:18:55', type: 'BUY',     from: '1.2 SOL',  to: '2.4M BONK', status: 'CONFIRMED', sig: '7pLn...2wKs' },
      { time: '19:04:11', type: 'STAKE',   from: '10 SOL',   to: '10 SOL',    status: 'CONFIRMED', sig: '2rMk...8vPt' },
      { time: '17:33:48', type: 'RECEIVE', from: 'External', to: '50 USDC',   status: 'CONFIRMED', sig: '9sNp...5hJu' },
      { time: '14:22:19', type: 'SELL',    from: '500 WIF',  to: '1,422 USDC',status: 'CONFIRMED', sig: '6tQr...1dCv' },
    ]
  },

  // ── Token Analytics ─────────────────────────────
  token: {
    symbol: 'BONK',
    name: 'Bonk Inu',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    shortMint: 'DezXAZ...B263',
    price: 0.00002341,
    priceChange24h: +38.21,
    liquidity: '$48.2M',
    holders: '842,103',
    volume24h: '$890M',
    volume7d: '$2.1B',
    marketCap: '$1.62B',
    fdv: '$2.34B',
    supply: '92.8T',
    topHolders: [
      { rank: 1, address: '9Fg2...3kLm', pct: 8.42, label: 'BONK Dev Wallet' },
      { rank: 2, address: '4xPn...7rQs', pct: 4.18, label: 'Binance Hot Wallet' },
      { rank: 3, address: '2mKj...5tNw', pct: 2.91, label: 'Unknown' },
      { rank: 4, address: '8vLq...1uRp', pct: 2.44, label: 'OKX Exchange' },
      { rank: 5, address: '6hGt...9dMk', pct: 1.87, label: 'Unknown' },
    ],
    riskSignals: [
      { level: 'LOW',    label: 'Rug Pull Risk',      detail: 'LP locked 24 months' },
      { level: 'LOW',    label: 'Dev Concentration',  detail: '8.4% in dev wallet' },
      { level: 'MEDIUM', label: 'Whale Activity',     detail: '3 wallets hold >2%' },
      { level: 'HIGH',   label: 'Volatility',         detail: '38% move in 24h' },
    ],
    dexPools: [
      { dex: 'Raydium', pair: 'BONK/SOL',  tvl: '$21.4M', volume: '$340M' },
      { dex: 'Orca',    pair: 'BONK/USDC', tvl: '$14.8M', volume: '$210M' },
      { dex: 'Meteora', pair: 'BONK/SOL',  tvl: '$11.9M', volume: '$88M'  },
    ]
  },

  // ── News Feed ────────────────────────────────────
  news: [
    { time: '22:54', source: 'WHALE-ALERT', tag: '🐳 WHALE', text: 'Wallet 4xPn...7rQs bought 120M BONK ($2,809) — 3rd large buy today', priority: 'high' },
    { time: '22:41', source: 'JUPITER',     tag: '🔄 SWAP',  text: 'Jupiter recorded $1.2B in 24h volume — all-time weekly high approaching', priority: 'medium' },
    { time: '22:18', source: 'ON-CHAIN',    tag: '📊 DATA',  text: 'SOL staking yield hit 6.8% APY — validator count: 3,421 active', priority: 'low' },
    { time: '22:01', source: 'X/TWITTER',   tag: '🌐 SOCIAL',text: '@solana: Network processes 4,100 TPS sustained — reliability at 99.97%', priority: 'medium' },
    { time: '21:47', source: 'WHALE-ALERT', tag: '🐳 WHALE', text: 'New wallet moved 50,000 SOL ($7.12M) from Binance to self-custody', priority: 'high' },
    { time: '21:33', source: 'DEFI',        tag: '💧 DEFI',  text: 'Raydium TVL crosses $2.8B — highest since November 2021 peak', priority: 'medium' },
    { time: '21:12', source: 'LAUNCH',      tag: '🚀 NEW',   text: 'New token $AIAGENT launched — 2,400 holders in first 30min, LP $800K locked', priority: 'high' },
    { time: '20:58', source: 'X/TWITTER',   tag: '🌐 SOCIAL',text: 'WIF breaks $2.80 resistance — CT calling $4 target next', priority: 'low' },
    { time: '20:41', source: 'ON-CHAIN',    tag: '📊 DATA',  text: 'BONK burn event scheduled for May 1 — 420T tokens to be burned', priority: 'medium' },
    { time: '20:24', source: 'EXCHANGE',    tag: '📈 CEX',   text: 'Coinbase lists WIF perpetuals — open interest $180M within 2h', priority: 'high' },
    { time: '20:08', source: 'ON-CHAIN',    tag: '📊 DATA',  text: 'Solana DeFi TVL: $8.42B — up 12% this week', priority: 'low' },
    { time: '19:52', source: 'WHALE-ALERT', tag: '🐳 WHALE', text: 'Large sell: 500K JUP ($620K) moved to Kraken — potential OTC deal', priority: 'high' },
  ],

  // ── Live Feed Messages ───────────────────────────
  liveFeed: [
    { type: 'SWAP',   text: 'SWAP  10,420,000 BONK → 243.8 SOL  via Jupiter  [4kXm...9nQr]' },
    { type: 'BUY',    text: 'BUY   2,400 WIF ($6,888) on Raydium  [7pLn...2wKs]' },
    { type: 'WHALE',  text: '🐳 WHALE  50,000 SOL moved from Binance  [2rMk...8vPt]' },
    { type: 'SWAP',   text: 'SWAP  84,200 USDC → 590 SOL  via Orca  [9sNp...5hJu]' },
    { type: 'ALERT',  text: '⚡ VOL SPIKE  POPCAT +19.9% in 45min — unusual activity' },
    { type: 'NEW',    text: '🚀 NEW TOKEN  $AIAGENT  $800K liquidity  2,400 holders' },
    { type: 'BUY',    text: 'BUY   120,000,000 BONK ($2,809) large wallet  [6tQr...1dCv]' },
    { type: 'SWAP',   text: 'SWAP  500 JUP → 402 USDC  via Jupiter  [3mNk...7rQs]' },
    { type: 'WHALE',  text: '🐳 WHALE  15,000 SOL staked  new validator  [8vLq...1uRp]' },
    { type: 'ALERT',  text: '⚡ PRICE ALERT  SOL broke $142 resistance  target: $150' },
    { type: 'SWAP',   text: 'SWAP  1,200 RAY → 1,010 USDC  via Raydium  [5hGt...9dMk]' },
    { type: 'BUY',    text: 'BUY   8,400 JUP ($10,416) — accumulation pattern' },
    { type: 'NEW',    text: '🚀 NEW TOKEN  $SOLCAT  $120K liq  launching on Pump.fun' },
    { type: 'ALERT',  text: '⚡ SNIPE  New pair detected  SOLCAT/SOL  0 to $280K in 12min' },
    { type: 'SWAP',   text: 'SWAP  20,000 USDC → 138.5 SOL  via Phoenix  [1dCv...6tQr]' },
  ],

  // ── Alerts ───────────────────────────────────────
  alerts: [
    { id: 'ALT001', token: 'SOL',    condition: 'PRICE > $150',         status: 'ACTIVE',    triggered: false, created: '2026-04-14 09:00' },
    { id: 'ALT002', token: 'BONK',   condition: 'VOL SPIKE > 50%/1h',   status: 'TRIGGERED', triggered: true,  created: '2026-04-14 10:30', triggeredAt: '22:18:03' },
    { id: 'ALT003', token: 'WIF',    condition: 'PRICE > $3.00',        status: 'ACTIVE',    triggered: false, created: '2026-04-14 11:15' },
    { id: 'ALT004', token: 'ANY',    condition: 'WHALE > $500K move',   status: 'TRIGGERED', triggered: true,  created: '2026-04-14 08:00', triggeredAt: '21:47:22' },
    { id: 'ALT005', token: 'JUP',    condition: 'PRICE < $1.00',        status: 'ACTIVE',    triggered: false, created: '2026-04-13 18:00' },
    { id: 'ALT006', token: 'PYTH',   condition: 'PRICE DROP > 10%/24h', status: 'TRIGGERED', triggered: true,  created: '2026-04-14 07:30', triggeredAt: '19:22:41' },
  ],

  // ── ASCII Sparklines (fake) ─────────────────────
  sparklines: {
    SOL:  '▁▂▃▄▃▅▇▆▇█▇▆▅▆▇▇▆▇█',
    BTC:  '▃▄▄▃▄▅▆▅▄▅▆▇▆▇▇▆▇▇▆▇',
    ETH:  '▅▆▅▄▃▄▄▃▃▄▃▃▄▄▃▄▃▃▃▄',
    BONK: '▁▁▂▁▂▃▄▅▆▇▇▇█████████',
    WIF:  '▂▃▄▄▃▄▅▇▆▇▇████████▇█',
  }
};
