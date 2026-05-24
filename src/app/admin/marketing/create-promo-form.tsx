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
  const [codeValue, setCodeValue] = React.useState<string>("");

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCodeValue(result);
  };

  async function action(formData: FormData) {
    // Since code is controlled, ensure it is added to formData properly
    formData.set('code', codeValue);
    const res = await createPromoCode(formData);
    if (res.success) {
      toast.success('Промокод успешно создан');
      setCodeValue("");
      formRef.current?.reset();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm bg-background/60 backdrop-blur-xl">
      <CardHeader className="border-b border-border/50 bg-muted/50 rounded-t-2xl pb-4">
        <CardTitle className="text-foreground text-sm font-bold uppercase tracking-widest">Новый промокод</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form action={action} ref={formRef} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Код (до 12 символов)</Label>
            <div className="flex gap-2">
              <Input 
                name="code" 
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
                placeholder="WELCOME2026" 
                required 
                maxLength={12}
                className="uppercase font-mono tracking-widest text-foreground bg-muted/50 border-border flex-grow" 
              />
              <Button 
                type="button" 
                intent="outline" 
                onClick={generateRandomCode}
                className="px-3 py-2 flex items-center justify-center font-bold text-base"
                title="Сгенерировать случайный код"
              >
                🎲
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Тип бонуса</Label>
            <Select name="type" defaultValue="DISCOUNT" onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="w-full bg-muted/50 border-border">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISCOUNT" label="Скидка (%)">Скидка (%)</SelectItem>
                <SelectItem value="VOUCHER" label="Пополнение (₽)">Пополнение (₽)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {type === 'DISCOUNT' && (
              <div className="animate-fade-in space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Процент (%)</Label>
                <Input name="discountPercent" type="number" placeholder="10" defaultValue="0" required className="bg-muted/50 font-mono tracking-widest border-border" />
              </div>
            )}
            
            {type === 'VOUCHER' && (
              <div className="animate-fade-in space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Сумма (₽)</Label>
                <Input name="amount" type="number" placeholder="500" defaultValue="0" required className="bg-muted/50 font-mono tracking-widest border-border" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Лимит активаций</Label>
            <Input name="maxUses" type="number" defaultValue="100" required className="bg-muted/50 font-mono tracking-widest border-border" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Срок годности</Label>
            <Input name="expiresAt" type="datetime-local" className="bg-muted/50 text-foreground border-border" />
          </div>

          <Button type="submit" className="w-full shadow-md font-bold uppercase tracking-wider text-xs bg-primary text-primary-foreground hover:bg-primary/90">
            Создать промокод
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
