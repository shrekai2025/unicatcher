'use client';

import { useState } from 'react';
import { DashboardLayout } from '~/components/dashboard-layout';
import { api } from '~/trpc/react';
import { getSession } from '~/lib/simple-auth';
import { CommentDialog } from '~/components/ui/comment-dialog';
import { GenerateCommentDialog } from '~/components/ui/generate-comment-dialog';

export default function TweetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTweets, setSelectedTweets] = useState<string[]>([]);
  const [expandedTweets, setExpandedTweets] = useState<string[]>([]);
  const [updatingTweets, setUpdatingTweets] = useState<string[]>([]);
  const [updatedTweets, setUpdatedTweets] = useState<{ [key: string]: any }>({});
  const [crawlingComments, setCrawlingComments] = useState<string[]>([]);
  const [commentStats, setCommentStats] = useState<{ [key: string]: any }>({});

  // 评论弹窗状态
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [viewingComments, setViewingComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [currentTweetInfo, setCurrentTweetInfo] = useState<{ id: string; content: string } | null>(null);

  // AI生成评论状态
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [currentGenerateTweet, setCurrentGenerateTweet] = useState<{ id: string; content: string } | null>(null);
  const [generatedComments, setGeneratedComments] = useState<{ [tweetId: string]: any[] }>({});
  const [expandedGeneratedComments, setExpandedGeneratedComments] = useState<string[]>([]);

  // AI服务配置状态
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);
  const [aiConfig, setAIConfig] = useState(() => {
    // 从localStorage读取生成评论AI配置
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unicatcher-comment-generation-ai-config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('生成评论AI配置解析失败:', e);
        }
      }
    }
    return {
      apiKey: '',
      provider: 'openai' as const,
      model: 'gpt-4o',
    };
  });

  // API 查询
  const tweetsQuery = api.tweets.list.useQuery({
    page: currentPage,
    limit: 10,
    search: searchQuery || undefined,
  });

  // API 变更
  const deleteTweet = api.tweets.delete.useMutation({
    onSuccess: () => {
      void tweetsQuery.refetch();
    },
  });

  const batchDeleteTweets = api.tweets.batchDelete.useMutation({
    onSuccess: () => {
      setSelectedTweets([]);
      void tweetsQuery.refetch();
    },
  });

  const exportTweets = api.tweets.export.useMutation();

  const handleSearch = () => {
    setCurrentPage(1);
    void tweetsQuery.refetch();
  };

  const handleDeleteTweet = (tweetId: string) => {
    if (confirm('确定要隐藏这条推文吗？隐藏后将不再显示在列表中。')) {
      const session = getSession();
      deleteTweet.mutate({ 
        id: tweetId, 
        deletedBy: session.username 
      });
    }
  };

  const handleBatchDelete = () => {
    if (selectedTweets.length === 0) {
      alert('请先选择要隐藏的推文');
      return;
    }
    
    if (confirm(`确定要隐藏选中的 ${selectedTweets.length} 条推文吗？隐藏后将不再显示在列表中。`)) {
      const session = getSession();
      batchDeleteTweets.mutate({ 
        ids: selectedTweets, 
        deletedBy: session.username 
      });
    }
  };

  const handleSelectTweet = (tweetId: string) => {
    setSelectedTweets(prev => 
      prev.includes(tweetId) 
        ? prev.filter(id => id !== tweetId)
        : [...prev, tweetId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTweets.length === tweetsQuery.data?.data?.tweets?.length) {
      setSelectedTweets([]);
    } else {
      setSelectedTweets(tweetsQuery.data?.data?.tweets?.map((tweet: any) => tweet.id) || []);
    }
  };

  const handleToggleExpand = (tweetId: string) => {
    setExpandedTweets(prev => 
      prev.includes(tweetId) 
        ? prev.filter(id => id !== tweetId)
        : [...prev, tweetId]
    );
  };

  const handleExportCSV = () => {
    exportTweets.mutate(
      { format: 'csv' },
      {
        onSuccess: (data: any) => {
          // 创建下载链接
          const blob = new Blob([data.data], { type: 'text/csv;charset=utf-8' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tweets_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
      }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleUpdateTweet = async (tweetId: string) => {
    try {
      setUpdatingTweets(prev => [...prev, tweetId]);

      // 调用推文更新API
      const response = await fetch('/api/tweet-processor/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'your-api-key', // 需要在环境变量中设置
        },
        body: JSON.stringify({ tweetId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失败');
      }

      const result = await response.json();
      const taskId = result.data.taskId;

      // 轮询任务状态
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/tweet-processor/status/${taskId}`, {
            headers: {
              'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'your-api-key',
            },
          });

          if (!statusResponse.ok) {
            throw new Error('获取任务状态失败');
          }

          const statusResult = await statusResponse.json();
          const status = statusResult.data.status;

          if (status === 'completed') {
            const updateResult = statusResult.data.result;
            if (updateResult.success) {
              // 更新成功，保存新数据并刷新列表
              setUpdatedTweets(prev => ({
                ...prev,
                [tweetId]: updateResult.data
              }));
              void tweetsQuery.refetch();
              alert(`推文数据更新成功！\n${updateResult.message}\n最后更新时间：${updateResult.data.lastUpdatedAt}`);
            } else {
              throw new Error(updateResult.message || '更新失败');
            }
          } else if (status === 'failed') {
            const errorMessage = statusResult.data.errorMessage || '任务执行失败';
            throw new Error(errorMessage);
          } else if (status === 'running' || status === 'queued') {
            // 继续轮询
            setTimeout(pollStatus, 2000);
            return;
          }
        } catch (pollError) {
          console.error('轮询任务状态失败:', pollError);
          throw pollError;
        }
      };

      // 开始轮询
      setTimeout(pollStatus, 1000);

    } catch (error) {
      console.error('更新推文失败:', error);
      alert(`更新推文失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setUpdatingTweets(prev => prev.filter(id => id !== tweetId));
    }
  };

  const handleCrawlComments = async (tweetId: string, incremental = false) => {
    try {
      setCrawlingComments(prev => [...prev, tweetId]);

      // 调用评论爬取API
      const response = await fetch('/api/tweet-processor/crawl-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'your-api-key',
        },
        body: JSON.stringify({
          tweetId,
          incremental,
          maxScrolls: 20
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '评论爬取失败');
      }

      const result = await response.json();
      const taskId = result.data.taskId;

      // 轮询任务状态
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/tweet-processor/status/${taskId}`, {
            headers: {
              'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'your-api-key',
            },
          });

          if (!statusResponse.ok) {
            throw new Error('获取任务状态失败');
          }

          const statusResult = await statusResponse.json();
          const status = statusResult.data.status;

          if (status === 'completed') {
            const crawlResult = statusResult.data.result;
            if (crawlResult.success) {
              // 爬取成功，更新评论统计
              setCommentStats(prev => ({
                ...prev,
                [tweetId]: {
                  totalComments: crawlResult.totalComments,
                  newComments: crawlResult.newComments,
                  hasMore: crawlResult.hasMore,
                  lastCrawledAt: new Date().toISOString(),
                }
              }));
              alert(`评论爬取成功！\n总评论数：${crawlResult.totalComments}\n新增评论：${crawlResult.newComments}`);
            } else {
              throw new Error(crawlResult.message || '爬取失败');
            }
          } else if (status === 'failed') {
            const errorMessage = statusResult.data.errorMessage || '任务执行失败';
            throw new Error(errorMessage);
          } else if (status === 'running' || status === 'queued') {
            // 继续轮询
            setTimeout(pollStatus, 2000);
            return;
          }
        } catch (pollError) {
          console.error('轮询任务状态失败:', pollError);
          throw pollError;
        }
      };

      // 开始轮询
      setTimeout(pollStatus, 1000);

    } catch (error) {
      console.error('爬取评论失败:', error);
      alert(`爬取评论失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setCrawlingComments(prev => prev.filter(id => id !== tweetId));
    }
  };

  const handleClearComments = async (tweetId: string) => {
    if (!confirm('确定要清除这条推文的所有评论吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/tweet-processor/clear-comments/${tweetId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'your-api-key',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '清除评论失败');
      }

      const result = await response.json();

      // 更新评论统计
      setCommentStats(prev => ({
        ...prev,
        [tweetId]: {
          totalComments: 0,
          newComments: 0,
          hasMore: false,
          lastClearedAt: new Date().toISOString(),
        }
      }));

      alert(`评论清除成功！\n已删除 ${result.data.deletedComments} 条评论`);

    } catch (error) {
      console.error('清除评论失败:', error);
      alert(`清除评论失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleViewComments = async (tweetId: string, tweetContent: string) => {
    try {
      setLoadingComments(true);
      setCurrentTweetInfo({ id: tweetId, content: tweetContent });
      setCommentDialogOpen(true);

      const response = await fetch(`/api/tweet-processor/comments/${tweetId}?includeStats=true`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'your-api-key',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取评论失败');
      }

      const result = await response.json();
      const commentData = result.data;

      // 设置评论数据到弹窗
      setViewingComments(commentData.comments || []);

    } catch (error) {
      console.error('查看评论失败:', error);
      alert(`查看评论失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setCommentDialogOpen(false);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleRefreshComments = () => {
    if (currentTweetInfo) {
      handleViewComments(currentTweetInfo.id, currentTweetInfo.content);
    }
  };

  const handleGenerateComments = (tweetId: string, tweetContent: string) => {
    setCurrentGenerateTweet({ id: tweetId, content: tweetContent });
    setGenerateDialogOpen(true);
  };

  const handleCommentsGenerated = (tweetId: string, comments: any[]) => {
    setGeneratedComments(prev => ({
      ...prev,
      [tweetId]: comments
    }));
  };

  const handleToggleGeneratedComments = (tweetId: string) => {
    setExpandedGeneratedComments(prev =>
      prev.includes(tweetId)
        ? prev.filter(id => id !== tweetId)
        : [...prev, tweetId]
    );
  };

  const handleCopyGeneratedComment = (content: string) => {
    navigator.clipboard.writeText(content);
    // 可以添加一个提示toast
  };

  // 保存AI配置到localStorage
  const saveAIConfig = (config: any) => {
    setAIConfig(config);
    if (typeof window !== 'undefined') {
      localStorage.setItem('unicatcher-comment-generation-ai-config', JSON.stringify(config));
    }
    setShowAIConfigModal(false);
  };

  const headerActions = (
    <div className="flex items-center space-x-3">
      <button
        onClick={() => setShowAIConfigModal(true)}
        className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        title="生成评论AI配置"
      >
        <span className="mr-2">🤖</span>
        AI配置
      </button>
      <button
        onClick={handleExportCSV}
        disabled={exportTweets.isPending}
        className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="mr-2">📥</span>
        {exportTweets.isPending ? '导出中...' : '导出CSV'}
      </button>
      {selectedTweets.length > 0 && (
        <button
          onClick={handleBatchDelete}
          disabled={batchDeleteTweets.isPending}
          className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="mr-2">🗑️</span>
          {batchDeleteTweets.isPending ? '删除中...' : `删除选中 (${selectedTweets.length})`}
        </button>
      )}
    </div>
  );

  return (
    <DashboardLayout actions={headerActions}>
      {/* 搜索和操作区域 */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索推文内容、用户名..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* 推文列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              推文列表
            </h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTweets.length === tweetsQuery.data?.data?.tweets?.length && tweetsQuery.data?.data?.tweets?.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">全选</span>
              </label>
              {selectedTweets.length > 0 && (
                <span className="text-sm text-gray-500">
                  已选择 {selectedTweets.length} 条
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  选择
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  推文内容
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  发布时间
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  统计数据
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tweetsQuery.data?.data?.tweets?.map((tweet: any) => (
                <tr key={tweet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTweets.includes(tweet.id)}
                      onChange={() => handleSelectTweet(tweet.id)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {tweet.profileImageUrl ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={tweet.profileImageUrl}
                            alt={tweet.userNickname}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-sm">
                              {tweet.userNickname?.[0] || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {tweet.userNickname}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{tweet.userUsername}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md">
                      {expandedTweets.includes(tweet.id) ? (
                        <div>
                          {tweet.content}
                          <button
                            onClick={() => handleToggleExpand(tweet.id)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            收起
                          </button>
                        </div>
                      ) : (
                        <div>
                          {truncateText(tweet.content)}
                          {tweet.content.length > 100 && (
                            <button
                              onClick={() => handleToggleExpand(tweet.id)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              展开
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-2">
                      {tweet.tweetUrl && (
                        <a
                          href={tweet.tweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          查看原推 ↗
                        </a>
                      )}
                      <button
                        onClick={() => handleUpdateTweet(tweet.id)}
                        disabled={updatingTweets.includes(tweet.id)}
                        className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingTweets.includes(tweet.id) ? '更新中...' : '更新数据'}
                      </button>
                      {updatedTweets[tweet.id] && (
                        <span className="text-xs text-green-500">
                          ✓ 已更新 {updatedTweets[tweet.id].lastUpdatedAt}
                        </span>
                      )}

                      {/* 评论管理按钮 */}
                      <div className="flex items-center space-x-2 border-l pl-2 ml-2">
                        <button
                          onClick={() => handleCrawlComments(tweet.id, false)}
                          disabled={crawlingComments.includes(tweet.id)}
                          className="text-purple-600 hover:text-purple-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="全量爬取评论"
                        >
                          {crawlingComments.includes(tweet.id) ? '爬取中...' : '爬取评论'}
                        </button>

                        <button
                          onClick={() => handleCrawlComments(tweet.id, true)}
                          disabled={crawlingComments.includes(tweet.id)}
                          className="text-purple-500 hover:text-purple-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="增量爬取评论"
                        >
                          增量爬取
                        </button>

                        <button
                          onClick={() => handleViewComments(tweet.id, tweet.content)}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                          title="查看评论统计"
                        >
                          查看评论
                        </button>

                        <button
                          onClick={() => handleClearComments(tweet.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          title="清除所有评论"
                        >
                          清除评论
                        </button>

                        <button
                          onClick={() => handleGenerateComments(tweet.id, tweet.content)}
                          className="text-orange-600 hover:text-orange-800 text-sm"
                          title="AI生成评论"
                        >
                          生成评论
                        </button>
                      </div>

                      {/* 评论统计显示 */}
                      {commentStats[tweet.id] && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="text-purple-500">
                            💬 {commentStats[tweet.id].totalComments} 条评论
                          </span>
                          {commentStats[tweet.id].newComments > 0 && (
                            <span className="ml-2 text-green-500">
                              +{commentStats[tweet.id].newComments} 新增
                            </span>
                          )}
                          {commentStats[tweet.id].lastCrawledAt && (
                            <span className="ml-2">
                              爬取于 {new Date(commentStats[tweet.id].lastCrawledAt).toLocaleString('zh-CN')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* AI生成评论显示 */}
                      {(generatedComments[tweet.id]?.length ?? 0) > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-orange-700">
                              🤖 AI生成评论 ({generatedComments[tweet.id]?.length || 0} 条)
                            </span>
                            <button
                              onClick={() => handleToggleGeneratedComments(tweet.id)}
                              className="text-xs text-orange-600 hover:text-orange-800"
                            >
                              {expandedGeneratedComments.includes(tweet.id) ? '收起' : '展开'}
                            </button>
                          </div>

                          {expandedGeneratedComments.includes(tweet.id) && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {generatedComments[tweet.id]?.map((comment: any, index: number) => (
                                <div key={index} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-medium text-orange-700">
                                      评论 {index + 1}
                                    </span>
                                    <button
                                      onClick={() => handleCopyGeneratedComment(comment.content)}
                                      className="text-xs text-orange-600 hover:text-orange-800"
                                      title="复制评论内容"
                                    >
                                      复制
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-900 mb-1">{comment.content}</p>
                                  {comment.reasoning && (
                                    <p className="text-xs text-gray-600">
                                      <strong>生成理由：</strong>{comment.reasoning}
                                    </p>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1">
                                    长度：{comment.content.length} 字符
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(tweet.publishedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>❤️ {tweet.likeCount || 0}</div>
                      <div>🔄 {tweet.retweetCount || 0}</div>
                      <div>💬 {tweet.replyCount || 0}</div>
                      <div>👁️ {tweet.viewCount || 0}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteTweet(tweet.id)}
                      disabled={deleteTweet.isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      隐藏
                    </button>
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {tweetsQuery.isLoading ? '加载中...' : '暂无推文数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {tweetsQuery.data?.data?.tweets && tweetsQuery.data.data.tweets.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!tweetsQuery.data?.data?.hasMore}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, tweetsQuery.data?.data?.total || 0)}
                  </span>{' '}
                  条，共 <span className="font-medium">{tweetsQuery.data?.data?.total || 0}</span> 条结果
                  {selectedTweets.length > 0 && (
                    <span className="ml-2">，已选择 {selectedTweets.length} 条</span>
                  )}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!tweetsQuery.data?.data?.hasMore}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 评论弹窗 */}
      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        comments={viewingComments}
        loading={loadingComments}
        tweetId={currentTweetInfo?.id}
        tweetContent={currentTweetInfo?.content}
        onRefresh={handleRefreshComments}
      />

      {/* AI生成评论弹窗 */}
      <GenerateCommentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        tweetId={currentGenerateTweet?.id}
        tweetContent={currentGenerateTweet?.content}
        aiConfig={aiConfig}
        onShowAIConfig={() => setShowAIConfigModal(true)}
        onGenerate={(comments) => {
          if (currentGenerateTweet?.id) {
            handleCommentsGenerated(currentGenerateTweet.id, comments);
          }
        }}
      />

      {/* AI服务配置弹窗 */}
      {showAIConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">生成评论AI配置</h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const config = {
                apiKey: formData.get('apiKey') as string,
                provider: formData.get('provider') as 'openai' | 'openai-badger' | 'zhipu' | 'anthropic',
                model: formData.get('model') as string,
                baseURL: formData.get('baseURL') as string || undefined,
              };
              saveAIConfig(config);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API密钥
                  </label>
                  <input
                    type="password"
                    name="apiKey"
                    defaultValue={aiConfig.apiKey}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入您的API密钥"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI供应商
                  </label>
                  <select
                    name="provider"
                    defaultValue={aiConfig.provider}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onChange={(e) => {
                      const provider = e.target.value as 'openai' | 'openai-badger' | 'zhipu' | 'anthropic';
                      const modelSelect = e.target.form?.querySelector('select[name="model"]') as HTMLSelectElement;
                      if (modelSelect) {
                        if (provider === 'openai-badger') {
                          modelSelect.value = 'gpt-4o-mini';
                        } else if (provider === 'zhipu') {
                          modelSelect.value = 'glm-4.5-flash';
                        } else if (provider === 'anthropic') {
                          modelSelect.value = 'claude-3-5-sonnet-20241022';
                        } else {
                          modelSelect.value = 'gpt-4o';
                        }
                      }
                    }}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="openai-badger">OpenAI-Badger</option>
                    <option value="zhipu">智谱AI (GLM)</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    模型
                  </label>
                  <select
                    name="model"
                    defaultValue={aiConfig.model}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="glm-4.5-flash">GLM-4.5-Flash</option>
                    <option value="glm-4.5">GLM-4.5</option>
                    <option value="glm-4.5-air">GLM-4.5-Air</option>
                    <option value="claude-3-5-sonnet-20241022">Claude-3.5-Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude-3-Opus</option>
                    <option value="claude-3-sonnet-20240229">Claude-3-Sonnet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    基础URL (可选)
                  </label>
                  <input
                    type="url"
                    name="baseURL"
                    defaultValue={aiConfig.baseURL || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="自定义API端点URL"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAIConfigModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  保存配置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}