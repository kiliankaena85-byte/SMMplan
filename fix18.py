import re

with open('src/app/admin/settings/general-settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the GeneralTelegramBotSection tag completely
# It might span multiple lines
content = re.sub(
    r"\{\/\* 3\. Telegram Support Bot Configuration & Live Diagnostics \*\/\}\s*<GeneralTelegramBotSection[\s\S]*?\/\>",
    "",
    content
)

with open('src/app/admin/settings/general-settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed GeneralTelegramBotSection from GeneralSettings")
