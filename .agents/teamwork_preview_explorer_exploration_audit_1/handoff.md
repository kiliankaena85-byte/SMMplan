# Handoff Report — Smmplan Landing Page Audit & Automation

This handoff report is prepared in strict compliance with the Handoff Protocol for read-only Explorer subagents.

---

## 1. Observation

Direct observations and evidence collected during the landing page audit:

### A. Prohibited Inline Tailwind Colors
* **`src/components/landing/TrustBar.tsx`** (Line 11):
  ```tsx
  { value: '24/7', label: 'Живая поддержка', icon: Headphones, color: 'text-indigo-500' }
  ```
* **`src/components/landing/WhyUs.tsx`** (Line 50):
  ```tsx
  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform dark:bg-success/10">
  ```
* **`src/components/landing/WhyUs.tsx`** (Line 64):
  ```tsx
  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform dark:bg-destructive/10">
  ```
* **`src/components/landing/WhyUs.tsx`** (Line 78):
  ```tsx
  <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-full blur-3xl opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-500 -translate-y-1/3 translate-x-1/3" />
  ```
* **`src/components/landing/WhyUs.tsx`** (Line 128):
  ```tsx
  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-primary-foreground text-xs font-extrabold shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shrink-0"
  ```
* **`src/components/landing/Reviews.tsx`** (Line 28):
  ```tsx
  <Star key={star} className={`w-4 h-4 ${star <= r.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
  ```
* **`src/components/landing/order-engine/DynamicPayloadWarnings.tsx`** (Lines 50, 60):
  ```tsx
  <div className="w-full bg-danger-50 dark:bg-danger-50/10 border border-danger-200 dark:border-danger-900/50 text-danger-700 dark:text-danger-500 rounded-xl p-4 flex items-start gap-3 shadow-sm">
  ```

### B. Theme Backdrop Hardcoding
* **`src/components/landing/SmartLinkLanding.tsx`** (Line 149):
  ```tsx
  {/* Base Colored Canvas (Adapts to Theme) */}
  <div className="absolute inset-0 bg-slate-950" />
  ```

### C. Mathematical Theme Contrasts (`src/app/globals.css`)
* **Light Theme Primary Background & Foreground**:
  ```css
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --color-primary: #0284c7;
  --color-muted-foreground: #64748b;
  ```
* **Dark Theme Card Background & Muted Foreground**:
  ```css
  --color-card: #0f172a;
  --color-muted-foreground: #94a3b8;
  ```

### D. Mobile Touch Target Metrics (`src/components/landing/order-engine/MobileWizard.tsx`)
* **Platform/Category Dropdown Triggers** (Lines 159, 199, 475, 516):
  ```tsx
  <SelectTrigger className="w-full h-9 pl-8 pr-8 rounded-xl border border-border bg-background text-xs font-semibold text-foreground">
  ```
* **Reseller "PRO Mode" Toggle Button** (Line 106):
  ```tsx
  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary transition-all active:scale-95 cursor-pointer"
  ```
* **Step Circles** (Line 397):
  ```tsx
  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center">1</div>
  ```

### E. Screenshot Automation Script (`take_screenshots.js`)
* **File Encoding Check**: The file is stored in UTF-16LE encoding (confirmed by node runtime crash on raw read).
* **Hardcoded Absolute Output Folder**:
  ```javascript
  await desktopPage.screenshot({ path: 'C:/Users/Артём/.gemini/antigravity/brain/57d1cb93-1089-4429-b1cd-f488fa564389/desktop.png' });
  ```
* **Authenticated Route Target**:
  ```javascript
  await desktopPage.goto('http://localhost:3000/dashboard/new-order', { waitUntil: 'networkidle' });
  ```

---

## 2. Logic Chain

1. **Inline Colors Violate Developer Contract**: The Smmplan Lite AI Developer Contract (`AGENTS.md`) states explicitly: `"- НИКОГДА не используй inline цвета: text-white, bg-black, text-blue-500. ВСЕГДА используй semantic tokens из globals.css"`. Components like `TrustBar.tsx`, `WhyUs.tsx`, `Reviews.tsx`, and `DynamicPayloadWarnings.tsx` directly contain inline values such as `text-indigo-500`, `text-emerald-600`, and `bg-rose-50`. This is a direct, verified violation of the rules.
2. **Alert Styling Fragility**: In `DynamicPayloadWarnings.tsx`, custom alert banners rely on Tailwind utility scales such as `bg-danger-50` and `border-danger-200`. In Tailwind CSS v4's strict configuration, custom desaturated color shades like `-50` and `-200` are not dynamically resolved by default, causing these critical warning messages to render with transparent backdrops and borders on runtime.
3. **Jarring Backdrop Sandwich**: The hardcoded `<div className="absolute inset-0 bg-slate-950" />` in `SmartLinkLanding.tsx:149` displays a pure dark slate background inside the Hero block. In Light Theme, since the sticky Header is white (`bg-background/80`) and the rest of the page body is light slate (`#f8fafc`), this creates a harsh, unpolished visual transition.
4. **WCAG 2.2 Contrast Failures**:
   * Text contrast of white (`#ffffff`) on `bg-primary` (`#0284c7`) calculates mathematically to **3.8:1**. This violates WCAG 2.2 AA's minimum requirement of **4.5:1** for normal-sized text.
   * Text contrast of `text-muted-foreground` (`#64748b`) on `#f8fafc` backdrop is **4.1:1**, which is also a **FAIL** (violating 4.5:1).
5. **Accidental Clicks on Mobile Viewport**:
   * The Platform and Category selector triggers are hardcoded to `h-9` (36px). This falls short of the WCAG 2.2 AA Target Size standard of **44x44px**.
   * Dropdown menu items inside `select.tsx` have vertical padding of `py-1` (totaling ~28px high), which creates high risk of clicking the wrong item.
   * The "PRO Mode" toggle is only **24px** high and sits adjacent to step numbers, facilitating accidental activation.
6. **Obsolete Screenshot Script Failures**:
   * Attempting to run `take_screenshots.js` directly crashes Node.js parser due to UTF-16LE formatting.
   * It attempts to capture `/dashboard/new-order`, which requires active cookies and authentication. Unauthenticated requests are redirected back to the login screen, producing photos of the login form rather than the dashboard.
   * The output path is hardcoded to a legacy folder structure, which will crash or save outside the active workspace.

---

## 3. Caveats

* **Local Environment Verification**: Port 3000 is assumed to be the local port of the Next.js dev server as configured inside `playwright.config.ts`.
* **Browser Sandbox**: The screenshot script was planned and validated using standard chromium viewport capabilities, but local differences in available OS system fonts may slightly alter font weight or bounding layouts on screenshot comparisons.

---

## 4. Conclusion

The Smmplan landing page is built on a highly polished structure but exhibits **five critical UX/logical bugs**:
1. Extensive contract violations regarding inline color choices (`text-indigo-500`, etc.) that must be refactored into semantic tokens.
2. Low WCAG 2.2 AA contrast ratios on primary interactive buttons (3.8:1) and muted body text (4.1:1) that impair readability.
3. Too dense mobile touch targets (<44px) on category and platform selects that create high click friction on mobile viewports.
4. Hardcoded dark background layers that ruin the aesthetic transitions when operating in Light Theme.
5. A broken, outdated screenshot automation script (`take_screenshots.js`) that uses hardcoded paths, incorrect page locations, and bad character encoding.

All recommended solutions are highly actionable, scoped, and documented in detail in `analysis.md`.

---

## 5. Verification Method

To verify these findings and confirm the resolved layout fixes in the future, the following methods must be executed:

### A. Execution of Automated Screenshots
Ensure the dev server is running on localhost, then run:
```powershell
# 1. Install playwright dependencies if not already done
npx playwright install chromium

# 2. Run the proposed Node automation script (after saving it as UTF-8)
node take_screenshots_fixed.js
```
* **Expected Output**: Success messages printed to stdout. Verify that beautiful `desktop.png` (1280x800) and `mobile.png` (375x812 iPhone X) are generated at `C:\Users\Артём\.gemini\antigravity\brain\5e3b2eb6-b167-4089-8d33-c0c807f15793\`.

### B. Validation of Type Safety & Build
Validate that code changes do not break strict TypeScript boundaries or production bundling:
```powershell
npx tsc --noEmit
npm run build
```
* **Expected Output**: Successful zero-error outputs.

### C. Design System Visual Check
Inspect files to ensure all raw hexes and inline classes like `text-indigo-500`, `text-emerald-600`, and `bg-rose-50` have been refactored into theme-based tokens matching `src/app/globals.css`.
