'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '~/components/navigation';
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
  const recentTasks = api.tasks.list.useQuery({ page: 1, limit: 5 });
  const recentTweets = api.tweets.list.useQuery({ page: 1, limit: 5 });

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900">
                系统仪表板
              </h1>
              <p className="mt-2 text-gray-600">
                UniCatcher 系统运行状况总览
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/x-login"
                className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900"
              >
                <span className="mr-2">🐦</span>
                X 无头登录
              </Link>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">📋</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        总任务数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {systemStatus.data?.data?.totalTasks || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">▶️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        运行中任务
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {systemStatus.data?.data?.runningTasks || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">🐦</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        总推文数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {systemStatus.data?.data?.totalTweets || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">🚀</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        系统状态
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {systemStatus.data?.data?.status || '正常'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 数据库清理功能 */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                数据库清理
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 清除无价值推文 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">🗑️</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-sm font-medium text-gray-900">清除无价值推文</h4>
                      <p className="text-sm text-gray-500">删除所有被AI标记为无价值的推文</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleCleanValuelessTweets}
                      disabled={cleanValuelessTweets.isPending}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cleanValuelessTweets.isPending ? '删除中...' : '立即删除'}
                    </button>
                  </div>
                </div>

                {/* 清除旧推文 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">📅</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-sm font-medium text-gray-900">清除旧推文</h4>
                      <p className="text-sm text-gray-500">删除指定时间之前的所有推文</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setShowOldTweetsModal(true)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      选择时间并删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* 最近任务 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  最近任务
                </h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {recentTasks.data?.data?.tasks?.map((task: any, index: number) => (
                      <li key={task.id}>
                        <div className="relative pb-8">
                          {index !== (recentTasks.data?.data?.tasks?.length || 0) - 1 && (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                task.status === 'completed' ? 'bg-green-500' :
                                task.status === 'running' ? 'bg-blue-500' :
                                task.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                              }`}>
                                <span className="text-white text-xs">
                                  {task.status === 'completed' ? '✓' :
                                   task.status === 'running' ? '▷' :
                                   task.status === 'failed' ? '✗' : '○'}
                                </span>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  List ID: <span className="font-medium text-gray-900">{task.listId}</span>
                                </p>
                                <p className="text-sm text-gray-500">
                                  状态: <span className={`font-medium ${
                                    task.status === 'completed' ? 'text-green-600' :
                                    task.status === 'running' ? 'text-blue-600' :
                                    task.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {task.status === 'completed' ? '已完成' :
                                     task.status === 'running' ? '运行中' :
                                     task.status === 'failed' ? '失败' : '等待中'}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={task.createdAt.toISOString()}>
                                  {task.createdAt.toLocaleString('zh-CN')}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )) || (
                      <li className="text-center py-4 text-gray-500">
                        暂无任务记录
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* 最近推文 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  最近推文
                </h3>
                <div className="space-y-4">
                  {recentTweets.data?.data?.tweets?.map((tweet: any) => (
                    <div key={tweet.id} className="border-l-4 border-blue-400 pl-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-sm">🐦</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            @{tweet.userUsername}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {tweet.content}
                          </p>
                          <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                            <span>👍 {tweet.likeCount}</span>
                            <span>🔄 {tweet.retweetCount}</span>
                            <span>💬 {tweet.replyCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      暂无推文数据
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 选择时间弹窗 */}
      {showOldTweetsModal && (
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
                  onClick={() => {
                    setShowOldTweetsModal(false);
                    setSelectedDate('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  取消
                </button>
                <button
                  onClick={handleCleanOldTweets}
                  disabled={cleanOldTweets.isPending || !selectedDate}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cleanOldTweets.isPending ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 