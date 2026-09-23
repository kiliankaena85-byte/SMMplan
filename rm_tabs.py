import re

with open('src/app/admin/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"\s*tabs=\{SYSTEM_TABS\}", "", content)

with open('src/app/admin/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed SYSTEM_TABS from page.tsx")
