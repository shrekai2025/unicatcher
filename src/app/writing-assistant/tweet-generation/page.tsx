'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Loader2, Sparkles, Copy, Star, MessageSquare, RefreshCw, AlertCircle } from 'lucide-react';

export default function TweetGenerationPage() {
  const [selectedUsername, setSelectedUsername] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [topic, setTopic] = useState('');
  const [generateCount, setGenerateCount] = useState(3);
  const [showResults, setShowResults] = useState(false);

  // 获取可用用户列表
  const { data: usersData } = api.tweetGeneration.getAvailableUsers.useQuery();

  // 获取内容类型列表
  const { data: typesData } = api.tweetGeneration.getContentTypes.useQuery();

  // 获取用户类型统计
  const { data: userStats, refetch: refetchUserStats } = api.tweetGeneration.getUserTypeStats.useQuery(
    { username: selectedUsername },
    { enabled: !!selectedUsername }
  );

  // 预览用户风格
  const { data: stylePreview, error: stylePreviewError } = api.tweetGeneration.previewUserStyle.useQuery(
    { username: selectedUsername, contentType: selectedContentType },
    { enabled: !!selectedUsername && !!selectedContentType, retry: false }
  );

  // 获取生成历史
  const { data: historyData, refetch: refetchHistory } = api.tweetGeneration.getGenerationHistory.useQuery({
    username: selectedUsername || undefined,
    limit: 10,
    offset: 0
  });

  // 创建生成任务
  const createTask = api.tweetGeneration.createGenerationTask.useMutation({
    onSuccess: () => {
      setShowResults(true);
      // 延迟刷新历史,等待任务处理
      setTimeout(() => {
        refetchHistory();
      }, 2000);
    }
  });

  // 提交反馈
  const submitFeedback = api.tweetGeneration.submitFeedback.useMutation({
    onSuccess: () => {
      refetchHistory();
    }
  });

  const handleGenerate = () => {
    if (!selectedUsername || !selectedContentType) {
      alert('请选择用户和内容类型');
      return;
    }

    createTask.mutate({
      username: selectedUsername,
      contentType: selectedContentType,
      topic: topic || undefined,
      generateCount,
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleRating = (resultId: string, rating: number) => {
    submitFeedback.mutate({ resultId, rating });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-blue-600" />
            推文生成
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            基于用户风格数据生成个性化推文，只需选择用户名和内容类型
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧: 配置区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 用户选择 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">1. 选择用户</h2>
              <select
                value={selectedUsername}
                onChange={(e) => {
                  setSelectedUsername(e.target.value);
                  setSelectedContentType(''); // 重置类型选择
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择用户...</option>
                {usersData?.users.map((user) => (
                  <option key={user.username} value={user.username}>
                    {user.username} ({user.tweetCount}条推文)
                  </option>
                ))}
              </select>

              {userStats && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    📊 共{userStats.data.totalTweets}条推文 | 已分析{userStats.data.types.length}种类型
                    {userStats.data.lastAnalyzed && (
                      <> | 最后分析: {new Date(userStats.data.lastAnalyzed).toLocaleDateString('zh-CN')}</>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 内容类型选择 */}
            {selectedUsername && typesData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">2. 选择内容类型</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {typesData.types.map((type) => {
                    const userTypeData = userStats?.data.types.find(t => t.contentType === type.value);
                    const hasSamples = userTypeData && userTypeData.sampleCount != null && userTypeData.sampleCount > 0;

                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedContentType(type.value)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedContentType === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {hasSamples ? (
                            <span className="text-green-600">✓ {userTypeData?.sampleCount ?? 0}条样本</span>
                          ) : (
                            <span className="text-orange-500">○ 未分析</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedContentType && typesData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    {typesData.types.find((t) => t.value === selectedContentType) && (
                      <div className="text-sm text-gray-700">
                        <div className="font-medium mb-2">类型特征:</div>
                        <div>
                          💡 分类: {typesData.types.find((t) => t.value === selectedContentType)?.category}
                        </div>
                        <div>
                          📝 特征: {typesData.types.find((t) => t.value === selectedContentType)?.description}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 风格预览或错误提示 */}
            {selectedUsername && selectedContentType && (
              <>
                {stylePreviewError && (
                  <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      风格数据未就绪
                    </h2>
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-sm text-yellow-800 mb-3">
                          <strong>用户 "{selectedUsername}" 尚未完成风格分析</strong>
                        </div>
                        <div className="text-sm text-gray-700 space-y-2">
                          <p>在生成个性化推文之前，需要先完成以下步骤：</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>前往 <strong>"数据提取和分析"</strong> 页面，对该用户的推文进行风格分析</li>
                            <li>或前往 <strong>"风格档案"</strong> 页面，查看和管理用户的风格数据</li>
                          </ol>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <a
                          href="/writing-assistant/data-extract"
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center text-sm font-medium"
                        >
                          前往数据提取和分析
                        </a>
                        <a
                          href="/writing-assistant/style-profiles"
                          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-center text-sm font-medium"
                        >
                          查看风格档案
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {stylePreview?.success && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">3. 风格预览</h2>
                    <div className="space-y-4">
                      {stylePreview.data.preview.commonOpenings.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">常用开头:</div>
                          <div className="flex flex-wrap gap-2">
                            {stylePreview.data.preview.commonOpenings.map((opening, i) => (
                              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                "{opening}"
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {stylePreview.data.preview.avgSentenceLength && (
                        <div className="text-sm text-gray-700">
                          平均句长: <span className="font-medium">{stylePreview.data.preview.avgSentenceLength.toFixed(0)}字</span>
                        </div>
                      )}

                      {stylePreview.data.preview.signatureWords.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">高频词汇:</div>
                          <div className="flex flex-wrap gap-2">
                            {stylePreview.data.preview.signatureWords.slice(0, 8).map((word, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {stylePreview.data.preview.exampleTweets.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">样本示例:</div>
                          <div className="space-y-2">
                            {stylePreview.data.preview.exampleTweets.slice(0, 2).map((tweet, i) => (
                              <div key={i} className="p-3 bg-gray-50 rounded text-sm text-gray-700 border-l-4 border-blue-400">
                                {tweet}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 生成参数 */}
            {selectedUsername && selectedContentType && !stylePreviewError && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">4. 生成参数 (可选)</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      话题 (选填)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="例如: 人工智能的发展趋势"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      生成数量
                    </label>
                    <select
                      value={generateCount}
                      onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>1条</option>
                      <option value={2}>2条</option>
                      <option value={3}>3条</option>
                      <option value={4}>4条</option>
                      <option value={5}>5条</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={createTask.isPending}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createTask.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        开始生成
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 右侧: 生成历史 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">生成历史</h2>
                <button
                  onClick={() => refetchHistory()}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {historyData?.data.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {task.username}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status === 'completed' ? '已完成' :
                         task.status === 'processing' ? '生成中' :
                         task.status === 'failed' ? '失败' :
                         '等待中'}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      类型: {task.contentType}
                    </div>

                    {task.topic && (
                      <div className="text-sm text-gray-600 mb-2">
                        话题: {task.topic}
                      </div>
                    )}

                    {task.results.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {task.results.map((result) => (
                          <div key={result.id} className="p-3 bg-gray-50 rounded text-sm">
                            <div className="text-gray-700 mb-2 line-clamp-2">
                              {result.generatedContent}
                            </div>
                            <div className="flex items-center justify-between">
                              {result.styleScore && (
                                <span className="text-xs text-gray-500">
                                  匹配度: {(result.styleScore * 100).toFixed(0)}%
                                </span>
                              )}
                              <button
                                onClick={() => copyToClipboard(result.generatedContent)}
                                className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                                title="复制"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {task.status === 'failed' && task.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {task.errorMessage}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}

                {(!historyData?.data.tasks || historyData.data.tasks.length === 0) && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    暂无生成记录
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}