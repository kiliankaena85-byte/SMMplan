export interface PaginationParams {
  cursor?: string;
  pageSize?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
  include?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
}

export async function paginatedQuery<T>(
  model: {
    findMany: (...args: never[]) => unknown;
    count: (...args: never[]) => unknown;
  },
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { cursor, pageSize = 50, where = {}, orderBy = { id: 'desc' }, include } = params;
  const take = pageSize + 1;

  const queryOptions: Record<string, unknown> = {
    take,
    where,
    orderBy,
  };

  if (cursor) {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1;
  }

  if (include) {
    queryOptions.include = include;
  }

  const [items, totalCount] = await Promise.all([
    (model.findMany as (opts: unknown) => Promise<T[]>)(queryOptions),
    (model.count as (opts: unknown) => Promise<number>)({ where }),
  ]);

  const hasNextPage = items.length > pageSize;
  const paginatedItems = hasNextPage ? items.slice(0, pageSize) : items;
  const nextCursor = hasNextPage && paginatedItems.length > 0
    ? (paginatedItems[paginatedItems.length - 1] as unknown as { id: string })?.id
    : undefined;

  return {
    items: paginatedItems,
    nextCursor,
    hasMore: hasNextPage,
    totalCount,
  };
}
