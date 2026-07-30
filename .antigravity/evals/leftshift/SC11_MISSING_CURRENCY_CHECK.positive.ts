// SC11 Positive Fixture: confirmPayment without currency check
export async function confirmPayment(paymentId: string) {
  // Missing currency check
  return { status: 'OK' };
}
