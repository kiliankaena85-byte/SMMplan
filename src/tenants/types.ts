import React from 'react';

export interface BaseUserProps {
  id?: string;
  email: string;
  balance: bigint;
  totalSpent?: bigint;
  referralCode?: string;
  tenantId: string;
  role?: string;
}

export interface OrderViewData {
  id: string;
  numericId: number;
  status: string;
  charge: bigint | number;
  quantity: number;
  remains?: number | null;
  link?: string | null;
  error?: string | null;
  createdAt: Date | string;
  service: {
    id?: string;
    categoryId?: string;
    name: string;
    category?: {
      name?: string;
      network?: {
        name?: string;
        slug?: string;
      } | null;
    } | null;
  };
}

export interface NetworkViewData {
  slug: string;
  name: string;
}

export interface ITenantDashboardStrategy<TUser extends BaseUserProps = BaseUserProps, TOrder = unknown> {
  ShellLayout: React.ComponentType<{ user: TUser; children: React.ReactNode }>;
  HomeView: React.ComponentType<{
    user: TUser;
    orders: TOrder[];
    referralCount: number;
    activeOrders: number;
    hasPendingPayments: boolean;
    origin: string;
    initialCatalog?: unknown[];
  }>;
  NewOrderView?: React.ComponentType<{
    userEmail: string;
    userBalanceCents: number;
    initialReorderData: unknown;
  }>;
  OrdersView?: React.ComponentType<{
    orders: OrderViewData[];
    totalCount: number;
    userBalanceCents: number;
    search: string;
    status: string;
    network: string;
    networks: NetworkViewData[];
    currentPage: number;
    totalPages: number;
    countsMap: Record<string, number>;
  }>;
}
