import { NavItem } from '@/types/nav';
import { LayoutDashboard, Mic, Settings } from 'lucide-react';

export const navItems: NavItem[] = [
  {
    title: 'New Talk',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Voice Recording',
    href: '/voice-recording',
    icon: Mic,
  },
  {
    title: '設定',
    href: '/settings',
    icon: Settings,
  },
];
