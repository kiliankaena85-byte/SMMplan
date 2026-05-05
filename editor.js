const fs = require('fs');
const file = process.argv[2];
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/^pick 8dfc35b/m, 'edit 8dfc35b');
fs.writeFileSync(file, content);
