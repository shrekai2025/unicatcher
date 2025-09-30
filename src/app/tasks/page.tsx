'use client';

import { useState } from 'react';
import { DashboardLayout } from '~/components/dashboard-layout';
import { api } from '~/trpc/react';

export default function TasksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<'list' | 'username'>('list'); // Tab切换状态
  const [createForm, setCreateForm] = useState({
    listId: '',
    username: '',
    maxTweets: 20,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // API 查询
  const tasksQuery = api.tasks.list.useQuery(
    { page: currentPage, limit: 10 },
    {
      refetchOnWindowFocus: true, // 仅在窗口聚焦时刷新
    }
  );

  // API 变更
  const createTask = api.tasks.create.useMutation({
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setCreateForm({ listId: '', username: '', maxTweets: 20 });
      void tasksQuery.refetch();
    },
  });

  const createByUsername = api.tasks.createByUsername.useMutation({
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setCreateForm({ listId: '', username: '', maxTweets: 20 });
      void tasksQuery.refetch();
    },
  });

  const cancelTask = api.tasks.cancel.useMutation({
    onSuccess: () => {
      void tasksQuery.refetch();
    },
  });

  const deleteTask = api.tasks.delete.useMutation({
    onSuccess: () => {
      void tasksQuery.refetch();
    },
  });

  const retryTask = api.tasks.retry.useMutation({
    onSuccess: () => {
      void tasksQuery.refetch();
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();

    if (taskMode === 'list') {
      if (!createForm.listId.trim()) {
        alert('请输入Twitter List ID');
        return;
      }
      createTask.mutate({
        listId: createForm.listId.trim(),
        maxTweets: createForm.maxTweets,
      });
    } else {
      if (!createForm.username.trim()) {
        alert('请输入Twitter用户名');
        return;
      }
      if (createForm.username.includes('@')) {
        alert('用户名不要包含@符号');
        return;
      }
      createByUsername.mutate({
        username: createForm.username.trim(),
        maxTweets: createForm.maxTweets,
      });
    }
  };

  const handleCancelTask = (taskId: string) => {
    if (confirm('确定要取消这个任务吗？')) {
      cancelTask.mutate({ id: taskId });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('确定要删除这个任务吗？删除后无法恢复。')) {
      deleteTask.mutate({ id: taskId });
    }
  };

  const handleRetryTask = (taskId: string) => {
    if (confirm('确定要重试这个任务吗？')) {
      retryTask.mutate({ id: taskId });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      pending: '等待中',
      running: '运行中',
      completed: '已完成',
      failed: '失败',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const headerActions = (
    <button
      onClick={() => setIsCreateModalOpen(true)}
      className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
    >
      <span className="mr-2">➕</span>
      创建任务
    </button>
  );

  return (
    <DashboardLayout actions={headerActions}>
      {/* 筛选器 */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            状态筛选:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="all">全部</option>
            <option value="pending">等待中</option>
            <option value="running">运行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
          </select>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {tasksQuery.data?.data?.tasks?.map((task: any) => (
            <li key={task.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {task.status === 'completed' ? '✓' :
                           task.status === 'running' ? '▷' :
                           task.status === 'failed' ? '✗' : '○'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          List ID: {task.listId}
                        </p>
                        <div className="ml-2 flex-shrink-0">
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <p>
                            创建时间: {new Date(task.createdAt).toLocaleString('zh-CN')}
                            {task.finishedAt && (
                              <span className="ml-4">
                                完成时间: {new Date(task.finishedAt).toLocaleString('zh-CN')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {task.status === 'running' && (
                      <button
                        onClick={() => handleCancelTask(task.id)}
                        disabled={cancelTask.isPending}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                      >
                        取消
                      </button>
                    )}
                    {task.status === 'failed' && (
                      <button
                        onClick={() => handleRetryTask(task.id)}
                        disabled={retryTask.isPending}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        重试
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTask.isPending}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
                {task.result?.message && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>{task.result.message}</p>
                  </div>
                )}
              </div>
            </li>
          )) || (
            <li className="px-4 py-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p>暂无任务</p>
              <p className="text-sm mt-2">点击"创建任务"按钮开始您的第一个爬取任务</p>
            </li>
          )}
        </ul>
      </div>

      {/* 分页 */}
      {tasksQuery.data?.data?.hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            加载更多
          </button>
        </div>
      )}

      {/* 创建任务模态框 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                创建爬取任务
              </h3>

              {/* Tab切换 */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  type="button"
                  onClick={() => setTaskMode('list')}
                  className={`flex-1 py-2 text-sm font-medium ${
                    taskMode === 'list'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  List模式
                </button>
                <button
                  type="button"
                  onClick={() => setTaskMode('username')}
                  className={`flex-1 py-2 text-sm font-medium ${
                    taskMode === 'username'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Username模式
                </button>
              </div>

              <form onSubmit={handleCreateTask}>
                <div className="mt-2 px-7 py-3">
                  <div className="space-y-4">
                    {taskMode === 'list' ? (
                      <div>
                        <label htmlFor="listId" className="block text-sm font-medium text-gray-700 text-left">
                          Twitter List ID *
                        </label>
                        <input
                          type="text"
                          id="listId"
                          value={createForm.listId}
                          onChange={(e) => setCreateForm({ ...createForm, listId: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="输入List ID"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          从 Twitter List URL 中获取的数字 ID
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 text-left">
                          Twitter Username *
                        </label>
                        <input
                          type="text"
                          id="username"
                          value={createForm.username}
                          onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="输入用户名"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          请输入用户名(不要带@符号)
                        </p>
                      </div>
                    )}
                    <div>
                      <label htmlFor="maxTweets" className="block text-sm font-medium text-gray-700 text-left">
                        最大推文数量
                      </label>
                      <input
                        type="number"
                        id="maxTweets"
                        value={createForm.maxTweets}
                        onChange={(e) => setCreateForm({ ...createForm, maxTweets: parseInt(e.target.value) })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        min="1"
                        max="1000"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        建议设置为 20-100 之间的数值
                      </p>
                    </div>
                  </div>
                </div>
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={createTask.isPending || createByUsername.isPending}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                    >
                      {(createTask.isPending || createByUsername.isPending) ? '创建中...' : '创建任务'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}