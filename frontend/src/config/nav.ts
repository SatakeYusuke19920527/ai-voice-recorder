import type { NavItem } from '@/types/types';
import { Bot, Database, LayoutDashboard, Mic, Settings } from 'lucide-react';

export const navItems: NavItem[] = [
  {
    title: 'New Talk',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'New Talk w/ OpenAI',
    href: '/new-talk-openai',
    icon: Bot,
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
