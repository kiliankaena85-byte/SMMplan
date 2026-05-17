'use client';

import { Card } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ShieldAlert, UserPlus, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

function SubmitButton({ label, className }: { label: string, className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" size="sm" intent="outline" className={className}>
      {pending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {label}
    </Button>
  );
}

function SearchButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="font-bold uppercase tracking-widest text-xs h-10 px-8 shadow-md">
      {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      Найти
    </Button>
  );
}

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
      <Card className="rounded-2xl border-border shadow-sm bg-card/60 backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/20 text-destructive rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Команда и Escrow Guard</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Дневные лимиты (в копейках) на ручные корректировки баланса.</p>
            </div>
          </div>

            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>EMAIL</TableHead>
                    <TableHead>РОЛЬ</TableHead>
                    <TableHead className="text-right">ДНЕВНОЙ ЛИМИТ (КОП.) И ДЕЙСТВИЕ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        Сотрудников нет
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-foreground">{u.email}</span>
                        </TableCell>
                        <TableCell>
                          <Badge intent={u.role === 'OWNER' ? 'destructive' : 'primary'} className={`font-bold text-[10px] uppercase ${u.role === 'OWNER' ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-emerald-500/20 text-success border-emerald-500/30'}`}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <form action={handleUpdateLimit} className="flex gap-2 items-center justify-end">
                            <input type="hidden" name="userId" value={u.id} />
                            <Input 
                              type="number" 
                              name="limit" 
                              defaultValue={u.supportLimitCents || 0} 
                              className="w-32 text-right font-mono font-bold"
                            />
                            <SubmitButton label="Сохранить" className="font-bold text-[10px] uppercase tracking-wider h-8" />
                          </form>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
        </div>
      </Card>

      {/* Role Assignment */}
      <Card className="rounded-2xl border-border shadow-sm bg-card/60 backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Назначение ролей</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Поиск и перевод клиентов в категорию персонала.</p>
            </div>
          </div>

          <form className="flex gap-3 mb-6" action="/admin/settings" method="GET">
            <input type="hidden" name="tab" value="team" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="text" 
                name="q" 
                placeholder="Введите email для поиска..." 
                defaultValue={searchQuery} 
                className="pl-10"
              />
            </div>
            <SearchButton />
          </form>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>КЛИЕНТ</TableHead>
                  <TableHead className="text-right">СМЕНИТЬ РОЛЬ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regularUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      {searchQuery ? "Пользователь не найден" : "Начните поиск по email для смены роли"}
                    </TableCell>
                  </TableRow>
                ) : (
                  regularUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <span className="text-xs font-mono font-bold text-foreground">{u.email}</span>
                      </TableCell>
                      <TableCell>
                        <form action={handleUpdateRole} className="flex gap-2 items-center justify-end">
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
                          <SubmitButton label="Назначить" className="text-[10px] font-bold uppercase tracking-wider h-8" />
                        </form>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
