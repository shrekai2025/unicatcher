import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API 文档 - UniCatcher',
  description: 'UniCatcher API 接口文档',
};

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">UniCatcher API 文档</h1>
          <p className="mt-2 text-gray-600">
            本页面提供了 UniCatcher 系统的完整 API 接口说明
          </p>
        </div>

        {/* 基础信息 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">基础信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">内部 API 基础路径</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/trpc</code>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">外部 REST API</h3>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/external</code>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">认证方式</h3>
              <span className="text-sm">NextAuth.js Session (内部) / API Key (外部)</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">数据格式</h3>
              <span className="text-sm">JSON</span>
            </div>
          </div>
        </div>

        {/* 任务管理 API */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">任务管理 API</h2>
          
          {/* 获取任务列表 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tasks.list
            </h3>
            <p className="text-gray-600 mb-3">获取任务列表（支持分页和状态筛选）</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                page: "number (可选, 默认: 1)",
                limit: "number (可选, 默认: 10, 最大: 100)",
                status: "string (可选, 值: 'created' | 'running' | 'completed' | 'failed')"
              }, null, 2)}</pre>
            </div>
            <div className="bg-gray-50 p-3 rounded mt-3">
              <h4 className="font-medium mb-2">返回数据：</h4>
              <pre className="text-sm">{JSON.stringify({
                success: "boolean",
                data: {
                  tasks: "Array<Task>",
                  total: "number",
                  hasMore: "boolean"
                }
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 创建任务 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 text-xs font-semibold rounded mr-2">POST</span>
              tasks.create
            </h3>
            <p className="text-gray-600 mb-3">创建新的Twitter List爬取任务</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                listId: "string (必填, Twitter List ID, 纯数字格式)",
                maxTweets: "number (可选, 默认: 20, 范围: 1-100)"
              }, null, 2)}</pre>
            </div>
            <div className="bg-gray-50 p-3 rounded mt-3">
              <h4 className="font-medium mb-2">返回数据：</h4>
              <pre className="text-sm">{JSON.stringify({
                success: "boolean",
                message: "string",
                data: {
                  executorTaskId: "string"
                }
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 获取任务详情 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tasks.getById
            </h3>
            <p className="text-gray-600 mb-3">根据ID获取任务详细信息</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                id: "string (必填, 任务ID)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 取消任务 */}
          <div className="mb-6 border-l-4 border-orange-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 text-xs font-semibold rounded mr-2">POST</span>
              tasks.cancel
            </h3>
            <p className="text-gray-600 mb-3">取消正在运行的任务</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                id: "string (必填, 任务ID)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 删除任务 */}
          <div className="mb-6 border-l-4 border-red-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-red-100 text-red-800 px-2 py-1 text-xs font-semibold rounded mr-2">DELETE</span>
              tasks.delete
            </h3>
            <p className="text-gray-600 mb-3">删除任务及其相关数据</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                id: "string (必填, 任务ID)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 重试任务 */}
          <div className="mb-6 border-l-4 border-purple-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 text-xs font-semibold rounded mr-2">POST</span>
              tasks.retry
            </h3>
            <p className="text-gray-600 mb-3">重新执行失败的任务</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                id: "string (必填, 原任务ID)"
              }, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* 推文管理 API */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">推文管理 API</h2>
          
          {/* 获取推文列表 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.list
            </h3>
            <p className="text-gray-600 mb-3">获取推文列表（支持分页和筛选）</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                page: "number (可选, 默认: 1)",
                limit: "number (可选, 默认: 20, 最大: 100)",
                taskId: "string (可选, 按任务ID筛选)",
                listId: "string (可选, 按List ID筛选)",
                search: "string (可选, 搜索关键词)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 根据任务ID获取推文 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.getByTaskId
            </h3>
            <p className="text-gray-600 mb-3">根据任务ID获取推文数据</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                taskId: "string (必填, 任务ID)",
                page: "number (可选, 默认: 1)",
                limit: "number (可选, 默认: 20)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 根据List ID获取推文 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.getByListId
            </h3>
            <p className="text-gray-600 mb-3">根据List ID获取推文数据</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                listId: "string (必填, List ID)",
                page: "number (可选, 默认: 1)",
                limit: "number (可选, 默认: 20)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 获取推文详情 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.getById
            </h3>
            <p className="text-gray-600 mb-3">根据ID获取推文详细信息</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                id: "string (必填, 推文ID)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 搜索推文 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.search
            </h3>
            <p className="text-gray-600 mb-3">搜索推文内容</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                query: "string (必填, 搜索关键词)",
                taskId: "string (可选, 限定任务范围)",
                listId: "string (可选, 限定List范围)",
                page: "number (可选, 默认: 1)",
                limit: "number (可选, 默认: 20)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 获取热门推文 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.getTrending
            </h3>
            <p className="text-gray-600 mb-3">获取热门推文（按互动数排序）</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                taskId: "string (可选)",
                listId: "string (可选)",
                limit: "number (可选, 默认: 10, 最大: 50)",
                sortBy: "string (可选, 默认: 'likes', 值: 'likes' | 'retweets' | 'replies' | 'views')"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 获取推文统计 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.getStats
            </h3>
            <p className="text-gray-600 mb-3">获取推文统计信息</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                taskId: "string (可选, 限定任务范围)",
                listId: "string (可选, 限定List范围)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 获取用户排行榜 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              tweets.getUserRanking
            </h3>
            <p className="text-gray-600 mb-3">获取用户互动排行榜</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                taskId: "string (可选)",
                listId: "string (可选)",
                limit: "number (可选, 默认: 10, 最大: 50)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 导出推文 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 text-xs font-semibold rounded mr-2">POST</span>
              tweets.export
            </h3>
            <p className="text-gray-600 mb-3">导出推文数据</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                taskId: "string (可选, 任务ID)",
                listId: "string (可选, List ID)",
                format: "string (可选, 默认: 'json', 值: 'json' | 'csv')"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 删除推文 */}
          <div className="mb-6 border-l-4 border-red-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-red-100 text-red-800 px-2 py-1 text-xs font-semibold rounded mr-2">DELETE</span>
              tweets.delete
            </h3>
            <p className="text-gray-600 mb-3">删除单个推文</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                id: "string (必填, 推文ID)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* 批量删除推文 */}
          <div className="mb-6 border-l-4 border-red-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-red-100 text-red-800 px-2 py-1 text-xs font-semibold rounded mr-2">DELETE</span>
              tweets.batchDelete
            </h3>
            <p className="text-gray-600 mb-3">批量删除多个推文</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">参数：</h4>
              <pre className="text-sm">{JSON.stringify({
                ids: "Array<string> (必填, 推文ID数组)"
              }, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* 系统管理 API */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">系统管理 API</h2>
          
          {/* 获取系统状态 */}
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
              system.status
            </h3>
            <p className="text-gray-600 mb-3">获取系统运行状态和统计信息</p>
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">返回数据：</h4>
              <pre className="text-sm">{JSON.stringify({
                success: "boolean",
                data: {
                  status: "string (系统状态)",
                  runningTasks: "number (运行中的任务数量)",
                  totalTasks: "number (总任务数量)",
                  totalTweets: "number (总推文数量)",
                  version: "string (系统版本)"
                }
              }, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* 外部 REST API */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">外部 REST API</h2>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>注意：</strong> 外部 REST API 正在开发中，将在后续版本中提供。目前建议使用 tRPC 内部 API。
            </p>
          </div>
          
          {/* 计划中的外部接口 */}
          <div className="mb-6 border-l-4 border-gray-400 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 text-xs font-semibold rounded mr-2">POST</span>
              /api/external/tasks
            </h3>
            <p className="text-gray-600 mb-3">创建爬取任务（计划中）</p>
          </div>

          <div className="mb-6 border-l-4 border-gray-400 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
                             /api/external/tasks/{'{id}'}
            </h3>
            <p className="text-gray-600 mb-3">查询任务状态（计划中）</p>
          </div>

          <div className="mb-6 border-l-4 border-gray-400 pl-4">
            <h3 className="font-medium text-gray-900 mb-2">
              <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 text-xs font-semibold rounded mr-2">GET</span>
                             /api/external/data/{'{id}'}
            </h3>
            <p className="text-gray-600 mb-3">获取爬取结果（计划中）</p>
          </div>
        </div>

        {/* 数据模型 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">数据模型</h2>
          
          {/* Task 模型 */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">SpiderTask (爬虫任务)</h3>
            <div className="bg-gray-50 p-3 rounded">
              <pre className="text-sm">{JSON.stringify({
                id: "string (任务ID)",
                type: "string (任务类型: 'twitter_list')",
                listId: "string (Twitter List ID)", 
                status: "string (状态: 'created' | 'running' | 'completed' | 'failed')",
                result: "object | null (执行结果信息)",
                tweetCount: "number (已爬取推文数量)",
                startedAt: "Date | null (开始时间)",
                completedAt: "Date | null (完成时间)",
                createdAt: "Date (创建时间)",
                updatedAt: "Date (更新时间)"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* Tweet 模型 */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Tweet (推文)</h3>
            <div className="bg-gray-50 p-3 rounded">
              <pre className="text-sm">{JSON.stringify({
                id: "string (推文ID)",
                content: "string (推文内容)",
                userNickname: "string (用户昵称)",
                userUsername: "string (用户名 @handle)",
                replyCount: "number (回复数)",
                retweetCount: "number (转发数)",
                likeCount: "number (点赞数)",
                viewCount: "number (浏览数)",
                imageUrls: "Array<string> | null (图片链接数组)",
                tweetUrl: "string (推文链接)",
                publishedAt: "BigInt (发布时间戳)",
                listId: "string (来源List ID)",
                scrapedAt: "BigInt (爬取时间戳)",
                taskId: "string (关联任务ID)",
                createdAt: "Date (数据库创建时间)",
                updatedAt: "Date (数据库更新时间)"
              }, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* 错误代码 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">错误代码</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <code className="font-mono">400</code>
              <span>参数错误或验证失败</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <code className="font-mono">401</code>
              <span>未认证或认证失败</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <code className="font-mono">403</code>
              <span>权限不足</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <code className="font-mono">404</code>
              <span>资源不存在</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <code className="font-mono">500</code>
              <span>服务器内部错误</span>
            </div>
          </div>
        </div>

        {/* 使用示例 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">使用示例</h2>
          
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">1. 创建爬取任务 (tRPC)</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded text-sm">
              <pre>{`// 使用 tRPC React Query
import { api } from '~/trpc/react';

const createTask = api.tasks.create.useMutation({
  onSuccess: (result) => {
    console.log('任务创建成功:', result);
  }
});

// 调用
createTask.mutate({
  listId: '123456789',
  maxTweets: 50
});`}</pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">2. 获取任务列表</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded text-sm">
              <pre>{`// 使用 tRPC React Query
const tasksQuery = api.tasks.list.useQuery({
  page: 1,
  limit: 10,
  status: 'completed'
});

console.log('任务列表:', tasksQuery.data?.data.tasks);`}</pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">3. 搜索推文</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded text-sm">
              <pre>{`// 使用 tRPC React Query
const searchQuery = api.tweets.search.useQuery({
  query: '关键词',
  page: 1,
  limit: 20
});

console.log('搜索结果:', searchQuery.data?.data.tweets);`}</pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">4. 导出推文数据</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded text-sm">
              <pre>{`// 导出为 JSON 格式
const exportMutation = api.tweets.export.useMutation({
  onSuccess: (result) => {
    // 下载文件
    const blob = new Blob([result.data.content], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.data.filename;
    a.click();
  }
});

exportMutation.mutate({
  taskId: 'task_123',
  format: 'json'
});`}</pre>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          <p>UniCatcher v1.0.0 | 如有疑问，请联系开发团队</p>
        </div>
      </div>
    </div>
  );
} 