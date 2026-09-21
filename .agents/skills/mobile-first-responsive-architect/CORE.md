# CORE: mobile-first-responsive-architect (Mobile & Touch Standard)

## HARD INVARIANTS
1. **Mobile-First Breakpoint Invariant (320–390px):** Стили по умолчанию строятся для смартфона (`w-full flex-col`). Брейкпоинты (`sm:`, `md:`, `lg:`) — только для прогрессивного расширения.
2. **Touch Target Floor:** Минимальная область клика интерактивных элементов >= 44x44px (WCAG 2.2 AA). Зазор между кнопками >= 8px.
3. **Safe Area Insets:** Нижние фиксированные панели обязаны включать `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]` или `pb-safe`.
4. **Dynamic Viewport (dvh):** Запрещен `100vh`. Использовать строго `100dvh` / `min-h-dvh` для защиты от прыжков адресной строки Safari/Chrome.
5. **iOS Auto-Zoom Guard:** Шрифты в `<input>`, `<select>`, `<textarea>` строго >= 16px на мобилке (`text-base sm:text-sm`).
6. **Thumb Zone:** Главные CTA-кнопки оформляются в нижней трети экрана. Таблицы на мобилке сворачиваются в карточки (`block md:table`).
