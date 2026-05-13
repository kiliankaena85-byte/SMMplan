const fs = require('fs');
const path = require('path');

const junkFiles = [
  'check-owner.ts',
  'check.ts',
  'editor.js',
  'find-debt.js',
  'fix-provider.ts',
  'inspect-services.ts',
  'inspect-vexboost.ts',
  'manual-sync.ts',
  'ping.ts',
  'prepare_vex_data.js',
  'refactor_ui.js',
  'rename-vexboost.js',
  'scratch-desktop-panel.js',
  'scratch-replace.js',
  'scripts/test-tx.js',
  'test-checkout.ts',
  'test-smart-logic.ts',
  'update-descriptions.ts'
];

let deleted = 0;
for (const file of junkFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`Deleted ${file}`);
    deleted++;
  }
}
console.log(`Deleted ${deleted} junk files.`);
