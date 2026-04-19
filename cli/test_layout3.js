const blessed = require('blessed');
const contrib = require('blessed-contrib');
const screen = blessed.screen({ smartCSR: true });
const contentBox = blessed.box({ parent: screen, top: 0, left: 0, width: '100%', height: '100%' });
const map = contrib.map({ parent: contentBox, screen: screen, top: 0, left: 40, width: 80, height: 25, style: { shapeColor: 'cyan' }});
screen.render();
map.addMarker({ lat: 50, lon: 0, color: 'red', char: 'X' });
screen.render();
setTimeout(()=>process.exit(0), 100);
