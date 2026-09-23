import re

with open('src/components/admin/OrderDetailsModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to OrderDetailsHeader
old_header = """        <OrderDetailsHeader
          order={currentOrder}
          copiedId={copiedId}
          onCopyId={handleCopyId}
          onClose={onClose}
        />"""

new_header = """        <OrderDetailsHeader
          order={currentOrder}
          copiedId={copiedId}
          onCopyId={handleCopyId}
          onClose={onClose}
          onEditStatusClick={() => setIsEditStatusOpen(true)}
        />"""

content = content.replace(old_header, new_header)

with open('src/components/admin/OrderDetailsModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Passed onEditStatusClick")
