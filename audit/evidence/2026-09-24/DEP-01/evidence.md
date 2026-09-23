# Доказательства ремедиации DEP-01 (Уязвимые версии прод-зависимостей)

## До исправления (Before)
Дата: 2026-09-24T02:00:00+03:00
Команда: `npm audit --omit=dev`
Код возврата: `1`

```
# npm audit report

@tiptap/core  <=3.30.4
Severity: high
Tiptap: mergeAttributes() turns an own __proto__ key into inherited executable DOM attributes - https://github.com/advisories/GHSA-cp6q-959q-f8rh
Tiptap: Quadratic ReDoS in block and inline Markdown attribute parsing - https://github.com/advisories/GHSA-j95f-988m-3j2f
fix available via `npm audit fix`
node_modules/@tiptap/core

baseline-browser-mapping  >=2.0.0 <2.11.0
Severity: moderate
baseline-browser-mapping process termination on invalid input causes denial of service - https://github.com/advisories/GHSA-w5vr-8v7q-w6rv
fix available via `npm audit fix`
node_modules/baseline-browser-mapping

next  16.0.0 - 16.3.2
Severity: critical
Next.js: Unauthenticated Remote Code Execution on windows-hosted servers - https://github.com/advisories/GHSA-p293-qw3h-jr36
Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used - https://github.com/advisories/GHSA-2xp9-vwfh-vxw4
fix available via `npm audit fix`
node_modules/next

nodemailer  <=9.1.0
Severity: high
Nodemailer: resolveContent() on a MailMessage bypasses disableFileAccess/disableUrlAccess when called with the legacy signature - https://github.com/advisories/GHSA-8m3c-c648-2xjj
Nodemailer: IDN/Punycode domain allow-list bypass leads to email delivery to an attacker-controlled domain - https://github.com/advisories/GHSA-wmmp-3585-3rmp
Nodemailer: Quadratic (O(n²)) time complexity in addressparser allows remote denial of service via a crafted address list - https://github.com/advisories/GHSA-2x7j-588g-ccc2
Nodemailer: Recipient-domain validation bypass via RFC 5322 comment mis-parsing leads to email delivery to an attacker-controlled domain - https://github.com/advisories/GHSA-cc9r-2j5m-2m83
fix available via `npm audit fix`
node_modules/nodemailer

4 vulnerabilities (1 moderate, 2 high, 1 critical)
```

## После исправления (After)
Дата: 2026-09-24T02:04:50+03:00
Команда: `npm audit --omit=dev`
Код возврата: `0`

```
found 0 vulnerabilities
```

## Дополнительная верификация:
- `npx tsc --noEmit` -> 0 errors (PASS)
- `node scripts/check-bundle-secrets.mjs` -> 0 secrets leaked (PASS)
