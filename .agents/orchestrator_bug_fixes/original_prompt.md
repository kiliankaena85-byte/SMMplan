# Original Prompt — 2026-05-22T22:20:29+03:00

Устранение 12 визуальных, логических и доступных (WCAG 2.2 AA) ошибок на главной странице Smmplan, обнаруженных в ходе глубокого аудита. Перевод инлайновых цветов на семантические токены, исправление контрастности элементов и оптимизация размеров интерактивных мишеней (touch targets) на мобильных экранах.

Requirements overview:
- R1: Fix theme/visual conflicts on the first screen (BUG-001, BUG-002) in `SmartLinkLanding.tsx` and header.
- R2: Remove inline colors in Bento/Warnings (BUG-003, BUG-004, BUG-005, BUG-006) across `DynamicPayloadWarnings.tsx`, `TrustBar.tsx`, `WhyUs.tsx`, `Reviews.tsx`.
- R3: Increase contrast of buttons, text, and links to WCAG 2.2 AA in `src/app/globals.css`.
- R4: Optimize touch targets to WCAG 2.5.5 in `MobileWizard.tsx` and `select.tsx`.
