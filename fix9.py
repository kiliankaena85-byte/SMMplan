import re

with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the economics block entirely
content = re.sub(
    r"\{canSeeRates && \(\s*<div className=\"flex flex-col gap-1\">\s*<span className=\"text-\[11px\] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1\.5\">\s*<Percent className=\"w-3\.5 h-3\.5\" />\s*Экономика\s*</span>.*?</div>\s*\)\}",
    "",
    content,
    flags=re.DOTALL
)

with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed economics block")
