import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  preload: true,
});

export const metadata: Metadata = {
  title: 'MCP Chat - MCP Client',
  description:
    'Model Context Protocol (MCP) 対応サーバーと接続するシンプルなチャットクライアント。',
  openGraph: {
    title: 'MCP Chat - MCP Client',
    description:
      'Model Context Protocol (MCP) 対応サーバーと接続するシンプルなチャットクライアント。',
    type: 'website',
    locale: 'ja_JP',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl={'/'} afterSignInUrl={'/'}>
      <html lang="ja">
        <body className={`${notoSansJP.className} antialiased`}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
