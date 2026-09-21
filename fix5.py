import re
with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("order.service?.provider?.name", "order.providerName")

with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
