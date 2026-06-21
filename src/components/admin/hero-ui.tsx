"use client";

import React from "react";
import {
  Table as ShadcnTable,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
export { Card, CardHeader, CardContent } from "@/components/ui/card";
export { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
const TableColumn = ({ children, className, isRowHeader }: any) => (
  <TableHead className={cn("text-muted-foreground font-bold border-b border-border/80 bg-muted/30 py-4 px-6 text-xs uppercase tracking-wider", className)}>{children}</TableHead>
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableHeaderComponent = ({ children }: any) => (
  <TableHeader>
    <TableRow className="hover:bg-transparent border-b border-border/80">{children}</TableRow>
  </TableHeader>
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableCellComponent = ({ children, className }: any) => (
  <TableCell className={cn("text-foreground border-b border-border/50 align-middle py-5 px-6", className)}>{children}</TableCell>
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableRowComponent = ({ children, className }: any) => (
  <TableRow className={cn("hover:bg-muted/50 even:bg-muted/20 border-b border-border/50 transition-all duration-150 group", className)}>{children}</TableRow>
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableBodyComponent = ({ children, emptyContent, renderEmptyState }: any) => {
  const content = React.Children.toArray(children).filter(Boolean);
  if (content.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={100} className="text-center py-12 text-warm-text/60 font-medium">
            {renderEmptyState ? renderEmptyState() : emptyContent || "Нет данных"}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }
  return <TableBody>{children}</TableBody>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableScrollContainer = ({ children }: any) => (
  <div className="rounded-xl border border-warm-border/60 shadow-[0_8px_30px_rgba(39,39,42,0.02)] bg-warm-card overflow-hidden">
    {children}
  </div>
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableContent = ({ children, "aria-label": ariaLabel, className }: any) => (
  <ShadcnTable aria-label={ariaLabel} className={className}>
    {children}
  </ShadcnTable>
);

export const Table = Object.assign(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ children, "aria-label": ariaLabel, className }: any) => {
    let hasWrapperChild = false;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.type === TableScrollContainer || child.type === TableContent) {
          hasWrapperChild = true;
        }
      }
    });

    if (hasWrapperChild) {
      return (
        <div className={className} aria-label={ariaLabel} data-slot="table-root-wrapper">
          {children}
        </div>
      );
    }

    return (
      <ShadcnTable aria-label={ariaLabel} className={className}>
        {children}
      </ShadcnTable>
    );
  },
  {
    Header: TableHeaderComponent,
    Column: TableColumn,
    Body: TableBodyComponent,
    Row: TableRowComponent,
    Cell: TableCellComponent,
    ScrollContainer: TableScrollContainer,
    Content: TableContent,
  }
);
