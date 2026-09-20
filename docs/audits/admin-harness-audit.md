# 🛡️ Admin Panel E2E Layout & Visual Audit Report

**Date:** 20.09.2026, 19:44:59  
**Base URL:** `http://127.0.0.1:3000`  
**Verdict:** **🔴 DEFECTS DETECTED** (43/84 passed)  
**Tenant Cookie Persistence:** ✅ Verified (`x_admin_tenant`)

---

## 📊 Summary Metrics

| Metric | Value | Status |
|---|---|---|
| Total Routes Checked | **21** | ✅ Complete |
| Viewports Tested | **4** (Desktop, Tablet, Mobile 375, Mobile 390) | ✅ Matrix |
| Horizontal Scroll Breakages | **40** | 🔴 Overflow |
| Header Clipping / Overflow | **80** | 🔴 Clipped |
| Tab Collisions & Stamping | **5** | 🔴 Collision |
| Error Boundary Crashes | **0** | 🟢 Clean |
| Clipped Data Cells | **0** | 🟢 Zero Clipping |
| React 19 Hydration Mismatches | **0** | 🟢 Clean |
| Server Action Crashes | **0** | 🟢 Clean |

---

## 📋 Inspection Matrix Details

| Route | Viewport | Status | Time | Horizontal Scroll | Header | Tabs | Error Boundary |
|---|---|---|---|---|---|---|---|
| `/admin/dashboard` | Desktop (1280x800) | 200 | 456ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/dashboard` | Tablet (768x1024) | 200 | 430ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/dashboard` | Mobile (375x812) | 200 | 425ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/dashboard` | Mobile (390x844) | 200 | 419ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/orders` | Desktop (1280x800) | 200 | 414ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/orders` | Tablet (768x1024) | 200 | 386ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/orders` | Mobile (375x812) | 200 | 386ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/orders` | Mobile (390x844) | 200 | 386ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/orders/cuid_audit_order_0000000000001` | Desktop (1280x800) | 200 | 464ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/orders/cuid_audit_order_0000000000001` | Tablet (768x1024) | 200 | 374ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/orders/cuid_audit_order_0000000000001` | Mobile (375x812) | 200 | 377ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/orders/cuid_audit_order_0000000000001` | Mobile (390x844) | 200 | 369ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/clients` | Desktop (1280x800) | 200 | 409ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/clients` | Tablet (768x1024) | 200 | 402ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/clients` | Mobile (375x812) | 200 | 393ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/clients` | Mobile (390x844) | 200 | 395ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/clients/cuid_audit_client_user_00000001` | Desktop (1280x800) | 200 | 438ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/clients/cuid_audit_client_user_00000001` | Tablet (768x1024) | 200 | 402ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/clients/cuid_audit_client_user_00000001` | Mobile (375x812) | 200 | 392ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/clients/cuid_audit_client_user_00000001` | Mobile (390x844) | 200 | 399ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/providers` | Desktop (1280x800) | 200 | 420ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/providers` | Tablet (768x1024) | 200 | 414ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/providers` | Mobile (375x812) | 200 | 403ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/providers` | Mobile (390x844) | 200 | 427ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/providers/cuid_audit_provider_00000000001` | Desktop (1280x800) | 200 | 440ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/providers/cuid_audit_provider_00000000001` | Tablet (768x1024) | 200 | 382ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/providers/cuid_audit_provider_00000000001` | Mobile (375x812) | 200 | 386ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/providers/cuid_audit_provider_00000000001` | Mobile (390x844) | 200 | 381ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/catalog` | Desktop (1280x800) | 200 | 475ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/catalog` | Tablet (768x1024) | 200 | 413ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/catalog` | Mobile (375x812) | 200 | 424ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/catalog` | Mobile (390x844) | 200 | 402ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/catalog/cuid_audit_service_000000000001` | Desktop (1280x800) | 200 | 434ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/catalog/cuid_audit_service_000000000001` | Tablet (768x1024) | 200 | 392ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/catalog/cuid_audit_service_000000000001` | Mobile (375x812) | 200 | 392ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/catalog/cuid_audit_service_000000000001` | Mobile (390x844) | 200 | 385ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/services/cuid_audit_service_000000000001/routing` | Desktop (1280x800) | 200 | 421ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/services/cuid_audit_service_000000000001/routing` | Tablet (768x1024) | 200 | 387ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/services/cuid_audit_service_000000000001/routing` | Mobile (375x812) | 200 | 407ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/services/cuid_audit_service_000000000001/routing` | Mobile (390x844) | 200 | 398ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/tickets` | Desktop (1280x800) | 200 | 428ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/tickets` | Tablet (768x1024) | 200 | 393ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/tickets` | Mobile (375x812) | 200 | 383ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/tickets` | Mobile (390x844) | 200 | 385ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/tickets/cuid_audit_ticket_000000000001` | Desktop (1280x800) | 200 | 394ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/tickets/cuid_audit_ticket_000000000001` | Tablet (768x1024) | 200 | 381ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/tickets/cuid_audit_ticket_000000000001` | Mobile (375x812) | 200 | 369ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/tickets/cuid_audit_ticket_000000000001` | Mobile (390x844) | 200 | 372ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/cms` | Desktop (1280x800) | 200 | 384ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/cms` | Tablet (768x1024) | 200 | 367ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/cms` | Mobile (375x812) | 200 | 366ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/cms` | Mobile (390x844) | 200 | 371ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/cms/cuid_audit_content_000000000001` | Desktop (1280x800) | 200 | 438ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/cms/cuid_audit_content_000000000001` | Tablet (768x1024) | 200 | 369ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/cms/cuid_audit_content_000000000001` | Mobile (375x812) | 200 | 370ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/cms/cuid_audit_content_000000000001` | Mobile (390x844) | 200 | 387ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/knowledge/cuid_audit_article_000000000001/edit` | Desktop (1280x800) | 200 | 419ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/knowledge/cuid_audit_article_000000000001/edit` | Tablet (768x1024) | 200 | 379ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/knowledge/cuid_audit_article_000000000001/edit` | Mobile (375x812) | 200 | 375ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/knowledge/cuid_audit_article_000000000001/edit` | Mobile (390x844) | 200 | 372ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/finance` | Desktop (1280x800) | 200 | 436ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/finance` | Tablet (768x1024) | 200 | 394ms | 🟢 0px | 🟢 OK | 🔴 1 collisions | 🟢 OK |
| `/admin/finance` | Mobile (375x812) | 200 | 396ms | 🔴 +63px | 🔴 2 issues | 🔴 2 collisions | 🟢 OK |
| `/admin/finance` | Mobile (390x844) | 200 | 400ms | 🔴 +48px | 🔴 2 issues | 🔴 2 collisions | 🟢 OK |
| `/admin/marketing` | Desktop (1280x800) | 200 | 453ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/marketing` | Tablet (768x1024) | 200 | 407ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/marketing` | Mobile (375x812) | 200 | 397ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/marketing` | Mobile (390x844) | 200 | 402ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/finance/payments/cuid_audit_payment_000000000001/dispute-pack` | Desktop (1280x800) | 200 | 441ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/finance/payments/cuid_audit_payment_000000000001/dispute-pack` | Tablet (768x1024) | 200 | 407ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/finance/payments/cuid_audit_payment_000000000001/dispute-pack` | Mobile (375x812) | 200 | 388ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/finance/payments/cuid_audit_payment_000000000001/dispute-pack` | Mobile (390x844) | 200 | 414ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/settings` | Desktop (1280x800) | 200 | 423ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/settings` | Tablet (768x1024) | 200 | 402ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/settings` | Mobile (375x812) | 200 | 401ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/settings` | Mobile (390x844) | 200 | 386ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/staff` | Desktop (1280x800) | 200 | 461ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/staff` | Tablet (768x1024) | 200 | 385ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/staff` | Mobile (375x812) | 200 | 392ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/staff` | Mobile (390x844) | 200 | 385ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/system/features` | Desktop (1280x800) | 200 | 435ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/system/features` | Tablet (768x1024) | 200 | 382ms | 🟢 0px | 🟢 OK | 🟢 OK | 🟢 OK |
| `/admin/system/features` | Mobile (375x812) | 200 | 388ms | 🔴 +63px | 🔴 2 issues | 🟢 OK | 🟢 OK |
| `/admin/system/features` | Mobile (390x844) | 200 | 383ms | 🔴 +48px | 🔴 2 issues | 🟢 OK | 🟢 OK |

