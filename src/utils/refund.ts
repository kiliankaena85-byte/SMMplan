/**
 * Единая формула расчёта частичного возврата.
 * 
 * ARCHITECTURE CONTRACT: Все места в коде, где нужно посчитать
 * сумму возврата за невыполненную часть заказа, ОБЯЗАНЫ использовать
 * эту функцию. Не дублируйте формулу.
 * 
 * Формула: Math.floor((remains / quantity) * charge)
 * Граничные случаи:
 *   - quantity = 0 → возврат 0 (деление на ноль)
 *   - remains <= 0 → возврат 0
 *   - charge <= 0 → возврат 0
 */
export function calculatePartialRefund(order: {
  remains: number;
  quantity: number;
  charge: number | bigint;
}): number {
  const charge = Number(order.charge);
  if (order.quantity <= 0 || order.remains <= 0 || charge <= 0) {
    return 0;
  }
  return Math.floor((order.remains / order.quantity) * charge);
}
