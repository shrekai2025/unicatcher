'use client';

import { useState } from 'react';
import { Navigation } from '~/components/navigation';
import { api } from '~/trpc/react';
import { getSession } from '~/lib/simple-auth';

export default function TweetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTweets, setSelectedTweets] = useState<string[]>([]);
  const [expandedTweets, setExpandedTweets] = useState<string[]>([]);

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

  const handleExport = () => {
    exportTweets.mutate(
      { format: 'json' },
      {
        onSuccess: (data: any) => {
          // 创建下载链接
          const blob = new Blob([data.data], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tweets_${new Date().toISOString().split('T')[0]}.json`;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* 页面头部 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              推文数据管理
            </h1>
            <p className="mt-2 text-gray-600">
              查看、搜索和管理采集到的推文数据
            </p>
          </div>

          {/* 搜索和操作栏 */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索推文内容、用户名..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={tweetsQuery.isPending}
                className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                🔍 搜索
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                disabled={exportTweets.isPending}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                📥 导出数据
              </button>
              {selectedTweets.length > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={batchDeleteTweets.isPending}
                  className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  🙈 批量隐藏 ({selectedTweets.length})
                </button>
              )}
            </div>
          </div>

          {/* 推文列表 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {tweetsQuery.data?.data?.tweets && tweetsQuery.data.data.tweets.length > 0 ? (
              <>
                {/* 表头 */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTweets.length === tweetsQuery.data.data.tweets.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      全选 ({tweetsQuery.data.data.tweets.length} 条推文)
                    </span>
                  </div>
                </div>

                {/* 推文列表 */}
                <ul className="divide-y divide-gray-200">
                  {tweetsQuery.data.data.tweets.map((tweet: any) => (
                    <li key={tweet.id} className={`${selectedTweets.includes(tweet.id) ? 'bg-blue-50' : ''}`}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedTweets.includes(tweet.id)}
                            onChange={() => handleSelectTweet(tweet.id)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {tweet.profileImageUrl ? (
                                    <img
                                      src={tweet.profileImageUrl}
                                      alt={`${tweet.userNickname} 的头像`}
                                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        const parent = target.parentElement!;
                                        parent.innerHTML = '<div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"><span class="text-blue-600 text-sm">🐦</span></div>';
                                      }}
                                      style={{
                                        minHeight: '32px',
                                        minWidth: '32px',
                                        backgroundColor: '#dbeafe'
                                      }}
                                    />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-blue-600 text-sm">🐦</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {tweet.userNickname}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    @{tweet.userUsername}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {/* 推文类型标识 */}
                                {tweet.isRT && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    🔄 转推
                                  </span>
                                )}
                                {tweet.isReply && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    💬 回复
                                  </span>
                                )}
                                
                                <a
                                  href={tweet.tweetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  查看原文
                                </a>
                                <button
                                  onClick={() => handleDeleteTweet(tweet.id)}
                                  disabled={deleteTweet.isPending}
                                  className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                                >
                                  隐藏
                                </button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm text-gray-900">
                                {expandedTweets.includes(tweet.id) ? tweet.content : truncateText(tweet.content)}
                              </p>
                              {tweet.content.length > 100 && (
                                <button 
                                  onClick={() => handleToggleExpand(tweet.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm mt-1"
                                >
                                  {expandedTweets.includes(tweet.id) ? '收起' : '展开全文'}
                                </button>
                              )}
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <span className="flex items-center">
                                  💬 {tweet.replyCount}
                                </span>
                                <span className="flex items-center">
                                  🔄 {tweet.retweetCount}
                                </span>
                                <span className="flex items-center">
                                  👍 {tweet.likeCount}
                                </span>
                                {tweet.viewCount && (
                                  <span className="flex items-center">
                                    👁️ {tweet.viewCount}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                <span>发布: {formatDate(new Date(tweet.publishedAt).toISOString())}</span>
                                <span className="ml-4">采集: {formatDate(tweet.createdAt)}</span>
                              </div>
                            </div>
                            {/* 推文配图展示 */}
                            {tweet.imageUrls && tweet.imageUrls.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-500 mb-2">
                                  📸 推文配图 ({tweet.imageUrls.length} 张):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {tweet.imageUrls.slice(0, 6).map((image: string, index: number) => (
                                    <div key={index} className="relative bg-gray-100 rounded border border-gray-300 overflow-hidden">
                                      <img
                                        src={image}
                                        alt={`推文图片 ${index + 1}`}
                                        className="w-20 h-20 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => window.open(image, '_blank')}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          const parent = target.parentElement!;
                                          parent.innerHTML = `<div class="w-20 h-20 flex items-center justify-center text-xs text-gray-500 cursor-pointer" onclick="window.open('${image}', '_blank')">图片加载失败<br/>点击查看</div>`;
                                        }}
                                        loading="lazy"
                                        style={{
                                          minHeight: '80px',
                                          minWidth: '80px',
                                          backgroundColor: '#f3f4f6'
                                        }}
                                      />
                                    </div>
                                  ))}
                                  {tweet.imageUrls.length > 6 && (
                                    <div className="w-20 h-20 bg-gray-100 rounded border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                                      +{tweet.imageUrls.length - 6}<br/>张图片
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* 视频内容展示 */}
                            {tweet.videoUrls && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-500 mb-2">
                                  🎬 视频内容:
                                </p>
                                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                                  {tweet.videoUrls.preview && (
                                    <div>
                                      <p className="text-xs text-gray-600 mb-2 font-medium">📸 视频预览图:</p>
                                      <div className="relative inline-block bg-gray-100 rounded border border-gray-300 overflow-hidden">
                                        <img
                                          src={tweet.videoUrls.preview}
                                          alt="视频预览"
                                          className="w-48 h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => window.open(tweet.videoUrls.preview, '_blank')}
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            const parent = target.parentElement!;
                                            parent.innerHTML = `<div class="w-48 h-32 flex items-center justify-center text-sm text-gray-500 cursor-pointer" onclick="window.open('${tweet.videoUrls.preview}', '_blank')">🎬<br/>预览图加载失败<br/>点击查看原图</div><div class="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">🎥 视频</div>`;
                                          }}
                                          loading="lazy"
                                          style={{
                                            minHeight: '128px',
                                            minWidth: '192px',
                                            backgroundColor: '#f3f4f6'
                                          }}
                                        />
                                        <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                                          🎥 视频
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {tweet.videoUrls.video && (
                                    <div>
                                      <p className="text-xs text-gray-600 mb-2 font-medium">🔗 视频文件:</p>
                                      <div className="bg-white rounded-md p-2 border border-gray-200">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm text-gray-700 flex-1 break-all">
                                            {tweet.videoUrls.video.length > 80 
                                              ? `${tweet.videoUrls.video.substring(0, 80)}...` 
                                              : tweet.videoUrls.video}
                                          </span>
                                          <div className="flex space-x-1">
                                            <a
                                              href={tweet.videoUrls.video}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                            >
                                              📱 播放
                                            </a>
                                            <button
                                              onClick={() => navigator.clipboard?.writeText(tweet.videoUrls.video)}
                                              className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                            >
                                              📋 复制
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 视频信息摘要 */}
                                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                                    <span>
                                      {tweet.videoUrls.preview && tweet.videoUrls.video 
                                        ? "✅ 预览图和视频文件已采集" 
                                        : tweet.videoUrls.preview 
                                        ? "⚠️ 仅采集到预览图" 
                                        : "⚠️ 仅采集到视频文件"}
                                    </span>
                                    {tweet.videoUrls.video?.includes('.mp4') && (
                                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                        MP4 格式
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="text-4xl mb-4">🐦</div>
                <p>暂无推文数据</p>
                <p className="text-sm mt-2">
                  {searchQuery ? '未找到匹配的推文' : '请先创建爬取任务来获取推文数据'}
                </p>
              </div>
            )}
          </div>

          {/* 分页 */}
          {tweetsQuery.data?.data?.hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={tweetsQuery.isPending}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                加载更多
              </button>
            </div>
          )}

          {/* 统计信息 */}
          {tweetsQuery.data?.data?.total && (
            <div className="mt-6 text-center text-sm text-gray-500">
              共 {tweetsQuery.data.data.total} 条推文
              {selectedTweets.length > 0 && (
                <span className="ml-2">，已选择 {selectedTweets.length} 条</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 