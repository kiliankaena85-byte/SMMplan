## 2026-05-24T04:25:24Z

You are the Senior Technical Writer and Worker. Your task is to edit `d:\SMM_plan_2\admin_usability_audit_report.md` to add a new section **«9. Дополнительный инженерный анализ рисков и архитектурные решения (Adversarial Engineering Risks & Mitigations)»** directly before the **«Заключение»** section (around line 1061).

The new section MUST be written in Russian and comprehensively cover the following 5 critical engineering risks and mitigations identified during the peer review:

1. **Конкурентные ошибки Serializable-транзакций (SQLState 40001 / 40P01)**:
   - *Риск*: При высокой активности техподдержки транзакции компенсации с изоляцией `Serializable` могут приводить к ошибкам сериализации PostgreSQL.
   - *Решение*: Внедрить декоратор/обертку автоматического повтора транзакции (`transactionalRetry`) с экспоненциальной задержкой и джиттером (jitter) для всех Server Actions, изменяющих балансы.

2. **Рассинхронизация Drawer при динамической смене URL**:
   - *Риск*: Если оператор переключается между заказами в ленте тикетов без перезагрузки, локальный `initialSelectedOrder` на клиенте может рассинхронизироваться из-за Next.js shallow routing.
   - *Решение*: Внедрить ленивую загрузку на клиенте (lazy-fetch fallback) внутри `OrderClient`, которая при отсутствии заказа в текущем порционном срезе автоматически запрашивает детали через `fetchOrderDetailsAction`.

3. **Блокировки таблицы `Service` при массовом пересчете наценки**:
   - *Риск*: Массовое обновление денормализованных полей (`netMarginRub`) при изменении глобального курса валют блокирует таблицу каталога.
   - *Решение*: Использовать батчевые (пакетные) обновления по 50 записей в транзакции или динамические представления СУБД (PostgreSQL Database Views) для мгновенного расчетного вывода без блокировок.

4. **Ограничения состояний для запуска докруток (State Guards)**:
   - *Риск*: Запуск докруток на заказах, которые еще не завершились или отменены, ведет к утечкам бюджетов и банам провайдеров.
   - *Решение*: Установить жесткие условия состояния (State Guards) в бэкенд-валидации: запуск `Refill` (Сценарий А) и `Compensatory` (Сценарий В) разрешен только если статус оригинального заказа равен `COMPLETED` или `PARTIAL`.

5. **Оповещения о балансе оптовых аккаунтов провайдеров**:
   - *Риск*: Ручные компенсации (Сценарий B) отправляются провайдерам по оптовому тарифу, но могут завершаться ошибкой из-за нулевого баланса платформы на стороне поставщика.
   - *Решение*: Реализовать фоновый мониторинг балансов провайдеров с отправкой алертов в Slack/Telegram каналы поддержки при падении оптового счета ниже установленного порога (например, < $50).

Please use the `replace_file_content` or `multi_replace_file_content` tool to edit the file.
MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. Do not hardcode or fabricate findings.
When complete, write your handoff/findings to `d:\SMM_plan_2\.agents\worker_4_report_mitigations\handoff.md` and reply with confirmation.
