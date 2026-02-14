'use client';
import AuthButton from '@/components/auth/auth-button';
import MobileNav from '@/components/dashboard/mobile-nav';
import DashboardNav from '@/components/dashboard/nav';
import { useAuth, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import React from 'react';

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirectToSignIn({
        redirectUrl:
          typeof window !== 'undefined' ? window.location.href : '/',
      });
    }
  }, [isLoaded, isSignedIn, redirectToSignIn]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        ログイン画面へ移動しています...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex h-16 items-center px-6">
          <MobileNav />
          <div className="flex w-full">
            <Link
              href="/"
              className="group flex cursor-pointer items-center gap-3"
            >
              <span className="text-base font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-sky-600">
                Voice Recording
              </span>
            </Link>
            <div className="ml-auto">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* sidebar + main */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
        {/* sidebar */}
        <aside className="hidden md:block sticky top-16 self-start border-r">
          {/* ← 外側は幅だけ担当。パディング/高さ/スクロールは内側へ */}
          <div className="h-[calc(100vh-4rem)] overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
            <DashboardNav />
          </div>
        </aside>

        {/* main */}
        <main className="flex h-[calc(100vh-4rem)] min-w-0 w-full flex-col overflow-x-hidden overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
