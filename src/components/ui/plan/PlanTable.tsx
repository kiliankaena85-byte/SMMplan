"use client";

import React from "react";

export interface PlanTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  className?: string;
}

export function PlanTable({ children, className = "", ...props }: PlanTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
      <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function PlanTableHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <thead className={`bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground ${className}`}>{children}</thead>;
}

export function PlanTableRow({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr 
      onClick={onClick}
      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function PlanTableCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-foreground align-middle ${className}`}>{children}</td>;
}

export function PlanTableHeadCell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-extrabold text-foreground select-none ${className}`}>{children}</th>;
}
