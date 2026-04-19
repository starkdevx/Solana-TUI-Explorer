const blessed = require('blessed');
const contrib = require('blessed-contrib');
const map = contrib.map({ style: { shapeColor: 'cyan' }, width: 86, height: 22 });
const lines = map.ctx._canvas.frame().split('\n');
console.log('Lines:', lines.length);
console.log('Line 0 length:', lines[0].length);
