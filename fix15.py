import re

with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ID у провайдера (externalId) under Provider
# Find Provider block
provider_block = """            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                ПОСТАВЩИК
              </span>
              <span className="text-sm text-foreground">{order.providerName || 'Системный'}</span>
            </div>"""

new_provider_block = """            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                ПОСТАВЩИК
              </span>
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{order.providerName || 'Системный'}</span>
                {order.externalId ? (
                  <span className="text-xs text-muted-foreground font-mono mt-0.5">ID: {order.externalId}</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground mt-0.5">ID не присвоен</span>
                )}
              </div>
            </div>"""

content = content.replace(provider_block, new_provider_block)

# 2. Make Client Email a link
client_block = """            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                КЛИЕНТ
              </span>
              <span className="text-sm text-foreground truncate">{order.user?.email || '-'}</span>
            </div>"""

new_client_block = """            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                КЛИЕНТ
              </span>
              {order.user?.email ? (
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
              )}
            </div>"""

content = content.replace(client_block, new_client_block)

# 3. Add Date Created
# We can put it next to Quantity, or under Charge
charge_block = """            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                СУММА ЗАКАЗА
              </span>
              <span className="text-sm font-bold text-foreground">{chargeRub.toFixed(2)} ₽</span>
            </div>"""

new_charge_block = charge_block + """
            <div className="flex flex-col gap-1 mt-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Дата создания
              </span>
              <span className="text-sm text-foreground">
                {new Date(order.createdAt).toLocaleString('ru-RU', { 
                  day: '2-digit', month: '2-digit', year: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}
              </span>
            </div>"""

content = content.replace(charge_block, new_charge_block)

with open('src/components/admin/order-details/OrderMinimalSummary.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated OrderMinimalSummary")
