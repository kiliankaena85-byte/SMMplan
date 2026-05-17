import { db as prisma } from "@/lib/db";
import { enforcePageRole } from "@/lib/server/rbac";
import Link from "next/link";
import { CMSTable } from "@/components/admin/cms/CMSTable";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "CMS | Управление контентом",
};

export default async function AdminCmsPage() {
  await enforcePageRole(["ADMIN", "OWNER"]);

  const items = await prisma.contentItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Контент (CMS)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Управление страницами, уроками академии и новостями
          </p>
        </div>
        <Button asChild intent="primary">
          <Link href="/admin/cms/new">
            Создать статью
          </Link>
        </Button>
      </div>

      <CMSTable items={items} />
    </div>
  );
}
