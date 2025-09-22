import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { AppProvider } from "~/components/app-provider";

export const metadata: Metadata = {
  title: "UniCatcher - 通用浏览器爬虫系统",
  description: "基于 T3 Stack 的通用浏览器爬虫系统，支持 Twitter List 爬取功能",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased bg-gray-50 min-h-screen">
        <TRPCReactProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
