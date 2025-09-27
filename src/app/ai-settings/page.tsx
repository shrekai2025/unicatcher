'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '~/components/dashboard-layout';

interface ProviderConfig {
  provider: string;
  apiKey: string;
  baseURL: string;
  isActive: boolean;
}

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-badger', label: 'OpenAI Badger' },
  { value: 'zhipu', label: '智谱AI' },
  { value: 'anthropic', label: 'Anthropic' },
];

export default function AISettingsPage() {
  // 系统提示词状态
  const [systemPromptTemplate, setSystemPromptTemplate] = useState('');
  const [promptLastUpdated, setPromptLastUpdated] = useState<string | null>(null);

  // AI服务商配置状态
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(
    AI_PROVIDERS.map(p => ({ provider: p.value, apiKey: '', baseURL: '', isActive: true }))
  );
  const [providersLastUpdated, setProvidersLastUpdated] = useState<string | null>(null);

  // 加载和保存状态
  const [loading, setLoading] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingProviders, setSavingProviders] = useState(false);

  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    try {
      setLoading(true);

      // 加载系统提示词
      const promptResponse = await fetch('/api/external/ai-comment-config', {
        headers: { 'x-api-key': 'unicatcher-api-key-demo' }
      });
      if (promptResponse.ok) {
        const promptResult = await promptResponse.json();
        if (promptResult.success) {
          setSystemPromptTemplate(promptResult.data.systemPromptTemplate || '');
          setPromptLastUpdated(promptResult.data.updatedAt);
        }
      }

      // 加载AI服务商配置
      const providersResponse = await fetch('/api/external/ai-provider-config', {
        headers: { 'x-api-key': 'unicatcher-api-key-demo' }
      });
      if (providersResponse.ok) {
        const providersResult = await providersResponse.json();
        if (providersResult.success && providersResult.data.providers.length > 0) {
          const loadedConfigs = providersResult.data.providers;
          const mergedConfigs = AI_PROVIDERS.map(p => {
            const loaded = loadedConfigs.find((lc: ProviderConfig) => lc.provider === p.value);
            return loaded || { provider: p.value, apiKey: '', baseURL: '', isActive: true };
          });
          setProviderConfigs(mergedConfigs);
          setProvidersLastUpdated(loadedConfigs[0]?.updatedAt || null);
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      alert('加载配置失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    try {
      setSavingPrompt(true);
      const response = await fetch('/api/external/ai-comment-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo'
        },
        body: JSON.stringify({ systemPromptTemplate })
      });

      if (!response.ok) throw new Error('保存失败');

      const result = await response.json();
      if (result.success) {
        setPromptLastUpdated(result.data.updatedAt);
        alert('✅ 系统提示词已保存成功！');
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('❌ 保存失败，请重试');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleSaveProviders = async () => {
    try {
      setSavingProviders(true);
      console.log('[AI设置] 准备保存配置:', providerConfigs);

      const response = await fetch('/api/external/ai-provider-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo'
        },
        body: JSON.stringify({ providers: providerConfigs })
      });

      console.log('[AI设置] 响应状态:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI设置] 响应错误:', errorText);
        throw new Error(`保存失败: ${response.status}`);
      }

      const result = await response.json();
      console.log('[AI设置] 响应结果:', result);

      if (result.success) {
        setProvidersLastUpdated(result.data.providers[0]?.updatedAt || null);
        alert('✅ AI服务商配置已保存成功！');
        // 重新加载以获取最新数据
        await loadAllConfigs();
      } else {
        throw new Error(result.error?.message || '保存失败');
      }
    } catch (error) {
      console.error('[AI设置] 保存失败:', error);
      alert(`❌ 保存失败: ${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setSavingProviders(false);
    }
  };

  const updateProviderConfig = (provider: string, field: keyof ProviderConfig, value: string | boolean) => {
    setProviderConfigs(prev => prev.map(p =>
      p.provider === provider ? { ...p, [field]: value } : p
    ));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">综合AI设置</h1>
          <p className="mt-2 text-sm text-gray-600">
            统一管理系统中所有AI相关配置，包括服务商密钥和系统提示词
          </p>
        </div>

        {/* AI服务商配置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">AI服务商配置</h2>
            <p className="mt-1 text-sm text-gray-600">
              配置各个AI服务商的API密钥和Base URL，所有功能将使用这里的配置
            </p>
            {providersLastUpdated && (
              <p className="mt-1 text-xs text-gray-500">
                最后更新：{new Date(providersLastUpdated).toLocaleString('zh-CN')}
              </p>
            )}
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {AI_PROVIDERS.map((provider) => {
                const config = providerConfigs.find(p => p.provider === provider.value);
                if (!config) return null;

                return (
                  <div key={provider.value} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">{provider.label}</h3>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.isActive}
                          onChange={(e) => updateProviderConfig(provider.value, 'isActive', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">启用</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Key <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={config.apiKey}
                          onChange={(e) => updateProviderConfig(provider.value, 'apiKey', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="输入API密钥"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base URL (可选)
                        </label>
                        <input
                          type="text"
                          value={config.baseURL}
                          onChange={(e) => updateProviderConfig(provider.value, 'baseURL', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="自定义API地址"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={loadAllConfigs}
                disabled={loading || savingProviders}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                重新加载
              </button>
              <button
                onClick={handleSaveProviders}
                disabled={loading || savingProviders}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {savingProviders ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  '保存服务商配置'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI评论系统提示词 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">AI评论系统提示词</h2>
            <p className="mt-1 text-sm text-gray-600">
              配置AI评论生成的系统提示词模板，影响整个系统的评论生成行为
            </p>
            {promptLastUpdated && (
              <p className="mt-1 text-xs text-gray-500">
                最后更新：{new Date(promptLastUpdated).toLocaleString('zh-CN')}
              </p>
            )}
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                系统提示词模板
              </label>
              <textarea
                value={systemPromptTemplate}
                onChange={(e) => setSystemPromptTemplate(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                placeholder="请输入系统提示词模板，使用 {{变量名}} 格式插入占位符..."
              />
              <p className="mt-2 text-sm text-gray-500">
                提示词为空时，AI评论生成将无法工作，请确保配置合适的模板
              </p>
            </div>

            <details className="mb-6">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900 mb-3">
                📝 查看占位符说明和示例
              </summary>

              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">必需占位符：</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{langPrompt}}'}</code> - 语言指令</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{commentCount}}'}</code> - 评论数量</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{tweetContent}}'}</code> - 推文内容</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{lengthPrompt}}'}</code> - 长度要求</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{language}}'}</code> - 语言名称</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-2">可选占位符：</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{userInfo}}'}</code> - 用户补充信息</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{type}}'}</code> - 评论类型（通过API传入）</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{existingComments}}'}</code> - 现有评论列表</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{referenceData}}'}</code> - 参考推文数据</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{authorUsername}}'}</code> - 推文作者用户名</li>
                    <li><code className="bg-gray-200 px-2 py-0.5 rounded">{'{{authorNickname}}'}</code> - 推文作者昵称</li>
                  </ul>
                </div>
              </div>
            </details>

            <div className="flex justify-end space-x-3">
              <button
                onClick={loadAllConfigs}
                disabled={loading || savingPrompt}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                重新加载
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={loading || savingPrompt}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {savingPrompt ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  '保存提示词'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}