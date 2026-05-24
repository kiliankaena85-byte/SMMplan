# Handoff Report — explorer_2

## 1. Observation
We directly audited the Smmplan codebase regarding support representative operations, logging coverage, and audit trails. Below are our exact observations:

### A. Unlogged Support Operations
1. **Support Reply and Internal Note (`src/actions/support/ticket.ts`)**:
   * Line 155: The `adminReplyTicket(formData: FormData)` action processes public messages and internal notes but completely lacks any call to `AdminAuditLog`, `AuditLog`, or general log systems:
     ```typescript
     export async function adminReplyTicket(formData: FormData) {
       return requireStaffPermission('support', 'edit', async () => {
         const parsed = adminReplySchema.safeParse(Object.fromEntries(formData.entries()));
         if (!parsed.success) throw new Error('Ошибка валидации сообщения');
         const { ticketId, message, isInternal, mediaUrl, mediaType, replyToId } = parsed.data;

         const sender = isInternal ? 'INTERNAL' : 'STAFF';

         const savedMsg = await ticketService.addMessage(ticketId, sender, message || '', mediaUrl, mediaType, replyToId);
         // ... SSE broadcasting and path revalidation, NO logging code.
     ```
2. **Anonymous Database Entries (`prisma/schema.prisma`)**:
   * Lines 456-481: The `TicketMessage` model has no `adminId`, `adminEmail`, or other operator identification:
     ```prisma
     model TicketMessage {
       id        String  @id @default(cuid())
       ticketId  String
       ticket    Ticket  @relation(fields: [ticketId], references: [id], onDelete: Cascade)
       sender    MessageSender
       text      String
       ...
     ```
3. **Ticket Status Closures (`src/actions/support/ticket.ts`)**:
   * Line 186: `changeTicketStatus(formData: FormData)` modifies status silently without logging:
     ```typescript
     export async function changeTicketStatus(formData: FormData) {
       return requireStaffPermission('support', 'edit', async () => {
         const parsed = changeStatusSchema.safeParse(Object.fromEntries(formData.entries()));
         if (!parsed.success) throw new Error('Неверный статус');
         const { ticketId, status } = parsed.data;

         await db.ticket.update({
           where: { id: ticketId },
           data: { 
             status,
             ...(status === 'CLOSED' ? { resolvedAt: new Date() } : {})
           }
         });
         // ... revalidations only
     ```

### B. Hardcoded `'internal'` Operator IPs
1. **Message Editing (`src/actions/support/ticket.ts`)**:
   * Lines 234-245: `editTicketMessage(formData: FormData)` hardcodes `'internal'`:
     ```typescript
     await tx.adminAuditLog.create({
       data: {
         adminId: user.id,
         adminEmail: user.email,
         action: 'TICKET_MESSAGE_EDITED',
         target: msg.id,
         targetType: 'TICKET_MESSAGE',
         oldValue: msg.text,
         newValue: newText.trim(),
         ipAddress: 'internal'
       }
     });
     ```
2. **Manual Telegram Bind (`src/actions/support/ticket.ts`)**:
   * Lines 375-386: `adminManualTelegramBind(formData: FormData)` hardcodes `'internal'`:
     ```typescript
     await tx.adminAuditLog.create({
       data: {
         adminId: admin.id,
         adminEmail: admin.email,
         action: 'MANUAL_TELEGRAM_BIND',
         target: webUser.id,
         targetType: 'USER',
         oldValue: tempUser.email,
         newValue: webUser.email,
         ipAddress: 'internal'
       }
     });
     ```
3. **Manual Compensation (`src/actions/support/compensation.ts`)**:
   * Lines 86-97: `logManualCompensation(formData: FormData)` hardcodes `'internal'`:
     ```typescript
     await tx.adminAuditLog.create({
       data: {
         adminId: user.id,
         adminEmail: user.email,
         action: topUpBalance ? 'BALANCE_TOPUP_COMPENSATION' : 'MANUAL_REFILL_COMPENSATION',
         target: ticket.id,
         targetType: 'TICKET',
         oldValue: JSON.stringify({ supportLimitCents: user.supportLimitCents }),
         newValue: JSON.stringify({ supportLimitCents: isOwner ? user.supportLimitCents : user.supportLimitCents - costCents }),
         ipAddress: 'internal'
       }
     });
     ```

### C. Missing IP Omissions in High-Risk Audits
1. **Admin User Impersonation (`src/actions/admin/users.ts`)**:
   * Lines 162-169: `loginAsAction(formData: FormData)` fails to supply `ipAddress` to `auditAdminAwaitable`:
     ```typescript
     await auditAdminAwaitable({
       adminId: admin.id,
       adminEmail: admin.email,
       action: 'LOGIN_AS_USER',
       target: userId,
       targetType: 'USER',
       newValue: { targetEmail: targetUser.email, sessionExpires: expiresAt.toISOString(), impersonatedBy: admin.id },
     });
     ```
