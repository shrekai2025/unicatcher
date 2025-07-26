import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API 文档 - UniCatcher',
  description: 'UniCatcher API 接口文档 - 完整的REST API和tRPC接口说明',
};

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">UniCatcher API 文档</h1>
          <p className="mt-4 text-lg text-gray-600">
            完整的 Twitter 爬虫 API 接口文档，包括 REST API 和 tRPC 接口
          </p>
          <div className="mt-4 flex space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              REST API 可用
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              tRPC 可用
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              v1.0.0
            </span>
          </div>
        </div>

        {/* 目录导航 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 目录</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="#basic-info" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-blue-600">基础信息</div>
              <div className="text-sm text-gray-600">服务器地址、认证方式</div>
            </a>
            <a href="#authentication" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-blue-600">认证说明</div>
              <div className="text-sm text-gray-600">API Key 和 Session 认证</div>
            </a>
            <a href="#rest-api" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-blue-600">REST API</div>
              <div className="text-sm text-gray-600">外部 HTTP 接口</div>
            </a>
            <a href="#trpc-api" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-blue-600">tRPC API</div>
              <div className="text-sm text-gray-600">内部类型安全接口</div>
            </a>
            <a href="#data-models" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-blue-600">数据模型</div>
              <div className="text-sm text-gray-600">API 返回的数据结构</div>
            </a>
            <a href="#data-extract" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-blue-600">数据提取</div>
              <div className="text-sm text-gray-600">批量提取与分析接口</div>
            </a>
            <a href="#examples" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-blue-600">代码示例</div>
              <div className="text-sm text-gray-600">Python、JavaScript 示例</div>
            </a>
          </div>
        </div>

        {/* 基础信息 */}
        <div id="basic-info" className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">🔧 基础信息</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">服务器地址</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm">http://43.153.82.100:3067</code>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">REST API 基础路径</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm">/api/external</code>
                </div>
              </div>
            <div>
                <h3 className="font-medium text-gray-900 mb-2">tRPC 基础路径</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm">/api/trpc</code>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">支持的数据格式</h3>
                <div className="flex space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">JSON</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">CSV</span>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">认证方式</h3>
                <div className="flex space-x-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">API Key</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Session</span>
                </div>
            </div>
            <div>
                <h3 className="font-medium text-gray-900 mb-2">Rate Limiting</h3>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">每个 List ID 建议间隔 1 分钟以上</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 认证说明 */}
        <div id="authentication" className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">🔐 认证说明</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">REST API 认证 (API Key)</h3>
              <p className="text-gray-600 mb-4">外部 REST API 使用 API Key 进行认证，支持两种传递方式：</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">方式 1: X-API-Key 请求头</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                                         <pre className="text-sm"><code>{`curl -H "X-API-Key: unicatcher-api-key-demo" \\
     http://43.153.82.100:3067/api/external/tasks`}</code></pre>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">方式 2: Authorization Bearer</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                                         <pre className="text-sm"><code>{`curl -H "Authorization: Bearer unicatcher-api-key-demo" \\
     http://43.153.82.100:3067/api/external/tasks`}</code></pre>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ 当前 API Key:</strong> <code>unicatcher-api-key-demo</code><br/>
                  <strong>注意:</strong> 这是演示密钥，生产环境请更换为安全密钥
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">tRPC 认证 (Session)</h3>
              <p className="text-gray-600 mb-4">内部 tRPC API 使用 NextAuth.js Session 认证：</p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">登录信息</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>用户名:</strong> admin</li>
                  <li><strong>密码:</strong> a2885828</li>
                  <li><strong>登录页面:</strong> <code>/login</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* REST API */}
        <div id="rest-api" className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">🌐 REST API</h2>
          
          {/* 任务管理接口 */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">任务管理</h3>
            
            {/* 创建任务 */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 text-sm font-semibold rounded mr-3">POST</span>
                <code className="text-lg font-mono">/api/external/tasks</code>
              </div>
              <p className="text-gray-600 mb-4">创建新的 Twitter List 爬取任务</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">请求参数</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      listId: "string (必填)",
                      maxTweets: "number (可选, 1-100, 默认: 20)"
              }, null, 2)}</pre>
            </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">响应示例</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      success: true,
                      message: "Task created successfully",
                data: {
                        taskId: "cmdih9v9d0000j7hoz84g1hir",
                        listId: "1948042550071496895",
                        maxTweets: 20,
                        status: "created"
                }
              }, null, 2)}</pre>
                  </div>
            </div>
          </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">cURL 示例</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                                     <pre><code>{`curl -X POST http://43.153.82.100:3067/api/external/tasks \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{"listId": "1948042550071496895", "maxTweets": 30}'`}</code></pre>
                </div>
              </div>
            </div>

            {/* 获取任务列表 */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 text-sm font-semibold rounded mr-3">GET</span>
                <code className="text-lg font-mono">/api/external/tasks</code>
              </div>
              <p className="text-gray-600 mb-4">获取任务列表，支持分页和状态筛选</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">查询参数</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      page: "number (可选, 默认: 1)",
                      limit: "number (可选, 默认: 10, 最大: 100)",
                      status: "string (可选: running|completed|failed)"
                    }, null, 2)}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">响应示例</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      success: true,
                data: {
                        tasks: ["Array<Task>"],
                        total: 25,
                        page: 1,
                        limit: 10,
                        hasMore: true
                }
              }, null, 2)}</pre>
                  </div>
                </div>
            </div>
          </div>

          {/* 获取任务详情 */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 text-sm font-semibold rounded mr-3">GET</span>
                                 <code className="text-lg font-mono">/api/external/tasks/[taskId]</code>
              </div>
              <p className="text-gray-600 mb-4">根据 ID 获取任务详细信息</p>
              
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">cURL 示例</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                                     <pre><code>{`curl -H "X-API-Key: unicatcher-api-key-demo" \\
     http://43.153.82.100:3067/api/external/tasks/cmdih9v9d0000j7hoz84g1hir`}</code></pre>
                </div>
              </div>
            </div>
          </div>

          {/* 数据获取接口 */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">数据获取</h3>
            
            {/* 获取任务数据 */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 text-sm font-semibold rounded mr-3">GET</span>
                <code className="text-lg font-mono">/api/external/data/[taskId]</code>
              </div>
              <p className="text-gray-600 mb-4">获取任务爬取的推文数据，支持 JSON 和 CSV 格式</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">查询参数</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      page: "number (可选, 默认: 1)",
                      limit: "number (可选, 默认: 20, 最大: 100)",
                      format: "string (可选: json|csv, 默认: json)"
              }, null, 2)}</pre>
            </div>
          </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">响应示例 (JSON)</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      success: true,
                      data: {
                        tweets: ["Array<Tweet>"],
                        total: 45,
                        page: 1,
                        limit: 20,
                        hasMore: true
                      }
              }, null, 2)}</pre>
                  </div>
            </div>
          </div>

              <div className="mt-4 space-y-3">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">获取 JSON 数据</h4>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                                         <pre><code>{`curl -H "X-API-Key: unicatcher-api-key-demo" \\
     "http://43.153.82.100:3067/api/external/data/cmdih9v9d0000j7hoz84g1hir?page=1&limit=50"`}</code></pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">下载 CSV 文件</h4>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                                         <pre><code>{`curl -H "X-API-Key: unicatcher-api-key-demo" \\
     "http://43.153.82.100:3067/api/external/data/cmdih9v9d0000j7hoz84g1hir?format=csv" \\
     -o tweets.csv`}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 数据提取与分析接口 */}
          <div id="data-extract" className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">数据提取与分析</h3>
            
            {/* 批量数据提取 */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 text-sm font-semibold rounded mr-3">POST</span>
                <code className="text-lg font-mono">/api/external/data/extract</code>
              </div>
              <p className="text-gray-600 mb-4">批量提取推文数据，支持按条件筛选和状态管理</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">请求参数</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      batchId: "string (必填) - 批次标识符",
                      maxCount: "number (必填, 1-10000) - 最大提取数量",
                      listId: "string (可选) - 按 List ID 筛选",
                      username: "string (可选) - 按用户名筛选",
                      isExtracted: "boolean (可选, 默认: false) - 提取状态"
                    }, null, 2)}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">响应示例</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      success: true,
                      message: "Data extracted successfully",
                      data: {
                        batchId: "batch_001",
                        extractedCount: 150,
                        tweets: ["Array<Tweet>"],
                        extractedAt: "2024-01-15T10:30:00Z",
                        filters: {
                          listId: "1234567890",
                          username: "example_user",
                          isExtracted: false
                        }
                      }
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">cURL 示例</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                  <pre><code>{`curl -X POST http://43.153.82.100:3067/api/external/data/extract \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "batchId": "batch_001",
    "maxCount": 500,
    "listId": "1948042550071496895",
    "isExtracted": false
  }'`}</code></pre>
                </div>
              </div>
            </div>

            {/* 获取待分析数据 */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 text-sm font-semibold rounded mr-3">GET</span>
                <code className="text-lg font-mono">/api/external/analysis/pending</code>
              </div>
              <p className="text-gray-600 mb-4">获取待分析的推文数据，用于外部分析系统</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">查询参数</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      limit: "number (可选, 默认: 100, 最大: 1000)",
                      system: "string (可选) - 分析系统标识"
                    }, null, 2)}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">响应示例</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      success: true,
                      data: {
                        tweets: ["Array<Tweet>"],
                        batchId: "batch_1705401234567_abc123",
                        count: 100,
                        syncedAt: "2024-01-15T10:30:00Z"
                      }
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">cURL 示例</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                  <pre><code>{`curl -H "X-API-Key: unicatcher-api-key-demo" \\
     "http://43.153.82.100:3067/api/external/analysis/pending?limit=200&system=ai_analyzer"`}</code></pre>
                </div>
              </div>
            </div>

            {/* 标记分析完成 */}
            <div className="mb-6 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 text-sm font-semibold rounded mr-3">POST</span>
                <code className="text-lg font-mono">/api/external/analysis/complete</code>
              </div>
              <p className="text-gray-600 mb-4">标记分析批次完成状态，更新数据状态</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">请求参数</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      batchId: "string (必填) - 批次ID",
                      status: "string (必填) - analyzed | failed",
                      errorMessage: "string (可选) - 错误信息",
                      analysisResult: "object (可选) - 分析结果"
                    }, null, 2)}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">响应示例</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      success: true,
                      message: "Analysis status marked successfully",
                      data: {
                        batchId: "batch_1705401234567_abc123",
                        status: "analyzed",
                        markedAt: "2024-01-15T10:35:00Z"
                      }
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">cURL 示例</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm">
                  <pre><code>{`curl -X POST http://43.153.82.100:3067/api/external/analysis/complete \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "batchId": "batch_1705401234567_abc123",
    "status": "analyzed",
    "analysisResult": {
      "sentiment": "positive",
      "topics": ["AI", "technology"],
      "confidence": 0.85
    }
  }'`}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HTTP 状态码 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">📊 HTTP 状态码</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">成功响应</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <code className="font-mono text-green-700">200 OK</code>
                  <span className="text-sm text-green-700">请求成功</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <code className="font-mono text-green-700">201 Created</code>
                  <span className="text-sm text-green-700">资源创建成功</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">错误响应</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <code className="font-mono text-red-700">400 Bad Request</code>
                  <span className="text-sm text-red-700">参数错误</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <code className="font-mono text-red-700">401 Unauthorized</code>
                  <span className="text-sm text-red-700">认证失败</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <code className="font-mono text-red-700">404 Not Found</code>
                  <span className="text-sm text-red-700">资源不存在</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <code className="font-mono text-red-700">409 Conflict</code>
                  <span className="text-sm text-red-700">资源冲突</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <code className="font-mono text-red-700">500 Internal Server Error</code>
                  <span className="text-sm text-red-700">服务器错误</span>
            </div>
          </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-gray-900 mb-3">错误响应格式</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm">{JSON.stringify({
                error: "错误消息",
                details: "详细错误信息（可选）"
              }, null, 2)}</pre>
            </div>
          </div>
        </div>

        {/* tRPC API */}
        <div id="trpc-api" className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">⚡ tRPC API</h2>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              <strong>💡 tRPC 优势:</strong> 类型安全、自动完成、实时验证。推荐在 React/Next.js 项目中使用。
            </p>
          </div>

          {/* 任务管理 */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">任务管理 (tasks.*)</h3>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">mutation</code>
                  tasks.create
                </h4>
                <p className="text-gray-600 mb-3">创建爬取任务</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const createTask = api.tasks.create.useMutation();
createTask.mutate({
  listId: "1948042550071496895",
  maxTweets: 50
});`}</pre>
            </div>
          </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded mr-2">query</code>
                  tasks.list
                </h4>
                <p className="text-gray-600 mb-3">获取任务列表</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const { data } = api.tasks.list.useQuery({
  page: 1,
  limit: 10,
  status: "completed"
});`}</pre>
            </div>
          </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded mr-2">query</code>
                  tasks.getById
                </h4>
                <p className="text-gray-600 mb-3">获取任务详情</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const { data } = api.tasks.getById.useQuery({
  id: "cmdih9v9d0000j7hoz84g1hir"
});`}</pre>
            </div>
          </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded mr-2">mutation</code>
                  tasks.cancel / tasks.delete / tasks.retry
                </h4>
                <p className="text-gray-600 mb-3">任务操作</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const cancelTask = api.tasks.cancel.useMutation();
const deleteTask = api.tasks.delete.useMutation();
const retryTask = api.tasks.retry.useMutation();

// 使用示例
cancelTask.mutate({ id: "task_id" });`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* 推文管理 */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">推文管理 (tweets.*)</h3>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded mr-2">query</code>
                  tweets.getByTaskId / tweets.getByListId
                </h4>
                <p className="text-gray-600 mb-3">获取推文数据</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const { data } = api.tweets.getByTaskId.useQuery({
  taskId: "cmdih9v9d0000j7hoz84g1hir",
  page: 1,
  limit: 20
});`}</pre>
            </div>
          </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded mr-2">query</code>
                  tweets.search
                </h4>
                <p className="text-gray-600 mb-3">搜索推文</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const { data } = api.tweets.search.useQuery({
  query: "关键词",
  page: 1,
  limit: 20
});`}</pre>
            </div>
          </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded mr-2">query</code>
                  tweets.getTrending
                </h4>
                <p className="text-gray-600 mb-3">获取热门推文</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const { data } = api.tweets.getTrending.useQuery({
  limit: 10,
  sortBy: "likes"
});`}</pre>
          </div>
        </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  <code className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">mutation</code>
                  tweets.export
                </h4>
                <p className="text-gray-600 mb-3">导出推文数据</p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre>{`const exportMutation = api.tweets.export.useMutation({
  onSuccess: (result) => {
    // 下载文件
    const blob = new Blob([result.data.content]);
    // ... 处理下载
  }
});

