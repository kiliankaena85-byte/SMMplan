import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';

export function getBaselineEvidence() {
  const commit = execSync('git rev-parse HEAD').toString().trim();
  const gitLog = execSync('git log -1 --oneline').toString().trim();
  const gitStatus = execSync('git status --porcelain').toString().trim();
  
  const schemaPath = 'prisma/schema.prisma';
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const schemaSha256 = crypto.createHash('sha256').update(schemaContent).digest('hex');

  const result = {
    commit,
    gitLog,
    isCleanTree: gitStatus.length === 0,
    schemaSha256,
    timestamp: new Date().toISOString()
  };

  console.log('=== AEARH BASELINE EVIDENCE ===');
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  getBaselineEvidence();
}
