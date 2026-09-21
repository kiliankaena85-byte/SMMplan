import re

with open('src/app/admin/tickets/components/unified-workspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the duplicates
content = content.replace("  userRole: string;\n  canSeeRates: boolean;\n", "")

with open('src/app/admin/tickets/components/unified-workspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed duplicates")
