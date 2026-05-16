import { db as prisma } from "@/lib/db";
import { cache } from "react";

// Default fallback configurations
const DEFAULT_SETTINGS: Record<string, string> = {
  SUPPORT_EMAIL: "support@smmplan.pro",
  PRIVACY_EMAIL: "privacy@smmplan.pro",
  TELEGRAM_SUPPORT_BOT: "smmplan_support_bot",
  TELEGRAM_SUPPORT_CHANNEL: "smmplan_support",
  COMPANY_NAME: "Smmplan Lite",
  COMPANY_INN: "Укажите ИНН",
  COMPANY_OGRNIP: "Укажите ОГРНИП",
  COMPANY_ADDRESS: "г. Москва",
};

export const getSetting = cache(async (key: string): Promise<string> => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });

    if (setting) {
      return setting.value;
    }
  } catch (error) {
    console.error(`Failed to fetch setting ${key}:`, error);
  }

  return DEFAULT_SETTINGS[key] || "";
});

export const getContactSettings = cache(async () => {
  const keys = [
    "SUPPORT_EMAIL", 
    "PRIVACY_EMAIL", 
    "TELEGRAM_SUPPORT_BOT", 
    "TELEGRAM_SUPPORT_CHANNEL",
    "COMPANY_NAME",
    "COMPANY_INN",
    "COMPANY_OGRNIP",
    "COMPANY_ADDRESS"
  ];
  
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } }
    });

    const result = { ...DEFAULT_SETTINGS };
    settings.forEach((s: { key: string; value: string }) => {
      result[s.key] = s.value;
    });

    return result;
  } catch (error) {
    console.error("Failed to fetch contact settings:", error);
    return DEFAULT_SETTINGS;
  }
});
