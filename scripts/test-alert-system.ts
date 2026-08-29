import { db } from '../src/lib/db';
import { redis } from '../src/lib/redis';
import { P0ThreatSensorService } from '../src/services/telemetry/p0-threat-sensor.service';
import { P0AlertDebouncer } from '../src/lib/alerts/p0-alert-debouncer';
import { sendAdminAlert, sendP0EmergencyAlert } from '../src/lib/notifications';
import { EmergencyEmailService } from '../src/lib/emergency-email';

async function diagnoseAlerts() {
  console.log('======================================================================');
  console.log('       🔍 ДИАГНОСТИКА СИСТЕМЫ АЛЕРТОВ И БАЛАНСОВ ПРОЕКТА SMMplan      ');
  console.log('======================================================================\n');

  // 1. Проверка конфигурации Telegram & Email
  const tgToken = process.env.ADMIN_ALERT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.ADMIN_ALERT_CHAT_ID || '268747191';
  console.log('1. 📡 Каналы доставки алертов:');
  console.log(`   - Telegram Bot Token: ${tgToken ? `Настроен (длина: ${tgToken.length} симв.)` : '❌ НЕ НАСТРОЕН'}`);
  console.log(`   - Telegram Chat ID:   ${tgChatId ? tgChatId : '❌ НЕ НАСТРОЕН'}`);
  console.log(`   - SMTP / Email:       ${process.env.SMTP_HOST ? `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}` : '❌ НЕ НАСТРОЕН'}\n`);

  // 2. Проверка Redis и блокировок Debouncer
  console.log('2. ⚡ Проверка Redis & Debounce Lock:');
  let redisOk = false;
  try {
    const ping = await redis.ping();
    redisOk = ping === 'PONG';
    console.log(`   - Redis Ping: ${redisOk ? '🟢 PONG (Online)' : '🔴 FAILED'}`);
    
    // Проверяем существующие ключи дебаунса
    const keys = await redis.keys('p0:debounce:*');
    console.log(`   - Активные ключи дебаунса (${keys.length}):`, keys);
  } catch (err: any) {
    console.warn(`   - Redis: ⚠️ Ошибка подключения (${err.message}) -> fallback на память`);
  }

  // 3. Проверка провайдеров в БД
  console.log('\n3. 📦 Активные провайдеры в БД:');
  const providers = await db.provider.findMany();
  console.log(`   - Всего провайдеров в базе: ${providers.length}`);
  for (const p of providers) {
    console.log(`   - [${p.id}] ${p.name} | isActive: ${p.isActive} | apiUrl: ${p.apiUrl ? 'Задан' : '—'}`);
  }

  // 4. Запуск сенсора балансов провайдеров
  console.log('\n4. 🩺 Запуск сенсора P0ThreatSensorService.checkProviderBalances():');
  const lowProviders = await P0ThreatSensorService.checkProviderBalances();
  console.log(`   - Найдено провайдеров с низким балансом: ${lowProviders.length}`);
  for (const lp of lowProviders) {
    console.log(`     ⚠️ ${lp.name}: баланс ${lp.balance} ${lp.currency}`);
  }

  // 5. Запуск полного P0 сканирования
  console.log('\n5. 🛡️ Полный аудит здоровья системы (P0ThreatSensorService.runFullP0Scan):');
  const fullScan = await P0ThreatSensorService.runFullP0Scan();
  console.log(`   - Диск: свободно ${fullScan.diskFreePercent}% (${fullScan.diskFreeGb} GB / ${fullScan.diskTotalGb} GB)`);
  console.log(`   - Память: занято ${fullScan.memoryUsedPercent}% (${fullScan.memoryUsedMb} MB / ${fullScan.memoryTotalMb} MB)`);
  console.log(`   - Курс ЦБ: устарел? ${fullScan.isStaleCurrency} (${fullScan.currencyHoursOld.toFixed(1)} ч.)`);
  console.log(`   - Провайдеры с низким балансом: ${fullScan.lowBalanceProviders.length}`);

  console.log('\n======================================================================');
  console.log('                          ДИАГНОСТИКА ЗАВЕРШЕНА                       ');
  console.log('======================================================================');
}

diagnoseAlerts()
  .catch(console.error)
  .finally(() => {
    db.$disconnect();
    redis.disconnect();
  });
