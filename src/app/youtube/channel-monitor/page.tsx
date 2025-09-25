'use client';

import { useState } from 'react';
import { DashboardLayout } from '~/components/dashboard-layout';
import { api } from '~/trpc/react';

export default function ChannelMonitorPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'tasks' | 'videos'>('channels');
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // 表单状态
  const [channelForm, setChannelForm] = useState({
    channelHandle: '',
    channelName: '',
    notes: '',
  });

  const [taskForm, setTaskForm] = useState({
    channelHandle: '',
    maxVideos: 20,
    duplicateStopCount: 3,
  });

  // API 查询
  const channelsQuery = api.youtube.getChannelRecords.useQuery(
    { page: currentPage, limit: 10 },
    { refetchOnWindowFocus: false }
  );

  const tasksQuery = api.youtube.getTasks.useQuery(
    { page: currentPage, limit: 10 },
    { refetchOnWindowFocus: false }
  );

  const videosQuery = api.youtube.getVideos.useQuery(
    { page: currentPage, limit: 20 },
    { refetchOnWindowFocus: false }
  );

  const statsQuery = api.youtube.getStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // 30秒刷新一次统计
  });

  // API 变更
  const addChannel = api.youtube.addChannelRecord.useMutation({
    onSuccess: () => {
      setIsAddChannelModalOpen(false);
      setChannelForm({ channelHandle: '', channelName: '', notes: '' });
      void channelsQuery.refetch();
      void statsQuery.refetch();
    },
  });

  const createTask = api.youtube.createTask.useMutation({
    onSuccess: () => {
      setIsCreateTaskModalOpen(false);
      setTaskForm({ channelHandle: '', maxVideos: 20, duplicateStopCount: 3 });
      void tasksQuery.refetch();
    },
  });

  const cancelTask = api.youtube.cancelTask.useMutation({
    onSuccess: () => {
      void tasksQuery.refetch();
    },
  });

  const deleteChannel = api.youtube.deleteChannelRecord.useMutation({
    onSuccess: () => {
      void channelsQuery.refetch();
      void statsQuery.refetch();
    },
  });

  // 处理函数
  const handleAddChannel = () => {
    if (!channelForm.channelHandle.trim() || !channelForm.channelName.trim()) {
      return;
    }

    addChannel.mutate({
      channelHandle: channelForm.channelHandle.trim(),
      channelName: channelForm.channelName.trim(),
      notes: channelForm.notes.trim() || undefined,
    });
  };

  const handleCreateTask = () => {
    if (!taskForm.channelHandle.trim()) {
      return;
    }

    createTask.mutate({
      channelHandle: taskForm.channelHandle.trim(),
      maxVideos: taskForm.maxVideos,
      duplicateStopCount: taskForm.duplicateStopCount,
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YouTube Channel 监控
          </h1>
          <p className="text-gray-600">
            监控 YouTube 频道，自动采集最新视频数据
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  📺
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">监控频道</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsQuery.data?.activeChannels ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  🎬
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">总视频数</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatNumber(statsQuery.data?.totalVideos ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  📈
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">今日新增</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsQuery.data?.todayVideos ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  ⚙️
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">运行任务</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsQuery.data?.runningTasks ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('channels')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'channels'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                频道管理
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                监控任务
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'videos'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                视频数据
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 频道管理 Tab */}
            {activeTab === 'channels' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">频道列表</h2>
                  <button
                    onClick={() => setIsAddChannelModalOpen(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    添加频道
                  </button>
                </div>

                {channelsQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : channelsQuery.data?.channels.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📺</div>
                    <p className="text-gray-500">还没有添加任何频道</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            频道信息
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状态
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            最后爬取
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            视频数
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {channelsQuery.data?.channels.map((channel) => (
                          <tr key={channel.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {channel.channelName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {channel.channelHandle}
                                </div>
                                {channel.notes && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {channel.notes}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  channel.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {channel.isActive ? '活跃' : '暂停'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {channel.lastCrawledAt
                                ? formatDate(channel.lastCrawledAt)
                                : '从未'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {channel.videoCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => {
                                  setTaskForm({
                                    ...taskForm,
                                    channelHandle: channel.channelHandle,
                                  });
                                  setIsCreateTaskModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-900 mr-3"
                              >
                                开始监控
                              </button>
                              <button
                                onClick={() => deleteChannel.mutate({ id: channel.id })}
                                className="text-red-600 hover:text-red-900"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 监控任务 Tab */}
            {activeTab === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">监控任务</h2>
                  <button
                    onClick={() => setIsCreateTaskModalOpen(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    创建任务
                  </button>
                </div>

                {tasksQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : tasksQuery.data?.tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">⚙️</div>
                    <p className="text-gray-500">还没有创建任何监控任务</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            频道
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状态
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            视频数
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            创建时间
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tasksQuery.data?.tasks.map((task) => (
                          <tr key={task.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {task.channelHandle || '未知频道'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  task.status === 'running'
                                    ? 'bg-blue-100 text-blue-800'
                                    : task.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : task.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {task.status === 'running'
                                  ? '运行中'
                                  : task.status === 'completed'
                                  ? '已完成'
                                  : task.status === 'failed'
                                  ? '失败'
                                  : task.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {task.videoCount || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(task.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {task.status === 'running' && (
                                <button
                                  onClick={() => cancelTask.mutate({ taskId: task.id })}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  取消
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 视频数据 Tab */}
            {activeTab === 'videos' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-6">视频数据</h2>

                {videosQuery.isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : videosQuery.data?.videos.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🎬</div>
                    <p className="text-gray-500">还没有采集到任何视频数据</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videosQuery.data?.videos.map((video) => (
                      <div key={video.id} className="bg-gray-50 rounded-lg overflow-hidden">
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                            {video.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {video.channelName}
                          </p>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{formatNumber(video.viewCount)} 次观看</span>
                            <span>{video.duration}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {video.publishedAt}
                          </p>
                          <div className="mt-3">
                            <a
                              href={video.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              观看视频 →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 添加频道模态框 */}
        {isAddChannelModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">添加监控频道</h3>
                  <button
                    onClick={() => setIsAddChannelModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      频道 Handle
                    </label>
                    <input
                      type="text"
                      value={channelForm.channelHandle}
                      onChange={(e) =>
                        setChannelForm({ ...channelForm, channelHandle: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="@username 或 UC开头的频道ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      频道名称
                    </label>
                    <input
                      type="text"
                      value={channelForm.channelName}
                      onChange={(e) =>
                        setChannelForm({ ...channelForm, channelName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="频道显示名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      备注（可选）
                    </label>
                    <textarea
                      value={channelForm.notes}
                      onChange={(e) =>
                        setChannelForm({ ...channelForm, notes: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      rows={3}
                      placeholder="频道备注信息"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsAddChannelModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddChannel}
                    disabled={addChannel.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {addChannel.isPending ? '添加中...' : '添加频道'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 创建任务模态框 */}
        {isCreateTaskModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">创建监控任务</h3>
                  <button
                    onClick={() => setIsCreateTaskModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      频道 Handle
                    </label>
                    <input
                      type="text"
                      value={taskForm.channelHandle}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, channelHandle: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="@username 或 UC开头的频道ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大视频数
                    </label>
                    <input
                      type="number"
                      value={taskForm.maxVideos}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, maxVideos: parseInt(e.target.value) || 20 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      min="1"
                      max="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      重复停止数
                    </label>
                    <input
                      type="number"
                      value={taskForm.duplicateStopCount}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          duplicateStopCount: parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      min="1"
                      max="10"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      连续遇到多少个重复视频后停止爬取
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsCreateTaskModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={createTask.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {createTask.isPending ? '创建中...' : '创建任务'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}