2. **Escrow Quarantine Resolving (`src/services/admin/escrow.service.ts`)**:
   * Lines 232-246: `resolveQuarantine` omits the `ipAddress` property:
     ```typescript
     await tx.adminAuditLog.create({
       data: {
         adminId: owner.id,
         adminEmail: owner.email,
         action: `QUARANTINE_${resolution}`,
         target: entry.id,
         targetType: 'LEDGER',
         oldValue: JSON.stringify({ status: 'QUARANTINE', userQuarantine: Number(user.quarantineBalance), userBalance: Number(user.balance) }),
         newValue: JSON.stringify({
           status: resolution,
           userQuarantine: Number(user.quarantineBalance) - Number(entry.amount),
           userBalance: resolution === 'APPROVE' ? Number(user.balance) + Number(entry.amount) : Number(user.balance),
         }),
       }
     });
     ```

### D. Silent Automated Account Merges
1. **Telegram Smart Bind Profile Merges (`src/bot/index.ts`)**:
   * Lines 97-126: An atomic transaction transfers tickets and dependencies from a temporary bot stub user to the web profile, deletes the temporary user, and binds the web profile to Telegram without logging to `AdminAuditLog` or `AuditLog`.

### E. Non-Blocking (Fire-and-Forget) Logging Issues
1. **Fire-and-Forget Logging (`src/lib/admin-audit.ts`)**:
   * Lines 8-34: `auditAdmin` runs non-blocking DB queries with a silent catch:
     ```typescript
     export function auditAdmin(params: { ... }) {
       void db.adminAuditLog.create({ ... }).catch((err) => {
         console.error('[AdminAudit] Failed to write log:', err);
       });
     }
     ```

---

## 2. Logic Chain
1. **Operator Anonymity**: Because `adminReplyTicket` and `changeTicketStatus` do not call any audit logs, and because the `TicketMessage` database model has no relation or text field storing which individual administrator created a message, any support agent can send responses or notes anonymously. If a representative behaves maliciously or breaches SLA protocols, their identity cannot be resolved from the database tables.
2. **Auditing Evasion (Masked IPs)**: Because `editTicketMessage`, `adminManualTelegramBind`, and `logManualCompensation` hardcode `ipAddress: 'internal'`, the actual network IP of the active operator is discarded. A compromised staff account cannot be geolocated or verified via networking log correlations.
3. **High-Risk Auditing Omissions**: Because `loginAsAction` and `resolveQuarantine` execute without passing `ipAddress` (which resolves to `null` in `AdminAuditLog`), critical security thresholds (impersonating users and releasing quarantined money) are captured without their network context.
4. **Data Loss (Silent Merges)**: Because automated Telegram binds merge database records and delete temporary stub users without logging, there is zero historical trace of profile merges or why specific temporary users vanished from the database.

---

## 3. Caveats
- We did not perform dynamic manual testing (e.g. running the website or issuing mock commands in a browser) as this is a **read-only codebase investigation**.
- We assumed that `getClientIp()` from `@/utils/ip` is fully working in Next.js Server Actions across all environments (which is supported by its usage in other actions like `updateUserRole` and `updateBalanceAction`).

---

## 4. Conclusion
There are multiple **critical logging coverage gaps** and **security vulnerabilities** in the support representative operations of Smmplan:
1. **Absolute Anonymity** on replies (`adminReplyTicket`) and ticket status modifications (`changeTicketStatus`), making staff accountability impossible to trace in database records.
2. **IP Auditing Evasion** due to hardcoded `'internal'` IPs and omitted IP parameters in high-risk financial and privacy actions (impersonation, escrow resolution).
3. **Silent Automated Merges** and lack of audit trails for automated profile deletions.

Resolving these gaps requires implementing standard IP resolving via `getClientIp('unknown')`, updating the `adminReplyTicket` and `changeTicketStatus` callbacks to accept the active operator's context, and writing explicit database audit entries for all support interactions.

---

## 5. Verification Method
To verify these findings, an implementing agent or auditor can:
1. **Inspect Code Files**:
   * Check `src/actions/support/ticket.ts` at line 155 and 186 to confirm the absence of audit log calls.
   * View `prisma/schema.prisma` at lines 456-481 to confirm the `TicketMessage` model does not contain fields tracking the administrator's ID.
   * View `src/bot/index.ts` at lines 97-126 to confirm no `auditAdmin` or `db.adminAuditLog` calls exist inside the smart bind transaction.
2. **Verify Database Records**:
   * Inspect the `AdminAuditLog` table in the database after calling the ticket editing, manual binding, or compensation actions to verify that `ipAddress` is logged literally as the string `'internal'`.
   * Verify that `ipAddress` is stored as `null` after executing `loginAsAction` or `resolveQuarantine` actions.
