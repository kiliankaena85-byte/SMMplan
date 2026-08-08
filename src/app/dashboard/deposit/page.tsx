import { redirect } from 'next/navigation';

export default function DepositRedirectPage() {
  redirect('/dashboard/add-funds');
}
