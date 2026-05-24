# Project: Smmplan Support & Admin Logging System Audit

## Architecture
- **Admin Server Actions**: Files in `src/actions/admin/` and other directories where admin-level operations reside (e.g. balance adjustment, team management, coupon creation, settings modification, user banning, service imports, provider configuration).
- **Support Operations**: Live-chat messages, resolving tickets, sending messages, setting limits, manual Telegram account merging.
- **Audit Log Infrastructure**: Prisma log models (`AuditLog` or similar), `VaultService` for credential management, and server action logging utilities.
- **Security & Secret Scrubbing**: Utility to strip password hashes, encryption keys, and Vault-encrypted variables from the log metadata before writing to db.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Exploration & Codebase Analysis | Search codebase for active admin actions, support actions, existing logging utilities, and identify coverage gaps. | None | PLANNED |
| M2 | Auditing Coverage & Security Implementation | Implement synchronous logging for all admin actions, log support rep actions, and ensure strict credential/key sanitization. | M1 | PLANNED |
| M3 | Logging Robustness & Error-Free Execution | Prevent unhandled logging exceptions (circular JSON, missing fields, foreign key constraint errors). | M2 | PLANNED |
| M4 | Validation & Production Verification | Verify typescript, lint, production build integrity, and run test suites. | M3 | PLANNED |
| M5 | Forensic Integrity Audit | Run Forensic Auditor to verify clean, compliant execution. | M4 | PLANNED |

## Interface Contracts
### Logging Service ↔ Server Actions
- Logging utility should be synchronously awaitable or safe to execute without blocking critical flows, recording:
  - `adminId` or `userId` (session identifier)
  - `actionType` (e.g. "BALANCE_ADJUSTMENT", "COUPON_CREATE")
  - `targetResourceId` / `targetClientId`
  - `metadata` (trimmed, secret-scrubbed JSON)
- Metadata sanitizer:
  - Scrub password, pass, hash, token, secret, key, credentials, yookassa, vault, etc.
  - Deep-sanitize nested JSON structures.
  - Trim large payloads (e.g., provider catalogs).
