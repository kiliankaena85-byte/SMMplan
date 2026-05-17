import { cache } from "react";
import { SettingsProvider } from "@/lib/settings";

export const getSetting = cache(async (key: string): Promise<string> => {
  const contactSettings = await SettingsProvider.getContactAndLegalSettings();
  return (contactSettings as any)[key] || "";
});

export const getContactSettings = cache(async () => {
  return await SettingsProvider.getContactAndLegalSettings();
});
