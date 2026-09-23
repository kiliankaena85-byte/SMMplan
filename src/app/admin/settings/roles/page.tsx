import { enforceSectionAccess } from '@/lib/server/rbac';
import { listRolesWithPermissionsAction } from '@/actions/admin/roles';
import { RBAC_SECTIONS } from '@/lib/rbac-sections';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';
import { RolesClient } from './roles-client';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Роли и матрица прав | OmniSMM 1.0',
};

export default async function RolesManagementPage() {
  await enforceSectionAccess('settings');

  const res = await listRolesWithPermissionsAction();
  const roles = res.success && res.roles ? res.roles : [];

  return (
    <div className="space-y-6 w-full max-w-full pb-8">
      <AdminBreadcrumbs
        items={[
          { label: 'Настройки', href: '/admin/settings' },
          { label: 'Роли и матрица прав' },
        ]}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Роли и матрица прав</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Управление ролями сотрудников, гранулярными правами доступа и защитой от несанкционированных действий.
            </p>
          </div>
        </div>
      </div>
      <RolesClient initialRoles={roles} sections={RBAC_SECTIONS} />
    </div>
  );
}
