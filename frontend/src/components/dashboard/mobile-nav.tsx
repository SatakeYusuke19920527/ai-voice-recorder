import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, PanelLeft } from 'lucide-react';
import { Button } from '../ui/button';
import DashboardNav from './nav';

const MobileNav = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 shadow-sm hover:bg-white md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side={'left'}
        className="border-r border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-cyan-100/60 pl-1 pr-0"
      >
        <SheetHeader className="px-8 py-5 text-left">
          <SheetTitle className="inline-flex items-center gap-2 text-slate-900">
            <PanelLeft className="h-4 w-4" />
            メニュー
          </SheetTitle>
        </SheetHeader>
        <div className="px-6">
          <DashboardNav />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
