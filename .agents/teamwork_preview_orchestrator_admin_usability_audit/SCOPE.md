# Scope: Admin Panel Usability and Logical Audit

## Architecture
The Smmplan admin panel is designed with the following structure:
- **Routes**: `/admin/*` pages like `/admin/tickets`, `/admin/orders`, `/admin/catalog`, `/admin/providers`, `/admin/settings`, `/admin/tickets/[id]`.
- **Framework/UI**: Next.js 16 (App Router), React 19, Tailwind CSS 4, HeroUI v3 (dot notation components).
- **Backend/ORM**: Prisma 5 client, PostgreSQL, Server Actions under `src/actions/admin/`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Codebase Exploration | Exploration of admin tickets, sidebar, orders and catalog code to extract transition logic errors, userflow steps, and file references. | None | DONE (findings.md ready) |
| 2 | Report & Specification Design | Generation of `admin_usability_audit_report.md` in workspace root covering userflows, transition bugs, OrderDrawer design, Catalog improvements, deep orders audit, and a comprehensive Refills (Scenario A & B) architecture brainstorm, followed by peer review. | M1 | DONE (Report written, peer reviewed, forensic audited, and finalized) |

## Interface Contracts & Critical Components to Audit
- `src/components/admin/tickets/[id]` or page routes for `/admin/tickets/[id]`
- `src/components/admin/ClientProfileSidebar.tsx` (or similar component) for LTV, financial history, and "Смотреть все заказы →" transition
- `/admin/orders` page and drawer components for filtering by `userId` and opening drawer via `edit_order_id`
- `/admin/catalog` search, batch operations, price switchers (RUB/USD), quantity switchers (1 unit/1k), and pricing operator widgets.
- `Refills (Scenario A: Industrial Refill API, Scenario B: Free Compensatory Order)` architecture, fraud protection, operator limits, and UI visual layout.
- Server Actions for ticket, orders, catalog and provider management in `src/actions/admin/`
