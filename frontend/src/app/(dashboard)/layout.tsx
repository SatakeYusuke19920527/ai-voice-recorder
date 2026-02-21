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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-cyan-50 to-sky-100">
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 top-1/3 h-60 w-60 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="relative flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-6 py-4 shadow-xl backdrop-blur-md">
          <span className="h-3 w-3 animate-ping rounded-full bg-sky-500" />
          <span className="text-sm font-semibold tracking-wide text-slate-700">
            Now Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <MobileNav />
          <div className="flex w-full">
            <Link
              href="/"
              className="group flex cursor-pointer items-center gap-3"
            >
              <span className="rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-base font-semibold tracking-tight text-transparent transition-colors duration-200 group-hover:from-sky-700 group-hover:to-cyan-700">
                Voice Recording
              </span>
            </Link>
            <div className="ml-auto flex items-center">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* sidebar + main */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr]">
        {/* sidebar */}
        <aside className="sticky top-16 hidden self-start border-r border-slate-200/70 md:block">
          {/* ← 外側は幅だけ担当。パディング/高さ/スクロールは内側へ */}
          <div className="h-[calc(100vh-4rem)] overflow-y-auto px-4 py-5 lg:px-6 lg:py-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-lg shadow-slate-900/5 backdrop-blur">
              <DashboardNav />
            </div>
          </div>
        </aside>

        {/* main */}
        <main className="flex h-[calc(100vh-4rem)] min-w-0 w-full flex-col overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
