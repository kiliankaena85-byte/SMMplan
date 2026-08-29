#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATIC_DIR = path.join(ROOT_DIR, '.next', 'static');
const DEV_API_DIR = path.join(ROOT_DIR, 'src', 'app', 'api', 'dev');

const FORBIDDEN_PATTERNS = [
  { name: 'QA Secret Keyword', regex: /secret_qdocker/i },
  { name: 'Next Public QA Secret Token', regex: /NEXT_PUBLIC_QA_SECRET/i },
  { name: 'Dev Login API Route in Bundle', regex: /\/api\/dev\//i },
  { name: 'Stripe Live Secret Key', regex: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Stripe Live Publishable Key', regex: /pk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'RSA/EC Private Key Header', regex: /-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----/ },
];

export function runBundleSecretCheck(scanDir = STATIC_DIR) {
  console.log('🛡️  [CI-GATE] Scanning client bundles for leaked secrets and dev backdoors...');
  let violations = [];

  // 1. Check if src/app/api/dev exists in production filesystem
  if (fs.existsSync(DEV_API_DIR)) {
    violations.push({
      file: 'src/app/api/dev',
      error: 'CRITICAL: Dev API directory (src/app/api/dev) exists in production source tree!'
    });
  }

  // 2. Check if static directory exists
  if (!fs.existsSync(scanDir)) {
    console.warn("⚠️  Scan directory " + scanDir + " not found. Run npm run build first.");
    return { success: violations.length === 0, violations };
  }

  function scanRecursive(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanRecursive(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.css') || entry.name.endsWith('.json') || entry.name.endsWith('.txt'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.regex.test(content)) {
            violations.push({
              file: path.relative(ROOT_DIR, fullPath),
              pattern: pattern.name,
              regex: pattern.regex.toString()
            });
          }
        }
      }
    }
  }

  scanRecursive(scanDir);

  if (violations.length > 0) {
    console.error('❌ [CI-GATE FAILED] Leaked secrets or forbidden patterns detected in client bundles:');
    for (const v of violations) {
      console.error("   - " + v.file + ": " + (v.pattern || v.error));
    }
    return { success: false, violations };
  }

  console.log('✅ [CI-GATE PASSED] 0 forbidden secrets or dev routes found in client build artifacts.');
  return { success: true, violations: [] };
}

if (process.argv[1] && (process.argv[1].endsWith('check-bundle-secrets.mjs') || process.argv[1].includes('check-bundle-secrets'))) {
  const result = runBundleSecretCheck();
  if (!result.success) {
    process.exit(1);
  }
}
