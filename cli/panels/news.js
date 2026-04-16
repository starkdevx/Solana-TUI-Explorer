const chalk = require('chalk');
const Table = require('cli-table3');
const DATA = require('../data');

function renderNews() {
  console.log('\n' + chalk.bgHex('#ff6b00').black(`  [ST] TERMINAL NEWS & SIGNALS  `) + '\n');
  
  const table = new Table({
    head: [chalk.gray('TIME'), chalk.gray('TAG'), chalk.gray('SOURCE'), chalk.gray('HEADLINE')],
    style: { head: [], border: ['gray'] },
    colWidths: [8, 12, 15, 60],
    wordWrap: true
  });

  DATA.news.forEach(n => {
    let tag = chalk.gray(n.tag);
    if (n.tag.includes('WHALE')) tag = chalk.cyanBright(n.tag);
    if (n.tag.includes('SWAP')) tag = chalk.magenta(n.tag);
    if (n.tag.includes('NEW')) tag = chalk.yellowBright(n.tag);

    table.push([
      chalk.gray(n.time),
      tag,
      chalk.hex('#ff6b00')(n.source),
      chalk.white(n.text)
    ]);
  });

  console.log(table.toString() + '\n');
}

module.exports = { renderNews };
