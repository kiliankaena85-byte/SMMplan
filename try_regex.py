import re

with open('src/app/admin/settings/components/general/GeneralLegalFiscalSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add tabMode to props interface
content = re.sub(
    r"siteName: string;\n  formState: GeneralFormState \| null;\n}",
    "siteName: string;\n  formState: GeneralFormState | null;\n  tabMode?: 'legal' | 'fiscal' | 'all';\n}",
    content
)

# Add tabMode to component arguments
content = re.sub(
    r"siteName,\n  formState,\n}: GeneralLegalFiscalSectionProps\) {",
    "siteName,\n  formState,\n  tabMode = 'all',\n}: GeneralLegalFiscalSectionProps) {",
    content
)

# Conditionally render blocks based on tabMode
# Legal section ends right before "{/* Fiscal 54-FZ & USN Settings */}"
content = content.replace(
    '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">',
    '{tabMode !== \'fiscal\' && (\n        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">'
)

content = content.replace(
    '{/* Fiscal 54-FZ & USN Settings */}',
    ')}\n\n        {tabMode !== \'legal\' && (\n          <div className="md:col-span-2 pt-4 border-t border-border/50">'
)
# Note: I'll need to be careful with closing tags. The easiest way is to rewrite the file completely.
