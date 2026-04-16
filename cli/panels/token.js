const chalk = require('chalk');
const Table = require('cli-table3');
const DATA = require('../data');

function renderToken(token) {
  const t = DATA.token; // Mock uses BONK
  
  console.log('\n' + chalk.bgHex('#ff6b00').black(`  [ST] TOKEN ANALYTICS: ${t.symbol}  `) + '\n');
  
  console.log(`${chalk.gray('NAME')}              ${t.name}`);
  console.log(`${chalk.gray('MINT')}              ${chalk.cyan(t.mint)}`);
  console.log(`${chalk.gray('PRICE')}             ${chalk.white.bold('$' + t.price.toFixed(8))}`);
  console.log(`${chalk.gray('24H CHANGE')}        ${chalk.greenBright('▲ ' + t.priceChange24h + '%')}`);
  console.log(`${chalk.gray('MARKET CAP')}        ${t.marketCap}`);
  console.log(`${chalk.gray('24H VOLUME')}        ${chalk.cyan(t.volume24h)}`);
  console.log(`${chalk.gray('LIQUIDITY')}         ${chalk.green(t.liquidity)}`);
  console.log(`${chalk.gray('HOLDERS')}           ${t.holders}\n`);


  console.log(chalk.hex('#ff6b00').bold(' RISK SIGNALS '));
  const riskTable = new Table({
    head: [chalk.gray('LEVEL'), chalk.gray('SIGNAL'), chalk.gray('DETAIL')],
    style: { head: [], border: ['gray'] }
  });

  t.riskSignals.forEach(r => {
    const rc = r.level === 'HIGH' ? chalk.bgRed.black : r.level === 'MEDIUM' ? chalk.bgYellow.black : chalk.bgGreen.black;
    riskTable.push([
      rc(` ${r.level} `),
      chalk.white(r.label),
      chalk.gray(r.detail)
    ]);
  });
  console.log(riskTable.toString() + '\n');

  console.log(chalk.hex('#ff6b00').bold(' TOP HOLDERS '));
  const holdersTable = new Table({
    head: [chalk.gray('RANK'), chalk.gray('ADDRESS'), chalk.gray('SHARE'), chalk.gray('LABEL')],
    style: { head: [], border: ['gray'] }
  });

  t.topHolders.forEach(h => {
    holdersTable.push([
      chalk.gray(`#${h.rank}`),
      chalk.cyan(h.address),
      chalk.hex('#ff6b00').bold(`${h.pct}%`),
      chalk.gray(h.label)
    ]);
  });
  console.log(holdersTable.toString() + '\n');
}

module.exports = { renderToken };
