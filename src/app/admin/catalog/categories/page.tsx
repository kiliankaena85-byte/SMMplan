import { db } from "@/lib/db";
import { CategoryManager } from "./components/category-manager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CategoriesAdminPage() {
  const categories = await db.category.findMany({
    orderBy: [
      { network: { slug: 'asc' } },
      { sort: 'asc' }
    ],
    include: {
      network: true,
      _count: { select: { services: true } }
    }
  });

  const networks = await db.network.findMany({ orderBy: { sort: 'asc' } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Управление Категориями</h1>
          <p className="text-muted-foreground text-sm">Группировка и сортировка услуг в каталоге.</p>
        </div>
        <Link href="/admin/catalog" className="text-sm font-medium text-primary hover:text-indigo-900 border border-border py-2 px-4 rounded-md">
          ← Вернуться в Каталог
        </Link>
      </div>

      <CategoryManager categories={categories} networks={networks} />
    </div>
  );
}
