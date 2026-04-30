'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { createPromoCode } from '@/actions/admin/marketing';
import { toast } from 'sonner';
import { useRef } from 'react';

export function CreatePromoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = React.useState<string>("DISCOUNT");

  async function action(formData: FormData) {
    const res = await createPromoCode(formData);
    if (res.success) {
      toast.success('Промокод успешно создан');
      formRef.current?.reset();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Card className="rounded-2xl border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100/50 bg-slate-50/50 rounded-t-2xl pb-4">
        <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest">Новый промокод</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form action={action} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Код (до 12 символов)</Label>
            <Input name="code" placeholder="WELCOME2026" required className="uppercase font-mono tracking-widest text-slate-900 bg-slate-50/50 border-slate-200" />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Тип бонуса</Label>
            <Select name="type" defaultValue="DISCOUNT" onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISCOUNT">Скидка (%)</SelectItem>
                <SelectItem value="VOUCHER">Пополнение (₽)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Процент (%)</Label>
              <Input name="discountPercent" type="number" placeholder="10" defaultValue="0" disabled={type === 'VOUCHER'} className="bg-slate-50/50 font-mono tracking-widest" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Сумма (₽)</Label>
              <Input name="amount" type="number" placeholder="500" defaultValue="0" disabled={type === 'DISCOUNT'} className="bg-slate-50/50 font-mono tracking-widest" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Лимит активаций</Label>
            <Input name="maxUses" type="number" defaultValue="100" required className="bg-slate-50/50 font-mono tracking-widest" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Срок годности</Label>
            <Input name="expiresAt" type="datetime-local" className="bg-slate-50/50 text-slate-700" />
          </div>

          <Button type="submit" className="w-full shadow-md font-bold uppercase tracking-wider text-xs">
            Сгенерировать
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
