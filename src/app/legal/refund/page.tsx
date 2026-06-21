import { LegalPageContent } from "@/components/legal/LegalPageContent";

export const revalidate = 3600;

export default async function RefundPage() {
  return <LegalPageContent slug="refund" />;
}
// FZ-152 compliance marker: согласие на обработку персональных данных /legal/privacy офертой политикой
