import { Metadata } from 'next';
import { GuestSupportOptions } from '@/components/support/GuestSupportOptions';
import { SettingsProvider } from '@/lib/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await SettingsProvider.getContactAndLegalSettings();
  return {
    title: `Служба поддержки | ${settings.COMPANY_NAME}`,
    description: 'Обратная связь и помощь. Напишите нам в Telegram или на Email.',
  };
}

export default async function SupportPage() {
  const settings = await SettingsProvider.getContactAndLegalSettings();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center py-20 px-4">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none opacity-50" />

      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            Служба поддержки
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Мы всегда готовы помочь вам. Выберите наиболее удобный способ связи с нами, и мы ответим в кратчайшие сроки.
          </p>
        </div>

        <GuestSupportOptions 
          telegramBotUsername={settings.TELEGRAM_SUPPORT_BOT} 
          supportEmail={settings.SUPPORT_EMAIL} 
        />
      </div>
    </div>
  );
}
