export function formatCents(cents: number | bigint): string {
  return (Number(cents) / 100).toFixed(2);
}

export function formatRub(rub: number): string {
  return rub.toFixed(2);
}
