import re

with open('src/app/admin/tickets/components/unified-workspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update interface
content = re.sub(
    r"currentIsApi: boolean;",
    "currentIsApi: boolean;\n  userRole: string;\n  canSeeRates: boolean;",
    content
)

# 2. Update props destruction
content = re.sub(
    r"currentIsApi,\s*}: UnifiedTicketsWorkspaceProps\)",
    "currentIsApi,\n  userRole,\n  canSeeRates,\n}: UnifiedTicketsWorkspaceProps)",
    content
)

# 3. Pass to OrderDetailsModal
old_modal = """              <OrderDetailsModal
                order={isOrderDrawerOpen ? selectedOrder : null}
                onClose={() => {
                  setIsOrderDrawerOpen(false);
                  setSelectedOrder(null);
                }}
                addOptimisticUpdate={(update) => {
                  setOptimisticTickets((prev) =>"""

new_modal = """              <OrderDetailsModal
                order={isOrderDrawerOpen ? selectedOrder : null}
                onClose={() => {
                  setIsOrderDrawerOpen(false);
                  setSelectedOrder(null);
                }}
                userRole={userRole}
                canSeeRates={canSeeRates}
                addOptimisticUpdate={(update) => {
                  setOptimisticTickets((prev) =>"""
content = content.replace(old_modal, new_modal)

with open('src/app/admin/tickets/components/unified-workspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done unified-workspace.tsx")
