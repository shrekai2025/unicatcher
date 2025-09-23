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
  { name: 'X辅助器', href: '/x-helper', icon: '🔧' },
  { name: '数据查看', href: '/viewer', icon: '👁️' },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, []);

  const navigation = getNavigationByRole(session.role);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
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
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
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
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 左侧导航 */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={getHomeHref()} className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                UniCatcher
              </Link>
            </div>
            
            {/* 桌面端导航菜单 */}
            <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200",
                    pathname === item.href
                      ? "border-blue-500 text-gray-900 bg-blue-50"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* 右侧用户信息 */}
          <div className="flex items-center space-x-4">
            {/* 角色标识 */}
            <div className="hidden sm:flex items-center space-x-2">
              <span className={cn(
                "px-2 py-1 text-xs font-medium rounded-full",
                session.role === 'admin' 
                  ? "bg-purple-100 text-purple-800" 
                  : "bg-green-100 text-green-800"
              )}>
                {session.role === 'admin' ? '管理员' : '查看者'}
              </span>
              <span className="text-sm text-gray-600">
                {session.username || '用户'}
              </span>
            </div>
            
            {/* 退出登录按钮 */}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-100"
            >
              退出登录
            </button>

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              aria-expanded="false"
            >
              <span className="sr-only">打开主菜单</span>
              <svg
                className={cn("h-6 w-6 transition-transform duration-200", isMobileMenuOpen && "rotate-90")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "block pl-3 pr-4 py-2 text-base font-medium transition-colors",
                    pathname === item.href
                      ? "bg-blue-50 border-r-4 border-blue-500 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
            
            {/* 移动端用户信息 */}
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="flex items-center px-4 space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {session.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-gray-800">
                    {session.username || '用户'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {session.role === 'admin' ? '系统管理员' : '数据查看者'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 