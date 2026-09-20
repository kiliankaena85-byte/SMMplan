'use client';

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, cleanupEmptyCategoriesAction } from "@/actions/admin/catalog/categories";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/confirm-modal";

import { CategoryItem, NetworkItem } from './sub/types';
import { CategoryEditModal } from './sub/CategoryEditModal';
import { NetworkEditModal } from './sub/NetworkEditModal';
import { CategoryMergeModal } from './sub/CategoryMergeModal';
import { CategoryTable } from './sub/CategoryTable';
import { CategoryToolbar } from './category-toolbar';
import { CategoryFilterBar } from './category-filter-bar';

export type { NetworkItem, CategoryItem };


export function CategoryManager({ 
  categories, 
  networks,
  currentTenant = 'smmplan'
}: { 
  categories: CategoryItem[]; 
  networks: NetworkItem[]; 
  currentTenant?: string;
}) {
  const router = useRouter();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState("ALL");
  const [emptyFilter, setEmptyFilter] = useState<'ALL' | 'WITH_SERVICES' | 'OTHER_TENANTS' | 'EMPTY'>('ALL');

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);

  // Edit category target & initial network
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [initialNetworkId, setInitialNetworkId] = useState<string | undefined>(undefined);

  // Delete Category State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [isCleanupPending, startCleanupTransition] = useTransition();

  const currentTenantLabel = useMemo(() => {
    if (currentTenant === 'flux') return 'SMMflux';
    if (currentTenant === 'smmplan') return 'SMMplan';
    if (currentTenant === 'all') return 'Все проекты';
    return currentTenant;
  }, [currentTenant]);

  // Truly empty categories (0 services globally across all tenants/archive)
  const trulyEmptyCategoriesCount = useMemo(() => {
    return categories.filter(c => (c.globalServicesCount ?? c._count?.services ?? 0) === 0).length;
  }, [categories]);

  const selectedNetworkTrulyEmptyCount = useMemo(() => {
    if (selectedNetworkFilter === 'ALL') return trulyEmptyCategoriesCount;
    return categories.filter(c => 
      c.networkId === selectedNetworkFilter && 
      (c.globalServicesCount ?? c._count?.services ?? 0) === 0
    ).length;
  }, [categories, selectedNetworkFilter, trulyEmptyCategoriesCount]);

  const activeTrulyEmptyCount = useMemo(() => {
    return selectedNetworkFilter === 'ALL' ? trulyEmptyCategoriesCount : selectedNetworkTrulyEmptyCount;
  }, [selectedNetworkFilter, trulyEmptyCategoriesCount, selectedNetworkTrulyEmptyCount]);

  const otherTenantsCategoriesCount = useMemo(() => {
    return categories.filter(c => 
      (c.tenantServicesCount ?? c._count?.services ?? 0) === 0 && 
      (c.globalServicesCount ?? 0) > 0
    ).length;
  }, [categories]);

  const withServicesCount = useMemo(() => {
    return categories.filter(c => (c.tenantServicesCount ?? c._count?.services ?? 0) > 0).length;
  }, [categories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchNetwork = selectedNetworkFilter === "ALL" || c.networkId === selectedNetworkFilter;
      const tenantCount = c.tenantServicesCount ?? c._count?.services ?? 0;
      const globalCount = c.globalServicesCount ?? c._count?.services ?? 0;

      let matchEmpty = true;
      if (emptyFilter === 'WITH_SERVICES') {
        matchEmpty = tenantCount > 0;
      } else if (emptyFilter === 'OTHER_TENANTS') {
        matchEmpty = tenantCount === 0 && globalCount > 0;
      } else if (emptyFilter === 'EMPTY') {
        matchEmpty = globalCount === 0;
      }

      const matchQuery = !searchQuery.trim() || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.network?.name && c.network.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchNetwork && matchEmpty && matchQuery;
    });
  }, [categories, selectedNetworkFilter, emptyFilter, searchQuery]);

  const openNewCategoryModal = (networkId?: string) => {
    setEditingCategory(null);
    setInitialNetworkId(networkId || (selectedNetworkFilter !== "ALL" ? selectedNetworkFilter : undefined));
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setInitialNetworkId(undefined);
    setCategoryModalOpen(true);
  };

  const confirmDeleteCategory = (cat: CategoryItem) => {
    setCategoryToDelete(cat);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setCatLoading(true);
      const res = await deleteCategory(categoryToDelete.id);
      if (!res.success) throw new Error(res.error);
      toast.success("Категория успешно удалена");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка удаления";
      toast.error(msg);
    } finally {
      setCatLoading(false);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  const executeCleanupEmpty = () => {
    startCleanupTransition(async () => {
      const targetNet = selectedNetworkFilter !== "ALL" ? selectedNetworkFilter : null;
      const res = await cleanupEmptyCategoriesAction(targetNet);
      if (res.success) {
        toast.success(res.message);
        setCleanupConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Ошибка при очистке пустых категорий");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ─── Stats & Actions Toolbar ─── */}
      <CategoryToolbar
        networks={networks}
        categories={categories}
        currentTenant={currentTenant}
        currentTenantLabel={currentTenantLabel}
        trulyEmptyCategoriesCount={trulyEmptyCategoriesCount}
        otherTenantsCategoriesCount={otherTenantsCategoriesCount}
        selectedNetworkFilter={selectedNetworkFilter}
        activeTrulyEmptyCount={activeTrulyEmptyCount}
        onCleanupEmpty={() => setCleanupConfirmOpen(true)}
        onMerge={() => setMergeModalOpen(true)}
        onManageNetworks={() => setNetworkModalOpen(true)}
        onAddCategory={() => openNewCategoryModal()}
      />

      {/* ─── Filter & Search Bar ─── */}
      <CategoryFilterBar
        networks={networks}
        searchQuery={searchQuery}
        selectedNetworkFilter={selectedNetworkFilter}
        emptyFilter={emptyFilter}
        totalCount={categories.length}
        withServicesCount={withServicesCount}
        otherTenantsCategoriesCount={otherTenantsCategoriesCount}
        trulyEmptyCategoriesCount={trulyEmptyCategoriesCount}
        currentTenantLabel={currentTenantLabel}
        currentTenant={currentTenant}
        onSearchChange={(v) => setSearchQuery(v)}
        onNetworkChange={(v) => setSelectedNetworkFilter(v)}
        onEmptyFilterChange={(v) => setEmptyFilter(v)}
        onReset={() => { setSearchQuery(""); setSelectedNetworkFilter("ALL"); setEmptyFilter("ALL"); }}
      />


      {/* ─── Full-Width Grouped Tables by Social Network ─── */}
      <CategoryTable
        networks={networks}
        filteredCategories={filteredCategories}
        selectedNetworkFilter={selectedNetworkFilter}
        searchQuery={searchQuery}
        currentTenantLabel={currentTenantLabel}
        onAddCategory={openNewCategoryModal}
        onEditCategory={openEditCategoryModal}
        onDeleteCategory={confirmDeleteCategory}
      />

      {/* ─── Modals ─── */}
      <CategoryEditModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        editingCategory={editingCategory}
        initialNetworkId={initialNetworkId}
        networks={networks}
        categories={categories}
      />

      <NetworkEditModal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
        networks={networks}
      />

      <CategoryMergeModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        categories={categories}
      />

      {/* Delete Category Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={executeDeleteCategory}
        title="Удаление категории"
        isDanger={true}
        confirmText="Удалить"
        cancelText="Отмена"
      >
        {categoryToDelete && (categoryToDelete.globalServicesCount ?? categoryToDelete._count?.services ?? 0) > 0 ? (
          <div className="space-y-2 text-xs">
            <p className="text-foreground">
              Категория «<strong>{categoryToDelete.name}</strong>» содержит{" "}
              <strong className="text-destructive">
                {categoryToDelete.globalServicesCount ?? categoryToDelete._count?.services}
              </strong>{" "}
              услуг ({categoryToDelete.otherTenantsLabel || "активных, скрытых или в других проектах"}).
            </p>
            <p className="text-muted-foreground">
              Прямое удаление невозможно. Чтобы удалить эту категорию, сначала объедините её с другой категорией или удалите все её услуги.
            </p>
          </div>
        ) : (
          <span>
            Вы действительно хотите удалить категорию «{categoryToDelete?.name}»? Это действие необратимо.
          </span>
        )}
      </ConfirmModal>

      {/* Bulk Cleanup Empty Categories Confirm Modal */}
      <ConfirmModal
        isOpen={cleanupConfirmOpen}
        onClose={() => setCleanupConfirmOpen(false)}
        onConfirm={executeCleanupEmpty}
        title="Очистка пустых категорий"
        isDanger={true}
        confirmText={isCleanupPending ? "Удаление..." : "Удалить пустые"}
        cancelText="Отмена"
      >
        {selectedNetworkFilter !== 'ALL' ? (
          <span>
            Вы действительно хотите удалить <strong>{activeTrulyEmptyCount}</strong> пустых категорий без услуг в выбранной соцсети? Это действие необратимо.
          </span>
        ) : (
          <span>
            Вы действительно хотите удалить все <strong>{activeTrulyEmptyCount}</strong> пустых категорий без услуг по всему каталогу? Это действие необратимо.
          </span>
        )}
      </ConfirmModal>
    </div>
  );
}
