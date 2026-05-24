const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // Verify PNG signature
  if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
    throw new Error('Not a valid PNG file: ' + filePath);
  }
  // Read IHDR chunk
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height, size: buffer.length };
}

try {
  const desktopPath = 'd:\\SMM_plan_2\\.planning\\screenshots\\desktop.png';
  const mobilePath = 'd:\\SMM_plan_2\\.planning\\screenshots\\mobile.png';
  
  console.log('Desktop PNG:', getPngDimensions(desktopPath));
  console.log('Mobile PNG:', getPngDimensions(mobilePath));
} catch (err) {
  console.error('Error:', err.message);
}
