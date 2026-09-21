export interface PaginationParams {
  cursor?: string;
  page?: number;
  pageSize?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
  include?: Record<string, unknown>;
  skipCount?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export async function paginatedQuery<T>(
  model: {
    findMany: (...args: never[]) => unknown;
    count: (...args: never[]) => unknown;
  },
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { cursor, page, pageSize = 50, where = {}, orderBy = [{ createdAt: 'desc' }, { id: 'desc' }], include, skipCount = false } = params;
  const safePageSize = Math.min(Math.max(1, pageSize), 200);

  // Offset-based pagination when page is explicitly provided or cursor is not used
  if (page !== undefined && !cursor) {
    const currentPage = Math.max(1, page);
    const queryOptions: Record<string, unknown> = {
      take: safePageSize,
      skip: (currentPage - 1) * safePageSize,
      where,
      orderBy,
    };

    if (include) {
      queryOptions.include = include;
    }

    let items: T[];
    let totalCount: number;

    if (skipCount) {
      items = await (model.findMany as (opts: unknown) => Promise<T[]>)(queryOptions);
      totalCount = -1;
    } else {
      [items, totalCount] = await Promise.all([
        (model.findMany as (opts: unknown) => Promise<T[]>)(queryOptions),
        (model.count as (opts: unknown) => Promise<number>)({ where }),
      ]);
    }

    const totalPages = totalCount >= 0 ? Math.max(1, Math.ceil(totalCount / safePageSize)) : -1;
    const hasMore = totalCount >= 0 ? currentPage < totalPages : items.length === safePageSize;
    const nextCursor = items.length > 0
      ? (items[items.length - 1] as unknown as { id: string })?.id
      : undefined;

    return {
      items,
      nextCursor,
      totalCount,
      totalPages,
      currentPage,
      pageSize: safePageSize,
      hasMore,
    };
  }

  // Cursor-based fallback for infinite scroll endpoints
  const take = safePageSize + 1;

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

  let items: T[];
  let totalCount: number;

  const fetchItemsAndCount = async (): Promise<[T[], number]> => {
    if (skipCount) {
      const itms = await (model.findMany as (opts: unknown) => Promise<T[]>)(queryOptions);
      return [itms, -1];
    }
    return Promise.all([
      (model.findMany as (opts: unknown) => Promise<T[]>)(queryOptions),
      (model.count as (opts: unknown) => Promise<number>)({ where }),
    ]);
  };

  try {
    [items, totalCount] = await fetchItemsAndCount();
  } catch (err: unknown) {
    // If cursor was deleted or not found (Prisma P2025), gracefully fall back to first page without cursor
    const isRecordNotFound =
      (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') ||
      (err instanceof Error && err.message.includes('Record to use for the cursor was not found'));

    if (cursor && isRecordNotFound) {
      delete queryOptions.cursor;
      delete queryOptions.skip;
      [items, totalCount] = await fetchItemsAndCount();
    } else {
      throw err;
    }
  }

  const hasNextPage = items.length > safePageSize;
  const paginatedItems = hasNextPage ? items.slice(0, safePageSize) : items;
  const nextCursor = hasNextPage && paginatedItems.length > 0
    ? (paginatedItems[paginatedItems.length - 1] as unknown as { id: string })?.id
    : undefined;

  const totalPages = totalCount >= 0 ? Math.max(1, Math.ceil(totalCount / safePageSize)) : -1;

  return {
    items: paginatedItems,
    nextCursor,
    hasMore: hasNextPage,
    totalCount,
    totalPages,
    currentPage: page || 1,
    pageSize: safePageSize,
  };
}
