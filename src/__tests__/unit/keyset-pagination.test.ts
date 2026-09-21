import { describe, it, expect, vi } from 'vitest';
import { paginatedQuery } from '@/lib/pagination';

describe('Keyset & Safe Pagination Unit Tests', () => {
  it('should use composite keyset ordering by default and compute nextCursor', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      { id: 'item-1', createdAt: new Date('2026-09-20') },
      { id: 'item-2', createdAt: new Date('2026-09-19') },
      { id: 'item-3', createdAt: new Date('2026-09-18') },
    ]);
    const mockCount = vi.fn().mockResolvedValue(5);

    const model = {
      findMany: mockFindMany as any,
      count: mockCount as any,
    };

    const result = await paginatedQuery(model, {
      pageSize: 2,
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      take: 3,
      where: {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: 'item-1', createdAt: new Date('2026-09-20') });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('item-2');
    expect(result.totalCount).toBe(5);
    expect(result.totalPages).toBe(3);
  });

  it('should support cursor navigation with skip=1 and cursor object', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      { id: 'item-3', createdAt: new Date('2026-09-18') },
    ]);
    const mockCount = vi.fn().mockResolvedValue(3);

    const model = {
      findMany: mockFindMany as any,
      count: mockCount as any,
    };

    const result = await paginatedQuery(model, {
      cursor: 'item-2',
      pageSize: 2,
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      take: 3,
      skip: 1,
      cursor: { id: 'item-2' },
      where: {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });

  it('should clamp pageSize to min 1 and max 200', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([]);
    const mockCount = vi.fn().mockResolvedValue(0);

    const model = {
      findMany: mockFindMany as any,
      count: mockCount as any,
    };

    // Test below lower bound
    await paginatedQuery(model, { pageSize: -5 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }) // safePageSize = 1, take = safePageSize + 1 = 2
    );

    // Test above upper bound
    await paginatedQuery(model, { pageSize: 500 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 201 }) // safePageSize = 200, take = 201
    );
  });

  it('should handle offset mode with page parameter and nextCursor', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      { id: 'item-11' },
      { id: 'item-12' },
    ]);
    const mockCount = vi.fn().mockResolvedValue(20);

    const model = {
      findMany: mockFindMany as any,
      count: mockCount as any,
    };

    const result = await paginatedQuery(model, {
      page: 2,
      pageSize: 10,
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      take: 10,
      skip: 10,
      where: {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    expect(result.currentPage).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalCount).toBe(20);
    expect(result.totalPages).toBe(2);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBe('item-12');
  });

  it('should skip count query in offset mode when skipCount is true and set totalCount to -1', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      { id: 'item-1' },
      { id: 'item-2' },
    ]);
    const mockCount = vi.fn();

    const model = {
      findMany: mockFindMany as any,
      count: mockCount as any,
    };

    const result = await paginatedQuery(model, {
      page: 1,
      pageSize: 2,
      skipCount: true,
    });

    expect(mockFindMany).toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(-1);
    expect(result.totalPages).toBe(-1);
    expect(result.hasMore).toBe(true); // items.length === safePageSize (2 === 2)
  });

  it('should skip count query in cursor mode when skipCount is true', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      { id: 'item-1' },
      { id: 'item-2' },
    ]);
    const mockCount = vi.fn();

    const model = {
      findMany: mockFindMany as any,
      count: mockCount as any,
    };

    const result = await paginatedQuery(model, {
      cursor: 'prev-id',
      pageSize: 5,
      skipCount: true,
    });

    expect(mockFindMany).toHaveBeenCalled();
    expect(mockCount).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(-1);
  });
});
