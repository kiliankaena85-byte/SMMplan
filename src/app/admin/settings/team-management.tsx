'use client';

import React, { useState, useTransition, useCallback } from 'react';
import {
  updateSupportLimit,
  createStaffRoleAction,
  updateStaffRolePermissionsAction,
  deleteStaffRoleAction,
  removeStaffMemberAction,
} from '@/actions/admin/team';
import {
  toggleStaffActiveStatusAction,
  generateStaffMagicLinkAction,
  resetStaffPasswordAction,
  updateStaffMemberAction,
} from '@/actions/admin/staff';
import { updateUserRole, updateStaffGeminiApiKeyAction } from '@/actions/admin/settings';
import { updateRoleAction } from '@/actions/admin/roles';
import { toast } from 'sonner';
import type { StaffRole, StaffPermission } from '@prisma/client';
import { RBAC_SECTIONS, normalizeRbacSection, type RbacSectionId } from '@/lib/rbac-sections';
import {
  type StaffUser,
  type RegularUser,
  type TeamManagementProps,
  type RolePermissionsState,
  DeleteRoleModal,
  DemoteStaffModal,
  EditStaffModal,
  RolePermissionsModal,
  AddStaffModal,
  StaffLogsDrawer,
  StaffTableSection,
  CustomRolesSection,
  PromoteUserSection,
} from './team';

export type { StaffUser, RegularUser, TeamManagementProps };

