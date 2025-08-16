/**
 * 数据提取记录页面
 * 显示所有数据提取任务的信息：任务ID、发起时间、任务状态、提取条数
 */

'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

// 为提取记录增加最小可用类型，避免隐式 any
interface ExtractRecord {
  id: string;
  batchId: string;
  createdAt: string | Date;
  status: string;
  tweetCount: number;
  listId?: string | null;
  username?: string | null;
  isReExtract: boolean;
}

export default function ExtractsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 获取提取记录列表
  const { data: extractsData, isLoading, error, refetch } = api.extracts.list.useQuery({
    page: currentPage,
    limit: pageSize,
  });

  // 获取统计信息
  const { data: statsData } = api.extracts.getStats.useQuery();

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      synced: { text: '成功', class: 'bg-green-100 text-green-800' },
      failed: { text: '失败', class: 'bg-red-100 text-red-800' },
      extracting: { text: '提取中', class: 'bg-blue-100 text-blue-800' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { text: status, class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.text}
      </span>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-red-800 font-medium">加载失败</h3>
            <p className="text-red-600 mt-1">无法加载数据提取记录</p>
            <button 
              onClick={() => refetch()}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">数据提取记录</h1>
          <p className="mt-2 text-gray-600">查看所有数据提取任务的执行情况</p>
        </div>

        {/* 统计信息卡片 */}
        {statsData?.success && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">总</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">总提取次数</dt>
                      <dd className="text-lg font-medium text-gray-900">{statsData.data.totalExtracts}</dd>
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
                      <span className="text-white text-sm font-medium">推</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">总提取推文数</dt>
                      <dd className="text-lg font-medium text-gray-900">{statsData.data.totalTweetsExtracted}</dd>
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
                      <span className="text-white text-sm font-medium">成</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">成功次数</dt>
                      <dd className="text-lg font-medium text-gray-900">{statsData.data.successfulExtracts}</dd>
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
                      <span className="text-white text-sm font-medium">重</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">重复提取次数</dt>
                      <dd className="text-lg font-medium text-gray-900">{statsData.data.reExtracts}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 提取记录表格 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">提取记录列表</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              显示所有数据提取任务的详细信息
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : extractsData?.success && extractsData.data.records.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        批次ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        发起时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        提取条数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        过滤条件
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        重复提取
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {extractsData.data.records.map((record: ExtractRecord) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {record.batchId}
                          </div>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm text-gray-900">
                             {formatDate(record.createdAt.toString())}
                           </div>
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {record.tweetCount} 条
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {record.listId && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mr-1">
                                List: {record.listId}
                              </span>
                            )}
                            {record.username && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                @{record.username}
                              </span>
                            )}
                            {!record.listId && !record.username && (
                              <span className="text-gray-400">无</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.isReExtract ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              是
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              否
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {extractsData.data.total > pageSize && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!extractsData.data.hasMore}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        显示第 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, extractsData.data.total)}
                        </span>{' '}
                        条，共 <span className="font-medium">{extractsData.data.total}</span> 条记录
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          上一页
                        </button>
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          第 {currentPage} 页
                        </span>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!extractsData.data.hasMore}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          下一页
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-lg mb-2">📊</div>
              <h3 className="text-gray-900 font-medium">暂无提取记录</h3>
              <p className="text-gray-500 mt-1">还没有进行过数据提取操作</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 