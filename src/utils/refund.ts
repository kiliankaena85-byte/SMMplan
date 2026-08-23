/**
 * Единая формула расчёта частичного возврата.
 * 
 * ARCHITECTURE CONTRACT: Все места в коде, где нужно посчитать
 * сумму возврата за невыполненную часть заказа, ОБЯЗАНЫ использовать
 * эту функцию. Не дублируйте формулу.
 * 
 * Формула: Math.floor((remains / quantity) * charge) на BigInt
 * Граничные случаи:
 *   - quantity = 0 → возврат 0 (деление на ноль)
 *   - remains <= 0 → возврат 0
 *   - charge <= 0 → возврат 0
 */
export function calculatePartialRefund(order: {
  remains: number;
  quantity: number;
  charge: bigint | number;
}): bigint {
  const charge = typeof order.charge === 'bigint' ? order.charge : BigInt(order.charge || 0);
  if (order.quantity <= 0 || order.remains <= 0 || charge <= BigInt(0)) {
    return BigInt(0);
  }
  // BigInt arithmetic: (remains * charge) / quantity
  // Порядок операций: сначала умножение (без потери точности), затем деление
  const calculated = (BigInt(order.remains) * charge) / BigInt(order.quantity);
  return calculated < charge ? calculated : charge;
}
