/**
 * @deprecated Импорт переехал в /admin/catalog/import (домен Каталога).
 * Этот файл выполняет постоянный редирект 308 для обратной совместимости.
 */
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type ImportPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DeprecatedImportPage({ searchParams }: ImportPageProps) {
  const sParams = searchParams ? await searchParams : {};
  const tenant = typeof sParams.tenant === 'string' ? sParams.tenant : undefined;
  const target = tenant
    ? `/admin/catalog/import?tenant=${tenant}`
    : '/admin/catalog/import';
  redirect(target);
}
