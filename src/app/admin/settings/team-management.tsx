'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  updateSupportLimit, 
  createStaffRoleAction, 
  updateStaffRolePermissionsAction, 
  deleteStaffRoleAction 
} from '@/actions/admin/team';
import { updateUserRole, updateStaffGeminiApiKeyAction } from '@/actions/admin/settings';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ShieldAlert, UserPlus, Loader2, Trash2, Plus, Check, Lock, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { StaffRole, StaffPermission } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface StaffUser {
  id: string;
  email: string;
  role: string;
  balance: bigint;
  supportLimitCents: number;
  geminiApiKey: string | null;
  createdAt: Date;
  staffRoleId: string | null;
  staffRole?: { id: string; name: string } | null;
  _count: { orders: number; tickets: number };
}

export interface RegularUser {
  id: string;
  email: string;
  role: string;
  balance: bigint;
  supportLimitCents: number;
  createdAt: Date;
  staffRoleId?: string | null;
  _count: { orders: number; tickets: number };
}

function SubmitButton({ label, className }: { label: string, className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" size="default" intent="outline" className={`h-11 font-bold uppercase tracking-widest text-[10px] min-w-[100px] flex items-center justify-center transition-all duration-200 cursor-pointer ${className || ''}`}>
      {pending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {label}
    </Button>
  );
}

function SearchButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="font-bold uppercase tracking-widest text-xs h-11 px-8 shadow-md transition-all duration-200 cursor-pointer">
      {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      Найти
    </Button>
  );
}

const getAllowedRoles = (adminRole?: string) => {
  const base = ['USER', 'SUPPORT', 'MANAGER', 'BANNED'];
  if (adminRole === 'OWNER') {
    return [...base, 'ADMIN', 'OWNER'];
  }
  return base;
};

interface TeamManagementProps {
  staffUsers: StaffUser[];
  regularUsers: RegularUser[];
  searchQuery: string;
  currentAdminRole?: string;
  staffRoles?: (StaffRole & { permissions: StaffPermission[] })[];
}

