import re

with open('src/__tests__/unit/general-settings-decomposition.test.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"GeneralTelegramBotSection,\s*", "", content)
content = re.sub(r"describe\('GeneralTelegramBotSection',.*?(?=describe\('GeneralLegalFiscalSection'|describe\('GeneralSettings Integration')|describe\('GeneralLegalFiscalSection'", "", content, flags=re.DOTALL)

with open('src/__tests__/unit/general-settings-decomposition.test.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
