export const dynamic = "force-dynamic";

import ClientPage from "./client-page";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Новый заказ',
};

export default function Page() {
  return <ClientPage />;
}
