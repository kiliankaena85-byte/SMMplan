const fs = require('fs');
const path = require('path');

console.log('🔍 Scanning .next/ build artifacts for leaked secrets...');

const buildDir = path.join(process.cwd(), '.next/static');
if (!fs.existsSync(buildDir)) {
  console.log('⚠️ .next/static not found, run npm run build first.');
  process.exit(0);
}

const FORBIDDEN_PATTERNS = [
  'smmplan_qa_sec',
  'smmplan_default_32_bytes',
  'StrongProdDbPassword2026',
  'test_Bz5e',
  'emrNjCPOuNMYKmMcxvHb532Xix99uAxM',
  '6833e1ceef531d34e7442d492b8e1021'
];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json') || entry.name.endsWith('.html'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) {
          console.error(`❌ CRITICAL: Leaked secret '${pattern}' found in ${fullPath}!`);
          process.exit(1);
        }
      }
    }
  }
}

scanDirectory(buildDir);
console.log('✅ PASS: No leaked secrets found in .next/static/ client bundles!');
