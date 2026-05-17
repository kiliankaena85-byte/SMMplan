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
export { Card, CardHeader, CardContent } from "@/components/ui/card";
export { Button } from "@/components/ui/button";

const TableColumn = ({ children, className, isRowHeader }: any) => (
  <TableHead className={className}>{children}</TableHead>
);
const TableHeaderComponent = ({ children }: any) => (
  <TableHeader>
    <TableRow>{children}</TableRow>
  </TableHeader>
);
const TableCellComponent = ({ children, className }: any) => (
  <TableCell className={className}>{children}</TableCell>
);
const TableRowComponent = ({ children, className }: any) => (
  <TableRow className={className}>{children}</TableRow>
);
const TableBodyComponent = ({ children, emptyContent, renderEmptyState }: any) => {
  const content = React.Children.toArray(children).filter(Boolean);
  if (content.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={100} className="text-center py-12 text-muted-foreground font-medium">
            {renderEmptyState ? renderEmptyState() : emptyContent || "Нет данных"}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }
  return <TableBody>{children}</TableBody>;
};

const TableScrollContainer = ({ children }: any) => (
  <div className="rounded-md border border-border shadow-sm bg-card overflow-hidden">
    {children}
  </div>
);
const TableContent = ({ children, "aria-label": ariaLabel, className }: any) => (
  <ShadcnTable aria-label={ariaLabel} className={className}>
    {children}
  </ShadcnTable>
);

export const Table = Object.assign(
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
