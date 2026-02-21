'use client';
import { navItems } from '@/config/nav';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthButton from '../auth/auth-button';
import { Button } from '../ui/button';

const DashboardNav = () => {
  const pathname = usePathname();
  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Button
            key={item.href}
            variant="ghost"
            className={cn(
              'h-auto min-h-11 justify-start rounded-xl border border-transparent px-3 py-2.5 text-left text-[13px] font-semibold tracking-wide whitespace-normal break-words transition-all',
              isActive
                ? 'border-sky-200 bg-gradient-to-r from-sky-100 to-cyan-100 text-sky-800 shadow-sm'
                : 'text-slate-600 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900',
            )}
            asChild
          >
            <Link href={item.href} className="flex w-full items-start gap-2">
              {item.icon && <item.icon className="mt-0.5 h-4 w-4 shrink-0" />}
              <span className="leading-5">{item.title}</span>
            </Link>
          </Button>
        );
      })}
      <div className="my-4 rounded-xl border border-slate-200/80 bg-white/80 p-3 md:hidden">
        <AuthButton />
      </div>
    </nav>
  );
};

export default DashboardNav;
