import { 
  LayoutDashboard, 
  PlusCircle, 
  ListOrdered, 
  Wallet, 
  HelpCircle, 
  Settings,
  Users,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  name: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  exact?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    name: 'Главная',
    label: 'Главная',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: 'Новый заказ',
    label: 'Новый заказ',
    href: '/dashboard/new-order',
    icon: PlusCircle,
  },
  {
    name: 'Мои заказы',
    label: 'Заказы',
    href: '/dashboard/orders',
    icon: ListOrdered,
  },
  {
    name: 'Пополнение баланса',
    label: 'Баланс',
    href: '/dashboard/deposit',
    icon: Wallet,
  },
  {
    name: 'Поддержка',
    label: 'Помощь',
    href: '/dashboard/support',
    icon: HelpCircle,
  },
];

export const DOCK_NAV_ITEMS: NavItem[] = MAIN_NAV_ITEMS;

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    name: 'Панель администратора',
    label: 'Админка',
    href: '/admin',
    icon: Settings,
  },
  {
    name: 'Пользователи',
    label: 'Пользователи',
    href: '/admin/users',
    icon: Users,
  },
];
