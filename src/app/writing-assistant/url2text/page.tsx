'use client';

import { useState, useEffect } from 'react';
import { cn } from '~/lib/utils';
import { Settings, Link as LinkIcon, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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

export default function Url2TextPage() {
  const [authToken, setAuthToken] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  // 从localStorage加载认证token
  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (savedToken) {
      setAuthToken(savedToken);
    }
  }, []);

  // 保存认证token到localStorage
  const saveAuthToken = (token: string) => {
    setAuthToken(token);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setShowConfig(false);
  };

  // URL转文本处理
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

    try {
      const response = await fetch('/api/url2text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          authToken: authToken.trim(),
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error?.message || '转换失败，请稍后重试');
      }
    } catch (err) {
      console.error('Conversion error:', err);
      setError('网络请求失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  // 复制正文内容
  const copyContent = async () => {
    if (!result?.content) return;

    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // 降级方案：使用传统方法复制
      const textArea = document.createElement('textarea');
      textArea.value = result.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            将网页URL转换为结构化文本内容
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
                  placeholder="请输入URL地址，例如：https://example.com/article"
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
                    转换中
                  </>
                ) : (
                  '转换'
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
        </div>

        {/* 结果展示区域 */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">📄 转换结果</h2>

              {/* 标题和作者信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-900">{result.title || '未获取到标题'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作者</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-900">{result.author || '未获取到作者'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 正文内容 */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">正文内容</label>
                <button
                  onClick={copyContent}
                  className={cn(
                    "flex items-center px-3 py-1.5 text-sm rounded-md transition-colors",
                    copied
                      ? "bg-green-100 text-green-700 cursor-default"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  )}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      复制正文
                    </>
                  )}
                </button>
              </div>

              <div className="border border-gray-200 rounded-md bg-white">
                {result.content ? (
                  <div className="p-4 prose prose-sm max-w-none">
                    <ReactMarkdown>{result.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="p-4 text-gray-500 text-center">
                    未获取到正文内容
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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