exportMutation.mutate({
  taskId: "task_id",
  format: "csv"
});`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 数据模型 */}
        <div id="data-models" className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">📋 数据模型</h2>
          
          <div className="space-y-6">
          {/* Task 模型 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">SpiderTask (爬虫任务)</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{JSON.stringify({
                  id: "string - 任务唯一标识",
                  type: "string - 任务类型 (twitter_list)",
                  listId: "string - Twitter List ID",
                  status: "string - 任务状态 (created|running|completed|failed)",
                  result: "object|null - 执行结果详情",
                  tweetCount: "number - 已爬取推文数量",
                  startedAt: "Date|null - 开始执行时间",
                  completedAt: "Date|null - 完成时间",
                  createdAt: "Date - 创建时间",
                  updatedAt: "Date - 最后更新时间"
              }, null, 2)}</pre>
            </div>
          </div>

          {/* Tweet 模型 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tweet (推文)</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{JSON.stringify({
                  id: "string - 推文唯一标识",
                  content: "string - 推文文本内容",
                  userNickname: "string - 用户显示名称",
                  userUsername: "string - 用户名 (@handle)",
                  replyCount: "number - 回复数量",
                  retweetCount: "number - 转发数量",
                  likeCount: "number - 点赞数量",
                  viewCount: "number - 浏览数量",
                  imageUrls: "string[]|null - 图片链接数组",
                  tweetUrl: "string - 推文链接",
                  publishedAt: "bigint - 发布时间戳",
                  listId: "string - 来源 List ID",
                  scrapedAt: "bigint - 爬取时间戳",
                  taskId: "string - 关联任务ID",
                  createdAt: "Date - 数据库创建时间",
                  updatedAt: "Date - 数据库更新时间"
                }, null, 2)}</pre>
              </div>
            </div>

            {/* API 响应结构 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">API 响应结构</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">成功响应</h4>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      success: true,
                      message: "操作成功信息",
                      data: "具体返回数据"
                    }, null, 2)}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">错误响应</h4>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <pre>{JSON.stringify({
                      error: "错误信息",
                      details: "详细错误描述（可选）"
              }, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 代码示例 */}
        <div id="examples" className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">💻 代码示例</h2>
          
          <div className="space-y-8">
            {/* Python 示例 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🐍 Python 完整示例</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm"><code>{`import requests
