'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ 
  children, 
  title, 
  description, 
  actions 
}: DashboardLayoutProps) {
  const pathname = usePathname();
  
  // 根据路径自动生成标题
  const getPageTitle = () => {
    if (title) return title;
    
    switch (pathname) {
      case '/dashboard':
        return '系统仪表板';
      case '/tasks':
        return '任务管理';
      case '/tweets':
        return '推文数据';
      case '/tweet-processing':
        return '推文处理';
      case '/viewer':
        return '数据查看';
      case '/api-docs':
        return 'API文档';
      case '/extracts':
        return '数据提取';
      case '/x-login':
        return 'X 登录管理';
      case '/x-helper':
        return 'X辅助器';
      default:
        return 'UniCatcher';
    }
  };

  const getPageDescription = () => {
    if (description) return description;
    
    switch (pathname) {
      case '/dashboard':
        return 'UniCatcher 系统运行状况总览';
      case '/tasks':
        return '管理和监控系统任务执行状态';
      case '/tweets':
        return '浏览和管理采集的推文数据';
      case '/tweet-processing':
        return '推文AI分析和处理状态';
      case '/viewer':
        return '以媒体卡片形式浏览推文数据';
      case '/api-docs':
        return '系统API接口文档和测试工具';
      case '/extracts':
        return '数据提取和导出功能';
      case '/x-login':
        return '管理X平台登录状态和无头浏览器';
      case '/x-helper':
        return '推文翻译和评论生成一站式工具';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* 页面头部 */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold leading-tight text-gray-900">
                {getPageTitle()}
              </h1>
              {getPageDescription() && (
                <p className="mt-2 text-gray-600 max-w-3xl">
                  {getPageDescription()}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex-shrink-0">
                {actions}
              </div>
            )}
          </div>

          {/* 页面内容 */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
