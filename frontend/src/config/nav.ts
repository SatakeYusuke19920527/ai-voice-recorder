import type { NavItem } from '@/types/types';
import {
  BookOpen,
  Database,
  Languages,
  LayoutDashboard,
  Mic,
  Settings,
} from 'lucide-react';

export const navItems: NavItem[] = [
  {
    title: 'New Talk',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: '英会話トレーニング',
    href: '/english-conversation',
    icon: Languages,
  },
  {
    title: '単語＆文法',
    href: '/vocabulary-grammar',
    icon: BookOpen,
  },
  {
    title: 'Voice Recording (Cosmos)',
    href: '/voice-recording',
    icon: Mic,
  },
  {
    title: 'Voice Recording (Neon)',
    href: '/voice-recording-neon',
    icon: Database,
  },
  {
    title: '設定',
    href: '/settings',
    icon: Settings,
  },
];
