with open('src/app/admin/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { Suspense, accountingService } from '@/services/financial/accounting.service';", "import { accountingService } from '@/services/financial/accounting.service';\nimport { Suspense } from 'react';")

with open('src/app/admin/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
