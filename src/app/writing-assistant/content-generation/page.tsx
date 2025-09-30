'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Plus, FileText, Send, Loader2, Copy, Trash2, RefreshCw, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { GenerationStagesViewer } from '~/components/generation/GenerationStagesViewer';

// AI配置常量
const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-badger', label: 'OpenAI Badger' },
  { value: 'zhipu', label: '智谱AI' },
  { value: 'anthropic', label: 'Anthropic' },
];

const AI_MODELS: Record<string, string[]> = {
  'openai': ['o3', 'gpt-5', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  'openai-badger': ['o3', 'gpt-5', 'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  'zhipu': ['glm-4.5-flash', 'glm-4.5', 'glm-4.5-air', 'glm-4.5-x', 'glm-4.5-airx'],
  'anthropic': ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
};

const DEFAULT_MODELS: Record<string, string> = {
  'openai': 'o3',
  'openai-badger': 'o3',
  'zhipu': 'glm-4.5-flash',
  'anthropic': 'claude-3-5-sonnet-20241022',
};

interface ArticleGenerationForm {
  topic: string;
  platformId: string;
  enableReferenceArticles: boolean;
  referenceFilters: {
    platformId?: string;
    typeId?: string;
  };
  referenceArticleCount: number;
  enableContentStructure: boolean;
  structureFilters: {
    platformId?: string;
    typeId?: string;
  };
  additionalRequirements: string;
}

export default function ContentGenerationPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showAIConfig, setShowAIConfig] = useState(false);

  // 页面级AI配置
  const [aiConfig, setAiConfig] = useState({
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: '',
  });

  const [form, setForm] = useState<ArticleGenerationForm>({
    topic: '',
    platformId: '',
    enableReferenceArticles: false,
    referenceFilters: {},
    referenceArticleCount: 3,
    enableContentStructure: false,
    structureFilters: {},
    additionalRequirements: '',
  });

  // 从localStorage加载AI配置
  useEffect(() => {
    const savedAIConfig = localStorage.getItem('ai-config');
    if (savedAIConfig) {
      try {
        const parsed = JSON.parse(savedAIConfig);
        setAiConfig(parsed);
      } catch (error) {
        console.error('Failed to parse saved AI config:', error);
      }
    }
  }, []);

  // 保存AI配置到localStorage
  const saveAIConfig = (config: typeof aiConfig) => {
    setAiConfig(config);
    localStorage.setItem('ai-config', JSON.stringify(config));
  };

  // API调用
  const { data: platforms } = api.contentPlatforms.getAll.useQuery();
  const { data: articleTypes } = api.articleTypes.getAll.useQuery();
  const { data: taskHistory, refetch: refetchHistory } = api.articleGeneration.getTaskHistory.useQuery({
    limit: 20,
    offset: 0,
  });

  // 参考文章预览
  const { data: referenceArticles } = api.articleGeneration.getReferenceArticles.useQuery({
    platformId: form.referenceFilters.platformId,
    typeId: form.referenceFilters.typeId,
    count: form.referenceArticleCount,
  }, {
    enabled: form.enableReferenceArticles && (!!form.referenceFilters.platformId || !!form.referenceFilters.typeId),
  });

  // 内容结构预览
  const { data: contentStructure } = api.contentStructures.getLatest.useQuery({
    platformId: form.structureFilters.platformId,
    typeId: form.structureFilters.typeId,
  }, {
    enabled: form.enableContentStructure && (!!form.structureFilters.platformId || !!form.structureFilters.typeId),
  });

  // 任务创建
  const createTask = api.articleGeneration.createTask.useMutation({
    onSuccess: () => {
      refetchHistory();
      setShowForm(false);
      resetForm();
    },
  });

  // 任务删除
  const deleteTask = api.articleGeneration.deleteTask.useMutation({
    onSuccess: () => {
      refetchHistory();
    },
  });

  const resetForm = () => {
    setForm({
      topic: '',
      platformId: '',
      enableReferenceArticles: false,
      referenceFilters: {},
      referenceArticleCount: 3,
      enableContentStructure: false,
      structureFilters: {},
      additionalRequirements: '',
    });
  };

  const handleAIProviderChange = (provider: string) => {
    const newConfig = {
      ...aiConfig,
      provider,
      model: DEFAULT_MODELS[provider] || AI_MODELS[provider]?.[0] || '',
    };
    saveAIConfig(newConfig);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic || !form.platformId) {
      return;
    }

    createTask.mutate({
      topic: form.topic,
      platformId: form.platformId,
      enableReferenceArticles: form.enableReferenceArticles,
      referenceFilters: form.referenceFilters,
      referenceArticleCount: form.referenceArticleCount,
      enableContentStructure: form.enableContentStructure,
      structureFilters: form.structureFilters,
      additionalRequirements: form.additionalRequirements || undefined,
      aiProvider: aiConfig.provider,
      aiModel: aiConfig.model,
      systemPrompt: aiConfig.systemPrompt || undefined,
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动选择复制');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'processing': return '生成中';
      case 'failed': return '失败';
      default: return '等待中';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">文章撰写</h1>
          <p className="mt-2 text-sm text-gray-600">
            AI辅助文章生成工具，根据主题和要求自动撰写文章
          </p>
        </div>

        {/* AI配置区域 */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">AI配置</h2>
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  {aiConfig.provider} - {aiConfig.model}
                </span>
              </div>
              <button
                onClick={() => setShowAIConfig(!showAIConfig)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                {showAIConfig ? '收起' : '配置'}
              </button>
            </div>
          </div>

          {showAIConfig && (
            <div className="px-6 py-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">AI供应商</label>
                  <select
                    value={aiConfig.provider}
                    onChange={(e) => handleAIProviderChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {AI_PROVIDERS.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">模型</label>
                  <select
                    value={aiConfig.model}
                    onChange={(e) => saveAIConfig({ ...aiConfig, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {AI_MODELS[aiConfig.provider]?.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 API密钥和Base URL现在在<a href="/ai-settings" className="underline font-medium">综合AI设置</a>中统一管理
                  </p>
                </div>
              </div>

              {/* 系统提示词配置 */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">系统提示词 (可选)</label>
                <textarea
                  value={aiConfig.systemPrompt}
                  onChange={(e) => saveAIConfig({ ...aiConfig, systemPrompt: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="输入自定义系统提示词，用于指导AI生成内容的风格和要求..."
                />
                <div className="mt-1 text-xs text-gray-500">
                  系统提示词将影响AI的写作风格和内容生成方式，留空则使用默认设置
                </div>
              </div>

              <div className="mt-4 flex items-center text-sm text-gray-500">
                <div className="text-xs">配置将自动保存到本地</div>
              </div>
            </div>
          )}
        </div>

        {/* 创建新任务按钮 */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            开始撰写文章
          </button>
        </div>

        {/* 任务历史 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">生成历史</h2>
              <button
                onClick={() => refetchHistory()}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {taskHistory?.tasks.map((task) => (
              <TaskHistoryItem
                key={task.id}
                task={task}
                onView={() => setSelectedTask(task.id)}
                onDelete={() => deleteTask.mutate({ taskId: task.id })}
                onCopy={copyToClipboard}
              />
            ))}

            {(!taskHistory?.tasks || taskHistory.tasks.length === 0) && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无生成记录</h3>
                <p className="mt-1 text-sm text-gray-500">开始您的第一篇AI文章创作吧！</p>
              </div>
            )}
          </div>
        </div>

        {/* 文章撰写表单对话框 */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI文章撰写</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
              {/* 基础配置 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容主题 *</label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如：如何使用React Hooks提升开发效率"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容平台 *</label>
                  <select
                    value={form.platformId}
                    onChange={(e) => setForm({ ...form, platformId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">请选择平台</option>
                    {platforms?.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                        {platform.wordCount && ` (${platform.wordCount})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 参考文章配置 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="enableReference"
                    checked={form.enableReferenceArticles}
                    onChange={(e) => setForm({ ...form, enableReferenceArticles: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableReference" className="ml-2 text-sm font-medium text-gray-700">
                    启用参考文章（AI将参考现有文章的行文方式）
                  </label>
                </div>

                {form.enableReferenceArticles && (
                  <div className="space-y-4 ml-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">筛选平台</label>
                        <select
                          value={form.referenceFilters.platformId || ''}
                          onChange={(e) => setForm({
                            ...form,
                            referenceFilters: { ...form.referenceFilters, platformId: e.target.value || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">全部平台</option>
                          {platforms?.map((platform) => (
                            <option key={platform.id} value={platform.id}>
                              {platform.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">筛选类型</label>
                        <select
                          value={form.referenceFilters.typeId || ''}
                          onChange={(e) => setForm({
                            ...form,
                            referenceFilters: { ...form.referenceFilters, typeId: e.target.value || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">全部类型</option>
                          {articleTypes?.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">参考数量</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={form.referenceArticleCount}
                          onChange={(e) => setForm({ ...form, referenceArticleCount: parseInt(e.target.value) || 3 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>

                    {referenceArticles && referenceArticles.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">将参考以下文章（共 {referenceArticles.length} 篇）：</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {referenceArticles.map((article) => (
                            <div key={article.id} className="text-sm bg-gray-50 p-2 rounded">
                              <span className="font-medium">{article.title}</span>
                              <span className="text-gray-500 ml-2">- {article.author}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 内容结构配置 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="enableStructure"
                    checked={form.enableContentStructure}
                    onChange={(e) => setForm({ ...form, enableContentStructure: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableStructure" className="ml-2 text-sm font-medium text-gray-700">
                    使用内容结构（占决策比重50%，可灵活调整）
                  </label>
                </div>

                {form.enableContentStructure && (
                  <div className="space-y-4 ml-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">筛选平台</label>
                        <select
                          value={form.structureFilters.platformId || ''}
                          onChange={(e) => setForm({
                            ...form,
                            structureFilters: { ...form.structureFilters, platformId: e.target.value || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">全部平台</option>
                          {platforms?.map((platform) => (
                            <option key={platform.id} value={platform.id}>
                              {platform.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">筛选类型</label>
                        <select
                          value={form.structureFilters.typeId || ''}
                          onChange={(e) => setForm({
                            ...form,
                            structureFilters: { ...form.structureFilters, typeId: e.target.value || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">全部类型</option>
                          {articleTypes?.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {contentStructure && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">将使用以下内容结构：</p>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <div className="font-medium">{contentStructure.title}</div>
                          <div className="text-gray-600 mt-1 max-h-20 overflow-y-auto">
                            {contentStructure.content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 附加要求 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">附加要求（可选）</label>
                <textarea
                  value={form.additionalRequirements}
                  onChange={(e) => setForm({ ...form, additionalRequirements: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：请注重实用性，包含代码示例..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createTask.isPending || !form.topic || !form.platformId}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createTask.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  开始生成
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 任务详情对话框 */}
        {selectedTask && (
          <TaskDetailDialog
            taskId={selectedTask}
            onClose={() => setSelectedTask(null)}
            onCopy={copyToClipboard}
          />
        )}
      </div>
    </div>
  );
}

// 任务历史项目组件
function TaskHistoryItem({ task, onView, onDelete, onCopy }: any) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-900">{task.topic}</h3>
            <span className={`ml-3 px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
              {getStatusText(task.status)}
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            平台：{task.platform.name} • 创建时间：{new Date(task.createdAt).toLocaleString('zh-CN')}
            {task.result && (
              <>
                {' • '}
                字数：{task.result.wordCount}字
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {task.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          {task.result && (
            <button
              onClick={() => onCopy(task.result.generatedContent)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="复制文章内容"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onView()}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            查看详情
          </button>
          <button
            onClick={() => onDelete()}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            title="删除任务"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 任务详情对话框组件
function TaskDetailDialog({ taskId, onClose, onCopy }: {
  taskId: string;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>文章详情</DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-0">
          <GenerationStagesViewer
            taskId={taskId}
            username="default-user" // 可以从context或者props获取
            contentType="通用" // 可以从任务信息获取
            onCopy={onCopy}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-100';
    case 'processing': return 'text-blue-600 bg-blue-100';
    case 'failed': return 'text-red-600 bg-red-100';
    default: return 'text-yellow-600 bg-yellow-100';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'completed': return '已完成';
    case 'processing': return '生成中';
    case 'failed': return '失败';
    default: return '等待中';
  }
}