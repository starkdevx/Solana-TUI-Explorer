const blessed = require('blessed');
const contrib = require('blessed-contrib');
const screen = blessed.screen({ smartCSR: true });

const grid = new contrib.grid({ rows: 12, cols: 12, screen });
const mapWidget = grid.set(0, 0, 12, 12, contrib.map, { style: { shapeColor: 'cyan' } });

screen.render();
mapWidget.addMarker({ lat: 40, lon: -74, color: 'green', char: 'O' });
screen.render();
setTimeout(() => process.exit(0), 100);
