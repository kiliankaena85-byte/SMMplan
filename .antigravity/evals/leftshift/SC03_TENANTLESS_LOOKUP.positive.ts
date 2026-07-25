// SC03 Positive Fixture: Tenantless Query Anti-Pattern
export async function getOrder(db: any, id: string) {
  const order = await db.order.findUnique({
    where: { id }
  });
  return order;
}
