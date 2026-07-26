# Implementation Plan: Client Dashboard Advanced Backend Features Integration

## Phase 1: Codebase Exploration & Technical Specification
- Dispatch Explorer (`teamwork_preview_explorer`) to audit `new-order`, `orders`, `settings`, and `deposit` files in SMMplan & SMMflux.
- Identify existing Prisma schemas, server actions, and client UI components.
- Produce technical specification in `.agents/explorer_1/analysis.md`.

## Phase 2: R1 - Advanced Order Parameters (`new-order`)
- Implement Drip-Feed toggle and interval/runs fields in `new-order` forms for both SMMplan & SMMflux.
- Add total budget calculation (`qty * runs * price`).
- Implement Custom Data textarea / numeric selection for comment/poll services.
- Display ETA P50/P90 speed badges (`⚡ Высокая (ETA P50: 12 мин, P90: 45 мин)`).
- Implement mandatory `clientConfirmation` JIT warning checkbox with error highlight animation.
- Verification: Reviewer + Challenger + Forensic Auditor.

## Phase 3: R2 - Order Management (`orders`)
- Add "Запросить бесплатную докрутку" (Refill request) button in `orders` registry.
- Connect Refill action to backend and display status (`PENDING`).
- Display Drip-Feed progress (`Запуск 2 из 5 (следующий через 15 мин)`).
- Show CBR exchange rate & discount breakdown details.
- Verification: Reviewer + Challenger + Forensic Auditor.

## Phase 4: R3 - Advanced Profile & Security Settings (`settings`)
- Display 152-ФЗ consent card with `tosAcceptedAt` timestamp and `tosAcceptedIp`.
- Add B2B Webhook URL, Webhook Secret, and status indicator.
- Add B2B Legal Entity Requisites fields (`companyName`, `inn`, `kpp`, `legalAddress`).
- Implement API Key generation & reset feature (`apiKeyHash`).
- Verification: Reviewer + Challenger + Forensic Auditor.

## Phase 5: R4 - Promo Codes & Vouchers in Deposit (`deposit`)
- Add Promo Code / Voucher input in `deposit` balance top-up form.
- Calculate instant discount or fix bonus in cents.
- Verification: Reviewer + Challenger + Forensic Auditor.

## Phase 6: E2E Integration & Verification
- Execute full linting (`eslint`), typechecking (`tsc --noEmit`), and build verification.
- Final Forensic Audit (`teamwork_preview_auditor`).
- Prepare final project report.
