'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { cn } from '~/lib/utils';
import { Plus, Search, Filter, Edit, Trash2, Check, X, AlertCircle, Copy, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';

interface TabItem {
  id: string;
  name: string;
  icon: string;
}

const tabs: TabItem[] = [
  { id: 'articles', name: '文章内容', icon: '📝' },
  { id: 'structures', name: '内容结构', icon: '🏗️' },
  { id: 'platforms', name: '内容平台', icon: '🌐' },
  { id: 'types', name: '文章类型', icon: '🏷️' },
];

export default function ReferenceCollectionPage() {
  const [activeTab, setActiveTab] = useState<string>('articles');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'articles' && <ArticlesTab />}
            {activeTab === 'structures' && <ContentStructuresTab />}
            {activeTab === 'platforms' && <PlatformsTab />}
            {activeTab === 'types' && <TypesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// 文章内容 Tab
function ArticlesTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    platformIds: [] as string[],
    articleTypeIds: [] as string[],
    startDate: '',
    endDate: '',
    author: '',
    title: '',
  });


  const { data: articlesData, refetch: refetchArticles } = api.collectedArticles.getAll.useQuery(filters);
  const { data: platforms } = api.contentPlatforms.getAll.useQuery();
  const { data: articleTypes } = api.articleTypes.getAll.useQuery();

  const handleCopyContent = async (content: string | null) => {
    if (!content) {
      alert('该文章没有正文内容');
      return;
    }

    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        alert('正文已复制到剪贴板');
      } else {
        // 备用方案：使用传统的复制方法
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          alert('正文已复制到剪贴板');
        } catch (execErr) {
          console.error('备用复制方法失败:', execErr);
          alert('复制失败，请手动选择并复制文本');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请重试');
    }
  };


  // 获取编辑中的文章数据
  const editingArticle = editingId
    ? articlesData?.articles.find(article => article.id === editingId)
    : null;

  const createArticle = api.collectedArticles.create.useMutation({
    onSuccess: () => {
      refetchArticles();
      setShowAddForm(false);
    },
  });

  const updateArticle = api.collectedArticles.update.useMutation({
    onSuccess: () => {
      refetchArticles();
      setEditingId(null);
    },
  });

  const deleteArticle = api.collectedArticles.delete.useMutation({
    onSuccess: () => {
      refetchArticles();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const title = formData.get('title') as string;
    const author = formData.get('author') as string;
    const content = formData.get('content') as string;
    const platformIds = formData.getAll('platforms') as string[];
    const articleTypeIds = formData.getAll('articleTypes') as string[];

    if (editingId) {
      updateArticle.mutate({
        id: editingId,
        title,
        author,
        content,
        platformIds,
        articleTypeIds,
      });
    } else {
      createArticle.mutate({
        title,
        author,
        content,
        platformIds,
        articleTypeIds,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 筛选条件 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">筛选条件</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">平台筛选</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
              <label className="flex items-center mb-1">
                <input
                  type="checkbox"
                  checked={filters.platformIds.length === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters({...filters, platformIds: []});
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                />
                <span className="ml-2 text-xs text-gray-700">全部</span>
              </label>
              {platforms?.map((platform) => (
                <label key={platform.id} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={filters.platformIds.includes(platform.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({
                          ...filters,
                          platformIds: [...filters.platformIds, platform.id]
                        });
                      } else {
                        setFilters({
                          ...filters,
                          platformIds: filters.platformIds.filter(id => id !== platform.id)
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span className="ml-2 text-xs text-gray-700">{platform.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">类型筛选</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
              <label className="flex items-center mb-1">
                <input
                  type="checkbox"
                  checked={filters.articleTypeIds.length === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters({...filters, articleTypeIds: []});
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                />
                <span className="ml-2 text-xs text-gray-700">全部</span>
              </label>
              {articleTypes?.map((type) => (
                <label key={type.id} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={filters.articleTypeIds.includes(type.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({
                          ...filters,
                          articleTypeIds: [...filters.articleTypeIds, type.id]
                        });
                      } else {
                        setFilters({
                          ...filters,
                          articleTypeIds: filters.articleTypeIds.filter(id => id !== type.id)
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span className="ml-2 text-xs text-gray-700">{type.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={filters.title}
              onChange={(e) => setFilters({...filters, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="搜索标题..."
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">作者</label>
            <input
              type="text"
              value={filters.author}
              onChange={(e) => setFilters({...filters, author: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="搜索作者..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* 添加按钮 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">文章列表</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加文章
        </button>
      </div>

      {/* 添加/编辑文章模态框 */}
      <Dialog
        open={showAddForm || !!editingId}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="p-6">
            <DialogTitle>
              {editingId ? '编辑文章' : '添加文章'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 pt-0">
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标题 *</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingArticle?.title || ''}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="请输入文章标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">作者 *</label>
                  <input
                    type="text"
                    name="author"
                    defaultValue={editingArticle?.author || ''}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="请输入作者姓名"
                  />
                </div>
              </div>

              {/* 文章内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">文章内容</label>
                <textarea
                  name="content"
                  defaultValue={editingArticle?.content || ''}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="请输入文章内容..."
                />
              </div>

              {/* 平台和类型选择 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容平台 *</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                    {platforms?.map((platform) => (
                      <label key={platform.id} className="flex items-center">
                        <input
                          type="checkbox"
                          name="platforms"
                          value={platform.id}
                          defaultChecked={editingArticle?.platforms.some(p => p.platformId === platform.id) || false}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          {platform.name}
                          {platform.isDefault && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">(默认)</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">文章类型 *</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                    {articleTypes?.map((type) => (
                      <label key={type.id} className="flex items-center">
                        <input
                          type="checkbox"
                          name="articleTypes"
                          value={type.id}
                          defaultChecked={editingArticle?.articleTypes.some(t => t.typeId === type.id) || false}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          {type.name}
                          {type.isDefault && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">(默认)</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={createArticle.isPending || updateArticle.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {createArticle.isPending || updateArticle.isPending ? '处理中...' : (editingId ? '更新' : '添加')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 文章表格 */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                标题
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                作者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                平台
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                采集时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {articlesData?.articles.map((article) => (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {article.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {article.author}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {article.platforms.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {p.platform.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {article.articleTypes.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                      >
                        {t.articleType.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(article.collectedAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCopyContent(article.content)}
                      className="text-green-600 hover:text-green-900 transition-colors"
                      title="复制正文"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(article.id)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteArticle.mutate({ id: article.id })}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!articlesData?.articles || articlesData.articles.length === 0) && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无文章</h3>
            <p className="mt-1 text-sm text-gray-500">开始添加您的第一篇文章吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 内容平台 Tab
function PlatformsTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: platforms, refetch } = api.contentPlatforms.getAll.useQuery();

  const createPlatform = api.contentPlatforms.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddForm(false);
    },
  });

  const updatePlatform = api.contentPlatforms.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
    },
  });

  const deletePlatform = api.contentPlatforms.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const setDefaultPlatform = api.contentPlatforms.setDefault.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const initDefaults = api.contentPlatforms.initDefaults.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get('name') as string;
    const platformId = formData.get('platformId') as string;
    const description = formData.get('description') as string;
    const wordCount = formData.get('wordCount') as string;

    if (editingId) {
      updatePlatform.mutate({
        id: editingId,
        name,
        platformId,
        description,
        wordCount,
      });
    } else {
      createPlatform.mutate({
        name,
        platformId,
        description,
        wordCount,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">内容平台管理</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => initDefaults.mutate()}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            初始化默认项
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加平台
          </button>
        </div>
      </div>

      {/* 添加/编辑表单 */}
      {(showAddForm || editingId) && (
        <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? '编辑平台' : '添加平台'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">平台名称 *</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="如：微信公众号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">平台ID *</label>
              <input
                type="text"
                name="platformId"
                required
                pattern="[a-zA-Z0-9_-]+"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="如：wechat"
              />
              <p className="text-xs text-gray-500 mt-1">只能包含字母、数字、下划线和短横线</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">字数要求</label>
              <input
                type="text"
                name="wordCount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="如：1000-1500字"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">平台描述</label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入平台描述..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={createPlatform.isPending || updatePlatform.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {editingId ? '更新' : '添加'}
            </button>
          </div>
        </form>
      )}

      {/* 平台表格 */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                平台名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                平台ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                描述
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                字数要求
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                创建时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {platforms?.map((platform) => (
              <tr key={platform.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {platform.name}
                  {platform.isDefault && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      默认
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {platform.platformId}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {platform.description || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {platform.wordCount || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {platform.isDefault ? (
                    <span className="text-blue-600">默认平台</span>
                  ) : (
                    <button
                      onClick={() => setDefaultPlatform.mutate({ id: platform.id })}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      设为默认
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(platform.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingId(platform.id)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {!platform.isDefault && (
                      <button
                        onClick={() => deletePlatform.mutate({ id: platform.id })}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!platforms || platforms.length === 0) && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无平台</h3>
            <p className="mt-1 text-sm text-gray-500">开始添加您的第一个内容平台吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 文章类型 Tab
function TypesTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: articleTypes, refetch } = api.articleTypes.getAll.useQuery();

  const createType = api.articleTypes.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddForm(false);
    },
  });

  const updateType = api.articleTypes.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingId(null);
    },
  });

  const deleteType = api.articleTypes.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const setDefaultType = api.articleTypes.setDefault.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const initDefaults = api.articleTypes.initDefaults.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get('name') as string;
    const typeId = formData.get('typeId') as string;
    const description = formData.get('description') as string;

    if (editingId) {
      updateType.mutate({
        id: editingId,
        name,
        typeId,
        description,
      });
    } else {
      createType.mutate({
        name,
        typeId,
        description,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">文章类型管理</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => initDefaults.mutate()}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            初始化默认项
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加类型
          </button>
        </div>
      </div>

      {/* 添加/编辑表单 */}
      {(showAddForm || editingId) && (
        <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? '编辑类型' : '添加类型'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">类型名称 *</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="如：技术教程"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">类型ID *</label>
              <input
                type="text"
                name="typeId"
                required
                pattern="[a-zA-Z0-9_-]+"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="如：tutorial"
              />
              <p className="text-xs text-gray-500 mt-1">只能包含字母、数字、下划线和短横线</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">类型描述</label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入类型描述..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={createType.isPending || updateType.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {editingId ? '更新' : '添加'}
            </button>
          </div>
        </form>
      )}

      {/* 类型表格 */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                类型名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                类型ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                描述
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                创建时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {articleTypes?.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {type.name}
                  {type.isDefault && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      默认
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {type.typeId}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {type.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {type.isDefault ? (
                    <span className="text-green-600">默认类型</span>
                  ) : (
                    <button
                      onClick={() => setDefaultType.mutate({ id: type.id })}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                    >
                      设为默认
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(type.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingId(type.id)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {!type.isDefault && (
                      <button
                        onClick={() => deleteType.mutate({ id: type.id })}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!articleTypes || articleTypes.length === 0) && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无类型</h3>
            <p className="mt-1 text-sm text-gray-500">开始添加您的第一个文章类型吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 内容结构 Tab
function ContentStructuresTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notesContent, setNotesContent] = useState('');

  // 使用数据库数据
  const { data: structures, refetch: refetchStructures } = api.contentStructures.getAll.useQuery();
  const { data: platforms } = api.contentPlatforms.getAll.useQuery();
  const { data: articleTypes } = api.articleTypes.getAll.useQuery();

  // CRUD 操作
  const createStructure = api.contentStructures.create.useMutation({
    onSuccess: () => {
      refetchStructures();
      setShowAddForm(false);
    },
  });

  const updateStructure = api.contentStructures.update.useMutation({
    onSuccess: () => {
      refetchStructures();
      setEditingId(null);
    },
  });

  const deleteStructure = api.contentStructures.delete.useMutation({
    onSuccess: () => {
      refetchStructures();
    },
  });

  // 从本地存储加载笔记内容
  useEffect(() => {
    const savedNotes = localStorage.getItem('writing-assistant-notes');
    if (savedNotes) {
      setNotesContent(savedNotes);
    }
  }, []);

  // 保存笔记内容到本地存储
  const handleSaveNotes = () => {
    localStorage.setItem('writing-assistant-notes', notesContent);
    alert('笔记已保存到浏览器本地存储');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const platformId = formData.get('platformId') as string;
    const typeId = formData.get('typeId') as string;

    if (editingId) {
      updateStructure.mutate({
        id: editingId,
        title,
        content,
        platformId,
        typeId,
      });
    } else {
      createStructure.mutate({
        title,
        content,
        platformId,
        typeId,
      });
    }
  };

  const handleEdit = (structure: any) => {
    setEditingId(structure.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    deleteStructure.mutate({ id });
  };

  const editingStructure = editingId ? structures?.find(s => s.id === editingId) : null;

  return (
    <div className="space-y-6">
      {/* 添加按钮 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">内容结构列表</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowNotesDialog(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <FileText className="h-4 w-4 mr-2" />
            笔记
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加结构
          </button>
        </div>
      </div>

      {/* 添加/编辑表单模态框 */}
      <Dialog
        open={showAddForm || !!editingId}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? '编辑内容结构' : '添加内容结构'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                name="title"
                defaultValue={editingStructure?.title || ''}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="请输入标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">正文</label>
              <textarea
                name="content"
                defaultValue={editingStructure?.content || ''}
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="请输入正文内容"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容平台</label>
              <select
                name="platformId"
                defaultValue={editingStructure?.platformId || ''}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">请选择平台</option>
                {platforms?.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文章类型</label>
              <select
                name="typeId"
                defaultValue={editingStructure?.typeId || ''}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">请选择类型</option>
                {articleTypes?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingId ? '更新' : '添加'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 笔记对话框 */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>笔记本</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0 flex flex-col h-full min-h-[60vh]">
            <textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              className="w-full flex-1 min-h-[50vh] px-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
              placeholder="在这里记录您的想法和内容..."
            />
            <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowNotesDialog(false)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                保存笔记
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 结构列表 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                标题
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                正文预览
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                内容平台
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                文章类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {structures?.map((structure) => (
              <tr key={structure.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {structure.title}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                  <div className="truncate">{structure.content}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {structure.platform.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {structure.articleType.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(structure)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(structure.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!structures || structures.length === 0) && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无内容结构</h3>
            <p className="mt-1 text-sm text-gray-500">开始添加您的第一个内容结构吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}