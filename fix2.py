import re

with open('src/app/admin/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const OrdersChart = nextDynamic\(\(\) => import\(\'./orders-chart\'\)\.then\(mod => mod\.OrdersChart\), \{.*?\}\);\n', '', content, flags=re.DOTALL)

with open('src/app/admin/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
