import re

with open('src/app/admin/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"import \{ SystemHealthOverview \} from '@/components/admin/settings/system-health-overview';\n", "", content)
content = re.sub(r"\{/\*.*Pulse & Quick Actions.*\*/\}\s*<SystemHealthOverview settings=\{sanitizedSettings\} />", "", content)

with open('src/app/admin/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed SystemHealthOverview")
