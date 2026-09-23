import re

with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add externalId logic
content = re.sub(
    r"<span className=\"text-sm text-foreground\">\{order.providerName \|\| 'Системный'\}</span>",
    """<div className="flex flex-col">
                <span className="text-sm text-foreground">{order.providerName || 'Системный'}</span>
                {order.externalId ? (
                  <span className="text-xs text-muted-foreground font-mono mt-0.5">ID: {order.externalId}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground mt-0.5">ID не присвоен</span>
                )}
              </div>""",
    content
)

# Replace client email with a link
content = re.sub(
    r"<span className=\"text-sm text-foreground truncate\">\{order\.user\?\.email \|\| '-'}</span>",
    """{order.user?.email ? (
                <a 
                  href={`/admin/users?search=${encodeURIComponent(order.user.email)}`}
                  target="_blank"
                  className="text-sm text-primary hover:underline truncate"
                  title="Перейти в профиль пользователя"
                >
                  {order.user.email}
                </a>
              ) : (
                <span className="text-sm text-foreground truncate">-</span>
              )}""",
    content
)

# Add Date created under charge
charge_div_regex = r"(<span className=\"text-sm font-bold text-foreground\">\{chargeRub\.toFixed\(2\)\}\s*₽</span>\s*</div>)"

new_charge = r"""\1
            <div className="flex flex-col gap-1 mt-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="opacity-70">🕒</span>
                Дата создания
              </span>
              <span className="text-sm text-foreground">
                {new Date(order.createdAt).toLocaleString('ru-RU', { 
                  day: '2-digit', month: '2-digit', year: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}
              </span>
            </div>"""

content = re.sub(charge_div_regex, new_charge, content)

with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated OrderMinimalSummary via regex")
