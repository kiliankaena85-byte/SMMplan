'use client';

import * as React from 'react';
import { SettingsCard } from '../settings-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { testGeminiAiConnectionAction, updateGlobalSettings } from '@/actions/admin/settings';
import type { SystemSettings } from '@prisma/client';
import { useState } from 'react';
import { toast } from 'sonner';

export function GeminiSettings({ settings }: { settings: SystemSettings }) {
  const [testing, setTesting] = useState(false);
  
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testGeminiAiConnectionAction();
      const message = 'message' in res ? res.message : (res as any).error;
      if (res.success) toast.success(message);
      else toast.error(message);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <SettingsCard
      id="gemini"
      title="Google Gemini AI (Экспериментально)"
      icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
      action={updateGlobalSettings}
      testButton={
        <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
          {testing && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
          Проверить AI
        </Button>
      }
      statusBadge={
        settings.geminiApiKeys ? (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-medium border border-indigo-500/20">Подключено</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border">Выключено</span>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Gemini Proxy URL (Опционально)</Label>
          <Input name="geminiProxy" defaultValue={settings.geminiProxy || ''} placeholder="https://generativelanguage.googleapis.com" />
        </div>
        <div className="space-y-2">
          <Label>API Key</Label>
          <Input 
            name="geminiApiKeys" 
            type="password"
            placeholder={settings.geminiApiKeys ? '••••••••••••••••' : 'AIzaSy...'} 
          />
        </div>
      </div>
    </SettingsCard>
  );
}
