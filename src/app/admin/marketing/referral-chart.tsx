'use client';
export function ReferralEconomicsChart({ paidOut, pending }: { paidOut: number, pending: number }) {
  return (
    <div className="h-[200px] w-full mt-4 flex items-center justify-center bg-muted/50 border border-dashed rounded-lg">
      <span className="text-muted-foreground font-medium">Чарты временно отключены</span>
    </div>
  );
}
