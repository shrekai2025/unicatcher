'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export default function TaskManagementPage() {
  // 获取正在运行的任务
  const runningTasksQuery = api.taskManagement.getRunningTasks.useQuery();

  // 获取任务历史
  const taskHistoryQuery = api.taskManagement.getTaskHistory.useQuery({ limit: 20 });

  // 取消任务
  const cancelTask = api.taskManagement.cancelTask.useMutation({
    onSuccess: () => {
      void runningTasksQuery.refetch();
      void taskHistoryQuery.refetch();
    },
  });

  // 取消所有任务
  const cancelAllTasks = api.taskManagement.cancelAllTasks.useMutation({
    onSuccess: () => {
      void runningTasksQuery.refetch();
      void taskHistoryQuery.refetch();
    },
  });

  const handleCancelTask = async (taskKey: string) => {
    if (confirm('确定要取消这个任务吗？')) {
      await cancelTask.mutateAsync({ taskKey });
    }
  };

  const handleCancelAllTasks = async () => {
    const count = runningTasksQuery.data?.tasks?.length || 0;
    if (count === 0) {
      alert('当前没有正在运行的任务');
      return;
    }
    if (confirm(`确定要取消所有 ${count} 个正在运行的任务吗？`)) {
      await cancelAllTasks.mutateAsync();
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">运行中</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">已完成</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">已取消</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">已失败</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">任务管理</h1>
          <p className="mt-2 text-gray-600">
            查看和管理所有正在运行的任务和历史记录
          </p>
        </div>

        {/* 控制面板 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={() => {
                void runningTasksQuery.refetch();
                void taskHistoryQuery.refetch();
              }}
              disabled={runningTasksQuery.isRefetching || taskHistoryQuery.isRefetching}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {runningTasksQuery.isRefetching ? '刷新中...' : '手动刷新'}
            </button>

            <button
              onClick={handleCancelAllTasks}
              disabled={!runningTasksQuery.data?.tasks?.length || cancelAllTasks.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelAllTasks.isPending ? '取消中...' : '取消所有任务'}
            </button>
          </div>
        </div>

        {/* 正在运行的任务 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            正在运行的任务 ({runningTasksQuery.data?.count || 0})
          </h2>

          {runningTasksQuery.isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : runningTasksQuery.data?.tasks && runningTasksQuery.data.tasks.length > 0 ? (
            <div className="space-y-4">
              {runningTasksQuery.data.tasks.map((task) => (
                <div
                  key={task.key}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusBadge(task.status)}
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {task.description}
                        </h3>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">任务Key:</span> <code className="bg-gray-100 px-2 py-1 rounded">{task.key}</code>
                        </div>
                        <div>
                          <span className="font-medium">开始时间:</span> {formatTime(task.startTime)}
                        </div>
                        <div>
                          <span className="font-medium">运行时长:</span> {formatDuration(task.duration)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelTask(task.key)}
                      disabled={cancelTask.isPending}
                      className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {cancelTask.isPending ? '取消中...' : '取消任务'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无正在运行的任务
            </div>
          )}
        </div>

        {/* 任务历史 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            任务历史 (最近{taskHistoryQuery.data?.count || 0}条)
          </h2>

          {taskHistoryQuery.isLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : taskHistoryQuery.data?.history && taskHistoryQuery.data.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      任务描述
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      任务Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      开始时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taskHistoryQuery.data.history.map((task, index) => (
                    <tr key={`${task.key}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{task.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{task.key}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatTime(task.startTime)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无任务历史记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}