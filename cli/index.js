const { program } = require('commander');
const chalk = require('chalk');
const clear = require('clear');
const { renderMarket, renderPrice } = require('./panels/price');
const { renderWallet } = require('./panels/wallet');
const { renderToken } = require('./panels/token');
const { renderNews } = require('./panels/news');
const { startLiveFeed, simulateLoading } = require('./panels/live');

const { startDashboard } = require('./panels/dashboard');

program
  .name('st')
  .description(chalk.hex('#ff6b00').bold('Solana Terminal (ST) — Bloomberg-style CLI for Solana'))
  .version('1.0.0');

// Dashboard command (Full layout)
program
  .command('dashboard')
  .alias('d')
  .description('Launch the full-screen terminal UI dashboard')
  .action(() => {
    startDashboard();
  });

// Header formatting hook (Only run if not dashboard to avoid clearing screen unexpectedly)
program.hook('preAction', (thisCommand, actionCommand) => {
  if (actionCommand.name() === 'dashboard') return;
  clear();
  console.log(chalk.hex('#ff6b00')('==========================================================='));
  console.log(chalk.white.bold('        SOLANA TERMINAL') + chalk.gray(' — Professional On-Chain Intel'));
  console.log(chalk.hex('#ff6b00')('==========================================================='));
});

// st market
program
  .command('market')
  .alias('m')
  .description('Show market overview and top tokens')
  .action(() => {
    simulateLoading('Fetching real-time market data...', () => {
      renderMarket();
    });
  });

// st price <SYMBOL>
program
  .command('price [symbol]')
  .alias('p')
  .description('Show detailed price analytics for a token (default: SOL)')
  .action((symbol) => {
    simulateLoading(`Fetching orderbooks for ${symbol || 'SOL'}...`, () => {
      renderPrice(symbol);
    });
  });

// st wallet <ADDRESS>
program
  .command('wallet [address]')
  .alias('w')
  .description('Analyze wallet holdings, PnL, and transactions')
  .action((address) => {
    simulateLoading(`Parsing on-chain wallet data...`, () => {
      renderWallet(address);
    });
  });

// st token <SYMBOL>
program
  .command('token [symbol]')
  .alias('t')
  .description('Deep dive into token liquidity, holders, and risk metrics')
  .action((symbol) => {
    simulateLoading(`Aggregating DEX metrics for ${symbol || 'BONK'}...`, () => {
      renderToken(symbol);
    });
  });

// st news
program
  .command('news')
  .alias('n')
  .description('Aggregate on-chain signals, whale alerts, and crypto news')
  .action(() => {
    simulateLoading('Compiling news feed...', () => {
      renderNews();
    });
  });

// st live <SYMBOL>
program
  .command('live [symbol]')
  .alias('l')
  .description('Stream live transactions and swaps via WebSockets')
  .action((symbol) => {
    startLiveFeed(symbol || 'SOL');
  });

// Fallback to dashboard view if no args provided
if (process.argv.length === 2) {
  process.argv.push('dashboard');
}

program.parse(process.argv);
