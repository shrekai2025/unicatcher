'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export default function WritingOverviewsPage() {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');

  // 获取所有用户概览列表
  const overviewsQuery = api.writingOverviews.getAllUserOverviews.useQuery();

  // 获取单个用户的完整概览
  const userOverviewQuery = api.writingOverviews.getUserOverview.useQuery(
    { username: selectedUsername || '' },
    { enabled: !!selectedUsername }
  );

  // 获取更新历史
  const updateHistoryQuery = api.writingOverviews.getUpdateHistory.useQuery(
    { username: selectedUsername || '' },
    { enabled: !!selectedUsername }
  );

  // 触发更新
  const triggerUpdate = api.writingOverviews.triggerOverviewUpdate.useMutation({
    onSuccess: () => {
      void overviewsQuery.refetch();
      if (selectedUsername) {
        void userOverviewQuery.refetch();
        void updateHistoryQuery.refetch();
      }
    },
  });

  // 删除概览
  const deleteOverview = api.writingOverviews.deleteOverview.useMutation({
    onSuccess: () => {
      void overviewsQuery.refetch();
      setSelectedUsername(null);
    },
  });

  const handleTriggerUpdate = async (username: string) => {
    if (confirm(`确定要更新 ${username} 的写作概览吗？这可能需要一些时间。`)) {
      await triggerUpdate.mutateAsync({ username });
    }
  };

  const handleGenerateNewOverview = async () => {
    const username = newUsername.trim();
    if (!username) {
      alert('请输入用户名');
      return;
    }

    if (username.includes('@')) {
      alert('用户名不能包含@符号');
      return;
    }

    if (confirm(`确定要为 ${username} 生成/更新写作概览吗？这可能需要一些时间。`)) {
      try {
        await triggerUpdate.mutateAsync({ username });
        setNewUsername('');
        alert('操作成功完成！');
      } catch (error) {
        alert(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  };

  const handleDelete = async (username: string) => {
    if (confirm(`确定要删除 ${username} 的写作概览吗？此操作不可恢复。`)) {
      await deleteOverview.mutateAsync({ username });
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">写作概览管理</h1>
          <p className="mt-2 text-gray-600">
            查看和管理所有用户的写作概览，手动触发更新
          </p>
        </div>

        {/* 生成新概览区域 */}
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            为指定用户生成/更新写作概览
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    void handleGenerateNewOverview();
                  }
                }}
                placeholder="输入用户名 (例如: elonmusk, 不要包含@符号)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleGenerateNewOverview}
              disabled={triggerUpdate.isPending || !newUsername.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {triggerUpdate.isPending ? '处理中...' : '生成/更新概览'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            💡 提示：如果该用户已有概览，将执行更新操作；如果没有概览，将生成初始概览
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：用户列表 */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                用户列表 ({overviewsQuery.data?.overviews.length || 0})
              </h2>
              <button
                onClick={() => void overviewsQuery.refetch()}
                disabled={overviewsQuery.isRefetching}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {overviewsQuery.isRefetching ? '刷新中...' : '刷新'}
              </button>
            </div>

            {overviewsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : overviewsQuery.data?.overviews && overviewsQuery.data.overviews.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {overviewsQuery.data.overviews.map((overview) => (
                  <div
                    key={overview.username}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedUsername === overview.username
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedUsername(overview.username)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{overview.username}</h3>
                      <span className="text-xs text-gray-500">v{overview.version}</span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">推文数:</span> {overview.totalTweetsAnalyzed}
                      </div>
                      <div>
                        <span className="font-medium">写作人格:</span> {overview.writingPersonality}
                      </div>
                      <div>
                        <span className="font-medium">更新时间:</span> {formatTime(overview.lastUpdated)}
                      </div>
                    </div>

                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTriggerUpdate(overview.username);
                        }}
                        disabled={triggerUpdate.isPending}
                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        更新
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(overview.username);
                        }}
                        disabled={deleteOverview.isPending}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">暂无写作概览</div>
            )}
          </div>

          {/* 右侧：概览详情 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">概览详情</h2>

            {!selectedUsername ? (
              <div className="text-center py-8 text-gray-500">
                请从左侧选择一个用户查看详情
              </div>
            ) : userOverviewQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : !userOverviewQuery.data?.overview ? (
              <div className="text-center py-8 text-gray-500">该用户暂无写作概览</div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {/* 整体风格 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">整体风格特征</h3>
                  <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
                    <div>
                      <span className="font-medium">写作人格:</span>{' '}
                      {userOverviewQuery.data.overview.overallStyle.writingPersonality}
                    </div>
                    <div>
                      <span className="font-medium">语调特征:</span>{' '}
                      {userOverviewQuery.data.overview.overallStyle.toneCharacteristics.join('、')}
                    </div>
                    <div>
                      <span className="font-medium">优势:</span>{' '}
                      {userOverviewQuery.data.overview.overallStyle.strengthsAnalysis}
                    </div>
                  </div>
                </div>

                {/* 典型结构 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">典型行文结构</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded p-3 text-sm">
                      <div className="font-medium text-blue-900 mb-1">开头模式</div>
                      <div className="text-blue-800">
                        {userOverviewQuery.data.overview.typicalStructure.openingPatterns.primaryPattern}
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        例: {userOverviewQuery.data.overview.typicalStructure.openingPatterns.examples[0]}
                      </div>
                    </div>

                    <div className="bg-green-50 rounded p-3 text-sm">
                      <div className="font-medium text-green-900 mb-1">展开模式</div>
                      <div className="text-green-800">
                        {userOverviewQuery.data.overview.typicalStructure.developmentPatterns.primaryPattern}
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded p-3 text-sm">
                      <div className="font-medium text-purple-900 mb-1">结尾模式</div>
                      <div className="text-purple-800">
                        {userOverviewQuery.data.overview.typicalStructure.closingPatterns.primaryPattern}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 吸引力机制 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">吸引力机制</h3>
                  <div className="space-y-2">
                    {userOverviewQuery.data.overview.attractionMechanisms.primaryHooks.slice(0, 3).map((hook, i) => (
                      <div key={i} className="bg-yellow-50 rounded p-3 text-sm">
                        <div className="font-medium text-yellow-900">{hook.type}</div>
                        <div className="text-yellow-800 text-xs mt-1">{hook.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 更新历史 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">更新历史</h3>
                  {updateHistoryQuery.isLoading ? (
                    <div className="text-sm text-gray-500">加载中...</div>
                  ) : updateHistoryQuery.data?.history && updateHistoryQuery.data.history.length > 0 ? (
                    <div className="space-y-2">
                      {updateHistoryQuery.data.history.map((log, i) => (
                        <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.updateType}</span>
                            <span className="text-gray-500">{formatTime(log.createdAt)}</span>
                          </div>
                          <div className="text-gray-600 mt-1">
                            新增 {log.newTweetsCount} 条推文
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">暂无更新历史</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}