import time
import json

class UniCatcherClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
    
    def create_task(self, list_id, max_tweets=20):
        """创建爬取任务"""
        url = f"{self.base_url}/api/external/tasks"
        data = {"listId": list_id, "maxTweets": max_tweets}
        
        response = requests.post(url, headers=self.headers, json=data)
        result = response.json()
        
        if response.status_code == 201 and result.get('success'):
            return result['data']['taskId']
        else:
            raise Exception(f"创建任务失败: {result}")
    
    def get_task_status(self, task_id):
        """获取任务状态"""
        url = f"{self.base_url}/api/external/tasks/{task_id}"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()['data']
        else:
            raise Exception(f"获取任务状态失败: {response.text}")
    
    def wait_for_completion(self, task_id, timeout=300):
        """等待任务完成"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            task = self.get_task_status(task_id)
            print(f"任务状态: {task['status']}")
            
            if task['status'] == 'completed':
                print(f"✅ 任务完成！采集了 {task.get('tweetCount', 0)} 条推文")
                return True
            elif task['status'] == 'failed':
                print("❌ 任务失败")
                return False
            
            time.sleep(10)
        
        print("⏰ 任务超时")
        return False
    
    def get_tweets(self, task_id, format='json'):
        """获取推文数据"""
        url = f"{self.base_url}/api/external/data/{task_id}"
        params = {'format': format}
        
        response = requests.get(url, headers=self.headers, params=params)
        
        if format == 'csv':
            return response.text
        else:
            return response.json()['data']['tweets']

# 使用示例
if __name__ == '__main__':
         client = UniCatcherClient(
         base_url='http://43.153.82.100:3067',
         api_key='unicatcher-api-key-demo'
     )
    
    try:
        # 创建任务
        task_id = client.create_task('1948042550071496895', 30)
        print(f"📋 任务已创建: {task_id}")
        
        # 等待完成
        if client.wait_for_completion(task_id):
            # 获取数据
            tweets = client.get_tweets(task_id)
            print(f"📊 获取到 {len(tweets)} 条推文")
            
            # 显示前3条
            for i, tweet in enumerate(tweets[:3], 1):
                print(f"\\n{i}. {tweet['userNickname']}")
                print(f"   {tweet['content'][:100]}...")
        
    except Exception as e:
        print(f"❌ 错误: {e}")

# 数据提取示例
def extract_data_example():
    """数据提取示例"""
    client = UniCatcherClient(
        base_url='http://43.153.82.100:3067',
        api_key='unicatcher-api-key-demo'
    )
    
    try:
        # 批量提取数据
        extract_result = client.extract_tweets(
            batch_id="batch_001",
            max_count=1000,
            list_id="1948042550071496895"
        )
        print(f"📊 提取了 {extract_result['extractedCount']} 条推文")
        
        # 获取待分析数据
        pending_data = client.get_pending_analysis(limit=500)
        print(f"🔍 待分析数据: {pending_data['count']} 条")
        
        # 标记分析完成
        client.mark_analysis_complete(
            batch_id=pending_data['batchId'],
            status='analyzed',
            analysis_result={'sentiment': 'positive'}
        )
        print("✅ 分析状态已更新")
        
    except Exception as e:
        print(f"❌ 错误: {e}")

# 在 UniCatcherClient 类中添加以下方法:
def extract_tweets(self, batch_id, max_count, list_id=None, username=None, is_extracted=False):
    """批量提取推文数据"""
    url = f"{self.base_url}/api/external/data/extract"
    data = {
        "batchId": batch_id,
        "maxCount": max_count,
        "listId": list_id,
        "username": username,
        "isExtracted": is_extracted
    }
    
    response = requests.post(url, headers=self.headers, json=data)
    if response.status_code == 200:
        return response.json()['data']
    else:
        raise Exception(f"数据提取失败: {response.text}")

def get_pending_analysis(self, limit=100, system='python_client'):
    """获取待分析数据"""
    url = f"{self.base_url}/api/external/analysis/pending"
    params = {"limit": limit, "system": system}
    
    response = requests.get(url, headers=self.headers, params=params)
    if response.status_code == 200:
        return response.json()['data']
    else:
        raise Exception(f"获取待分析数据失败: {response.text}")

def mark_analysis_complete(self, batch_id, status, error_message=None, analysis_result=None):
    """标记分析完成"""
    url = f"{self.base_url}/api/external/analysis/complete"
    data = {
        "batchId": batch_id,
        "status": status,
        "errorMessage": error_message,
        "analysisResult": analysis_result
    }
    
    response = requests.post(url, headers=self.headers, json=data)
    if response.status_code == 200:
        return response.json()['data']
    else:
        raise Exception(f"标记分析完成失败: {response.text}")`}</code></pre>
              </div>
            </div>

            {/* JavaScript 示例 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🟨 JavaScript/Node.js 示例</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm"><code>{`class UniCatcherClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        };
    }

    async createTask(listId, maxTweets = 20) {
        const response = await fetch(\`\${this.baseUrl}/api/external/tasks\`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ listId, maxTweets })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            return result.data.taskId;
        } else {
            throw new Error(\`创建任务失败: \${JSON.stringify(result)}\`);
        }
    }

    async getTaskStatus(taskId) {
        const response = await fetch(\`\${this.baseUrl}/api/external/tasks/\${taskId}\`, {
            headers: this.headers
        });

        if (response.ok) {
            const result = await response.json();
            return result.data;
        } else {
            throw new Error(\`获取任务状态失败: \${response.statusText}\`);
        }
    }

    async waitForCompletion(taskId, timeout = 300000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const task = await this.getTaskStatus(taskId);
            console.log(\`任务状态: \${task.status}\`);

            if (task.status === 'completed') {
                console.log(\`✅ 任务完成！采集了 \${task.tweetCount || 0} 条推文\`);
                return true;
            } else if (task.status === 'failed') {
                console.log('❌ 任务失败');
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        console.log('⏰ 任务超时');
        return false;
    }

    async getTweets(taskId, format = 'json') {
        const url = new URL(\`\${this.baseUrl}/api/external/data/\${taskId}\`);
        url.searchParams.set('format', format);

        const response = await fetch(url, { headers: this.headers });

        if (format === 'csv') {
            return await response.text();
        } else {
            const result = await response.json();
            return result.data.tweets;
        }
    }
}

// 使用示例
async function main() {
         const client = new UniCatcherClient(
         'http://43.153.82.100:3067',
         'unicatcher-api-key-demo'
     );

    try {
        // 创建任务
        const taskId = await client.createTask('1948042550071496895', 30);
        console.log(\`📋 任务已创建: \${taskId}\`);

        // 等待完成
        if (await client.waitForCompletion(taskId)) {
            // 获取数据
            const tweets = await client.getTweets(taskId);
            console.log(\`📊 获取到 \${tweets.length} 条推文\`);

            // 显示前3条
            tweets.slice(0, 3).forEach((tweet, i) => {
                console.log(\`\\n\${i + 1}. \${tweet.userNickname}\`);
                console.log(\`   \${tweet.content.substring(0, 100)}...\`);
            });
        }
    } catch (error) {
        console.error('❌ 错误:', error);
    }
}

main();

// 数据提取示例
async function extractDataExample() {
    const client = new UniCatcherClient(
        'http://43.153.82.100:3067',
        'unicatcher-api-key-demo'
    );

    try {
        // 批量提取数据
        const extractResult = await client.extractTweets(
            'batch_001',
            1000,
            '1948042550071496895'
        );
        console.log(\`📊 提取了 \${extractResult.extractedCount} 条推文\`);

        // 获取待分析数据
        const pendingData = await client.getPendingAnalysis(500);
        console.log(\`🔍 待分析数据: \${pendingData.count} 条\`);

        // 标记分析完成
        await client.markAnalysisComplete(
            pendingData.batchId,
            'analyzed',
            null,
            { sentiment: 'positive' }
        );
        console.log('✅ 分析状态已更新');

    } catch (error) {
        console.error('❌ 错误:', error);
    }
}

// 在 UniCatcherClient 类中添加以下方法:
async extractTweets(batchId, maxCount, listId = null, username = null, isExtracted = false) {
    const response = await fetch(\`\${this.baseUrl}/api/external/data/extract\`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
            batchId,
            maxCount,
            listId,
            username,
            isExtracted
        })
    });

    if (response.ok) {
        const result = await response.json();
        return result.data;
    } else {
        throw new Error(\`数据提取失败: \${response.statusText}\`);
    }
}

async getPendingAnalysis(limit = 100, system = 'js_client') {
    const url = new URL(\`\${this.baseUrl}/api/external/analysis/pending\`);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('system', system);

    const response = await fetch(url, { headers: this.headers });

    if (response.ok) {
        const result = await response.json();
        return result.data;
    } else {
        throw new Error(\`获取待分析数据失败: \${response.statusText}\`);
    }
}

async markAnalysisComplete(batchId, status, errorMessage = null, analysisResult = null) {
    const response = await fetch(\`\${this.baseUrl}/api/external/analysis/complete\`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
            batchId,
            status,
            errorMessage,
            analysisResult
        })
    });

    if (response.ok) {
        const result = await response.json();
        return result.data;
    } else {
        throw new Error(\`标记分析完成失败: \${response.statusText}\`);
    }
}`}</code></pre>
              </div>
            </div>

            {/* React tRPC 示例 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">⚛️ React + tRPC 示例</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm"><code>{`import { api } from '~/trpc/react';
import { useState } from 'react';

function TaskManager() {
    const [listId, setListId] = useState('');
    const [maxTweets, setMaxTweets] = useState(20);

    // 查询任务列表
    const { data: tasks, refetch } = api.tasks.list.useQuery({
        page: 1,
        limit: 10
    });

    // 创建任务
    const createTask = api.tasks.create.useMutation({
        onSuccess: () => {
            console.log('任务创建成功');
            refetch(); // 刷新任务列表
        },
        onError: (error) => {
            console.error('创建失败:', error.message);
        }
    });

    // 获取推文数据
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const { data: tweets } = api.tweets.getByTaskId.useQuery(
        {
            taskId: selectedTaskId,
            page: 1,
            limit: 50
        },
        { enabled: !!selectedTaskId }
    );

    const handleCreateTask = () => {
        if (!listId.trim()) {
            alert('请输入 List ID');
            return;
        }

        createTask.mutate({
            listId: listId.trim(),
            maxTweets: maxTweets
        });
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">任务管理</h1>
            
            {/* 创建任务表单 */}
            <div className="mb-6 p-4 border rounded">
                <h2 className="text-lg font-semibold mb-3">创建新任务</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Twitter List ID"
                        value={listId}
                        onChange={(e) => setListId(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded"
                    />
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={maxTweets}
                        onChange={(e) => setMaxTweets(Number(e.target.value))}
                        className="w-24 px-3 py-2 border rounded"
                    />
                    <button
                        onClick={handleCreateTask}
                        disabled={createTask.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                        {createTask.isPending ? '创建中...' : '创建任务'}
                    </button>
                </div>
            </div>

            {/* 任务列表 */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">任务列表</h2>
                {tasks?.data?.tasks?.map((task) => (
                    <div
                        key={task.id}
                        className="p-3 border rounded mb-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedTaskId(task.id)}
                    >
                        <div className="flex justify-between">
                            <span>List ID: {task.listId}</span>
                            <span className={\`px-2 py-1 rounded text-xs \${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }\`}>
                                {task.status}
                            </span>
                        </div>
                        <div className="text-sm text-gray-600">
                            推文数量: {task.tweetCount} | 创建时间: {new Date(task.createdAt).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* 推文数据 */}
            {tweets && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">推文数据 ({tweets.data.tweets.length} 条)</h2>
                    <div className="space-y-2">
                        {tweets.data.tweets.map((tweet) => (
                            <div key={tweet.id} className="p-3 border rounded">
                                <div className="font-medium">{tweet.userNickname} (@{tweet.userUsername})</div>
                                <div className="text-gray-700 mt-1">{tweet.content}</div>
                                <div className="text-sm text-gray-500 mt-2">
                                    👍 {tweet.likeCount} | 🔄 {tweet.retweetCount} | 💬 {tweet.replyCount}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskManager;`}</code></pre>
              </div>
            </div>
          </div>
        </div>

        {/* 最佳实践 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">✨ 最佳实践</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">性能优化</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  使用分页获取大量数据
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  合理设置 maxTweets 参数 (建议 20-50)
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  避免频繁轮询任务状态
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  使用 CSV 格式导出大量数据
                </li>
              </ul>
          </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">错误处理</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">💡</span>
                  检查HTTP状态码和响应消息
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">💡</span>
                  处理网络超时和重试机制
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">💡</span>
                  验证 API Key 和参数格式
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">💡</span>
                  监控任务状态变化
                </li>
              </ul>
            </div>
            </div>
          </div>

        {/* 页脚 */}
        <div className="text-center py-8 border-t border-gray-200">
          <div className="text-gray-500 space-y-2">
            <p className="font-medium">UniCatcher v1.0.0</p>
            <p className="text-sm">Twitter 数据采集与分析平台</p>
            <div className="flex justify-center space-x-4 text-sm">
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800">管理后台</a>
              <a href="/tasks" className="text-blue-600 hover:text-blue-800">任务管理</a>
              <a href="/tweets" className="text-blue-600 hover:text-blue-800">数据查看</a>
                             <a href="http://43.153.82.100:5555" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">数据库管理</a>
            </div>
            <p className="text-xs mt-4">
              如有疑问，请联系开发团队 | 文档最后更新：{new Date().toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 