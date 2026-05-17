NS # Roadmap: SMMplan_lite

## Overview

SMMplan_lite is an automated, smart SMM panel optimized for high margins with no automatic failover, smart link analysis, and embedded financial control. 
**Current Development Focus:** v2.0 Extensions & Integration (B2B API & i18n).

## Phases

- [x] **v1.0 Milestone History:**
  - Archived: [v1.0 ROADMAP](./milestones/v1.0-ROADMAP.md) | [v1.0 REQUIREMENTS](./milestones/v1.0-REQUIREMENTS.md)

- [x] **Phase 1: B2B Reseller API Gateway**

## Phase Details

### Phase 1: B2B Reseller API Gateway
**Goal**: Build public API endpoints allowing third-party panels to buy directly from Smmplan_lite using user balances.
**Depends on**: v1.0 Core
**Requirements**: [B2B-01, B2B-02, B2B-03, B2B-04]
**Success Criteria**:
  1. User can generate an API key from frontend.
  2. External system can post to `/api/v1/order` and successfully deduct balance in cents.
  3. API Service mapping returns a properly formatted JSON compatible with PerfectPanel specs.
**Plans**: PLAN.md (Completed)

## Progress

**Execution Order:**
Phases execute in numeric order: 1

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. B2B Reseller API Gateway | 1/1 | Completed | x |

### Phase 2: Production Hardening (Docker, CI/CD, Deployment Architecture)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 1
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 2 to break down)

## Backlog

### Phase 999.1: B2B Promo Banner on Landing (Frictionless Acquisition) (BACKLOG)

**Goal:** Promote B2B reseller cabinet and mass ordering capabilities to professional agencies on the main guest landing page without cluttering the minimalist core single-order UX.
**Requirements:**
- Add a premium, high-converting CTA card/banner inside [WhyUs.tsx](file:///d:/SMM_plan_2/src/components/landing/WhyUs.tsx) or [SmartLinkLanding.tsx](file:///d:/SMM_plan_2/src/components/landing/SmartLinkLanding.tsx) pointing to the registration page.
- Showcase B2B benefits: Excel batch parsing, pre-funded balance payments, discount tiers, and API access.
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: Guest Mass Order Demo & Pre-Registration Gateway (BACKLOG)

**Goal:** Enable guest users to experience mass link parsing and pricing calculations directly on the landing page, prompting a frictionless registration step only at the moment of payment execution.
**Requirements:**
- Add a "Mass Order" tab option to the main [SmartLinkLanding.tsx](file:///d:/SMM_plan_2/src/components/landing/SmartLinkLanding.tsx) header.
- Provide a bulk text input, parse lines in memory, display structural feedback, and intercept checkout with a premium onboarding modal.
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.3: Mass Order API Gateway Extensions (BACKLOG)

**Goal:** Provide programmatic bulk order submission for pro resellers and external panels using our PerfectPanel-compliant API v2 routing.
**Requirements:**
- Extend the API handler in `src/app/api/v2/route.ts` to support multi-order action request payloads (`add_multi`).
- Verify balance availability atomically and return structured arrays of success order IDs and individual validation errors.
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

