// =============================================
// SOLANA TERMINAL CLI — Config
// =============================================

module.exports = {
  // Solana Public RPC — override via SOLANA_RPC in .env for better reliability
  SOLANA_RPC: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',

  // DexScreener (Solana token prices — free, no key)
  DEXSCREENER_BASE: 'https://api.dexscreener.com',

  // CoinDesk Data API (major crypto prices — free tier works without key)
  // Set COINDESK_API_KEY env var when you have one for higher rate limits.
  COINDESK_BASE:   'https://data-api.coindesk.com',
  COINDESK_MARKET: process.env.COINDESK_MARKET || 'coinbase',
  COINDESK_API_KEY: process.env.COINDESK_API_KEY || '',

  // Major cryptos — fetched from CoinDesk (accurate spot prices in USD)
  COINDESK_SYMBOLS: ['BTC', 'ETH', 'SOL'],

  // Solana-native tokens — fetched from DexScreener
  DEX_SYMBOLS: ['BONK','WIF','JUP','PYTH','RAY','ORCA','DRIFT','RENDER','POPCAT','FARTCOIN','TRUMP'],

  // Combined display order (CoinDesk first, then DEX tokens)
  MARKET_SYMBOLS: ['SOL','BTC','ETH','BONK','WIF','JUP','PYTH','RAY','ORCA','DRIFT','RENDER','POPCAT','FARTCOIN','TRUMP'],

  // ── Token mint addresses on Solana (for DexScreener) ───────────
  TOKEN_MINTS: {
    SOL:      'So11111111111111111111111111111111111111112',
    BTC:      '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', // Portal wBTC
    ETH:      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // Portal wETH
    BONK:     'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    WIF:      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    JUP:      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    PYTH:     'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    RAY:      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    ORCA:     'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    DRIFT:    'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
    RENDER:   'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
    POPCAT:   '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
    FARTCOIN: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    TRUMP:    '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
  },

  TOKEN_NAMES: {
    SOL:      'Solana',
    BTC:      'Bitcoin',
    ETH:      'Ethereum',
    BONK:     'Bonk',
    WIF:      'dogwifhat',
    JUP:      'Jupiter',
    PYTH:     'Pyth Network',
    RAY:      'Raydium',
    ORCA:     'Orca',
    DRIFT:    'Drift Protocol',
    RENDER:   'Render',
    POPCAT:   'Popcat',
    FARTCOIN: 'Fartcoin',
    TRUMP:    'Official Trump',
  },

  // Refresh intervals (ms)
  MARKET_REFRESH_MS:  30000,
  NETWORK_REFRESH_MS: 30000,
  TOKEN_REFRESH_MS:   30000,
  WALLET_REFRESH_MS:  60000,
};
