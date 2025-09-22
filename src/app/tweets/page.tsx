'use client';

import { useState } from 'react';
import { DashboardLayout } from '~/components/dashboard-layout';
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

  const headerActions = (
    <div className="flex items-center space-x-3">
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
                    {tweet.url && (
                      <a
                        href={tweet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看原推文 ↗
                      </a>
                    )}
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
    </DashboardLayout>
  );
}