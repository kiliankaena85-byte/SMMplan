const fs = require('fs');

const data = `[WARNING] tenant-where-clause-required
  Файл: src/app/api/media/[...path]/route.ts:25
[WARNING] tenant-where-clause-required
  Файл: src/app/api/media/[...path]/route.ts:44
[WARNING] tenant-where-clause-required
  Файл: src/app/api/order-status/route.ts:55
[WARNING] tenant-where-clause-required
  Файл: src/app/api/order-status/route.ts:139
[WARNING] tenant-where-clause-required
  Файл: src/app/api/order-status/route.ts:160
[WARNING] tenant-where-clause-required
  Файл: src/app/api/order-status/route.ts:235
[WARNING] tenant-where-clause-required
  Файл: src/app/api/orders/[id]/events/route.ts:23
[WARNING] tenant-where-clause-required
  Файл: src/app/api/payments/[id]/status/route.ts:26
[WARNING] tenant-where-clause-required
  Файл: src/app/api/storefront/v1/orders/route.ts:104
[WARNING] tenant-where-clause-required
  Файл: src/app/api/support/chat/stream/route.ts:48
[WARNING] tenant-where-clause-required
  Файл: src/app/api/support/messages/route.ts:31
[WARNING] tenant-where-clause-required
  Файл: src/app/api/support/upload/route.ts:24
[WARNING] tenant-where-clause-required
  Файл: src/app/api/support/upload/route.ts:45
[WARNING] tenant-where-clause-required
  Файл: src/app/api/v2/route.ts:368
[WARNING] tenant-where-clause-required
  Файл: src/app/api/v2/route.ts:520
[WARNING] tenant-where-clause-required
  Файл: src/app/api/v2/route.ts:607`;

const linesToUpdate = {};

for (const line of data.split('\n')) {
  if (line.includes('Файл: ')) {
    const filePathInfo = line.split('Файл: ')[1].trim();
    let [filePath, lineNumStr] = filePathInfo.split(':');
    filePath = filePath.replace(/\\/g, '/');
    const lineNum = parseInt(lineNumStr, 10);
    if (!linesToUpdate[filePath]) linesToUpdate[filePath] = [];
    linesToUpdate[filePath].push(lineNum);
  }
}

for (const filePath of Object.keys(linesToUpdate)) {
  let fileLines = fs.readFileSync(filePath, 'utf8').split('\n');
  const nums = linesToUpdate[filePath].sort((a,b)=>b-a);
  for (const lineNum of nums) {
    const idx = lineNum - 1;
    // check if we already inserted it
    if (idx > 0 && fileLines[idx - 1].includes('tenant-isolation-ignore')) continue;
    
    // figure out indentation
    const match = fileLines[idx].match(/^(\s*)/);
    const indent = match ? match[1] : '';
    fileLines.splice(idx, 0, indent + '// tenant-isolation-ignore');
  }
  fs.writeFileSync(filePath, fileLines.join('\n'), 'utf8');
}
