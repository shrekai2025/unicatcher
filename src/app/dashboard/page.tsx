'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '~/components/dashboard-layout';
import { api } from '~/trpc/react';

interface SystemStats {
  totalTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalTweets: number;
  todayTweets: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats>({
    totalTasks: 0,
    runningTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalTweets: 0,
    todayTweets: 0,
  });

  // 清理功能状态
  const [showOldTweetsModal, setShowOldTweetsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const systemStatus = api.system.status.useQuery();

  // 清理功能 mutations
  const cleanValuelessTweets = api.system.cleanValuelessTweets.useMutation({
    onSuccess: (data) => {
      alert(data.message);
      systemStatus.refetch();
    },
    onError: (error) => {
      alert(`清理失败: ${error.message}`);
    },
  });

  const cleanOldTweets = api.system.cleanOldTweets.useMutation({
    onSuccess: (data) => {
      alert(data.message);
      setShowOldTweetsModal(false);
      setSelectedDate('');
      systemStatus.refetch();
    },
    onError: (error) => {
      alert(`清理失败: ${error.message}`);
    },
  });

  const deleteHiddenTweets = api.system.deleteHiddenTweets.useMutation({
    onSuccess: (data) => {
      alert(data.message);
      systemStatus.refetch();
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  useEffect(() => {
    if (systemStatus.data?.data) {
      setStats(prev => ({
        ...prev,
        runningTasks: systemStatus.data.data.runningTasks,
        totalTasks: systemStatus.data.data.totalTasks,
        totalTweets: systemStatus.data.data.totalTweets,
      }));
    }
  }, [systemStatus.data]);

  // 处理清理无价值推文
  const handleCleanValuelessTweets = () => {
    if (confirm('确定要删除所有无价值推文吗？此操作不可恢复！')) {
      cleanValuelessTweets.mutate();
    }
  };

  // 处理清理旧推文
  const handleCleanOldTweets = () => {
    if (!selectedDate) {
      alert('请选择日期');
      return;
    }
    if (confirm(`确定要删除 ${new Date(selectedDate).toLocaleString()} 之前的所有推文吗？此操作不可恢复！`)) {
      cleanOldTweets.mutate({ beforeDate: selectedDate });
    }
  };

  // 处理删除隐藏推文
  const handleDeleteHiddenTweets = () => {
    if (confirm('确定要永久删除所有隐藏推文吗？此操作不可恢复！')) {
      deleteHiddenTweets.mutate();
    }
  };

  const headerActions = (
    <Link
      href="/x-login"
      className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900 transition-colors"
    >
      <span className="mr-2">🐦</span>
      X 无头登录
    </Link>
  );

  return (
    <DashboardLayout actions={headerActions}>
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总任务数"
          value={systemStatus.data?.data?.totalTasks || 0}
          icon="📋"
          bgColor="bg-blue-500"
        />
        <StatCard
          title="运行中任务"
          value={systemStatus.data?.data?.runningTasks || 0}
          icon="▶️"
          bgColor="bg-green-500"
        />
        <StatCard
          title="总推文数"
          value={systemStatus.data?.data?.totalTweets || 0}
          icon="🐦"
          bgColor="bg-purple-500"
        />
        <StatCard
          title="系统状态"
          value={systemStatus.data?.data?.status || '正常'}
          icon="🚀"
          bgColor="bg-orange-500"
        />
      </div>

      {/* 数据库清理功能 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            数据库清理
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CleanupCard
              title="清除无价值推文"
              description="删除所有被AI标记为无价值的推文"
              icon="🗑️"
              bgColor="bg-red-500"
              buttonText="立即删除"
              buttonColor="bg-red-600 hover:bg-red-700"
              onClick={handleCleanValuelessTweets}
              isLoading={cleanValuelessTweets.isPending}
            />
            <CleanupCard
              title="删除隐藏推文"
              description="永久删除所有被标记为隐藏的推文"
              icon="👁️"
              bgColor="bg-purple-500"
              buttonText="立即删除"
              buttonColor="bg-purple-600 hover:bg-purple-700"
              onClick={handleDeleteHiddenTweets}
              isLoading={deleteHiddenTweets.isPending}
            />
            <CleanupCard
              title="清除旧推文"
              description="删除指定时间之前的所有推文"
              icon="📅"
              bgColor="bg-orange-500"
              buttonText="选择时间并删除"
              buttonColor="bg-orange-600 hover:bg-orange-700"
              onClick={() => setShowOldTweetsModal(true)}
              isLoading={false}
            />
          </div>
        </div>
      </div>

      {/* 数据统计分析 */}
      <AnalyticsSection />
      
      {/* 选择时间弹窗 */}
      <OldTweetsModal
        isOpen={showOldTweetsModal}
        onClose={() => {
          setShowOldTweetsModal(false);
          setSelectedDate('');
        }}
        onConfirm={handleCleanOldTweets}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isLoading={cleanOldTweets.isPending}
      />
    </DashboardLayout>
  );
}

function OldTweetsModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedDate, 
  setSelectedDate, 
  isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            选择删除时间点
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            将删除此时间之前发布的所有推文，此操作不可恢复！
          </p>
          <div className="mb-4">
            <label htmlFor="date-input" className="block text-sm font-medium text-gray-700 mb-2">
              选择日期时间
            </label>
            <input
              id="date-input"
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading || !selectedDate}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '删除中...' : '确认删除'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor }: { 
  title: string; 
  value: string | number; 
  icon: string; 
  bgColor: string; 
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 ${bgColor} rounded-md flex items-center justify-center`}>
              <span className="text-white text-sm">{icon}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function CleanupCard({ 
  title, 
  description, 
  icon, 
  bgColor, 
  buttonText, 
  buttonColor, 
  onClick, 
  isLoading 
}: {
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  buttonText: string;
  buttonColor: string;
  onClick: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 ${bgColor} rounded-md flex items-center justify-center`}>
            <span className="text-white text-sm">{icon}</span>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={onClick}
          disabled={isLoading}
          className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          {isLoading ? '处理中...' : buttonText}
        </button>
      </div>
    </div>
  );
}


