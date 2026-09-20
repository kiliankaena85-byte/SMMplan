/**
 * Central order lifecycle and dispatch constants
 */

/**
 * Order cancellation cooling-off window in seconds.
 * Allows users to cancel mistakenly placed orders and receive instant balance refund.
 */
export const ORDER_COOLING_OFF_SECONDS = 90;

/**
 * Order cancellation cooling-off window in milliseconds.
 */
export const ORDER_COOLING_OFF_MS = ORDER_COOLING_OFF_SECONDS * 1000;
