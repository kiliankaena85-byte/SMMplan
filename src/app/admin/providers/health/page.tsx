import { redirect } from 'next/navigation';

export default function ProviderHealthRedirect() {
  redirect('/admin/providers');
}