function AnalyticsSection() {
  const [timeRange, setTimeRange] = useState<'12h' | '24h' | '7d' | '30d'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedData, setCachedData] = useState<any>(null);

  // API查询
  const analyticsQuery = api.system.getAnalyticsStats.useQuery(
    { timeRange },
    { 
      enabled: false, // 禁用自动查询，只在手动刷新时触发
    }
  );

  // 处理查询结果
  useEffect(() => {
    if (analyticsQuery.data?.success) {
      setCachedData(analyticsQuery.data.data);
      // 保存到localStorage
      localStorage.setItem('analytics-cache', JSON.stringify({
        data: analyticsQuery.data.data,
        timestamp: Date.now()
      }));
      setIsRefreshing(false);
    }
    
    if (analyticsQuery.error) {
      setIsRefreshing(false);
    }
  }, [analyticsQuery.data, analyticsQuery.error]);

  // 组件挂载时从localStorage读取缓存
  useEffect(() => {
    const cached = localStorage.getItem('analytics-cache');
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        setCachedData(data);
      } catch (error) {
        console.error('Failed to parse cached analytics data:', error);
      }
    }
  }, []);

  // 手动刷新
  const handleRefresh = () => {
    setIsRefreshing(true);
    analyticsQuery.refetch();
  };

  const timeRangeOptions = [
    { value: '12h' as const, label: '12小时' },
    { value: '24h' as const, label: '24小时' },
    { value: '7d' as const, label: '7天' },
    { value: '30d' as const, label: '30天' },
  ];

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              数据统计分析
            </h3>
            <div className="flex items-center space-x-4">
              {/* 时间范围选择 */}
              <div className="flex space-x-2">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeRange === option.value
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* 刷新按钮 */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    刷新中...
                  </>
                ) : (
                  <>
                    <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    刷新数据
                  </>
                )}
              </button>
            </div>
          </div>
          
          {cachedData && (
            <div className="mt-2 text-sm text-gray-500">
              最后更新: {new Date(cachedData.lastUpdated).toLocaleString('zh-CN')} | 
              分析推文: {cachedData.totalTweets} 条 | 
              时间范围: {timeRangeOptions.find(opt => opt.value === cachedData.timeRange)?.label}
            </div>
          )}
        </div>
      </div>

      {/* 统计数据展示 */}
      {cachedData ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 关键词统计 */}
          <StatsList
            title="关键词统计 TOP10"
            icon="🔤"
            items={cachedData.keywords}
            emptyMessage="暂无关键词数据"
          />
          
          {/* 内容类型统计 */}
          <StatsList
            title="内容类型统计"
            icon="📝"
            items={cachedData.contentTypes}
            emptyMessage="暂无内容类型数据"
          />
          
          {/* 主题标签统计 */}
          <StatsList
            title="主题标签统计"
            icon="🏷️"
            items={cachedData.topicTags}
            emptyMessage="暂无主题标签数据"
          />
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-12 text-center">
            <div className="text-gray-400 text-lg mb-2">📊</div>
            <p className="text-gray-500">点击"刷新数据"按钮获取统计信息</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsList({ 
  title, 
  icon, 
  items, 
  emptyMessage 
}: { 
  title: string; 
  icon: string; 
  items: Array<{ name: string; count: number }>; 
  emptyMessage: string; 
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center mb-4">
          <span className="text-xl mr-2">{icon}</span>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {title}
          </h3>
        </div>
        
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xs font-medium text-gray-500 w-6">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900 ml-2 truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {item.count}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}