"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-900 to-red-950 text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="text-center">
          <div className="text-6xl font-bold text-red-300 mb-4">⚠️</div>
          <h1 className="text-3xl font-bold mb-4">系统出现错误</h1>
          <p className="text-red-200 text-lg mb-4">
            抱歉，系统遇到了一个意外错误。
          </p>
          {error.digest && (
            <p className="text-sm text-red-300 font-mono mb-8">
              错误ID: {error.digest}
            </p>
          )}
        </div>

        <div className="bg-red-900/20 backdrop-blur-sm rounded-xl p-6 max-w-2xl">
          <h3 className="text-lg font-semibold mb-2">错误详情</h3>
          <p className="text-red-200 text-sm font-mono break-all">
            {error.message || "未知错误"}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors duration-200"
          >
            重试
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold transition-colors duration-200"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
} 