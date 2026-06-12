import { enforceSectionAccess } from "@/lib/server/rbac";
import { ArticleForm } from "../ArticleForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Создание статьи | Панель управления",
};

export default async function AdminCreateArticlePage() {
  // Strict page role guard
  await enforceSectionAccess('settings');

  return (
    <div className="p-6 bg-background min-h-full pb-10">
      <ArticleForm />
    </div>
  );
}
