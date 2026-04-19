const fs = require('fs'); const dashboard = fs.readFileSync('cli/panels/dashboard.js', 'utf8'); eval(dashboard.split('// 15-minute silent resync')[0]); console.log(buildAsciiWorldMap([], []));
