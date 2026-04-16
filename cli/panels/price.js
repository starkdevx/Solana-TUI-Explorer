const chalk = require('chalk');
const Table = require('cli-table3');
const DATA = require('../data');

function renderPrice(symbol) {
  const t = DATA.market.find(x => x.symbol === (symbol ? symbol.toUpperCase() : 'SOL')) || DATA.market[0];
  
  console.log('\n' + chalk.bgHex('#ff6b00').black(`  [ST] SOLANA TERMINAL v1.0.0 — PRICE DETAIL: ${t.symbol}  `) + '\n');
  
  const c = t.pct > 0 ? chalk.greenBright : chalk.redBright;
  const arrow = t.pct > 0 ? '▲' : '▼';

  console.log(`${chalk.gray('SYMBOL')}        ${chalk.hex('#ff6b00').bold(t.symbol + ' / USD')}`);
  console.log(`${chalk.gray('NAME')}          ${t.name}`);
  console.log(`${chalk.gray('LAST PRICE')}    ${chalk.white.bold('$' + t.price)}`);
  console.log(`${chalk.gray('24H CHANGE')}    ${c(`${arrow} ${Math.abs(t.pct)}% ($${Math.abs(t.change)})`)}`);
  console.log(`${chalk.gray('24H HIGH')}      ${chalk.greenBright('$' + t.high)}`);
  console.log(`${chalk.gray('24H LOW')}       ${chalk.redBright('$' + t.low)}`);
  console.log(`${chalk.gray('24H VOLUME')}    ${chalk.cyan('$' + t.vol)}`);
  console.log(`${chalk.gray('MARKET CAP')}    $${t.mcap}\n`);
}

function renderMarket() {
  console.log('\n' + chalk.bgHex('#ff6b00').black(`  [ST] MARKET OVERVIEW (LIVE)  `) + '\n');
  
  const table = new Table({
    head: [chalk.gray('SYMBOL'), chalk.gray('PRICE'), chalk.gray('24H %'), chalk.gray('VOLUME'), chalk.gray('MKT CAP')],
    chars: { 'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐'
         , 'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘'
         , 'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼'
         , 'right': '│', 'right-mid': '┤', 'middle': '│' },
    style: { head: [], border: ['gray'] }
  });

  DATA.market.forEach(d => {
    const c = d.pct > 0 ? chalk.greenBright : chalk.redBright;
    const arrow = d.pct > 0 ? '▲' : '▼';
    table.push([
      chalk.white.bold(d.symbol),
      `$${d.price}`,
      c(`${arrow} ${d.pct}%`),
      chalk.cyan(`$${d.vol}`),
      `$${d.mcap}`
    ]);
  });

  console.log(table.toString() + '\n');
}

module.exports = { renderPrice, renderMarket };
