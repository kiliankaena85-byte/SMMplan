import re

with open('src/app/admin/settings/general-settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("toast.success(res.message);", "toast.success('Режим тех. работ изменен');")

with open('src/app/admin/settings/general-settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed message property error")
