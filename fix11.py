import re

with open('src/components/admin/OrderDetailsModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add isEditStatusOpen state
state_code = """  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);"""
content = re.sub(
    r"const \[isFailoverOpen, setIsFailoverOpen\] = useState\(false\);",
    "const [isFailoverOpen, setIsFailoverOpen] = useState(false);\n" + state_code,
    content
)

# Modify handleSetStatus to close the modal
content = re.sub(
    r"if \(onSuccess\) onSuccess\(\);\s*onClose\(\);",
    "if (onSuccess) onSuccess();\n          setIsEditStatusOpen(false);",
    content
)

# Render the Edit Status Modal
edit_modal = """
      {/* Edit Status Modal */}
      {isEditStatusOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card text-card-foreground p-6 rounded-2xl w-full max-w-sm border border-border/80 shadow-2xl"
          >
            <h3 className="text-lg font-bold mb-4">Ручное изменение статуса</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Новый статус</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium outline-none focus:border-primary"
                >
                  <option value="PENDING">PENDING (В очереди)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (В работе)</option>
                  <option value="COMPLETED">COMPLETED (Выполнен)</option>
                  <option value="PARTIAL">PARTIAL (Частично)</option>
                  <option value="CANCELED">CANCELED (Отменён)</option>
                  <option value="ERROR">ERROR (Ошибка)</option>
                </select>
              </div>
              
              {selectedStatus === 'PARTIAL' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Остаток (Remains)</label>
                  <input
                    type="number"
                    min="0"
                    value={remains}
                    onChange={(e) => setRemains(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Укажите, сколько единиц не было выполнено.</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditStatusOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                disabled={isPending}
              >
                Отмена
              </button>
              <button
                onClick={handleSetStatus}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Сохранить
              </button>
            </div>
          </motion.div>
        </div>
      )}
"""
content = content.replace("    document.body\n  );", edit_modal + "\n    document.body\n  );")

with open('src/components/admin/OrderDetailsModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Edit Status modal")
