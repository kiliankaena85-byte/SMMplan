/**
 * Structured logger for Smmplan (Pino-based).
 *
 * Provides:
 *  - JSON-structured output (compatible with Loki/Promtail)
 *  - Correlation ID propagation via AsyncLocalStorage
 *  - Child loggers with bound context
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Payment processed', { orderId, amount });
 *   logger.error('Checkout failed', { error: err.message, userId });
 *
 * With child logger (for workers):
 *   const log = logger.child({ correlationId: orderId, component: 'OrderProcessor' });
 *   log.info('Dispatching order to provider', { externalId });
 */

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// ─── Correlation ID Store ──────────────────────────────────────────────────

export interface LogContext {
  correlationId?: string;
  userId?: string;
  component?: string;
}

export const logContextStorage = new AsyncLocalStorage<LogContext>();

/** Run a function with a bound log context (correlationId, userId, etc.) */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return logContextStorage.run(context, fn);
}

/** Get current correlation ID from async context */
export function getCorrelationId(): string | undefined {
  return logContextStorage.getStore()?.correlationId;
}

// ─── Pino Instance ─────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production';

const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // NOTE: pino-pretty transport is incompatible with Next.js Turbopack bundler.
  // Use plain JSON in all environments. Loki/Promtail parses JSON natively.
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'smmplan',
    env: process.env.NODE_ENV || 'development',
  },
});

// ─── Logger Proxy (auto-injects correlationId from AsyncLocalStorage) ──────

type LogFn = (message: string, context?: Record<string, unknown>) => void;

interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
  /** Create a child logger with bound context fields */
  child: (bindings: Record<string, unknown>) => Logger;
}

function createLoggerFromBase(pinoInstance: pino.Logger): Logger {
  const log = (level: pino.Level) => (message: string, context?: Record<string, unknown>) => {
    const store = logContextStorage.getStore();
    const merged = {
      ...(store?.correlationId ? { correlationId: store.correlationId } : {}),
      ...(store?.userId ? { userId: store.userId } : {}),
      ...(store?.component ? { component: store.component } : {}),
      ...context,
    };
    pinoInstance[level](merged, message);
  };

  return {
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    debug: log('debug'),
    child: (bindings) => createLoggerFromBase(pinoInstance.child(bindings)),
  };
}

export const logger = createLoggerFromBase(baseLogger);