export function TeamManagement({ 
  staffUsers, 
  regularUsers, 
  searchQuery, 
  currentAdminRole, 
  staffRoles = [] 
}: TeamManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Ruble support limit client-side state
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const initialLimits: Record<string, string> = {};
    staffUsers.forEach(u => {
      initialLimits[u.id] = String((u.supportLimitCents || 0) / 100);
    });
    return initialLimits;
  });

  // Gemini API Keys client-side state
  const [staffGeminiKeys, setStaffGeminiKeys] = useState<Record<string, string>>({});
  const [savingKeyForUserId, setSavingKeyForUserId] = useState<string | null>(null);

  // Search, Role Filter & Pagination state
  const [searchEmail, setSearchEmail] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredStaffUsers = staffUsers.filter((u) => {
    const matchesEmail = u.email.toLowerCase().includes(searchEmail.toLowerCase().trim());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole || u.staffRoleId === filterRole;
    return matchesEmail && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStaffUsers.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStaff = filteredStaffUsers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const isOwner = currentAdminRole === 'OWNER';

  async function handleSaveStaffGeminiKey(userId: string) {
    const keyVal = staffGeminiKeys[userId];
    setSavingKeyForUserId(userId);
    try {
      const res = await updateStaffGeminiApiKeyAction(userId, keyVal || null);
      if (res.success) {
        toast.success(keyVal ? 'Персональный ключ Gemini сохранен' : 'Персональный ключ удален (будет использоваться общий пул)');
      } else {
        toast.error(res.error || 'Ошибка при сохранении ключа');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при сохранении ключа');
    } finally {
      setSavingKeyForUserId(null);
    }
  }

  async function handleUpdateLimit(formData: FormData) {
    try {
      const res = await updateSupportLimit(formData);
      if (res.success) {
        toast.success('Лимит доверия обновлен');
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('Ошибка при обновлении лимита');
    }
  }

  async function handleUpdateRole(formData: FormData) {
    try {
      await updateUserRole(formData);
      toast.success('Роль пользователя обновлена');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при обновлении роли');
    }
  }

  // Auto-submit permission toggling
  const handleTogglePermission = (roleId: string, section: string, currentVal: boolean, type: 'view' | 'edit') => {
    startTransition(async () => {
      const existing = staffRoles.find(r => r.id === roleId);
      const perm = existing?.permissions?.find((p) => p.section === section);
      
      const nextView = type === 'view' ? !currentVal : (perm?.canView || false);
      const nextEdit = type === 'edit' ? !currentVal : (perm?.canEdit || false);

      // Secure guard: Edit permission requires View permission
      const finalView = nextEdit ? true : nextView;

      const formData = new FormData();
      formData.append('roleId', roleId);
      formData.append('section', section);
      formData.append('canView', finalView ? 'true' : 'false');
      formData.append('canEdit', nextEdit ? 'true' : 'false');

      const res = await updateStaffRolePermissionsAction(formData);
      if (res.success) {
        toast.success(`Права роли для раздела ${section.toUpperCase()} обновлены`);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', newRoleName.trim());
      formData.append('description', newRoleDesc.trim());

      const res = await createStaffRoleAction(formData);
      if (res.success) {
        toast.success('Кастомная роль успешно создана');
        setNewRoleName('');
        setNewRoleDesc('');
        setShowCreateForm(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteRole = () => {
    if (!roleToDelete) return;
    const { id } = roleToDelete;
    setRoleToDelete(null);
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('roleId', id);

      const res = await deleteStaffRoleAction(formData);
      if (res.success) {
        toast.success('Роль успешно удалена');
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    setRoleToDelete({ id: roleId, name: roleName });
  };

  return (
    <div className="space-y-8">
      {/* Role Deletion Confirmation Dialog */}
      <Dialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-500 pb-2">
              <AlertTriangle className="w-6 h-6" />
              <DialogTitle className="text-lg font-bold">Удаление роли</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Вы уверены, что хотите удалить роль <strong className="text-foreground">«{roleToDelete?.name}»</strong>?
              <br /><br />
              ⚠️ Все сотрудники с этой ролью потеряют доступ к административным разделам, пока им не будет назначена новая роль.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRoleToDelete(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDeleteRole}
              className="font-bold gap-1.5"
            >
              Удалить роль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SECTION 1: Staff List & Escrow Guard ── */}
      <Card className="rounded-2xl border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/15 text-destructive rounded-xl border border-destructive/20 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Команда и Escrow Guard</h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Системные роли, лимиты компенсаций и наборы прав.</p>
              </div>
            </div>

            {/* Quick Badge */}
            <div className="flex items-center gap-2">
              <Badge intent="outline" className="text-xs font-mono font-bold px-3 py-1">
                Всего сотрудников: {filteredStaffUsers.length}
              </Badge>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/60">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Поиск по email сотрудника..."
                value={searchEmail}
                onChange={(e) => {
                  setSearchEmail(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-10 text-xs bg-background"
              />
            </div>
            
            <div className="w-full sm:w-48">
              <select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 bg-background border border-border rounded-xl px-3 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">Все роли и группы</option>
                <option value="OWNER">Владелец (OWNER)</option>
                <option value="ADMIN">Администратор (ADMIN)</option>
                <option value="MANAGER">Менеджер (MANAGER)</option>
                <option value="SUPPORT">Поддержка (SUPPORT)</option>
                {staffRoles.map(r => (
                  <option key={r.id} value={r.id}>Группа: {r.name}</option>
                ))}
              </select>
            </div>

            {(searchEmail || filterRole !== 'ALL') && (
              <Button
                type="button"
                intent="ghost"
                size="sm"
                onClick={() => {
                  setSearchEmail('');
                  setFilterRole('ALL');
                  setCurrentPage(1);
                }}
                className="text-xs font-bold text-muted-foreground hover:text-foreground h-10 px-3 cursor-pointer shrink-0"
              >
                Сбросить
              </Button>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden w-full">
            <Table aria-label="Список активных членов команды саппорта" className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3 text-xs font-bold w-[22%]">EMAIL</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-bold w-[38%]">НАЗНАЧЕНИЕ РОЛИ И ПРАВ</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-bold w-[22%]">GEMINI AI КЛЮЧ</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-bold text-right w-[18%]">ДНЕВНОЙ ЛИМИТ (₽)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-xs text-muted-foreground">
                      Сотрудники не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStaff.map((u) => {
                    const supportLimitRub = limits[u.id] ? Math.round(parseFloat(limits[u.id]) * 100) : 0;
                    const hasKey = Boolean(u.geminiApiKey);
                    const isSaving = savingKeyForUserId === u.id;
                    return (
                      <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-foreground bg-muted/40 px-2 py-1 rounded-lg border border-border/30 truncate max-w-[170px] inline-block" title={u.email}>{u.email}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <form action={handleUpdateRole} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={u.id} />
                            
                            {/* System Role Selection */}
                            <div className="flex flex-col gap-0.5">
                              <Select name="role" defaultValue={u.role}>
                                <SelectTrigger className="w-28 h-9 bg-background text-[11px] font-bold rounded-lg" size="default">
                                  <SelectValue>
                                    {(value: string) => value || 'Выбрать'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {getAllowedRoles(currentAdminRole).map((r) => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Custom Staff Role Selection */}
                            <div className="flex flex-col gap-0.5">
                              <Select name="staffRoleId" defaultValue={u.staffRoleId || 'NONE'}>
                                <SelectTrigger className="w-36 h-9 bg-background text-[11px] font-bold rounded-lg" size="default">
                                  <SelectValue>
                                    {(value: string) => {
                                      if (!value || value === 'NONE') return 'Все права (OWNER)';
                                      return staffRoles.find(r => r.id === value)?.name ?? value;
                                    }}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">Все права (OWNER)</SelectItem>
                                  {staffRoles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <SubmitButton label="Сменить" className="h-9 px-2.5 min-w-[70px]" />
                          </form>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            <div className="flex items-center justify-between">
                              {hasKey ? (
                                <Badge intent="outline" className="text-[9px] py-0 px-1 border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                                  🟢 Свой ключ
                                </Badge>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">⚪️ Общий пул</span>
                              )}
                            </div>
                            <div className="flex gap-1 items-center">
                              <Input
                                type="password"
                                placeholder={hasKey ? '••••••••••••••••' : 'Личный AI ключ'}
                                value={staffGeminiKeys[u.id] ?? ''}
                                onChange={(e) => setStaffGeminiKeys(prev => ({ ...prev, [u.id]: e.target.value }))}
                                className="h-8 font-mono text-[11px] rounded-lg"
                              />
                              <Button
                                size="sm"
                                intent="outline"
                                disabled={isSaving}
                                onClick={() => handleSaveStaffGeminiKey(u.id)}
                                className="h-8 px-2 font-bold text-[10px] uppercase tracking-wider shrink-0"
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <form action={handleUpdateLimit} className="flex gap-1.5 items-center justify-end">
                            <input type="hidden" name="userId" value={u.id} />
                            <Input 
                              type="number" 
                              step="0.01"
                              value={limits[u.id] ?? ''} 
                              onChange={e => setLimits(prev => ({ ...prev, [u.id]: e.target.value }))}
                              className="w-20 h-9 text-right font-mono font-bold text-xs rounded-lg"
                            />
                            <input 
                              type="hidden" 
                              name="limit" 
                              value={supportLimitRub} 
                            />
                            <SubmitButton label="Сохранить" className="h-9 px-2 min-w-[70px]" />
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
                <p className="text-xs text-muted-foreground font-medium">
                  Показано {(safePage - 1) * itemsPerPage + 1} - {Math.min(safePage * itemsPerPage, filteredStaffUsers.length)} из {filteredStaffUsers.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    intent="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs font-bold"
                  >
                    ← Назад
                  </Button>
                  <span className="px-2 text-xs font-mono font-bold text-foreground">
                    {safePage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    intent="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs font-bold"
                  >
                    Вперед →
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card Feed View */}
          <div className="block md:hidden divide-y divide-border/30 bg-card/30 rounded-xl border border-border overflow-hidden">
            {paginatedStaff.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground italic">Сотрудники не найдены</p>
            ) : (
              paginatedStaff.map((u) => {
                const supportLimitRub = limits[u.id] ? Math.round(parseFloat(limits[u.id]) * 100) : 0;
                const hasKey = Boolean(u.geminiApiKey);
                const isSaving = savingKeyForUserId === u.id;
                return (
                  <div key={u.id} className="p-4 space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/30 truncate max-w-[280px]" title={u.email}>
                        {u.email}
                      </span>
                    </div>

                    <form action={handleUpdateRole} className="space-y-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                      <input type="hidden" name="userId" value={u.id} />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Роль</span>
                          <Select name="role" defaultValue={u.role}>
                            <SelectTrigger className="w-full h-10 bg-background text-xs font-bold rounded-xl" size="default">
                              <SelectValue>
                                {(value: string) => value || 'Выбрать'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {getAllowedRoles(currentAdminRole).map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Группа прав</span>
                          <Select name="staffRoleId" defaultValue={u.staffRoleId || 'NONE'}>
                            <SelectTrigger className="w-full h-10 bg-background text-xs font-bold rounded-xl" size="default">
                              <SelectValue>
                                {(value: string) => {
                                  if (!value || value === 'NONE') return 'Все права (OWNER)';
                                  return staffRoles.find(r => r.id === value)?.name ?? value;
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">Все права (OWNER)</SelectItem>
                              {staffRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <SubmitButton label="Сменить роль" className="w-full h-10 text-xs" />
                    </form>

                    {/* Mobile Gemini API Key */}
                    <div className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Личный Gemini API-ключ</span>
                        {hasKey ? (
                          <Badge intent="outline" className="text-[9px] py-0 px-1.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                            🟢 Свой ключ
                          </Badge>
                        ) : (
                          <span className="text-[9px] text-muted-foreground">⚪️ Общий пул</span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="password"
                          placeholder={hasKey ? '••••••••••••••••' : 'AIzaSy...'}
                          value={staffGeminiKeys[u.id] ?? ''}
                          onChange={(e) => setStaffGeminiKeys(prev => ({ ...prev, [u.id]: e.target.value }))}
                          className="h-10 font-mono text-xs rounded-xl flex-1"
                        />
                        <Button
                          size="sm"
                          intent="outline"
                          disabled={isSaving}
                          onClick={() => handleSaveStaffGeminiKey(u.id)}
                          className="h-10 px-3 font-bold text-xs uppercase tracking-wider shrink-0"
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Сохранить'}
                        </Button>
                      </div>
                    </div>

                    <form action={handleUpdateLimit} className="flex gap-3 items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/20">
                      <input type="hidden" name="userId" value={u.id} />
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Дневной лимит (₽)</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={limits[u.id] ?? ''} 
                          onChange={e => setLimits(prev => ({ ...prev, [u.id]: e.target.value }))}
                          className="w-full h-10 text-left font-mono font-bold text-xs rounded-xl"
                        />
                        <input 
                          type="hidden" 
                          name="limit" 
                          value={supportLimitRub} 
                        />
                      </div>
                      <div className="pt-4">
                        <SubmitButton label="Сохранить" className="h-10 text-xs" />
                      </div>
                    </form>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Pagination controls */}
          {totalPages > 1 && (
            <div className="flex md:hidden items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
              <p className="text-xs text-muted-foreground font-medium">
                {safePage} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  intent="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs font-bold"
                >
                  ← Назад
                </Button>
                <Button
                  type="button"
                  intent="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 text-xs font-bold"
                >
                  Вперед →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 2: Custom Roles & Granular Permissions Grid (Owner-only) ── */}
      {isOwner && (
        <Card className="rounded-2xl border-border shadow-sm bg-card overflow-hidden">
          <CardContent className="p-4 sm:p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/15 text-primary rounded-xl border border-primary/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Роли и Права Доступа</h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Тонкая настройка чтения и записи разделов боковой панели.</p>
                </div>
              </div>

              <Button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                intent="outline" 
                size="sm" 
                className="h-10 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Создать роль
              </Button>
            </div>

            {/* Create Role Inline Section */}
            {showCreateForm && (
              <form onSubmit={handleCreateRole} className="p-5 rounded-xl border border-border/80 bg-muted/30/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Новая роль поддержки</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground/80 font-bold uppercase">Название</span>
                    <Input 
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="Например: Младший саппорт"
                      className="h-11 rounded-xl text-xs font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground/80 font-bold uppercase">Описание</span>
                    <Input 
                      value={newRoleDesc}
                      onChange={e => setNewRoleDesc(e.target.value)}
                      placeholder="Например: Доступ только к тикетам клиентов"
                      className="h-11 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button 
                    type="button" 
                    intent="ghost" 
                    onClick={() => setShowCreateForm(false)} 
                    className="h-10 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    className="h-10 px-6 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                    Сохранить
                  </Button>
                </div>
              </form>
            )}

            {/* Permissions Matrix Layout */}
            <div className="space-y-4">
              {staffRoles.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  Нет созданных кастомных ролей. Нажмите кнопку "Создать роль", чтобы начать.
                </div>
              ) : (
                staffRoles.map((role) => (
                  <div key={role.id} className="p-6 rounded-xl border border-border/80 space-y-4 bg-muted/10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{role.name}</h4>
                          {role.isSystem && (
                            <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border border-primary/20 rounded-md">Системная</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 font-medium">{role.description || 'Описание отсутствует'}</p>
                      </div>

                      {!role.isSystem && (
                        <button 
                          onClick={() => handleDeleteRole(role.id, role.name)}
                          disabled={isPending}
                          aria-label={`Удалить роль ${role.name}`}
                          className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Permissions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                      {['orders', 'finance', 'catalog', 'settings'].map((sec) => {
                        const perm = role.permissions?.find((p) => p.section === sec) || { canView: false, canEdit: false };
                        return (
                          <div key={sec} className="p-3 rounded-lg border border-border/50 bg-background flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80 border-b border-border/30 pb-1.5">
                              📁 {sec === 'orders' ? 'Заказы' : sec === 'finance' ? 'Финансы' : sec === 'catalog' ? 'Каталог' : 'Настройки'}
                            </span>
                            
                            <div className="flex justify-between items-center text-xs mt-1">
                              <span className="text-muted-foreground font-medium">Просмотр</span>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleTogglePermission(role.id, sec, perm.canView, 'view')}
                                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border ${
                                  perm.canView ? 'bg-primary border-primary/80' : 'bg-muted/80 border-border'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full bg-background shadow-sm transition-transform duration-200 ${
                                  perm.canView ? 'translate-x-5' : 'translate-x-0'
                                } flex items-center justify-center`}>
                                  {perm.canView && <Check className="w-2.5 h-2.5 text-primary" />}
                                </div>
                              </button>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-medium">Редактирование</span>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleTogglePermission(role.id, sec, perm.canEdit, 'edit')}
                                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer border ${
                                  perm.canEdit ? 'bg-primary border-primary/80' : 'bg-muted/80 border-border'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full bg-background shadow-sm transition-transform duration-200 ${
                                  perm.canEdit ? 'translate-x-5' : 'translate-x-0'
                                } flex items-center justify-center`}>
                                  {perm.canEdit && <Check className="w-2.5 h-2.5 text-primary" />}
                                </div>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 3: Role Promotion (Clients to Staff) ── */}
      <Card className="rounded-2xl border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/15 text-primary rounded-xl border border-primary/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Назначение ролей</h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Поиск и перевод клиентов в категорию персонала.</p>
            </div>
          </div>

          <form className="flex gap-3 mb-2" action="/admin/settings" method="GET">
            <input type="hidden" name="tab" value="team" />
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="text" 
                name="q" 
                placeholder="Введите email для поиска..." 
                defaultValue={searchQuery} 
                className="pl-10 h-11 rounded-xl text-xs font-semibold"
              />
            </div>
            <SearchButton />
          </form>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden w-full overflow-x-auto scrollbar-hide">
            <Table aria-label="Список клиентов для изменения ролей">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4">КЛИЕНТ</TableHead>
                  <TableHead className="px-6 py-4 text-right">СМЕНИТЬ РОЛЬ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-28 text-center text-xs text-muted-foreground">
                      {searchQuery ? "Пользователь не найден" : "Начните поиск по email для смены роли"}
                    </TableCell>
                  </TableRow>
                ) : (
                  regularUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="px-6 py-5">
                        <span className="text-xs font-mono font-bold text-foreground bg-muted/40 px-2 py-1.5 rounded-lg border border-border/30 truncate max-w-[300px] inline-block" title={u.email}>{u.email}</span>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <form action={handleUpdateRole} className="flex flex-col sm:flex-row gap-4 items-center justify-end">
                          <input type="hidden" name="userId" value={u.id} />
                          
                          {/* System Role */}
                          <div className="flex flex-col gap-1 w-full sm:w-auto text-left">
                            <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Роль</span>
                            <Select name="role" defaultValue={u.role}>
                              <SelectTrigger className="w-full sm:w-32 h-11 bg-background text-xs font-bold rounded-xl" size="default">
                                <SelectValue>
                                  {(value: string) => value || 'Выбрать'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {getAllowedRoles(currentAdminRole).map((r) => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Custom Staff Role */}
                          <div className="flex flex-col gap-1 w-full sm:w-auto text-left">
                            <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Группа прав</span>
                            <Select name="staffRoleId" defaultValue={u.staffRoleId || 'NONE'}>
                              <SelectTrigger className="w-full sm:w-48 h-11 bg-background text-xs font-bold rounded-xl" size="default">
                                <SelectValue>
                                  {(value: string) => {
                                    if (!value || value === 'NONE') return 'Все права (OWNER)';
                                    return staffRoles.find(r => r.id === value)?.name ?? value;
                                  }}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">Все права (OWNER)</SelectItem>
                                {staffRoles.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="pt-5 w-full sm:w-auto">
                            <SubmitButton label="Назначить" className="w-full sm:w-auto" />
                          </div>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Feed View */}
          <div className="block md:hidden divide-y divide-border/30 bg-card/30 rounded-xl border border-border overflow-hidden">
            {regularUsers.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground italic">
                {searchQuery ? "Пользователь не найден" : "Начните поиск по email для смены роли"}
              </p>
            ) : (
              regularUsers.map((u) => (
                <div key={u.id} className="p-4 space-y-3">
                  <span className="text-xs font-mono font-bold text-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/30 truncate max-w-[280px] block" title={u.email}>
                    {u.email}
                  </span>
                  <form action={handleUpdateRole} className="space-y-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                    <input type="hidden" name="userId" value={u.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Роль</span>
                        <Select name="role" defaultValue={u.role}>
                          <SelectTrigger className="w-full h-10 bg-background text-xs font-bold rounded-xl" size="default">
                            <SelectValue>
                              {(value: string) => value || 'Выбрать'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {getAllowedRoles(currentAdminRole).map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">Группа прав</span>
                        <Select name="staffRoleId" defaultValue={u.staffRoleId || 'NONE'}>
                          <SelectTrigger className="w-full h-10 bg-background text-xs font-bold rounded-xl" size="default">
                            <SelectValue>
                              {(value: string) => {
                                if (!value || value === 'NONE') return 'Все права (OWNER)';
                                return staffRoles.find(r => r.id === value)?.name ?? value;
                              }}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Все права (OWNER)</SelectItem>
                            {staffRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <SubmitButton label="Назначить" className="w-full h-10 text-xs" />
                  </form>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
