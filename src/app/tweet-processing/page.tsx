/**
 * 推文处理页面
 * 替换原有的数据提取页面，提供推文筛选、AI处理和配置管理功能
 */

'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Navigation } from '~/components/navigation';
import { TweetFilterPresets, type ListIdPreset, type UsernamePreset } from '~/lib/tweet-filter-presets';

// AI 配置接口
interface AIConfig {
  apiKey: string;
  provider: 'openai' | 'openai-badger';
  model: string;
  baseURL?: string;
}

// 筛选配置接口
interface FilterConfig {
  listIds: string[];
  usernames: string[];
  publishedAfter?: string;
  isExtracted: 'all' | 'true' | 'false';
  aiProcessStatus: 'all' | 'pending' | 'processing' | 'completed' | 'failed';
  sortOrder: 'desc' | 'asc';
}

// 时间快捷选项
const TIME_PRESETS = [
  { label: '1小时', hours: 1 },
  { label: '4小时', hours: 4 },
  { label: '12小时', hours: 12 },
  { label: '24小时', hours: 24 },
  { label: '72小时', hours: 72 },
];

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的推文内容分析助手。请分析推文的价值和内容，并按以下要求输出结果：

**分析规则：**
1. 剔除无信息价值的推文：
   - 纯粹的打招呼、问候、感谢
   - 个人日常生活分享（如吃饭、睡觉、心情等）
   - 无实质内容的互动（如单纯的表情、"赞"、"转发"等）
   - 营销推广、广告内容

2. 匹配主题标签：
   如果推文内容与以下主题相关，请列出匹配的标签：
   - 人工智能、机器学习、深度学习
   - 编程开发、软件工程
   - 科技产品、硬件设备
   - 商业创新、投资融资
   - 互联网、社交媒体
   - 数据科学、大数据
   - 区块链、加密货币

3. 判断内容类型：
   根据推文内容的性质，选择匹配的类型：
   - 教程：操作指南、学习材料
   - 产品介绍：新产品发布、功能介绍
   - 产品试用：使用体验、测评分享
   - 新闻报道：行业新闻、事件报道
   - 观点分析：个人观点、行业分析
   - 工具推荐：软件工具、资源推荐

**输出格式（必须是有效的JSON）：**
{
  "isValueless": false,
  "topicTags": ["匹配的主题标签1", "匹配的主题标签2"],
  "contentTypes": ["匹配的内容类型1", "匹配的内容类型2"]
}

