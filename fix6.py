import re

with open('src/app/admin/tickets/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add userRole and canSeeRates
replacement = """
  const supportLimitCents = await adminTicketService.getSupportDailyLimitCents();
  const supportSpentTodayCents = await adminTicketService.getSupportSpentTodayCents(user.id);
  const canSeeRates = user.role === 'OWNER' || user.role === 'ADMIN';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">
      <UnifiedTicketsWorkspace
        tickets={ticketsResult.items}
        totalPages={ticketsResult.pages}
        currentPage={currentPage}
        stats={stats}
        activeTicket={activeTicket}
        templates={templatesResult.templates}
        supportLimitCents={supportLimitCents}
        supportSpentTodayCents={supportSpentTodayCents}
        currentStatus={statusFilter}
        currentSource={sourceFilter}
        currentIsApi={isApiEnabledFilter}
        userRole={user.role}
        canSeeRates={canSeeRates}
      />
    </div>
  );
"""

# We need to find the return statement and replace it.
content = re.sub(
    r"const supportLimitCents = await adminTicketService\.getSupportDailyLimitCents\(\);\s*const supportSpentTodayCents = await adminTicketService\.getSupportSpentTodayCents\(user\.id\);\s*return \(\s*<div className=\"flex flex-col h-\[calc\(100vh-64px\)\] overflow-hidden bg-background\">\s*<UnifiedTicketsWorkspace.*?</UnifiedTicketsWorkspace>\s*</div>\s*\);",
    replacement.strip(),
    content,
    flags=re.DOTALL
)

with open('src/app/admin/tickets/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done page.tsx")
