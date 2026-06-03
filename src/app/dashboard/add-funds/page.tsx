export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ClientPage from "./client-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Пополнение баланса | SMMplan",
  description: "Пополните баланс личного кабинета SMMplan для быстрой оплаты заказов и услуг продвижения.",
};

export default function Page() {
  return (
    <Suspense fallback={
      <div className="max-w-lg animate-pulse text-muted-foreground">Загрузка...</div>
    }>
      <ClientPage />
    </Suspense>
  );
}
