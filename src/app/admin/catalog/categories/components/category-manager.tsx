"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory } from "@/actions/admin/catalog/categories";
import { Table } from '@/components/admin/hero-ui';

export function CategoryManager({ categories, networks }: { categories: any[], networks: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [networkId, setNetworkId] = useState(networks[0]?.id || "");
  const [sort, setSort] = useState("0");

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setNetworkId(networks[0]?.id || "");
    setSort("0");
    setError(null);
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setNetworkId(cat.networkId);
    setSort(String(cat.sort));
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !networkId) return setError("Заполните все поля");
    
    try {
      setLoading(true);
      setError(null);
      const payload = { name, networkId, sort: parseInt(sort, 10) || 0 };
      
      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      
      resetForm();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
     if (!confirm("Удалить эту категорию?")) return;
     try {
       setLoading(true);
       const res = await deleteCategory(id);
       if (!res.success) throw new Error(res.error);
       router.refresh();
     } catch(err: any) {
       setError(err.message);
     } finally {
       setLoading(false);
     }
  };

  return (
    <div className="space-y-6">
       {/* Editor Form */}
       <div className="bg-background p-4 shadow sm:rounded-lg border border-border">
          <h2 className="text-lg font-medium mb-3">{editingId ? "Редактировать категорию" : "Добавить категорию"}</h2>
          {error && <div className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">{error}</div>}
          <form onSubmit={handleSave} className="flex flex-wrap gap-4 items-end">
             <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-foreground">Название (с префиксом платформы)</label>
                <input 
                   type="text" 
                   value={name} onChange={e => setName(e.target.value)}
                   className="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm border p-2"
                   placeholder="Например: INSTAGRAM | Лайки"
                />
             </div>
             <div className="w-48">
                <label className="block text-xs font-medium text-foreground">Сеть (Network)</label>
                <select 
                   value={networkId} onChange={e => setNetworkId(e.target.value)}
                   className="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm border p-2"
                >
                   {networks.map(n => (
                     <option key={n.id} value={n.id}>{n.name.toUpperCase()}</option>
                   ))}
                </select>
             </div>
             <div className="w-24">
                <label className="block text-xs font-medium text-foreground">Сорт.</label>
                <input 
                   type="number" 
                   value={sort} onChange={e => setSort(e.target.value)}
                   className="mt-1 block w-full rounded-md border-border shadow-sm sm:text-sm border p-2"
                />
             </div>
             <div className="flex gap-2">
                 <button 
                    type="submit" 
                    disabled={loading}
                    className="inline-flex justify-center bg-primary text-white rounded py-2 px-4 shadow-sm text-sm font-medium hover:bg-indigo-700"
                 >
                    {editingId ? "Сохранить" : "Добавить"}
                 </button>
                 {editingId && (
                     <button type="button" onClick={resetForm} className="text-muted-foreground text-sm hover:underline ml-2">
                        Отмена
                     </button>
                 )}
             </div>
          </form>
       </div>

       {/* List display */}
       <div className="bg-card shadow-sm ring-1 ring-border rounded-xl overflow-hidden w-full">
        <Table aria-label="Менеджер категорий">
          <Table.ScrollContainer>
            <Table.Content>
              <Table.Header>
                <Table.Column isRowHeader>НАЗВАНИЕ</Table.Column>
                <Table.Column>ПЛАТФОРМА</Table.Column>
                <Table.Column>СОРТИРОВКА</Table.Column>
                <Table.Column>УСЛУГ</Table.Column>
                <Table.Column className="text-right">ДЕЙСТВИЯ</Table.Column>
              </Table.Header>
              <Table.Body>
                {categories.map((c) => (
                  <Table.Row key={c.id}>
                    <Table.Cell>
                      <span className="font-medium text-foreground text-sm">{c.name}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-muted-foreground text-sm font-mono">{c.network?.slug?.toUpperCase() || '-'}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-muted-foreground text-sm">{c.sort}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-muted-foreground text-sm">{c._count.services}</span>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex justify-end gap-3 font-medium text-sm">
                        <button onClick={() => handleEdit(c)} className="text-primary hover:underline">Изменить</button>
                        <button onClick={() => handleDelete(c.id)} className="text-destructive hover:underline">Удалить</button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </div>
  );
}

