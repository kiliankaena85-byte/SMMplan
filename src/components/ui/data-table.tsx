'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Table } from '@heroui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  renderToolbar?: (table: ReturnType<typeof useReactTable>) => React.ReactNode;
  hideClientPagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Поиск...',
  renderToolbar,
  hideClientPagination = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="relative">
      {renderToolbar && renderToolbar(table as any)}
      <div className="flex items-center py-4 justify-between gap-4">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto flex px-4 h-9 font-medium text-sm border-border border bg-card shadow-sm hover:bg-muted/50 items-center justify-center gap-2 rounded-lg">
            Вид колонок
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <Table aria-label="Data Table" className="h-full w-full">
          <Table.ScrollContainer>
            <Table.Content className="w-full">
              <Table.Header className="bg-muted/30">
                {table.getFlatHeaders().map((header, index) => (
                  <Table.Column isRowHeader={index === 0} key={header.id} className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <Table.Row
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="hover:bg-muted/30 border-b border-border last:border-0 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Table.Cell key={cell.id} className="py-3 px-4 text-sm text-foreground">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  ))
                ) : []}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {!table.getRowModel().rows?.length && (
          <div className="h-24 w-full flex items-center justify-center text-sm text-muted-foreground bg-card">
            Нет результатов.
          </div>
        )}
      </div>
      {!hideClientPagination && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Выбрано: {table.getFilteredSelectedRowModel().rows.length} из{' '}
            {table.getFilteredRowModel().rows.length} строк.
          </div>
          <div className="space-x-2">
            <Button
              intent="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Пред
            </Button>
            <Button
              intent="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              След
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
