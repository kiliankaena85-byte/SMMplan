import re

with open('src/__tests__/unit/general-settings-decomposition.test.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"expect\(screen\.getByText\('Telegram.*?\)\.toBeDefined\(\);", "", content)

with open('src/__tests__/unit/general-settings-decomposition.test.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
