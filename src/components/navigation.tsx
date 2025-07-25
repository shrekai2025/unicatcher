'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '~/lib/utils';

const navigation = [
  { name: '仪表板', href: '/dashboard', icon: '📊' },
  { name: '任务管理', href: '/tasks', icon: '⚙️' },
  { name: '推文数据', href: '/tweets', icon: '🐦' },
  { name: '数据提取', href: '/extracts', icon: '📤' },
  { name: 'API文档', href: '/api-docs', icon: '📖' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
                UniCatcher
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                    pathname === item.href
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <Link
              href="/api/auth/signout"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              退出登录
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 