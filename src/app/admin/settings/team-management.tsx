'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { updateSupportLimit } from '@/actions/admin/team';
import { updateUserRole } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { Search, ShieldAlert, UserPlus } from 'lucide-react';

interface TeamManagementProps {
  staffUsers: any[];
  regularUsers: any[];
  searchQuery: string;
}

export function TeamManagement({ staffUsers, regularUsers, searchQuery }: TeamManagementProps) {
  
  async function handleUpdateLimit(formData: FormData) {
    try {
      const res = await updateSupportLimit(formData);
      if (res.success) {
        toast.success('Лимит доверия обновлен');
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Ошибка при обновлении лимита');
    }
  }

  async function handleUpdateRole(formData: FormData) {
    try {
      await updateUserRole(formData);
      toast.success('Роль пользователя обновлена');
    } catch (err) {
      toast.error('Ошибка при обновлении роли');
    }
  }

  return (
    <div className="space-y-8">
      {/* Staff Limits */}
      <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Команда и Escrow Guard</h3>
              <p className="text-[11px] text-slate-500 font-medium">Дневные лимиты (в копейках) на ручные корректировки баланса.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-medium text-slate-700">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60 bg-slate-50/30">
                  <th className="py-3 px-6 font-bold">Email</th>
                  <th className="py-3 px-4 font-bold">Роль</th>
                  <th className="py-3 px-4 font-bold text-right">Дневной лимит (коп.)</th>
                  <th className="py-3 px-6 font-bold text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100/30 hover:bg-slate-50/80 transition-colors last:border-0 group">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-900">{u.email}</td>
                    <td className="py-4 px-4">
                      <Badge className={`font-bold text-[10px] uppercase ${u.role === 'OWNER' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right" colSpan={2}>
                      <form action={handleUpdateLimit} className="flex gap-2 items-center justify-end">
                        <input type="hidden" name="userId" value={u.id} />
                        <Input 
                          type="number" 
                          name="limit" 
                          defaultValue={u.supportLimitCents || 0} 
                          className="w-32 text-right font-mono font-bold"
                        />
                        <Button type="submit" size="sm" intent="outline" className="font-bold text-[10px] uppercase tracking-wider h-8">
                          Сохранить
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Role Assignment */}
      <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Назначение ролей</h3>
              <p className="text-[11px] text-slate-500 font-medium">Поиск и перевод клиентов в категорию персонала.</p>
            </div>
          </div>

          <form className="flex gap-3 mb-6" action="/admin/settings" method="GET">
            <input type="hidden" name="tab" value="team" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                type="text" 
                name="q" 
                placeholder="Введите email для поиска..." 
                defaultValue={searchQuery} 
                className="pl-10"
              />
            </div>
            <Button type="submit" className="font-bold uppercase tracking-widest text-xs h-10 px-8 shadow-md">
              Найти
            </Button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-medium text-slate-700">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100/60 bg-slate-50/30">
                  <th className="py-3 px-6 font-bold">Клиент</th>
                  <th className="py-3 px-6 font-bold text-right">Сменить роль</th>
                </tr>
              </thead>
              <tbody>
                {regularUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100/30 hover:bg-slate-50/80 transition-colors last:border-0 group">
                    <td className="py-4 px-6 text-xs font-mono font-bold text-slate-900">{u.email}</td>
                    <td className="py-4 px-6 flex justify-end">
                      <form action={handleUpdateRole} className="flex gap-2 items-center">
                        <input type="hidden" name="userId" value={u.id} />
                        <Select name="role" defaultValue={u.role}>
                          <SelectTrigger className="w-32" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">USER</SelectItem>
                            <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                            <SelectItem value="MANAGER">MANAGER</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="submit" intent="outline" className="text-[10px] font-bold uppercase tracking-wider h-8">
                          Назначить
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
                {regularUsers.length === 0 && searchQuery && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400 font-medium tracking-wide">Пользователь не найден</td>
                  </tr>
                )}
                {regularUsers.length === 0 && !searchQuery && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400 font-medium tracking-wide italic opacity-60">Начните поиск по email для смены роли</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
