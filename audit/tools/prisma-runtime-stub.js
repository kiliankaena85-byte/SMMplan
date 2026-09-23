// Offline runtime stub for PrismaClient (engines unavailable in audit sandbox).
// Delegates are proxies returning empty results; used only to let modules import.
const makeDelegate = () => new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'fields') return {};
    if (prop === 'then') return undefined;
    return async () => (String(prop).startsWith('findMany') || String(prop).startsWith('groupBy') ? [] : null);
  },
});
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get: (t, prop) => {
        if (prop in t) return t[prop];
        if (prop === '$extends') return () => t;
        if (prop === '$use') return () => t;
        if (typeof prop === 'string' && prop.startsWith('$')) {
          if (prop === '$transaction') return async (arg) => (typeof arg === 'function' ? arg(new PrismaClient()) : Promise.all(arg));
          if (prop === '$queryRaw' || prop === '$queryRawUnsafe') return async () => [];
          if (prop === '$executeRaw' || prop === '$executeRawUnsafe') return async () => 0;
          return async () => undefined;
        }
        return makeDelegate();
      },
    });
  }
}
const Prisma = new Proxy({}, { get: () => undefined });
module.exports = { PrismaClient, Prisma };
module.exports.default = { PrismaClient, Prisma };