---

## 🔍 Detailed Findings & Defect Diagnostics


### #1 Route: `/admin/dashboard` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #2 Route: `/admin/dashboard` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #3 Route: `/admin/orders` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #4 Route: `/admin/orders` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #5 Route: `/admin/orders/cuid_audit_order_0000000000001` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #6 Route: `/admin/orders/cuid_audit_order_0000000000001` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #7 Route: `/admin/clients` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #8 Route: `/admin/clients` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #9 Route: `/admin/clients/cuid_audit_client_user_00000001` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #10 Route: `/admin/clients/cuid_audit_client_user_00000001` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #11 Route: `/admin/providers` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #12 Route: `/admin/providers` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #13 Route: `/admin/providers/cuid_audit_provider_00000000001` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #14 Route: `/admin/providers/cuid_audit_provider_00000000001` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #15 Route: `/admin/catalog` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #16 Route: `/admin/catalog` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #17 Route: `/admin/catalog/cuid_audit_service_000000000001` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #18 Route: `/admin/catalog/cuid_audit_service_000000000001` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #19 Route: `/admin/services/cuid_audit_service_000000000001/routing` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #20 Route: `/admin/services/cuid_audit_service_000000000001/routing` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #21 Route: `/admin/tickets` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #22 Route: `/admin/tickets` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #23 Route: `/admin/cms` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #24 Route: `/admin/cms` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #25 Route: `/admin/cms/cuid_audit_content_000000000001` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #26 Route: `/admin/cms/cuid_audit_content_000000000001` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #27 Route: `/admin/knowledge/cuid_audit_article_000000000001/edit` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #28 Route: `/admin/knowledge/cuid_audit_article_000000000001/edit` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #29 Route: `/admin/finance` [Tablet (768x1024)]
- **HTTP Status:** 200
- **Horizontal Overflow:** No

