const blessed = require('blessed');
const contrib = require('blessed-contrib');
const screen = blessed.screen({ smartCSR: true });
const tabNetwork = blessed.box({ parent: screen, width: '100%', height: '100%' });

const netScroll  = blessed.box({ parent: tabNetwork, width: '100%', height: '100%', scrollable: true });
const netBox     = blessed.box({ parent: netScroll, width: '100%', height: 100 });
netBox.setContent("Scrollable text behind map\n".repeat(40));

const mapWidget = contrib.map({ parent: tabNetwork, top: 4, left: 34, width: 86, height: 22, style: { shapeColor: 'cyan' } });

screen.render();
mapWidget.addMarker({ lat: 40, lon: -74, color: 'green', char: 'O' });
screen.render();
setTimeout(() => process.exit(0), 100);
