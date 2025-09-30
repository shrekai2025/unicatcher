'use client';

import { useState, useEffect } from 'react';
import { cn } from '~/lib/utils';
import { Settings, Link as LinkIcon, Copy, CheckCircle, AlertCircle, Loader2, History, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

const AUTH_TOKEN_KEY = 'url2text_auth_token';

interface ConversionResult {
  title: string;
  author: string;
  content: string;
}

interface ApiResponse {
  success: boolean;
  data?: ConversionResult;
  error?: {
    code: string;
    message: string;
  };
}

interface HistoryResult {
  id: string;
  originalUrl: string;
  title?: string;
  author?: string;
  content?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface HistoryApiResponse {
  success: boolean;
  data?: {
    results: HistoryResult[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export default function Url2TextPage() {
  const [authToken, setAuthToken] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  // 历史结果相关状态
  const [historyResults, setHistoryResults] = useState<HistoryResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryResult | null>(null);

  // 从localStorage加载认证token
  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (savedToken) {
      setAuthToken(savedToken);
    }
    // 页面加载时获取历史结果
    loadHistoryResults();
  }, []);

  // 获取历史结果
  const loadHistoryResults = async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const response = await fetch('/api/external/writing-assistant/url2text-result?limit=20&offset=0', {
        method: 'GET',
        headers: {
          'x-api-key': 'unicatcher-api-key-demo',
        },
      });

      const data: HistoryApiResponse = await response.json();

      if (data.success && data.data) {
        setHistoryResults(data.data.results);
      } else {
        setHistoryError(data.error?.message || '获取历史记录失败');
      }
    } catch (err) {
      console.error('Load history error:', err);
      setHistoryError('网络请求失败');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 查看历史结果详情
  const viewHistoryItem = (item: HistoryResult) => {
    setSelectedHistoryItem(item);
    if (item.title && item.author && item.content) {
      setResult({
        title: item.title,
        author: item.author,
        content: item.content
      });
    }
    setUrl(item.originalUrl);
    setError(item.error || null);
  };

  // 复制历史结果内容
  const copyHistoryContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // 保存认证token到localStorage
  const saveAuthToken = (token: string) => {
    setAuthToken(token);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setShowConfig(false);
  };

  // URL转文本任务提交
  const handleConversion = async () => {
    if (!url.trim()) {
      setError('请输入有效的URL地址');
      return;
    }

    if (!authToken.trim()) {
      setError('请先配置认证Token');
      setShowConfig(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setTaskSubmitted(false);

    try {
      const response = await fetch('/api/external/writing-assistant/url2text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo'
        },
        body: JSON.stringify({
          url: url.trim(),
          authToken: authToken.trim(),
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setTaskSubmitted(true);
        // 任务提交成功后，定期刷新历史记录查看结果
        setTimeout(() => {
          loadHistoryResults();
        }, 2000);
        // 清空URL，准备下一个任务
        setUrl('');
      } else {
        setError(data.error?.message || '任务提交失败，请稍后重试');
      }
    } catch (err) {
      console.error('Task submission error:', err);
      setError('网络请求失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };


  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConversion();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">URL转文本</h1>
          <p className="mt-2 text-sm text-gray-600">
            将网页URL转换为结构化文本内容（异步处理，结果显示在下方历史记录中）
          </p>
        </div>

        {/* 操作区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 配置按钮 */}
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              配置
            </button>

            {/* URL输入框 */}
            <div className="flex-1 flex">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="请输入URL地址，例如：https://example.com/article（提交后后台异步处理）"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={isLoading}
                />
              </div>

              {/* 转换按钮 */}
              <button
                onClick={handleConversion}
                disabled={isLoading || !url.trim() || !authToken.trim()}
                className={cn(
                  "ml-3 px-6 py-3 rounded-md font-medium text-sm transition-colors",
                  "flex items-center justify-center min-w-[100px]",
                  isLoading || !url.trim() || !authToken.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提交中
                  </>
                ) : (
                  '提交任务'
                )}
              </button>
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* 任务提交成功提示 */}
          {taskSubmitted && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700">
                <p className="font-medium">任务已提交成功！</p>
                <p className="mt-1">正在后台处理中，请稍后查看下方“历史记录”获取结果。</p>
              </div>
            </div>
          )}
        </div>


        {/* 历史结果列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <History className="h-5 w-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">历史记录</h2>
                <span className="ml-2 text-sm text-gray-500">({historyResults.length} 条)</span>
              </div>
              <button
                onClick={loadHistoryResults}
                disabled={isLoadingHistory}
                className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoadingHistory && "animate-spin")} />
                刷新
              </button>
            </div>
          </div>

          <div className="p-6">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-500">加载中...</span>
              </div>
            ) : historyError ? (
              <div className="flex items-center justify-center py-8">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-600">{historyError}</span>
              </div>
            ) : historyResults.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无历史记录</p>
                <p className="text-sm text-gray-400 mt-1">转换一些 URL 后，这里将显示历史结果</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyResults.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                      selectedHistoryItem?.id === item.id && "border-blue-300 bg-blue-50"
                    )}
                    onClick={() => viewHistoryItem(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* URL 和时间 */}
                        <div className="flex items-center mb-2">
                          <LinkIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                          <span className="text-sm text-blue-600 truncate flex-1" title={item.originalUrl}>
                            {item.originalUrl}
                          </span>
                          <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>

                        {/* 标题和作者 */}
                        {(item.title || item.author) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            {item.title && (
                              <div>
                                <span className="text-xs text-gray-500">标题：</span>
                                <span className="text-sm text-gray-900 ml-1">{item.title}</span>
                              </div>
                            )}
                            {item.author && (
                              <div>
                                <span className="text-xs text-gray-500">作者：</span>
                                <span className="text-sm text-gray-900 ml-1">{item.author}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 内容预览或错误信息 */}
                        {item.error ? (
                          <div className="flex items-center text-red-600">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            <span className="text-sm">{item.error}</span>
                          </div>
                        ) : item.content ? (
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {item.content.substring(0, 100)}...
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">无内容</div>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="ml-4 flex items-center space-x-2">
                        {item.content && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyHistoryContent(item.content!);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="复制内容"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        {(item.title || item.author || item.content) && !item.error && (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 配置模态框 */}
        <Dialog
          open={showConfig}
          onOpenChange={(open) => setShowConfig(open)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader className="p-6">
              <DialogTitle>配置认证Token</DialogTitle>
            </DialogHeader>

            <div className="p-6 pt-0">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    认证Token *
                  </label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="请输入认证Token"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    此Token将用于调用外部URL转文本服务，会保存在本地浏览器中。
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowConfig(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => saveAuthToken(authToken)}
                  disabled={!authToken.trim()}
                  className={cn(
                    "px-4 py-2 rounded-md font-medium transition-colors",
                    authToken.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  保存
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}