- **Tab Collisions:**
  - Tab trigger "4. Сверка & Балансы" overflows TabsList bottom (254px > 237px)

- **Clipped Cells:** 0





### #30 Route: `/admin/finance` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)
- **Tab Collisions:**
  - Tab trigger "2. Реестр Платежей" overflows TabsList bottom (289px > 272px)
  - Tab trigger overlaps TabsContent by 20px

- **Clipped Cells:** 0





### #31 Route: `/admin/finance` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)
- **Tab Collisions:**
  - Tab trigger "2. Реестр Платежей" overflows TabsList bottom (261px > 244px)
  - Tab trigger overlaps TabsContent by 20px

- **Clipped Cells:** 0





### #32 Route: `/admin/marketing` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #33 Route: `/admin/marketing` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #34 Route: `/admin/finance/payments/cuid_audit_payment_000000000001/dispute-pack` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #35 Route: `/admin/finance/payments/cuid_audit_payment_000000000001/dispute-pack` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #36 Route: `/admin/settings` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #37 Route: `/admin/settings` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #38 Route: `/admin/staff` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #39 Route: `/admin/staff` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0





### #40 Route: `/admin/system/features` [Mobile (375x812)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+63px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 63px (438px > 375px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 375px)


- **Clipped Cells:** 0





### #41 Route: `/admin/system/features` [Mobile (390x844)]
- **HTTP Status:** 200
- **Horizontal Overflow:** Yes (+48px overflow)
- **Header Issues:**
  - Header scrollWidth exceeds clientWidth by 48px (438px > 390px)
  - Button/link "ADadmin.auditВладелец" offscreen right (438px > 390px)


- **Clipped Cells:** 0




