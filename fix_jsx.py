import re

with open('src/app/admin/settings/components/general/GeneralLegalFiscalSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("<Город>", "&lt;Город&gt;")

with open('src/app/admin/settings/components/general/GeneralLegalFiscalSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed JSX <Город>")
