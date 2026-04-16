const chalk = require('chalk');
const Table = require('cli-table3');
const DATA = require('../data');

function renderWallet(address) {
  const w = DATA.wallet;
  
  console.log('\n' + chalk.bgHex('#ff6b00').black(`  [ST] WALLET INSIGHTS  `) + '\n');
  
  console.log(`${chalk.gray('ADDRESS')}           ${chalk.cyan.underline(address || w.address)}`);
  console.log(`${chalk.gray('PORTFOLIO VALUE')}   ${chalk.white.bold('$' + w.totalValue.toLocaleString())}`);
  console.log(`${chalk.gray('PNL (24H)')}         ${chalk.green('+$' + w.pnl.day + ' (+' + w.pnl.dayPct + '%)')}`);
  console.log(`${chalk.gray('PNL (30D)')}         ${chalk.green('+$' + w.pnl.month + ' (+' + w.pnl.monthPct + '%)')}\n`);

  console.log(chalk.hex('#ff6b00').bold(' HOLDINGS '));
  const table = new Table({
    head: [chalk.gray('TOKEN'), chalk.gray('AMOUNT'), chalk.gray('VALUE'), chalk.gray('ALLOC'), chalk.gray('24H %')],
    style: { head: [], border: ['gray'] }
  });

  w.holdings.forEach(h => {
    const c = h.change > 0 ? chalk.greenBright : h.change < 0 ? chalk.redBright : chalk.gray;
    const arrow = h.change > 0 ? '▲' : h.change < 0 ? '▼' : '─';
    table.push([
      chalk.white.bold(h.token),
      h.amount.toString(),
      `$${h.value.toLocaleString()}`,
      `${h.pct}%`,
      c(`${arrow} ${Math.abs(h.change)}%`)
    ]);
  });
  console.log(table.toString() + '\n');

  console.log(chalk.hex('#ff6b00').bold(' RECENT TRANSACTIONS '));
  const txTable = new Table({
    head: [chalk.gray('TIME'), chalk.gray('TYPE'), chalk.gray('FROM'), chalk.gray('TO'), chalk.gray('STATUS')],
    style: { head: [], border: ['gray'] }
  });

  const typeColors = { SWAP: chalk.cyan, BUY: chalk.greenBright, SELL: chalk.redBright, STAKE: chalk.yellow };

  w.recentTxns.forEach(tx => {
    const tc = typeColors[tx.type] || chalk.white;
    txTable.push([
      chalk.gray(tx.time),
      tc.bold(tx.type),
      tx.from,
      tx.to,
      chalk.green(tx.status)
    ]);
  });
  console.log(txTable.toString() + '\n');
}

module.exports = { renderWallet };
