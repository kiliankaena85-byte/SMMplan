import re

with open('src/components/admin/order-details/OrderDetailsHeader.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { ExternalLink, Copy, Check, X } from 'lucide-react';", "import { ExternalLink, Copy, Check, X, Pencil } from 'lucide-react';")

content = content.replace("onClose: () => void;", "onClose: () => void;\n  onEditStatusClick?: () => void;")

content = content.replace("  onClose,\n}: OrderDetailsHeaderProps)", "  onClose,\n  onEditStatusClick,\n}: OrderDetailsHeaderProps)")

old_status = """            <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${statusInfo.cls} ${statusInfo.borderCls}`}>
              {statusInfo.label}
            </span>"""

new_status = """            <div className="flex items-center gap-1">
              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${statusInfo.cls} ${statusInfo.borderCls}`}>
                {statusInfo.label}
              </span>
              {onEditStatusClick && (
                <button
                  type="button"
                  onClick={onEditStatusClick}
                  className="p-1 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  title="Изменить статус вручную"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>"""

content = content.replace(old_status, new_status)

with open('src/components/admin/order-details/OrderDetailsHeader.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated OrderDetailsHeader")
