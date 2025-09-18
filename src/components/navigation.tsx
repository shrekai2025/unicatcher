'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '~/lib/utils';
import { logout, getSession } from '~/lib/simple-auth';
import type { UserRole } from '~/lib/simple-auth';

const adminNavigation = [
  { name: '仪表板', href: '/dashboard', icon: '📊' },
  { name: '任务管理', href: '/tasks', icon: '⚙️' },
  { name: '推文数据', href: '/tweets', icon: '🐦' },
  { name: '推文处理', href: '/tweet-processing', icon: '🤖' },
  { name: 'API文档', href: '/api-docs', icon: '📖' },
];

const viewerNavigation = [
  { name: '数据查看', href: '/viewer', icon: '👁️' },
];

function getNavigationByRole(role?: UserRole) {
  switch (role) {
    case 'admin':
      return adminNavigation;
    case 'viewer':
      return viewerNavigation;
    default:
      return [];
  }
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ username?: string; role?: UserRole }>({ username: undefined, role: undefined });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  const navigation = getNavigationByRole(session.role);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // 根据角色确定默认主页
  const getHomeHref = () => {
    switch (session.role) {
      case 'admin':
        return '/dashboard';
      case 'viewer':
        return '/viewer';
      default:
        return '/dashboard';
    }
  };

  // 避免 hydration 不匹配，在客户端未挂载时显示简化版
  if (!mounted) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold text-blue-600">
                  UniCatcher
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">加载中...</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={getHomeHref()} className="text-2xl font-bold text-blue-600">
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
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              欢迎，{session.username || '用户'}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 