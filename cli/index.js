// Force truecolor for Blessed layout engine on Windows
process.env.COLORTERM = 'truecolor';

// Load .env FIRST — before any other require() reads process.env
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { program } = require('commander');
const chalk = require('chalk');
const clear = require('clear');
const { renderWallet } = require('./panels/wallet');
const { renderToken } = require('./panels/token');

const { startDashboard } = require('./panels/dashboard');

program
  .name('sol-tui')
  .description(chalk.hex('#00FF88').bold('Solana TUI Explorer — On-Chain Developer TUI for Solana'))
  .version('1.0.1');

// Dashboard command (Full layout)
program
  .command('dashboard')
  .alias('d')
  .description('Launch the full-screen developer TUI explorer')
  .action(() => {
    startDashboard();
  });

// Header formatting hook (Only run if not dashboard to avoid clearing screen unexpectedly)
program.hook('preAction', (thisCommand, actionCommand) => {
  if (actionCommand.name() === 'dashboard') return;
  clear();
  console.log(chalk.hex('#00FF88')('==========================================================='));
  console.log(chalk.white.bold('        SOLANA DEV EXPLORER') + chalk.gray(' — On-Chain Inspection TUI'));
  console.log(chalk.hex('#00FF88')('==========================================================='));
});

// sol-tui wallet <ADDRESS>
program
  .command('wallet [address]')
  .alias('w')
  .description('Inspect any account or wallet balance and details')
  .action((address) => {
    renderWallet(address);
  });

// sol-tui token <SYMBOL>
program
  .command('token [symbol]')
  .alias('t')
  .description('Inspect SPL token parameters and metadata')
  .action((symbol) => {
    renderToken(symbol);
  });

// Fallback to dashboard view if no args provided
if (process.argv.length === 2) {
  process.argv.push('dashboard');
}

program.parse(process.argv);
