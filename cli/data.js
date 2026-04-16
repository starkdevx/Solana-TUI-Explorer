// =============================================
// SOLANA TERMINAL CLI — Data Layer (mirrors web data.js)
// =============================================

const DATA = {

  market: [
    { symbol: 'SOL',      name: 'Solana',         price: 142.37,     change: +2.31,      pct: +1.65,  vol: '2.1B',  mcap: '65.8B',  high: 145.20,    low: 138.90 },
    { symbol: 'BTC',      name: 'Bitcoin',         price: 67420,      change: +742,       pct: +1.11,  vol: '38.4B', mcap: '1.32T',  high: 68100,     low: 65900  },
    { symbol: 'ETH',      name: 'Ethereum',        price: 3241,       change: -13.4,      pct: -0.41,  vol: '14.2B', mcap: '389B',   high: 3312,      low: 3198   },
    { symbol: 'BONK',     name: 'Bonk',            price: 0.00002341, change: +0.0000089, pct: +38.21, vol: '890M',  mcap: '1.62B',  high: 0.0000251, low: 0.0000169 },
    { symbol: 'WIF',      name: 'dogwifhat',       price: 2.87,       change: +0.52,      pct: +22.11, vol: '420M',  mcap: '2.87B',  high: 3.01,      low: 2.34   },
    { symbol: 'JUP',      name: 'Jupiter',         price: 1.24,       change: +0.08,      pct: +6.89,  vol: '210M',  mcap: '1.68B',  high: 1.31,      low: 1.15   },
    { symbol: 'PYTH',     name: 'Pyth Network',    price: 0.412,      change: -0.038,     pct: -8.44,  vol: '88M',   mcap: '567M',   high: 0.461,     low: 0.398  },
    { symbol: 'RAY',      name: 'Raydium',         price: 4.21,       change: +0.31,      pct: +7.94,  vol: '145M',  mcap: '1.11B',  high: 4.38,      low: 3.89   },
    { symbol: 'MEME',     name: 'Memecoin',        price: 0.0328,     change: +0.0041,    pct: +14.27, vol: '62M',   mcap: '328M',   high: 0.0349,    low: 0.0281 },
    { symbol: 'ORCA',     name: 'Orca',            price: 3.94,       change: -0.18,      pct: -4.38,  vol: '44M',   mcap: '394M',   high: 4.14,      low: 3.82   },
    { symbol: 'DRIFT',    name: 'Drift Protocol',  price: 0.881,      change: +0.043,     pct: +5.13,  vol: '38M',   mcap: '528M',   high: 0.902,     low: 0.832  },
    { symbol: 'RENDER',   name: 'Render',          price: 7.63,       change: +0.44,      pct: +6.12,  vol: '122M',  mcap: '3.02B',  high: 7.88,      low: 7.14   },
    { symbol: 'POPCAT',   name: 'Popcat',          price: 0.541,      change: +0.09,      pct: +19.97, vol: '210M',  mcap: '541M',   high: 0.572,     low: 0.449  },
    { symbol: 'FARTCOIN', name: 'Fartcoin',        price: 0.129,      change: +0.021,     pct: +19.44, vol: '89M',   mcap: '129M',   high: 0.141,     low: 0.107  },
    { symbol: 'TRUMP',    name: 'Official Trump',  price: 14.82,      change: -1.21,      pct: -7.55,  vol: '312M',  mcap: '2.96B',  high: 16.44,     low: 14.61  },
  ],

  topGainers: [
    { symbol: 'BONK',     pct: +38.21 },
    { symbol: 'POPCAT',   pct: +19.97 },
    { symbol: 'FARTCOIN', pct: +19.44 },
    { symbol: 'WIF',      pct: +22.11 },
    { symbol: 'MEME',     pct: +14.27 },
  ],
  topLosers: [
    { symbol: 'PYTH',  pct: -8.44  },
    { symbol: 'TRUMP', pct: -7.55  },
    { symbol: 'ORCA',  pct: -4.38  },
    { symbol: 'ETH',   pct: -0.41  },
    { symbol: 'MNGO',  pct: -11.22 },
  ],

  wallet: {
    address:     '7xKkP...3mNpQ',
    fullAddress: '7xKkPmVn8RqwZ2jLfBd4uYtX1sCo9HGe5Ap3mNpQ',
    totalValue:  28420.50,
    pnl: { day: +1240.30, dayPct: +4.56, month: +4320.80, monthPct: +17.92 },
    holdings: [
      { token: 'SOL',    amount: '142.38',      value: 20261.20, pct: 71.3, change: +1.65  },
      { token: 'BONK',   amount: '24,500,000',  value: 573.45,   pct: 2.0,  change: +38.21 },
      { token: 'JUP',    amount: '2,104',       value: 2608.96,  pct: 9.2,  change: +6.89  },
      { token: 'WIF',    amount: '820',         value: 2353.40,  pct: 8.3,  change: +22.11 },
      { token: 'RENDER', amount: '98.4',        value: 750.79,   pct: 2.6,  change: +6.12  },
      { token: 'USDC',   amount: '1,872.70',    value: 1872.70,  pct: 6.6,  change: 0.00   },
    ],
    recentTxns: [
      { time: '22:41:03', type: 'SWAP',    from: '500 JUP',   to: '402 USDC',   status: 'CONFIRMED', sig: '4kXm...9nQr' },
      { time: '21:18:55', type: 'BUY',     from: '1.2 SOL',   to: '2.4M BONK',  status: 'CONFIRMED', sig: '7pLn...2wKs' },
      { time: '19:04:11', type: 'STAKE',   from: '10 SOL',    to: '10 SOL',     status: 'CONFIRMED', sig: '2rMk...8vPt' },
      { time: '17:33:48', type: 'RECEIVE', from: 'External',  to: '50 USDC',    status: 'CONFIRMED', sig: '9sNp...5hJu' },
      { time: '14:22:19', type: 'SELL',    from: '500 WIF',   to: '1,422 USDC', status: 'CONFIRMED', sig: '6tQr...1dCv' },
    ]
  },

  token: {
    symbol:        'BONK',
    name:          'Bonk Inu',
    mint:          'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    shortMint:     'DezXAZ...B263',
    price:         0.00002341,
    priceChange24h:+38.21,
    liquidity:     '$48.2M',
    holders:       '842,103',
    volume24h:     '$890M',
    volume7d:      '$2.1B',
    marketCap:     '$1.62B',
    fdv:           '$2.34B',
    supply:        '92.8T',
    topHolders: [
      { rank: 1, address: '9Fg2...3kLm', pct: 8.42, label: 'BONK Dev Wallet'    },
      { rank: 2, address: '4xPn...7rQs', pct: 4.18, label: 'Binance Hot Wallet' },
      { rank: 3, address: '2mKj...5tNw', pct: 2.91, label: 'Unknown'            },
      { rank: 4, address: '8vLq...1uRp', pct: 2.44, label: 'OKX Exchange'       },
      { rank: 5, address: '6hGt...9dMk', pct: 1.87, label: 'Unknown'            },
    ],
    riskSignals: [
      { level: 'LOW',    label: 'Rug Pull Risk',     detail: 'LP locked 24 months'  },
      { level: 'LOW',    label: 'Dev Concentration', detail: '8.4% in dev wallet'   },
      { level: 'MEDIUM', label: 'Whale Activity',    detail: '3 wallets hold >2%'   },
      { level: 'HIGH',   label: 'Volatility',        detail: '38% move in 24h'      },
    ],
    dexPools: [
      { dex: 'Raydium', pair: 'BONK/SOL',  tvl: '$21.4M', volume: '$340M' },
      { dex: 'Orca',    pair: 'BONK/USDC', tvl: '$14.8M', volume: '$210M' },
      { dex: 'Meteora', pair: 'BONK/SOL',  tvl: '$11.9M', volume: '$88M'  },
    ]
  },

  news: [
    { time: '22:54', source: 'WHALE-ALERT', tag: 'WHALE',  text: 'Wallet 4xPn...7rQs bought 120M BONK ($2,809) — 3rd large buy today',           priority: 'high'   },
    { time: '22:41', source: 'JUPITER',     tag: 'SWAP',   text: 'Jupiter recorded $1.2B in 24h volume — all-time weekly high approaching',       priority: 'medium' },
    { time: '22:18', source: 'ON-CHAIN',    tag: 'DATA',   text: 'SOL staking yield hit 6.8% APY — validator count: 3,421 active',                priority: 'low'    },
    { time: '22:01', source: 'X/TWITTER',   tag: 'SOCIAL', text: '@solana: Network processes 4,100 TPS sustained — reliability at 99.97%',        priority: 'medium' },
    { time: '21:47', source: 'WHALE-ALERT', tag: 'WHALE',  text: 'New wallet moved 50,000 SOL ($7.12M) from Binance to self-custody',             priority: 'high'   },
    { time: '21:33', source: 'DEFI',        tag: 'DEFI',   text: 'Raydium TVL crosses $2.8B — highest since November 2021 peak',                 priority: 'medium' },
    { time: '21:12', source: 'LAUNCH',      tag: 'NEW',    text: 'New token $AIAGENT launched — 2,400 holders in first 30min, LP $800K locked',   priority: 'high'   },
    { time: '20:58', source: 'X/TWITTER',   tag: 'SOCIAL', text: 'WIF breaks $2.80 resistance — CT calling $4 target next',                       priority: 'low'    },
    { time: '20:41', source: 'ON-CHAIN',    tag: 'DATA',   text: 'BONK burn event scheduled for May 1 — 420T tokens to be burned',               priority: 'medium' },
    { time: '20:24', source: 'EXCHANGE',    tag: 'CEX',    text: 'Coinbase lists WIF perpetuals — open interest $180M within 2h',                 priority: 'high'   },
    { time: '20:08', source: 'ON-CHAIN',    tag: 'DATA',   text: 'Solana DeFi TVL: $8.42B — up 12% this week',                                    priority: 'low'    },
    { time: '19:52', source: 'WHALE-ALERT', tag: 'WHALE',  text: 'Large sell: 500K JUP ($620K) moved to Kraken — potential OTC deal',             priority: 'high'   },
  ],

  liveFeed: [
    { type: 'SWAP',  text: 'SWAP  10,420,000 BONK → 243.8 SOL  via Jupiter  [4kXm...9nQr]'       },
    { type: 'BUY',   text: 'BUY   2,400 WIF ($6,888) on Raydium  [7pLn...2wKs]'                  },
    { type: 'WHALE', text: 'WHALE  50,000 SOL moved from Binance  [2rMk...8vPt]'                  },
    { type: 'SWAP',  text: 'SWAP  84,200 USDC → 590 SOL  via Orca  [9sNp...5hJu]'                },
    { type: 'ALERT', text: 'VOL SPIKE  POPCAT +19.9% in 45min — unusual activity'                 },
    { type: 'NEW',   text: 'NEW TOKEN  $AIAGENT  $800K liquidity  2,400 holders'                  },
    { type: 'BUY',   text: 'BUY   120,000,000 BONK ($2,809) large wallet  [6tQr...1dCv]'         },
    { type: 'SWAP',  text: 'SWAP  500 JUP → 402 USDC  via Jupiter  [3mNk...7rQs]'                },
    { type: 'WHALE', text: 'WHALE  15,000 SOL staked  new validator  [8vLq...1uRp]'               },
    { type: 'ALERT', text: 'PRICE ALERT  SOL broke $142 resistance  target: $150'                 },
    { type: 'SWAP',  text: 'SWAP  20,000 USDC → 138.5 SOL  via Phoenix  [1dCv...6tQr]'           },
    { type: 'BUY',   text: 'BUY   8,400 JUP ($10,416) — accumulation pattern'                    },
    { type: 'NEW',   text: 'NEW TOKEN  $SOLCAT  $120K liq  launching on Pump.fun'                 },
    { type: 'ALERT', text: 'SNIPE  New pair detected  SOLCAT/SOL  0 to $280K in 12min'            },
  ],

  alerts: [
    { id: 'ALT001', token: 'SOL',  condition: 'PRICE > $150',        status: 'ACTIVE',    triggered: false, created: '04-14 09:00', triggeredAt: null        },
    { id: 'ALT002', token: 'BONK', condition: 'VOL SPIKE > 50%/1h',  status: 'TRIGGERED', triggered: true,  created: '04-14 10:30', triggeredAt: '22:18:03'  },
    { id: 'ALT003', token: 'WIF',  condition: 'PRICE > $3.00',       status: 'ACTIVE',    triggered: false, created: '04-14 11:15', triggeredAt: null        },
    { id: 'ALT004', token: 'ANY',  condition: 'WHALE > $500K move',  status: 'TRIGGERED', triggered: true,  created: '04-14 08:00', triggeredAt: '21:47:22'  },
    { id: 'ALT005', token: 'JUP',  condition: 'PRICE < $1.00',       status: 'ACTIVE',    triggered: false, created: '04-13 18:00', triggeredAt: null        },
    { id: 'ALT006', token: 'PYTH', condition: 'PRICE DROP > 10%/24h',status: 'TRIGGERED', triggered: true,  created: '04-14 07:30', triggeredAt: '19:22:41'  },
  ],

  priceExchanges: [
    { name: 'Binance',  price: 142.41, pct: +1.67, vol: '$820M' },
    { name: 'Coinbase', price: 142.39, pct: +1.65, vol: '$340M' },
    { name: 'OKX',      price: 142.35, pct: +1.62, vol: '$290M' },
    { name: 'Kraken',   price: 142.42, pct: +1.68, vol: '$180M' },
    { name: 'Jupiter',  price: 142.37, pct: +1.65, vol: '$280M' },
    { name: 'Raydium',  price: 142.33, pct: +1.63, vol: '$190M' },
  ],

  sparklines: {
    SOL:      '▁▂▃▄▃▅▇▆▇█▇▆▅▆▇▇▆▇█',
    BTC:      '▃▄▄▃▄▅▆▅▄▅▆▇▆▇▇▆▇▇▆▇',
    ETH:      '▅▆▅▄▃▄▄▃▃▄▃▃▄▄▃▄▃▃▃▄',
    BONK:     '▁▁▂▁▂▃▄▅▆▇▇▇█████████',
    WIF:      '▂▃▄▄▃▄▅▇▆▇▇████████▇█',
    JUP:      '▃▄▅▆▆▇▇▆▅▆▇█▇▆▅▆▇▆▅▆',
    PYTH:     '█▇▆▅▄▄▃▂▂▁▂▁▂▂▁▂▁▁▂▁',
    RAY:      '▃▄▅▆▇▆▅▆▇█▇▆▇▇▆▇▆▅▆▇',
    MEME:     '▁▁▂▂▃▄▅▆▇▇████████▇▇█',
    ORCA:     '▆▅▅▄▃▃▂▃▂▂▃▂▂▃▃▂▃▂▂▃',
    DRIFT:    '▃▄▅▅▆▆▇▆▆▇▇▆▇▇▆▇▇▆▅▆',
    RENDER:   '▄▅▅▆▆▇▆▅▆▇▇█▇▆▅▆▇▆▅▆',
    POPCAT:   '▁▂▂▃▄▅▆▇▇████████████',
    FARTCOIN: '▁▁▂▃▄▅▆▇▇████████████',
    TRUMP:    '▇▆▅▄▃▄▃▃▂▃▂▂▃▂▂▂▁▂▂▁',
  },

  chartData: {
    x: ['00:00','04:00','08:00','12:00','16:00','20:00','Now'],
    y: [136.2, 137.4, 138.9, 141.2, 140.1, 142.3, 145.2]
  },

  // ── Network Stats (DNS CLI data — F8 NETWORK panel) ──────────────
  networkStats: {

    epoch: {
      current: 788,
      progress: 30.2,
      timeLeft: '33h 6m',
      slotsTotal: 432000,
      slotsDone:  130464,
      startTime: '2025-04-13 18:00 UTC',
      endTime:   '2025-04-15 03:06 UTC',
    },

    tps: {
      current: 4147,
      average: 4161,
      maximum: 4309,
      minimum: 3993,
      history: [
        { ago: '11 mins ago', value: 4194 },
        { ago: '10 mins ago', value: 4116 },
        { ago: '9 mins ago',  value: 4270 },
        { ago: '8 mins ago',  value: 4153 },
        { ago: '7 mins ago',  value: 4077 },
        { ago: '6 mins ago',  value: 4228 },
        { ago: '5 mins ago',  value: 4201 },
        { ago: '4 mins ago',  value: 4256 },
        { ago: '3 mins ago',  value: 4309 },
        { ago: '2 mins ago',  value: 4147 },
      ]
    },

    blocktime: {
      current: 408.16,
      average: 392,
      maximum: 408.16,
      minimum: 382.17,
      history: [
        { ago: '11 mins ago', value: '397.35 ms' },
        { ago: '10 mins ago', value: '389.61 ms' },
        { ago: '9 mins ago',  value: '394.74 ms' },
        { ago: '8 mins ago',  value: '394.74 ms' },
        { ago: '7 mins ago',  value: '384.62 ms' },
        { ago: '6 mins ago',  value: '384.62 ms' },
        { ago: '5 mins ago',  value: '382.17 ms' },
        { ago: '4 mins ago',  value: '394.74 ms' },
        { ago: '3 mins ago',  value: '394.74 ms' },
        { ago: '2 mins ago',  value: '408.16 ms' },
      ]
    },

    validators: [
      { rank: 1,  name: 'Helius',           stake: '13.98M', commission: '0%',   delegators: '20,395'  },
      { rank: 2,  name: 'Binance Staking',  stake: '12.47M', commission: '8%',   delegators: '544'     },
      { rank: 3,  name: 'Galaxy',           stake: '9.80M',  commission: '5%',   delegators: '981'     },
      { rank: 4,  name: 'Coinbase 02',      stake: '8.84M',  commission: '8%',   delegators: '1,533'   },
      { rank: 5,  name: 'Ledger by Figment',stake: '8.77M',  commission: '7%',   delegators: '115,497' },
      { rank: 6,  name: 'Figment',          stake: '7.32M',  commission: '7%',   delegators: '9,857'   },
      { rank: 7,  name: 'Kiln1',            stake: '6.61M',  commission: '5%',   delegators: '3,739'   },
      { rank: 8,  name: 'Everstake',        stake: '5.86M',  commission: '7%',   delegators: '189,156' },
      { rank: 9,  name: 'SOL Community',    stake: '5.84M',  commission: '5%',   delegators: '906'     },
      { rank: 10, name: 'Unknown',          stake: '5.47M',  commission: '100%', delegators: '20'      },
    ],

    supply: {
      circulating:    519.8,
      circulatingPct: 86.5,
      staked:         392.9,
      stakedPct:      65.4,
      total:          600.9,
      epoch:          788,
      stakingApy:     7.07,
      inflationRate:  4.58,
    },

    stakeData: {
      totalStaked:    '398.42M SOL',
      totalStakedUsd: '$70.33B',
      activeStakers:  '1,021,443',
      uniqueWallets:  '508,796',
      biggestStake:   '8.39M SOL ($1.48B)',
      medianStake:    '1.14 SOL ($200.53)',
      meanStake:      '386.18 SOL ($68.17K)',
      filterApy:      '6.82%',
      updated:        '5 minutes ago',
    },

    stakeGraph: [
      { epoch: 172, sol: 318.46, bar: 23 },
      { epoch: 221, sol: 387.84, bar: 30 },
      { epoch: 270, sol: 402.16, bar: 32 },
      { epoch: 320, sol: 382.32, bar: 30 },
      { epoch: 372, sol: 374.69, bar: 29 },
      { epoch: 424, sol: 383.68, bar: 30 },
      { epoch: 475, sol: 389.16, bar: 30 },
      { epoch: 536, sol: 318.55, bar: 23 },
      { epoch: 585, sol: 375.39, bar: 29 },
      { epoch: 635, sol: 379.47, bar: 29 },
      { epoch: 684, sol: 393.77, bar: 31 },
      { epoch: 733, sol: 389.58, bar: 30 },
      { epoch: 788, sol: 395.96, bar: 31 },
    ],

    stakeDistribution: [
      { range: '0 – 5',           totalSol: '674.25K (0.17%)',   stakes: '696,634', wallets: '391,049', validators: '3,347' },
      { range: '5 – 10',          totalSol: '546.90K (0.14%)',   stakes: '79,318',  wallets: '49,486',  validators: '1,048' },
      { range: '10 – 50',         totalSol: '2.98M (0.75%)',     stakes: '135,638', wallets: '75,660',  validators: '1,409' },
      { range: '50 – 100',        totalSol: '2.39M (0.60%)',     stakes: '35,068',  wallets: '22,416',  validators: '1,214' },
      { range: '100 – 500',       totalSol: '12.59M (3.16%)',    stakes: '53,525',  wallets: '26,001',  validators: '1,730' },
      { range: '500 – 1K',        totalSol: '4.89M (1.23%)',     stakes: '7,266',   wallets: '4,632',   validators: '531'   },
      { range: '1K – 5K',         totalSol: '16.91M (4.24%)',    stakes: '8,449',   wallets: '4,284',   validators: '863'   },
      { range: '5K – 10K',        totalSol: '10.52M (2.64%)',    stakes: '1,546',   wallets: '846',     validators: '403'   },
      { range: '10K – 50K',       totalSol: '50.83M (12.76%)',   stakes: '2,367',   wallets: '947',     validators: '877'   },
      { range: '50K – 100K',      totalSol: '49.60M (12.45%)',   stakes: '666',     wallets: '232',     validators: '405'   },
      { range: '100K – 250K',     totalSol: '89.53M (22.47%)',   stakes: '708',     wallets: '184',     validators: '302'   },
      { range: '250K – 500K',     totalSol: '53.44M (13.41%)',   stakes: '145',     wallets: '137',     validators: '56'    },
      { range: '500K+',           totalSol: '103.44M (25.96%)',  stakes: '77',      wallets: '63',      validators: '53'    },
    ],
  },

};

module.exports = DATA;
