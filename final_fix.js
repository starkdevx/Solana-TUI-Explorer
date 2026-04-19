const fs = require('fs');
const file = 'cli/panels/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

// Use standard ASCII periods for the map mesh to ensure 100% font compatibility
content = content.replace(/\{white-fg\}·\{\/\}/g, '{white-fg}.{/}');

// Redefine GRY (grey) text to just use standard white, as gray maps to invisible black on this terminal scheme
content = content.replace(/const GRY  = s => \\{gray-fg\}\\\\{\/\}\;/g, 'const GRY  = s => \{white-fg}\\\{/}\;');

// Also catch any raw {gray-fg} in the entire file
content = content.replace(/\{gray-fg\}/g, '{white-fg}');

fs.writeFileSync(file, content, 'utf8');
