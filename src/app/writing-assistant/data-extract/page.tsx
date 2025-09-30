'use client';

import { useState } from 'react';

interface ExtractResult {
  success: boolean;
  message: string;
  data: {
    username: string;
    totalFound: number;
    newInserted: number;
    existingSkipped: number;
    fromTweetTable: number;
    fromManualTable: number;
    mergedAt: string;
  };
}

interface AnalysisResult {
  success: boolean;
  message: string;
  data: {
    username: string;
    steps: string[];
    results: {
      merge?: any;
      types?: any;
      style?: any;
    };
    processingTime: string;
    completedAt: string;
  };
}

export default function DataExtractPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [analysisUsername, setAnalysisUsername] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleExtract = async () => {
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/writing-analysis/merge-tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'unicatcher-api-key-demo',
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || '数据提取失败');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysis = async () => {
    if (!analysisUsername.trim()) {
      setAnalysisError('请输入用户名');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setCurrentStep('准备分析...');

    try {
      const response = await fetch('/api/writing-analysis/complete-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'unicatcher-api-key-demo',
        },
        body: JSON.stringify({
          username: analysisUsername.trim(),
          steps: ['types', 'style'],
          options: {
            typeAnalysisLimit: 200,
            styleAnalysisLimit: 500
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || '分析失败');
      }

      setAnalysisResult(data);
      setCurrentStep('');
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '未知错误');
      setCurrentStep('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">数据提取和分析</h1>
          <p className="mt-2 text-gray-600">
            从 Tweet 表和 ManualTweetText 表合并提取指定用户的推文数据，并进行写作风格分析
          </p>
        </div>

        {/* 提取表单 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter 用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如: elonmusk"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <p className="mt-1 text-sm text-gray-500">
                输入要提取的 Twitter 用户名（不含 @ 符号）
              </p>
            </div>

            <button
              onClick={handleExtract}
              disabled={isLoading || !username.trim()}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  提取中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  开始提取
                </>
              )}
            </button>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                功能说明
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>自动从 Tweet 表和 ManualTweetText 表获取数据</li>
                  <li>按推文 ID 自动去重（优先保留 Tweet 表数据）</li>
                  <li>按发布时间升序排序</li>
                  <li>写入 WritingAnalysisTweet 表用于后续分析</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  提取失败
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 提取结果 */}
        {result && result.success && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-green-900">
                  提取成功
                </h3>
              </div>
              <p className="mt-1 text-sm text-green-700">
                {result.message}
              </p>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 用户名 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">用户名</div>
                  <div className="text-2xl font-bold text-gray-900">
                    @{result.data.username}
                  </div>
                </div>

                {/* 总数据量 */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 mb-1">总数据量</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {result.data.totalFound}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    合并后的总条数
                  </div>
                </div>

                {/* 新增数据 */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 mb-1">新增数据</div>
                  <div className="text-2xl font-bold text-green-900">
                    {result.data.newInserted}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    已写入分析表
                  </div>
                </div>

                {/* 跳过重复 */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm text-yellow-600 mb-1">跳过重复</div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {result.data.existingSkipped}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    已存在于分析表
                  </div>
                </div>

                {/* Tweet表数据 */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-600 mb-1">Tweet 表</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {result.data.fromTweetTable}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    来自爬取数据
                  </div>
                </div>

                {/* Manual表数据 */}
                <div className="bg-pink-50 rounded-lg p-4">
                  <div className="text-sm text-pink-600 mb-1">Manual 表</div>
                  <div className="text-2xl font-bold text-pink-900">
                    {result.data.fromManualTable}
                  </div>
                  <div className="text-xs text-pink-600 mt-1">
                    来自手采数据
                  </div>
                </div>
              </div>

              {/* 合并时间 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  合并时间: {new Date(result.data.mergedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>

            {/* 下一步操作提示 */}
            {result.data.newInserted > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">下一步操作</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>✓ 数据已成功写入 WritingAnalysisTweet 表</p>
                  <p>✓ 可以前往"推文数据"页面查看提取的数据</p>
                  <p>✓ 可以使用下方的"分析"功能进行类型分析和风格分析</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 写作分析表单 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">写作风格分析</h2>
            <p className="text-sm text-gray-600">
              对已提取的推文数据进行类型分析和风格特征分析
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter 用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={analysisUsername}
                onChange={(e) => setAnalysisUsername(e.target.value)}
                placeholder="例如: elonmusk"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isAnalyzing}
              />
              <p className="mt-1 text-sm text-gray-500">
                输入要分析的 Twitter 用户名（需已完成数据提取）
              </p>
            </div>

            <button
              onClick={handleAnalysis}
              disabled={isAnalyzing || !analysisUsername.trim()}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  分析中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  开始分析
                </>
              )}
            </button>

            {/* 当前步骤显示 */}
            {currentStep && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                  <span className="text-purple-800 font-medium">{currentStep}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 分析功能说明 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-purple-800">
                分析步骤说明
              </h3>
              <div className="mt-2 text-sm text-purple-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>步骤1: 推文类型分析 - 分析每条推文的内容类型（技术、观点、问题等）</li>
                  <li>步骤2: 风格特征分析 - 为每种内容类型生成独立的写作风格档案</li>
                  <li>分析完成后可用于个性化内容生成</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 分析错误提示 */}
        {analysisError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  分析失败
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  {analysisError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 分析结果 */}
        {analysisResult && analysisResult.success && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-purple-900">
                  分析完成
                </h3>
              </div>
              <p className="mt-1 text-sm text-purple-700">
                {analysisResult.message}
              </p>
            </div>

            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* 用户名 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">用户</div>
                  <div className="text-xl font-bold text-gray-900">
                    @{analysisResult.data.username}
                  </div>
                </div>

                {/* 类型分析结果 */}
                {analysisResult.data.results.types && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 mb-2 font-medium">✓ 推文类型分析</div>
                    <div className="text-sm text-blue-800">
                      {analysisResult.data.results.types.analyzedCount !== undefined && (
                        <p>分析推文数: {analysisResult.data.results.types.analyzedCount} 条</p>
                      )}
                      {analysisResult.data.results.types.typeDistribution && (
                        <p className="mt-1">
                          发现类型: {Object.keys(analysisResult.data.results.types.typeDistribution).length} 种
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 风格分析结果 */}
                {analysisResult.data.results.style && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600 mb-2 font-medium">✓ 风格特征分析</div>
                    <div className="text-sm text-purple-800">
                      <p>生成风格档案: {analysisResult.data.results.style.typeBasedProfilesCount} 个</p>
                      {analysisResult.data.results.style.contentTypes && (
                        <p className="mt-1">
                          内容类型: {analysisResult.data.results.style.contentTypes.join(', ')}
                        </p>
                      )}
                      <p className="mt-2 text-xs">{analysisResult.data.results.style.message}</p>
                    </div>
                  </div>
                )}

                {/* 处理时间 */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      处理时间: {analysisResult.data.processingTime}
                    </div>
                    <div>
                      完成时间: {new Date(analysisResult.data.completedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}