const chalk = require('chalk');
const ora = require('ora');
const DATA = require('../data');

function simulateLoading(text, callback) {
  const spinner = ora({ text: chalk.hex('#ff6b00')(text), color: 'yellow' }).start();
  setTimeout(() => {
    spinner.stop();
    callback();
  }, 800);
}

function startLiveFeed(symbol = 'SOL') {
  console.log('\n' + chalk.bgRed.white.bold(`  ● LIVE STREAMING: ${symbol.toUpperCase()} TRANSACTIONS  `) + '\n');
  
  const spinner = ora({ text: chalk.gray('Connecting to Helius WebSockets...'), color: 'yellow' }).start();

  setTimeout(() => {
    spinner.succeed(chalk.green('Connected to mainnet stream.'));
    console.log(chalk.gray('Listening for large swaps and whale movements...\n'));
    
    // Initial feed
    for(let i=0; i<3; i++) printLiveEvent();

    // Stream
    setInterval(printLiveEvent, 2500);

  }, 1200);
}

function printLiveEvent() {
  const idx = Math.floor(Math.random() * DATA.liveFeed.length);
  const entry = DATA.liveFeed[idx];
  const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  let label = chalk.white(entry.type);
  if (entry.type === 'WHALE') label = chalk.bgCyan.black(' WHALE ');
  if (entry.type === 'BUY') label = chalk.bgGreen.black(' BUY ');
  if (entry.type === 'SWAP') label = chalk.bgMagenta.black(' SWAP ');
  if (entry.type === 'ALERT') label = chalk.bgYellow.black(' ALERT ');

  console.log(`${chalk.gray(now)}  ${label}  ${chalk.white(entry.text)}`);
}

module.exports = { startLiveFeed, simulateLoading };
