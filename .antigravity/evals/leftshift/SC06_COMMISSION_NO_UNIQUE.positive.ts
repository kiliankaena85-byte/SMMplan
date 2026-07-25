// SC06 Positive Fixture: Commission create without unique / upsert
export async function award(db: any, orderId: string, referrerId: string, amount: bigint) {
  await db.commission.create({
    data: { orderId, referrerId, amount }
  });
}
