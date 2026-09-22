const fs = require('fs');
const file = 'src/constants/link-service-compatibility.spec.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\bLinkType\b/g, 'TargetTypeEnum');
content = content.replace(/\bisLinkServiceCompatible\b/g, 'isTargetTypeCompatible');

fs.writeFileSync(file, content, 'utf8');
console.log("Fixed spec file.");
