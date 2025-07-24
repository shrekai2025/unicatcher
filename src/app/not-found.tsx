import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950 text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="text-center">
          <div className="text-8xl font-bold text-blue-300 mb-4">404</div>
          <h1 className="text-3xl font-bold mb-4">页面未找到</h1>
          <p className="text-blue-200 text-lg mb-8">
            抱歉，您访问的页面不存在或已被移除。
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors duration-200"
          >
            返回首页
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold transition-colors duration-200"
          >
            重新登录
          </Link>
        </div>
      </div>
    </main>
  );
} 