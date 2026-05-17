"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  Row,
} from "@tanstack/react-table";
import { Table, Input, Button, Chip } from "@heroui/react";
import { updateServiceDescription } from "@/actions/admin/catalog/enrichment";
import { ExternalLinkIcon, CheckIcon, SaveIcon } from "lucide-react";

type ServiceColumn = {
  id: string;
  numericId: number;
  name: string;
  description: string | null;
  externalId: string | null;
  provider: {
    name: string;
    apiUrl: string;
  } | null;
};

// Inline Editable Cell Component
function EditableDescriptionCell({ row }: { row: Row<ServiceColumn> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(row.original.description || "");
  const [isPending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(false);

  // Focus effect or save indication could go here
  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateServiceDescription(row.original.id, value);
      if (result.success) {
        setIsSaved(true);
        setIsEditing(false);
      } else {
        alert("Ошибка при сохранении: " + result.error);
      }
    });
  };

  if (isEditing) {
    return (
      <div className="flex gap-2 w-full min-w-[300px]">
        <textarea
          className="w-full min-h-[60px] text-sm p-2 border border-default-200 rounded-md bg-default-50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Вставьте описание с сайта провайдера..."
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              setIsEditing(false);
              setValue(row.original.description || "");
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="primary"
            isIconOnly
            onPress={handleSave}
            isDisabled={isPending}
          >
            <SaveIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onPress={() => {
              setIsEditing(false);
              setValue(row.original.description || "");
            }}
            isDisabled={isPending}
          >
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group flex flex-col gap-1 cursor-pointer hover:bg-default-100 p-2 rounded-md transition-colors w-full min-w-[300px]"
      onClick={() => setIsEditing(true)}
    >
      {isSaved && (
        <span className="text-xs text-success flex items-center gap-1 font-medium mb-1">
          <CheckIcon className="w-3 h-3" /> Сохранено
        </span>
      )}
      {row.original.description ? (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-snug line-clamp-3 group-hover:line-clamp-none">
          {row.original.description}
        </p>
      ) : (
        <span className="text-sm text-muted-foreground italic">
          Нажмите, чтобы добавить описание...
        </span>
      )}
    </div>
  );
}

// Generate Provider Link
function getProviderUrl(providerName: string | undefined, externalId: string | null) {
  if (!providerName || !externalId) return "#";
  const name = providerName.toLowerCase();
  
  if (name.includes("soc-rocket")) return `https://soc-rocket.ru/services`;
  if (name.includes("smmprime")) return `https://smmprime.com/services`;
  if (name.includes("stream-promotion")) return `https://stream-promotion.ru/`;
  if (name.includes("likedrom")) return `https://likedrom.com/services`;
  if (name.includes("smmpanelus")) return `https://smmpanelus.com/services`;
  if (name.includes("soc-proof")) return `https://soc-proof.su/services`;
  if (name.includes("telegram.shop")) return `https://telegram.shop/services`;
  
  return "#";
}


export function EnrichmentClientTable({ initialData }: { initialData: ServiceColumn[] }) {
  const [data] = useState(initialData);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<ServiceColumn>[]>(
    () => [
      {
        accessorKey: "numericId",
        header: "ID",
        cell: ({ row }) => (
          <span className="tabular-nums font-mono text-sm text-muted-foreground">
            {row.original.numericId}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: "name",
        header: "Услуга",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 max-w-[300px]">
            <span className="text-sm font-medium leading-tight">
              {row.original.name}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Chip size="sm" variant="secondary" color="default">
                {row.original.provider?.name || "Неизвестно"}
              </Chip>
              {row.original.externalId && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Ext ID: {row.original.externalId}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "sourceLink",
        header: "Провайдер",
        cell: ({ row }) => {
          const url = getProviderUrl(row.original.provider?.name, row.original.externalId);
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 bg-sky-50 px-2 py-1 rounded-md transition-colors"
            >
              Перейти к источнику <ExternalLinkIcon className="w-3 h-3" />
            </a>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Описание (Редактируемое)",
        cell: ({ row }) => <EditableDescriptionCell row={row} />,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Поиск по названию или ID..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          Найдено услуг: <span className="tabular-nums font-semibold">{table.getFilteredRowModel().rows.length}</span>
        </div>
      </div>

      {/* Table */}
      <Table 
        aria-label="Таблица обогащения каталога"
        className="p-0 border shadow-none bg-background rounded-xl overflow-hidden"
      >
        <Table.ScrollContainer>
          <Table.Content>
            <Table.Header>
              {table.getFlatHeaders().map((header, index) => (
                <Table.Column 
                  key={header.id} 
                  className={header.id === 'description' ? 'w-[50%]' : ''}
                  isRowHeader={index === 0}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <Table.Row key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))
              ) : (
                []
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {/* Empty State */}
      {!table.getRowModel().rows?.length && (
        <div className="flex items-center justify-center h-32 border border-dashed rounded-xl bg-default-50">
          <p className="text-muted-foreground">Услуги не найдены.</p>
        </div>
      )}

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Страница <span className="font-semibold">{table.getState().pagination.pageIndex + 1}</span> из{" "}
            {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => table.previousPage()}
              isDisabled={!table.getCanPreviousPage()}
            >
              Пред.
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => table.nextPage()}
              isDisabled={!table.getCanNextPage()}
            >
              След.
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
