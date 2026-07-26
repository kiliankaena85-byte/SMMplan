import React from 'react';
import { SmmPlanFullApp, PlanTab } from '../../components/plan-views';

type Props = {
  params: Promise<{ tab: string }>;
};

const VALID_TABS: PlanTab[] = ['dashboard', 'orders', 'new-order', 'deposit', 'referrals', 'support', 'settings'];

export async function generateMetadata({ params }: Props) {
  const { tab } = await params;
  const tabTitles: Record<string, string> = {
    'orders': 'Мои заказы',
    'new-order': 'Быстрый заказ',
    'deposit': 'Пополнение баланса',
    'referrals': 'Партнерская программа',
    'support': 'Служба поддержки',
    'settings': 'Настройки профиля',
  };

  return {
    title: `SMMplan — ${tabTitles[tab] || 'Личный кабинет'}`,
  };
}

export default async function SmmPlanTabPage({ params }: Props) {
  const { tab } = await params;
  const initialTab = (VALID_TABS.includes(tab as PlanTab) ? tab : 'dashboard') as PlanTab;
  return <SmmPlanFullApp initialTab={initialTab} />;
}