export function TeamManagement({
  staffUsers,
  regularUsers,
  searchQuery,
  currentAdminRole,
  staffRoles = [],
}: TeamManagementProps) {
  const [isPending, startTransition] = useTransition();

  // Modals state (hoisted to component top level per AGENTS.md Modal Hoisting rule)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [viewingLogsUser, setViewingLogsUser] = useState<StaffUser | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [staffToRemove, setStaffToRemove] = useState<{ id: string; email: string; role: string } | null>(null);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);

  // Edit modal local state
  const [editRole, setEditRole] = useState('');
  const [editStaffRoleId, setEditStaffRoleId] = useState('NONE');
  const [editGeminiKey, setEditGeminiKey] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editAllowedTenants, setEditAllowedTenants] = useState<string[]>(['smmplan']);
  const [editIsActive, setEditIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [isSavingEdit, setSavingEdit] = useState(false);

  // Full 16-section permissions editor modal state
  const [editingRolePermissions, setEditingRolePermissions] = useState<RolePermissionsState | null>(null);
  const [isSavingRolePerms, setIsSavingRolePerms] = useState(false);

  const isOwner = currentAdminRole === 'OWNER';

  const canDemote = useCallback((targetRole: string) => {
    if (!isOwner && ['OWNER', 'ADMIN'].includes(targetRole)) return false;
    if (!['OWNER', 'ADMIN'].includes(currentAdminRole || '')) return false;
    return true;
  }, [isOwner, currentAdminRole]);

  const openEdit = useCallback((u: StaffUser) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStaffRoleId(u.staffRoleId || 'NONE');
    setEditGeminiKey('');
    setEditLimit(String((u.supportLimitCents || 0) / 100));
    setEditAllowedTenants(u.allowedTenants && u.allowedTenants.length > 0 ? u.allowedTenants : ['smmplan']);
    setEditIsActive(u.isActive !== false);
    setNewPassword('');
  }, []);

  const openRolePermissionsModal = useCallback((role: StaffRole & { permissions: StaffPermission[] }) => {
    const permMap: Record<string, { canView: boolean; canEdit: boolean }> = {};
    for (const s of RBAC_SECTIONS) {
      const p = role.permissions?.find(x => normalizeRbacSection(x.section) === s.id);
      permMap[s.id] = {
        canView: p?.canView || false,
        canEdit: p?.canEdit || false,
      };
    }
    setEditingRolePermissions({
      id: role.id,
      name: role.name,
      description: role.description || '',
      isSystem: role.isSystem,
      permissions: permMap,
    });
  }, []);

  const handleGenerateMagicLink = async (userId: string) => {
    try {
      const res = await generateStaffMagicLinkAction({
        userId,
        redirectUrl: '/admin/dashboard',
      });
      if (res.success) {
        const fullUrl = `${window.location.origin}${res.relativeLink}`;
        await navigator.clipboard.writeText(fullUrl);
        toast.success(`Ссылка для входа (${res.staffEmail}) скопирована в буфер обмена! Действует 24 часа.`);
      } else {
        toast.error(res.error || 'Ошибка при генерации ссылки');
      }
    } catch {
      toast.error('Не удалось сгенерировать ссылку для входа');
    }
  };

  const handleToggleStatus = (u: StaffUser) => {
    const nextStatus = u.isActive === false ? true : false;
    startTransition(async () => {
      const res = await toggleStaffActiveStatusAction({
        userId: u.id,
        isActive: nextStatus,
      });
      if (res.success) {
        toast.success(`Сотрудник ${u.email} ${nextStatus ? 'активирован' : 'приостановлен'}`);
      } else {
        toast.error(res.error || 'Ошибка смены статуса');
      }
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      // 1. Update basic role, limits and allowed tenants
      const updateRes = await updateStaffMemberAction({
        userId: editingUser.id,
        role: editRole as any,
        staffRoleId: editStaffRoleId === 'NONE' ? null : editStaffRoleId,
        supportLimitRubles: parseFloat(editLimit || '0'),
        allowedTenants: editAllowedTenants,
      });

      if (!updateRes.success) {
        toast.error(updateRes.error || 'Ошибка обновления профиля');
        return;
      }

      // 2. Update active status if changed
      if ((editingUser.isActive !== false) !== editIsActive) {
        await toggleStaffActiveStatusAction({
          userId: editingUser.id,
          isActive: editIsActive,
        });
      }

      // 3. Reset password if entered
      if (newPassword.trim()) {
        const pwdRes = await resetStaffPasswordAction({
          userId: editingUser.id,
          newPassword: newPassword.trim(),
        });
        if (pwdRes.success) {
          toast.success('Пароль сотрудника успешно изменён');
        } else {
          toast.error(pwdRes.error || 'Ошибка смены пароля');
        }
      }

      // 4. Update Gemini API key if entered
      if (editGeminiKey.trim()) {
        const res = await updateStaffGeminiApiKeyAction(editingUser.id, editGeminiKey.trim());
        if (!res.success) toast.error(res.error || 'Ошибка сохранения Gemini ключа');
      }

      toast.success(`Сотрудник ${editingUser.email} обновлён`);
      setEditingUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmRemoveStaff = () => {
    if (!staffToRemove) return;
    setStaffToRemove(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('userId', staffToRemove.id);
      const res = await removeStaffMemberAction(fd);
      if (res?.success) toast.success(`Сотрудник ${staffToRemove.email} разжалован`);
      else toast.error(res?.error || 'Ошибка при разжаловании');
    });
  };

  const confirmDeleteRole = () => {
    if (!roleToDelete) return;
    const { id } = roleToDelete;
    setRoleToDelete(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('roleId', id);
      const res = await deleteStaffRoleAction(fd);
      if (res?.success) toast.success('Роль удалена');
      else toast.error(res?.error || 'Ошибка удаления роли');
    });
  };

  const handleCreateRole = async (name: string, description: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      const res = await createStaffRoleAction(fd);
      if (res?.success) {
        toast.success('Кастомная роль создана');
      } else {
        toast.error(res?.error || 'Ошибка создания роли');
      }
    });
  };

  const handleTogglePermission = (roleId: string, section: string, currentVal: boolean, type: 'view' | 'edit') => {
    startTransition(async () => {
      const canonicalSec = normalizeRbacSection(section);
      const existing = staffRoles.find(r => r.id === roleId);
      const perm = existing?.permissions?.find(p => normalizeRbacSection(p.section) === canonicalSec);
      const nextView = type === 'view' ? !currentVal : (perm?.canView || false);
      const nextEdit = type === 'edit' ? !currentVal : (perm?.canEdit || false);
      const finalView = nextEdit ? true : nextView;
      const fd = new FormData();
      fd.append('roleId', roleId);
      fd.append('section', canonicalSec);
      fd.append('canView', finalView ? 'true' : 'false');
      fd.append('canEdit', nextEdit ? 'true' : 'false');
      const res = await updateStaffRolePermissionsAction(fd);
      if (res?.success) toast.success(`Права «${canonicalSec.toUpperCase()}» обновлены`);
      else toast.error(res?.error || 'Ошибка');
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRolePermissions) return;
    setIsSavingRolePerms(true);
    try {
      const permsArray = Object.entries(editingRolePermissions.permissions).map(([sec, p]) => ({
        section: sec as RbacSectionId,
        canView: p.canView || p.canEdit,
        canEdit: p.canEdit,
      }));
      const res = await updateRoleAction({
        id: editingRolePermissions.id,
        name: editingRolePermissions.name,
        description: editingRolePermissions.description,
        permissions: permsArray,
      });
      if (res.success) {
        toast.success(`Права роли «${editingRolePermissions.name}» успешно сохранены`);
        setEditingRolePermissions(null);
      } else {
        toast.error(res.error || 'Ошибка сохранения прав роли');
      }
    } catch {
      toast.error('Произошла ошибка при сохранении прав');
    } finally {
      setIsSavingRolePerms(false);
    }
  };

  const handleUpdateRole = async (formData: FormData) => {
    try {
      await updateUserRole(formData);
      toast.success('Роль пользователя обновлена');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка при обновлении роли');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── MODALS ── */}
      <AddStaffModal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        staffRoles={staffRoles}
        currentAdminRole={currentAdminRole}
        onSuccess={() => setIsAddStaffOpen(false)}
      />

      <StaffLogsDrawer
        user={viewingLogsUser}
        onClose={() => setViewingLogsUser(null)}
      />

      <DeleteRoleModal
        roleToDelete={roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={confirmDeleteRole}
        isPending={isPending}
      />

      <DemoteStaffModal
        staffToRemove={staffToRemove}
        onClose={() => setStaffToRemove(null)}
        onConfirm={confirmRemoveStaff}
        isPending={isPending}
      />

      <EditStaffModal
        editingUser={editingUser}
        onClose={() => setEditingUser(null)}
        editRole={editRole}
        setEditRole={setEditRole}
        editStaffRoleId={editStaffRoleId}
        setEditStaffRoleId={setEditStaffRoleId}
        editGeminiKey={editGeminiKey}
        setEditGeminiKey={setEditGeminiKey}
        editLimit={editLimit}
        setEditLimit={setEditLimit}
        editAllowedTenants={editAllowedTenants}
        setEditAllowedTenants={setEditAllowedTenants}
        editIsActive={editIsActive}
        setEditIsActive={setEditIsActive}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        isSavingEdit={isSavingEdit}
        onSave={handleSaveEdit}
        onGenerateMagicLink={handleGenerateMagicLink}
        onViewLogs={(u) => setViewingLogsUser(u)}
        staffRoles={staffRoles}
        currentAdminRole={currentAdminRole}
        canDemote={canDemote}
        onDemoteClick={(u) => {
          setEditingUser(null);
          setStaffToRemove({ id: u.id, email: u.email, role: u.role });
        }}
        onOpenRolePermissions={openRolePermissionsModal}
      />

      <RolePermissionsModal
        editingRolePermissions={editingRolePermissions}
        onClose={() => setEditingRolePermissions(null)}
        onSave={handleSaveRolePermissions}
        isSaving={isSavingRolePerms}
        setEditingRolePermissions={setEditingRolePermissions}
      />

      {/* ── SECTION 1: Staff Table ── */}
      <StaffTableSection
        staffUsers={staffUsers}
        staffRoles={staffRoles}
        onOpenAddStaff={() => setIsAddStaffOpen(true)}
        onOpenEdit={openEdit}
        onOpenDemote={(u) => setStaffToRemove({ id: u.id, email: u.email, role: u.role })}
        onToggleStatus={handleToggleStatus}
        onGenerateMagicLink={handleGenerateMagicLink}
        onViewLogs={(u) => setViewingLogsUser(u)}
        canDemote={canDemote}
        isPending={isPending}
      />

      {/* ── SECTION 2: Custom Roles & Permissions Matrix (Owner-only) ── */}
      {isOwner && (
        <CustomRolesSection
          staffRoles={staffRoles}
          onOpenRolePermissions={openRolePermissionsModal}
          onOpenDeleteRole={setRoleToDelete}
          onTogglePermission={handleTogglePermission}
          onCreateRole={handleCreateRole}
          isPending={isPending}
        />
      )}

      {/* ── SECTION 3: Promote User ── */}
      <PromoteUserSection
        regularUsers={regularUsers}
        searchQuery={searchQuery}
        currentAdminRole={currentAdminRole}
        staffRoles={staffRoles}
        onUpdateRole={handleUpdateRole}
      />
    </div>
  );
}