请确保输出是严格的JSON格式，不要包含任何额外的文本。`;

export default function TweetProcessingPage() {
  // 筛选状态
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tweet-processing-filter-config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('解析筛选配置失败:', error);
        }
      }
    }
    return {
      listIds: [],
      usernames: [],
      publishedAfter: undefined,
      isExtracted: 'all',
      aiProcessStatus: 'all',
      sortOrder: 'desc',
    };
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 50;

  // 预制功能状态
  const [listIdPresets, setListIdPresets] = useState<ListIdPreset[]>([]);
  const [usernamePresets, setUsernamePresets] = useState<UsernamePreset[]>([]);
  const [selectedListIdPresets, setSelectedListIdPresets] = useState<ListIdPreset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tweet-processing-selected-listid-presets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('解析选择的ListId预制项失败:', error);
        }
      }
    }
    return [];
  });
  const [selectedUsernamePresets, setSelectedUsernamePresets] = useState<UsernamePreset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tweet-processing-selected-username-presets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('解析选择的Username预制项失败:', error);
        }
      }
    }
    return [];
  });

  // AI 配置状态
  const [aiConfig, setAIConfig] = useState<AIConfig>(() => {
    // 从 localStorage 加载配置
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tweet-processing-ai-config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('解析 AI 配置失败:', e);
        }
      }
    }
    return {
      apiKey: '',
      provider: 'openai' as const,
      model: 'gpt-4o',
    };
  });

  // 主题标签管理状态
  const [newTopicTag, setNewTopicTag] = useState({ name: '', description: '' });
  const [showTopicTagForm, setShowTopicTagForm] = useState(false);

  // 内容类型管理状态
  const [newContentType, setNewContentType] = useState({ name: '', description: '' });
  const [showContentTypeForm, setShowContentTypeForm] = useState(false);

  // AI 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);

  // 折叠状态
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

  // 预制项表单状态
  const [showListIdForm, setShowListIdForm] = useState(false);
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [newListIdPreset, setNewListIdPreset] = useState({ name: '', listId: '' });
  const [newUsernamePreset, setNewUsernamePreset] = useState({ name: '', username: '' });

  // 加载预制项目
  useEffect(() => {
    setListIdPresets(TweetFilterPresets.getListIdPresets());
    setUsernamePresets(TweetFilterPresets.getUsernamePresets());
  }, []);


  // 保存 AI 配置到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-processing-ai-config', JSON.stringify(aiConfig));
    }
  }, [aiConfig]);

  // 保存筛选配置到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-processing-filter-config', JSON.stringify(filterConfig));
    }
  }, [filterConfig]);

  // 保存预制项选择状态到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-processing-selected-listid-presets', JSON.stringify(selectedListIdPresets));
    }
  }, [selectedListIdPresets]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-processing-selected-username-presets', JSON.stringify(selectedUsernamePresets));
    }
  }, [selectedUsernamePresets]);

  // 计算有效的 listIds 和 usernames
  const effectiveListIds = selectedListIdPresets.length > 0 
    ? selectedListIdPresets.map(preset => preset.listId)
    : filterConfig.listIds;
  
  const effectiveUsernames = selectedUsernamePresets.length > 0 
    ? selectedUsernamePresets.map(preset => preset.username)
    : filterConfig.usernames;

  // 获取推文数据
  const { data: tweetsData, isLoading: tweetsLoading, refetch: refetchTweets } = api.tweetProcessing.getFilteredTweets.useQuery({
    listIds: effectiveListIds.length > 0 ? effectiveListIds : undefined,
    usernames: effectiveUsernames.length > 0 ? effectiveUsernames : undefined,
    publishedAfter: filterConfig.publishedAfter,
    isExtracted: filterConfig.isExtracted,
    aiProcessStatus: filterConfig.aiProcessStatus,
    page: currentPage,
    limit,
    sortOrder: filterConfig.sortOrder,
  });

  // 获取主题标签
  const { data: topicTags, refetch: refetchTopicTags } = api.tweetProcessing.getTopicTags.useQuery();
  const { data: contentTypes, refetch: refetchContentTypes } = api.tweetProcessing.getContentTypes.useQuery();

  // 获取处理记录
  const { data: processRecords } = api.tweetProcessing.getAIProcessRecords.useQuery({ limit: 10 });

  // Mutations
  const createTopicTag = api.tweetProcessing.createTopicTag.useMutation({
    onSuccess: () => {
      refetchTopicTags();
      setNewTopicTag({ name: '', description: '' });
      setShowTopicTagForm(false);
    },
  });

  const deleteTopicTag = api.tweetProcessing.deleteTopicTag.useMutation({
    onSuccess: () => {
      refetchTopicTags();
    },
  });

  const createContentType = api.tweetProcessing.addContentType.useMutation({
    onSuccess: () => {
      refetchContentTypes();
      setNewContentType({ name: '', description: '' });
      setShowContentTypeForm(false);
    },
  });

  const deleteContentType = api.tweetProcessing.deleteContentType.useMutation({
    onSuccess: () => {
      refetchContentTypes();
    },
  });

  const startAIProcess = api.tweetProcessing.startAIBatchProcess.useMutation({
    onSuccess: (data) => {
      setCurrentBatchId(data.batchId);
      setIsProcessing(true);
      setShowProcessingModal(true);
    },
  });

  const stopAIProcess = api.tweetProcessing.stopAIBatchProcess.useMutation({
    onSuccess: () => {
      setIsProcessing(false);
      setCurrentBatchId(null);
    },
  });

  // 处理筛选
  const handleFilter = () => {
    setCurrentPage(1);
    refetchTweets();
  };

  // 创建 ListId 预制项
  const handleCreateListIdPreset = () => {
    if (newListIdPreset.name.trim() && newListIdPreset.listId.trim()) {
      try {
        const preset = TweetFilterPresets.addListIdPreset({
          name: newListIdPreset.name.trim(),
          listId: newListIdPreset.listId.trim(),
        });
        setListIdPresets(TweetFilterPresets.getListIdPresets());
        setNewListIdPreset({ name: '', listId: '' });
        setShowListIdForm(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : '创建预制项失败');
      }
    }
  };

  // 删除 ListId 预制项
  const handleDeleteListIdPreset = (presetId: string) => {
    TweetFilterPresets.deleteListIdPreset(presetId);
    setListIdPresets(TweetFilterPresets.getListIdPresets());
    // 从选中项中移除
    setSelectedListIdPresets(prev => prev.filter(p => p.id !== presetId));
  };

  // 创建用户名预制项
  const handleCreateUsernamePreset = () => {
    if (newUsernamePreset.name.trim() && newUsernamePreset.username.trim()) {
      try {
        const preset = TweetFilterPresets.addUsernamePreset({
          name: newUsernamePreset.name.trim(),
          username: newUsernamePreset.username.trim(),
        });
        setUsernamePresets(TweetFilterPresets.getUsernamePresets());
        setNewUsernamePreset({ name: '', username: '' });
        setShowUsernameForm(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : '创建预制项失败');
      }
    }
  };

  // 删除用户名预制项
  const handleDeleteUsernamePreset = (presetId: string) => {
    TweetFilterPresets.deleteUsernamePreset(presetId);
    setUsernamePresets(TweetFilterPresets.getUsernamePresets());
    // 从选中项中移除
    setSelectedUsernamePresets(prev => prev.filter(p => p.id !== presetId));
  };

  // 切换 ListId 预制项选择
  const handleToggleListIdPreset = (preset: ListIdPreset) => {
    setSelectedListIdPresets(prev => {
      const isSelected = prev.some(p => p.id === preset.id);
      if (isSelected) {
        return prev.filter(p => p.id !== preset.id);
      } else {
        return [...prev, preset];
      }
    });
  };

  // 切换用户名预制项选择
  const handleToggleUsernamePreset = (preset: UsernamePreset) => {
    setSelectedUsernamePresets(prev => {
      const isSelected = prev.some(p => p.id === preset.id);
      if (isSelected) {
        return prev.filter(p => p.id !== preset.id);
      } else {
        return [...prev, preset];
      }
    });
  };

  // 设置时间快捷选项
  const handleTimePreset = (hours: number) => {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    setFilterConfig(prev => ({
      ...prev,
      publishedAfter: date.toISOString(),
    }));
  };

  // 创建主题标签
  const handleCreateTopicTag = () => {
    if (newTopicTag.name.trim()) {
      createTopicTag.mutate({
        name: newTopicTag.name.trim(),
        description: newTopicTag.description.trim() || undefined,
      });
    }
  };

  // 创建内容类型
  const handleCreateContentType = () => {
    if (newContentType.name.trim()) {
      createContentType.mutate({
        name: newContentType.name.trim(),
        description: newContentType.description.trim() || undefined,
      });
    }
  };

  // 启动 AI 处理
  const handleStartAIProcess = () => {
    if (!aiConfig.apiKey) {
      alert('请先配置 OpenAI API Key');
      return;
    }

    startAIProcess.mutate({
      filterConfig: {
        listIds: effectiveListIds.length > 0 ? effectiveListIds : undefined,
        usernames: effectiveUsernames.length > 0 ? effectiveUsernames : undefined,
        publishedAfter: filterConfig.publishedAfter,
        isExtracted: filterConfig.isExtracted,
      },
      batchSize,
      systemPrompt: systemPrompt.trim() === DEFAULT_SYSTEM_PROMPT.trim() ? '' : systemPrompt.trim(),
      aiConfig,
    });
  };

  return (
    <>
      <Navigation />
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">推文处理</h1>
            <p className="text-gray-600 mt-1">筛选推文并使用 AI 进行关键词提取和主题标签匹配</p>
          </div>

          {/* 筛选区域 */}
          <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                className="flex items-center text-lg font-semibold text-gray-900 hover:text-gray-700"
              >
                <span className="mr-2">
                  {isFiltersCollapsed ? '▶' : '▼'}
                </span>
                推文筛选
                {(selectedListIdPresets.length > 0 || selectedUsernamePresets.length > 0 || filterConfig.publishedAfter) && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    已设置筛选条件
                  </span>
                )}
              </button>
            </div>

            {!isFiltersCollapsed && (
              <>
                {/* List ID 预制项 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      List ID
                      {selectedListIdPresets.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {selectedListIdPresets.length} 项已选
                        </span>
                      )}
                    </label>
                    <button
                      onClick={() => setShowListIdForm(!showListIdForm)}
                      className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {showListIdForm ? '取消' : '添加'}
                    </button>
                  </div>

                  {showListIdForm && (
                <div className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={newListIdPreset.name}
                      onChange={(e) => setNewListIdPreset(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="预制项名称"
                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newListIdPreset.listId}
                      onChange={(e) => setNewListIdPreset(prev => ({ ...prev, listId: e.target.value }))}
                      placeholder="List ID"
                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateListIdPreset}
                    disabled={!newListIdPreset.name.trim() || !newListIdPreset.listId.trim()}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                  >
                    保存
                  </button>
                </div>
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {listIdPresets.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedListIdPresets.some(p => p.id === preset.id)}
                        onChange={() => handleToggleListIdPreset(preset)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-sm text-gray-600">{preset.listId}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteListIdPreset(preset.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </div>
                    ))}
                    {listIdPresets.length === 0 && (
                      <div className="text-gray-500 text-center py-4">
                        暂无 List ID 预制项，点击"添加"创建
                      </div>
                    )}
                  </div>
                </div>

                {/* 用户名预制项 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      发推人用户名
                      {selectedUsernamePresets.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {selectedUsernamePresets.length} 项已选
                        </span>
                      )}
                    </label>
                    <button
                      onClick={() => setShowUsernameForm(!showUsernameForm)}
                      className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {showUsernameForm ? '取消' : '添加'}
                    </button>
                  </div>

                  {showUsernameForm && (
                <div className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={newUsernamePreset.name}
                      onChange={(e) => setNewUsernamePreset(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="预制项名称"
                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newUsernamePreset.username}
                      onChange={(e) => setNewUsernamePreset(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="用户名（不带@）"
                      className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateUsernamePreset}
                    disabled={!newUsernamePreset.name.trim() || !newUsernamePreset.username.trim()}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                  >
                    保存
                  </button>
                </div>
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {usernamePresets.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedUsernamePresets.some(p => p.id === preset.id)}
                        onChange={() => handleToggleUsernamePreset(preset)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-sm text-gray-600">@{preset.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUsernamePreset(preset.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </div>
                    ))}
                    {usernamePresets.length === 0 && (
                      <div className="text-gray-500 text-center py-4">
                        暂无用户名预制项，点击"添加"创建
                      </div>
                    )}
                  </div>
                </div>

                {/* 时间筛选 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发推时间
                    {filterConfig.publishedAfter && (
                      <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                        已设置
                      </span>
                    )}
                  </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.hours}
                    onClick={() => handleTimePreset(preset.hours)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {preset.label}内
                  </button>
                ))}
                <button
                  onClick={() => setFilterConfig(prev => ({ ...prev, publishedAfter: undefined }))}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  清除
                </button>
              </div>
                  {filterConfig.publishedAfter && (
                    <div className="text-sm text-gray-600">
                      筛选 {new Date(filterConfig.publishedAfter).toLocaleString()} 之后的推文
                    </div>
                  )}
                </div>

                {/* 其他筛选选项 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">其他筛选选项</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">是否被提取过</label>
                <select
                  value={filterConfig.isExtracted}
                  onChange={(e) => setFilterConfig(prev => ({ ...prev, isExtracted: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="true">是</option>
                  <option value="false">否</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI处理状态</label>
                <select
                  value={filterConfig.aiProcessStatus}
                  onChange={(e) => setFilterConfig(prev => ({ ...prev, aiProcessStatus: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">排序方式</label>
                <select
                  value={filterConfig.sortOrder}
                  onChange={(e) => setFilterConfig(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="desc">时间由近到远</option>
                  <option value="asc">时间由远到近</option>
                    </select>
                  </div>
                  </div>
                </div>

                <button
                  onClick={handleFilter}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  筛选推文
                </button>
              </>
            )}
          </div>

          {/* 主题标签管理 */}
          <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">主题标签</h3>
                <button
                  onClick={() => setShowTopicTagForm(!showTopicTagForm)}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  {showTopicTagForm ? '取消' : '添加'}
                </button>
              </div>

              {showTopicTagForm && (
                <div className="mb-3 p-3 border border-gray-200 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      value={newTopicTag.name}
                      onChange={(e) => setNewTopicTag(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="标签名称"
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newTopicTag.description}
                      onChange={(e) => setNewTopicTag(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="标签描述（可选）"
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCreateTopicTag}
                      disabled={!newTopicTag.name.trim() || createTopicTag.isPending}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      {createTopicTag.isPending ? '创建中...' : '保存'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {topicTags?.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between p-2 border border-gray-200 rounded text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{tag.name}</span>
                      {tag.description && (
                        <span className="text-xs text-gray-500 ml-2">({tag.description})</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTopicTag.mutate({ id: tag.id })}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 ml-2 flex-shrink-0"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
          </div>

          {/* 内容类型管理 */}
          <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">内容类型</h3>
                <button
                  onClick={() => setShowContentTypeForm(!showContentTypeForm)}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  {showContentTypeForm ? '取消' : '添加'}
                </button>
              </div>

              {showContentTypeForm && (
                <div className="mb-3 p-3 border border-gray-200 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      value={newContentType.name}
                      onChange={(e) => setNewContentType(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="类型名称"
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newContentType.description}
                      onChange={(e) => setNewContentType(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="类型描述（可选）"
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCreateContentType}
                      disabled={!newContentType.name.trim() || createContentType.isPending}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      {createContentType.isPending ? '创建中...' : '保存'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {contentTypes?.map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-2 border border-gray-200 rounded text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{type.name}</span>
                      {type.description && (
                        <span className="text-xs text-gray-500 ml-2">({type.description})</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteContentType.mutate({ id: type.id })}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 ml-2 flex-shrink-0"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
          </div>

          {/* AI 批处理控制区域 */}
          <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium">AI 批处理</h3>
                <p className="text-xs text-gray-500">自动处理符合筛选条件的推文</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAIConfigModal(true)}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  设置
                </button>
                {!isProcessing ? (
                  <button
                    onClick={handleStartAIProcess}
                    disabled={!aiConfig.apiKey || startAIProcess.isPending}
                    className="px-4 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                  >
                    {startAIProcess.isPending ? '启动中...' : '开始处理'}
                  </button>
                ) : (
                  <button
                    onClick={() => currentBatchId && stopAIProcess.mutate({ batchId: currentBatchId })}
                    disabled={stopAIProcess.isPending}
                    className="px-4 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
                  >
                    {stopAIProcess.isPending ? '停止中...' : '停止处理'}
                  </button>
                )}
                <button
                  onClick={() => setShowProcessingModal(true)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  状态
                </button>
              </div>
            </div>
          </div>

          {/* 推文列表 */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">推文列表</h2>
              {tweetsData && (
                <div className="text-sm text-gray-600">
                  第 {tweetsData.pagination.page} 页，共 {tweetsData.pagination.totalPages} 页，
                  总计 {tweetsData.pagination.total} 条推文
                </div>
              )}
            </div>

            {tweetsLoading && (
              <div className="text-center py-8">
                <div className="text-gray-600">加载中...</div>
              </div>
            )}

            {tweetsData && tweetsData.tweets.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-600">没有找到符合条件的推文</div>
              </div>
            )}

            {tweetsData && tweetsData.tweets.length > 0 && (
              <>
                <div className="space-y-4">
                  {tweetsData.tweets.map((tweet) => (
                    <div key={tweet.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        {tweet.profileImageUrl && (
                          <img
                            src={tweet.profileImageUrl}
                            alt={tweet.userNickname}
                            className="w-12 h-12 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-semibold">{tweet.userNickname}</span>
                            <span className="text-gray-500">@{tweet.userUsername}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500 text-sm">
                              {new Date(parseInt(tweet.publishedAt)).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="mb-3">{tweet.content}</div>
                          
                          {/* AI 处理状态和结果 */}
                          <div className="mb-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              tweet.aiProcessStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              tweet.aiProcessStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                              tweet.aiProcessStatus === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              AI状态: {
                                tweet.aiProcessStatus === 'completed' ? '已完成' :
                                tweet.aiProcessStatus === 'processing' ? '处理中' :
                                tweet.aiProcessStatus === 'failed' ? '失败' :
                                '待处理'
                              }
                            </span>
                          </div>

                          {/* 主题标签和内容类型 */}
                          {(tweet.topicTags || tweet.contentTypes) && (
                            <div className="space-y-2">
                              {tweet.topicTags && tweet.topicTags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-xs text-gray-500 mr-1">主题标签:</span>
                                  {tweet.topicTags.map((tag: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full whitespace-nowrap">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {tweet.contentTypes && tweet.contentTypes.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-xs text-gray-500 mr-1">内容类型:</span>
                                  {tweet.contentTypes.map((type: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full whitespace-nowrap">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                            <span>💬 {tweet.replyCount}</span>
                            <span>🔄 {tweet.retweetCount}</span>
                            <span>❤️ {tweet.likeCount}</span>
                            <span>👁️ {tweet.viewCount}</span>
                            <a
                              href={tweet.tweetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              查看原推
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 分页 */}
                {tweetsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      上一页
                    </button>
                    <span className="px-4 py-2">
                      第 {currentPage} 页，共 {tweetsData.pagination.totalPages} 页
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(tweetsData.pagination.totalPages, prev + 1))}
                      disabled={currentPage === tweetsData.pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 处理状态弹窗 */}
      {showProcessingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI 处理状态</h3>
              <button
                onClick={() => setShowProcessingModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">最近处理记录</h4>
              {processRecords && processRecords.length > 0 ? (
                <div className="space-y-3">
                  {processRecords.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">批次 {record.batchId}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.status === 'completed' ? 'bg-green-100 text-green-800' :
                          record.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          record.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status === 'completed' ? '已完成' :
                           record.status === 'processing' ? '处理中' :
                           record.status === 'failed' ? '失败' :
                           record.status === 'cancelled' ? '已取消' :
                           record.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>总数: {record.totalTweets} | 已处理: {record.processedTweets} | 失败: {record.failedTweets}</div>
                        <div>开始时间: {new Date(record.startedAt).toLocaleString()}</div>
                        {record.completedAt && (
                          <div>完成时间: {new Date(record.completedAt).toLocaleString()}</div>
                        )}
                        {record.errorMessage && (
                          <div className="text-red-600">错误: {record.errorMessage}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">暂无处理记录</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI 配置弹窗 */}
      {showAIConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI 配置</h3>
              <button
                onClick={() => setShowAIConfigModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAIConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="输入 OpenAI API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI 提供商</label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const provider = e.target.value as 'openai' | 'openai-badger';
                    setAIConfig(prev => ({ 
                      ...prev, 
                      provider,
                      // 切换供应商时自动设置对应的默认模型
                      model: provider === 'openai-badger' ? 'gpt-4o-mini' : 'gpt-4o'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="openai-badger">OpenAI-badger</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI 模型</label>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAIConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {aiConfig.provider === 'openai-badger' ? (
                    <>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">单次处理推文数量</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统提示词
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="输入系统提示词..."
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-mono"
                />
                <div className="mt-2 text-sm text-gray-600">
                  自定义 AI 处理时的系统提示词
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAIConfigModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowAIConfigModal(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
