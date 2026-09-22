const fs = require('fs');
const file = 'src/constants/link-service-compatibility.spec.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace ServiceTargetType with TargetTypeEnum where it's used as a value (e.g., ServiceTargetType.CHANNEL)
content = content.replace(/ServiceTargetType\./g, 'TargetTypeEnum.');

fs.writeFileSync(file, content, 'utf8');
console.log("Fixed spec file again.");
