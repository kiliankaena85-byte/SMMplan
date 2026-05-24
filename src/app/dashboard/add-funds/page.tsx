export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ClientPage from "./client-page";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="max-w-lg animate-pulse text-muted-foreground">Загрузка...</div>
    }>
      <ClientPage />
    </Suspense>
  );
}
