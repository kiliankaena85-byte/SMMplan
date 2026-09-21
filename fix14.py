import re

with open('src/components/admin/OrderDetailsModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will just write a python script to wrap the first argument of createPortal in <> </>
# The string to search is `return createPortal(\n    <div`
content = content.replace("return createPortal(\n    <div", "return createPortal(\n    <>\n    <div")

# The end string is `</div>,\n\n      {/* Edit Status Modal */}`
# Wait, it actually ends with:
#       )}
# 
#     document.body
#   );
content = content.replace("      )}\n\n    document.body\n  );", "      )}\n    </>,\n    document.body\n  );")

# Also I need to remove that dangling comma `</div>,` before the modal
content = content.replace("      </ConfirmModal>\n    </div>,\n\n      {/* Edit Status Modal */}", "      </ConfirmModal>\n    </div>\n\n      {/* Edit Status Modal */}")

with open('src/components/admin/OrderDetailsModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed JSX syntax")
