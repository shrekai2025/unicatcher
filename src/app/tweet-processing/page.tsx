/**
 * 推文处理页面
 * 替换原有的数据提取页面，提供推文筛选、AI处理和配置管理功能
 */

'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { DashboardLayout } from '~/components/dashboard-layout';
import type { AIConfig } from '~/server/core/ai/base/ai-types';

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
1. 提取关键词：
   - 从推文中提取3-8个最重要的关键词
   - 关键词应该是名词、技术术语、产品名称等实质性内容
   - 避免提取停用词、介词、助词等无意义词汇
   - 关键词应该有助于理解推文的核心内容

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

**重要：价值判断标准**
- 如果推文匹配到任何一种内容类型，则视为有价值（isValueless: false）
- 如果推文不匹配任何内容类型，则视为无价值（isValueless: true）
- 价值判断完全基于是否命中内容类型，而非推文内容的主观判断

**输出格式（必须是有效的JSON）：**
{
  "isValueless": false,
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "topicTags": ["匹配的主题标签1", "匹配的主题标签2"],
  "contentTypes": ["匹配的内容类型1", "匹配的内容类型2"]
}

请确保输出是严格的JSON格式，不要包含任何额外的文本。`;

export default function TweetProcessingPage() {
  // 避免hydration错误的mounted状态
  const [isMounted, setIsMounted] = useState(false);

  // 筛选状态
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    listIds: [],
    usernames: [],
    publishedAfter: undefined,
    isExtracted: 'all',
    aiProcessStatus: 'all',
    sortOrder: 'desc',
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 50;

  // 数据库中的listId记录
  const [dbListIds, setDbListIds] = useState<{id: string, listId: string, name: string}[]>([]);
  const [selectedDbListIds, setSelectedDbListIds] = useState<{id: string, listId: string, name: string}[]>([]);
  const [showAddListIdForm, setShowAddListIdForm] = useState(false);
  const [newListIdForm, setNewListIdForm] = useState({ listId: '', name: '' });

  // AI 配置状态
  const [aiConfig, setAIConfig] = useState<{
    provider: 'openai' | 'openai-badger' | 'zhipu' | 'anthropic';
    model: string;
  }>({
    provider: 'openai',
    model: 'gpt-4o',
  });

  // 主题标签管理状态
  const [newTopicTag, setNewTopicTag] = useState({ name: '', description: '' });
  const [showTopicTagForm, setShowTopicTagForm] = useState(false);

  // 内容类型管理状态
  const [newContentType, setNewContentType] = useState({ name: '', description: '' });
  const [showContentTypeForm, setShowContentTypeForm] = useState(false);

  // 编辑弹窗状态
  const [showTopicTagModal, setShowTopicTagModal] = useState(false);
  const [showContentTypeModal, setShowContentTypeModal] = useState(false);
  const [editingTopicTagId, setEditingTopicTagId] = useState<string | null>(null);
  const [editingContentTypeId, setEditingContentTypeId] = useState<string | null>(null);

  // AI 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(10);
  
  // 批量处理模式状态
  const [batchProcessingMode, setBatchProcessingMode] = useState<'optimized' | 'traditional'>('optimized');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);

  // 折叠状态
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);


  // 客户端挂载后加载localStorage数据，避免hydration错误
  useEffect(() => {
    setIsMounted(true);
    
    // 加载筛选配置
    const savedFilterConfig = localStorage.getItem('tweet-processing-filter-config');
    if (savedFilterConfig) {
      try {
        setFilterConfig(JSON.parse(savedFilterConfig));
      } catch (error) {
        console.error('解析筛选配置失败:', error);
      }
    }
    
    
    // 加载AI配置
    const savedAIConfig = localStorage.getItem('tweet-processing-ai-config');
    if (savedAIConfig) {
      try {
        setAIConfig(JSON.parse(savedAIConfig));
      } catch (error) {
        console.error('解析 AI 配置失败:', error);
      }
    }
    
    // 加载批处理模式
    const savedBatchMode = localStorage.getItem('tweet-processing-batch-mode');
    if (savedBatchMode) {
      setBatchProcessingMode(savedBatchMode as 'optimized' | 'traditional');
    }

    // 从本地存储加载选中的数据库ListId记录
    const savedSelectedDbListIds = localStorage.getItem('tweet-processing-selectedDbListIds');
    if (savedSelectedDbListIds) {
      try {
        const parsedSelectedDbListIds = JSON.parse(savedSelectedDbListIds) as {id: string, listId: string, name: string}[];
        setSelectedDbListIds(parsedSelectedDbListIds);
      } catch (error) {
        console.error('加载选中的数据库ListId记录失败:', error);
      }
    }
  }, []);


  // 获取数据库中的listId记录
  const { data: dbListIdsData, refetch: refetchDbListIds } = api.listIds.getAll.useQuery();

  // 更新数据库中的listId记录到本地状态
  useEffect(() => {
    if (dbListIdsData?.data) {
      setDbListIds(dbListIdsData.data);
      
      // 检查本地存储的选中项是否仍然存在于数据库中，如果不存在则清理
      if (isMounted) {
        setSelectedDbListIds(prev => {
          const filteredSelection = prev.filter(selected => 
            dbListIdsData.data.some(dbItem => dbItem.id === selected.id)
          );
          
          // 如果过滤后的选择与之前不同，更新本地存储
          if (filteredSelection.length !== prev.length) {
            localStorage.setItem('tweet-processing-selectedDbListIds', JSON.stringify(filteredSelection));
            return filteredSelection;
          }
          
          return prev;
        });
      }
    }
  }, [dbListIdsData, isMounted]);

  // 保存选中的数据库ListId记录到本地存储
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('tweet-processing-selectedDbListIds', JSON.stringify(selectedDbListIds));
    }
  }, [selectedDbListIds, isMounted]);

  // 保存 AI 配置到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-processing-ai-config', JSON.stringify(aiConfig));
    }
  }, [aiConfig]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-processing-batch-mode', batchProcessingMode);
    }
  }, [batchProcessingMode]);

  // 保存筛选配置到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tweet-processing-filter-config', JSON.stringify(filterConfig));
    }
  }, [filterConfig]);


  // 创建listId记录
  const createListId = api.listIds.create.useMutation({
    onSuccess: () => {
      refetchDbListIds();
      setNewListIdForm({ listId: '', name: '' });
      setShowAddListIdForm(false);
    },
  });

  // 删除listId记录
  const deleteListId = api.listIds.delete.useMutation({
    onSuccess: () => {
      refetchDbListIds();
      // 从选中项中移除被删除的项
      setSelectedDbListIds(prev => prev.filter(item => 
        !dbListIdsData?.data.find(db => db.id === item.id)
      ));
    },
  });

  // 计算有效的 listIds 和 usernames
  const effectiveListIds = selectedDbListIds.length > 0 
    ? selectedDbListIds.map(item => item.listId)
    : filterConfig.listIds;
  
  const effectiveUsernames = filterConfig.usernames;

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

  // 使用useEffect来处理数据获取后的操作
  useEffect(() => {
    if (processRecords && processRecords.length > 0) {
      console.log('[前台] 📋 获取到AI处理记录:', {
        记录数量: processRecords.length,
        最新记录: processRecords[0] ? {
          批次ID: processRecords[0].batchId,
          状态: processRecords[0].status,
          总推文数: processRecords[0].totalTweets,
          已处理: processRecords[0].processedTweets,
          API调用次数: processRecords[0].responseDetails?.length || 0,
          处理模式: processRecords[0].batchProcessingMode,
        } : null,
      });
      
      // 如果有响应详情，打印AI交互信息
      if (processRecords[0]?.responseDetails && Array.isArray(processRecords[0].responseDetails)) {
        processRecords[0].responseDetails.forEach((response: any, idx: number) => {
          console.log(`[前台] 📥 第${idx + 1}次API调用详情:`, {
            时间: new Date(response.timestamp).toLocaleString(),
            状态: response.responseStatus === 200 ? '✅ 成功' : '❌ 失败',
            处理时间: response.processingTime + 'ms',
            推文数量: response.results?.length || 0,
            成功数量: response.results?.filter((r: any) => !r.error).length || 0,
            Token使用: response.responseData?.usage?.total_tokens || '未知',
          });
        });
      }
    }
  }, [processRecords]);

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

  const updateTopicTag = api.tweetProcessing.updateTopicTag.useMutation({
    onSuccess: () => {
      refetchTopicTags();
      setNewTopicTag({ name: '', description: '' });
      setEditingTopicTagId(null);
      setShowTopicTagModal(false);
    },
  });

  const updateContentType = api.tweetProcessing.updateContentType.useMutation({
    onSuccess: () => {
      refetchContentTypes();
      setNewContentType({ name: '', description: '' });
      setEditingContentTypeId(null);
      setShowContentTypeModal(false);
    },
  });

  const deleteContentType = api.tweetProcessing.deleteContentType.useMutation({
    onSuccess: () => {
      refetchContentTypes();
    },
  });

  const startAIProcess = api.tweetProcessing.startAIBatchProcess.useMutation({
    onSuccess: (data) => {
      console.log('[前台] ✅ AI批量处理任务启动成功:', {
        批次ID: data.batchId,
        总推文数: data.totalTweets,
        批次大小: data.batchSize,
        预估批次数: data.estimatedBatches,
        处理模式: data.mode,
      });
      setCurrentBatchId(data.batchId);
      setIsProcessing(true);
      setShowProcessingModal(true);
    },
    onError: (error) => {
      console.error('[前台] ❌ AI批量处理任务启动失败:', error);
    },
  });

  const stopAIProcess = api.tweetProcessing.stopAIBatchProcess.useMutation({
    onSuccess: () => {
      setIsProcessing(false);
      setCurrentBatchId(null);
    },
  });

  // 清理状态
  const [isClearingTasks, setIsClearingTasks] = useState(false);

  // 清理AI批处理任务
  const clearAITasks = async () => {
    if (!confirm('🗑️ 确定要清理所有AI批处理任务吗？\n\n这将强制停止所有正在运行的任务并清理状态。')) {
      return;
    }

    setIsClearingTasks(true);
    try {
      const response = await fetch('/api/external/ai-batch/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo',
        },
        body: JSON.stringify({ force: true }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('[前台] ✅ AI批处理任务清理成功:', result);
        setIsProcessing(false);
        setCurrentBatchId(null);
        alert('✅ AI批处理任务已清理完成！');
      } else {
        console.error('[前台] ❌ AI批处理任务清理失败:', result);
        alert('❌ 清理失败: ' + result.error);
      }
    } catch (error) {
      console.error('[前台] ❌ AI批处理任务清理异常:', error);
      alert('❌ 清理异常: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsClearingTasks(false);
    }
  };

  // 处理筛选
  const handleFilter = () => {
    setCurrentPage(1);
    refetchTweets();
  };


  // 处理数据库listId选择
  const handleToggleDbListId = (item: {id: string, listId: string, name: string}) => {
    setSelectedDbListIds(prev => {
      const isSelected = prev.some(p => p.id === item.id);
      if (isSelected) {
        return prev.filter(p => p.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // 创建新的listId记录
  const handleCreateListId = () => {
    if (newListIdForm.listId.trim() && newListIdForm.name.trim()) {
      createListId.mutate({
        listId: newListIdForm.listId.trim(),
        name: newListIdForm.name.trim(),
      });
    }
  };

  // 删除listId记录
  const handleDeleteListId = (id: string) => {
    if (confirm('确定要删除这个List ID记录吗？')) {
      deleteListId.mutate({ id });
    }
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
    const requestConfig = {
      filterConfig: {
        listIds: effectiveListIds.length > 0 ? effectiveListIds : undefined,
        usernames: effectiveUsernames.length > 0 ? effectiveUsernames : undefined,
        publishedAfter: filterConfig.publishedAfter,
        isExtracted: filterConfig.isExtracted,
      },
      batchSize,
      batchProcessingMode,
      systemPrompt: systemPrompt.trim() === DEFAULT_SYSTEM_PROMPT.trim() ? '' : systemPrompt.trim(),
      aiProvider: aiConfig.provider,
      aiModel: aiConfig.model,
    };

    console.log('[前台] 🚀 启动AI批量处理任务');
    console.log('[前台] 请求配置:', {
      处理模式: batchProcessingMode === 'optimized' ? '🚀 优化模式 (批量)' : '🔄 传统模式 (逐条)',
      批次大小: batchSize,
      筛选条件: requestConfig.filterConfig,
      AI配置: {
        provider: aiConfig.provider,
        model: aiConfig.model,
      },
      系统提示词长度: requestConfig.systemPrompt?.length || '使用默认',
    });

    startAIProcess.mutate(requestConfig);
  };

  return (
    <DashboardLayout>

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
                {isMounted && (selectedDbListIds.length > 0 || filterConfig.usernames.length > 0 || filterConfig.publishedAfter) && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    已设置筛选条件
                  </span>
                )}
              </button>
            </div>

            {!isFiltersCollapsed && (
              <>
                {/* 数据库中的List ID记录 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      已保存的List ID
                      {isMounted && selectedDbListIds.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {selectedDbListIds.length} 项已选
                        </span>
                      )}
                    </label>
                    <button
                      onClick={() => setShowAddListIdForm(!showAddListIdForm)}
                      className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      {showAddListIdForm ? '取消' : '添加'}
                    </button>
                  </div>

                  {showAddListIdForm && (
                    <div className="mb-3 p-3 border border-gray-200 rounded bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={newListIdForm.listId}
                          onChange={(e) => setNewListIdForm(prev => ({ ...prev, listId: e.target.value }))}
                          placeholder="List ID（纯数字）"
                          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={newListIdForm.name}
                          onChange={(e) => setNewListIdForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="名称"
                          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={handleCreateListId}
                        disabled={!newListIdForm.listId.trim() || !newListIdForm.name.trim() || createListId.isPending}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                      >
                        {createListId.isPending ? '保存中...' : '保存'}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {dbListIds.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm hover:shadow-md hover:from-blue-100 hover:to-blue-200 transition-all duration-200">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedDbListIds.some(p => p.id === item.id)}
                            onChange={() => handleToggleDbListId(item)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-blue-900 truncate">{item.name}</div>
                            <div className="text-xs text-blue-700 truncate">ID: {item.listId}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteListId(item.id)}
                          disabled={deleteListId.isPending}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-white rounded transition-colors flex-shrink-0 ml-1"
                          title="删除"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v-1a1 1 0 10-2 0v1zm4 0a1 1 0 102 0v-1a1 1 0 10-2 0v1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {dbListIds.length === 0 && (
                      <div className="col-span-full text-gray-500 text-center py-4 bg-gray-50 rounded border-2 border-dashed border-gray-200">
                        <div className="text-2xl mb-2">📋</div>
                        <div>暂无已保存的List ID</div>
                        <div className="text-xs mt-1">点击上方"添加"创建第一个记录</div>
                      </div>
                    )}
                  </div>
                  {selectedDbListIds.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      已选择 {selectedDbListIds.length} 个List ID：
                      {selectedDbListIds.map(p => p.name).join(', ')}
                    </div>
                  )}
                </div>

                {/* 用户名筛选 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">发推人用户名</label>
                  <input
                    type="text"
                    value={filterConfig.usernames.join(',')}
                    onChange={(e) => setFilterConfig(prev => ({ 
                      ...prev, 
                      usernames: e.target.value.split(',').map(u => u.trim()).filter(u => u) 
                    }))}
                    placeholder="输入用户名，多个用逗号分隔（不带@）"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* 时间筛选 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发推时间
                    {isMounted && filterConfig.publishedAfter && (
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
                  {isMounted && filterConfig.publishedAfter && (
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {topicTags?.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm hover:shadow-md hover:from-blue-100 hover:to-blue-200 transition-all duration-200">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-blue-900">{tag.name}</div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => {
                          setNewTopicTag({ name: tag.name, description: tag.description || '' });
                          setEditingTopicTagId(tag.id);
                          setShowTopicTagModal(true);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-white rounded transition-colors"
                        title="编辑"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteTopicTag.mutate({ id: tag.id })}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-white rounded transition-colors"
                        title="删除"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v-1a1 1 0 10-2 0v1zm4 0a1 1 0 102 0v-1a1 1 0 10-2 0v1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {contentTypes?.map((type) => (
                  <div key={type.id} className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg shadow-sm hover:shadow-md hover:from-green-100 hover:to-green-200 transition-all duration-200">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-green-900">{type.name}</div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => {
                          setNewContentType({ name: type.name, description: type.description || '' });
                          setEditingContentTypeId(type.id);
                          setShowContentTypeModal(true);
                        }}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-white rounded transition-colors"
                        title="编辑"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteContentType.mutate({ id: type.id })}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-white rounded transition-colors"
                        title="删除"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v-1a1 1 0 10-2 0v1zm4 0a1 1 0 102 0v-1a1 1 0 10-2 0v1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          </div>


          {/* AI 批处理控制区域 */}
          <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="text-base font-medium">AI 批处理</h3>
                  <p className="text-xs text-gray-500">自动处理符合筛选条件的推文</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  batchProcessingMode === 'optimized' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {batchProcessingMode === 'optimized' ? '优化模式' : '传统模式'}
                </span>
                {batchProcessingMode === 'optimized' && (
                  <span className="text-xs text-green-600" title="优化模式可提高5-10倍处理速度">⚡ 高效处理</span>
                )}
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
                    disabled={startAIProcess.isPending}
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
                <button
                  onClick={clearAITasks}
                  disabled={isClearingTasks}
                  className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300"
                  title="清理所有AI批处理任务，解决任务卡住问题"
                >
                  {isClearingTasks ? '清理中...' : '🗑️ 清理'}
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

                          {/* AI分析结果：关键词、主题标签和内容类型 */}
                          {(tweet.keywords || tweet.topicTags || tweet.contentTypes) && (
                            <div className="space-y-2">
                              {tweet.keywords && tweet.keywords.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-xs text-gray-500 mr-1">关键词:</span>
                                  {tweet.keywords.map((keyword: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full whitespace-nowrap">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              )}
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
              <h4 className="font-medium">最近处理记录 (最多保存10条)</h4>
              {processRecords && processRecords.length > 0 ? (
                <div className="space-y-4">
                  {processRecords.map((record) => (
                    <div key={record.id} className="border border-gray-200 rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">批次 {record.batchId}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.status === 'completed' ? 'bg-green-100 text-green-800' :
                          record.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          record.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.status === 'completed' ? '已完成' :
                           record.status === 'processing' ? '处理中' :
                           record.status === 'failed' ? '失败' :
                           record.status === 'cancelled' ? '已取消' : record.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <div>总数: {record.totalTweets} | 已处理: {record.processedTweets} | 失败: {record.failedTweets}</div>
                        <div>模式: <span className="font-medium">{record.batchProcessingMode === 'optimized' ? '优化模式' : '传统模式'}</span></div>
                        <div>模型: {record.aiProvider} / {record.aiModel}</div>
                        <div>开始时间: {new Date(record.startedAt).toLocaleString()}</div>
                        {record.completedAt && (
                          <div>完成时间: {new Date(record.completedAt).toLocaleString()}</div>
                        )}
                        {record.errorMessage && (
                          <div className="text-red-600">错误: {record.errorMessage}</div>
                        )}
                      </div>

                      {/* AI交互核心信息 */}
                      <div className="mt-3 space-y-4">
                        {/* API调用统计 */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                          <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                            🔄 API调用情况
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {record.responseDetails?.length || 0} 次调用
                            </span>
                          </h5>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">处理模式:</span>
                              <span className="ml-2 font-medium text-blue-700">
                                {record.batchProcessingMode === 'optimized' ? '🚀 优化模式 (批量)' : '🔄 传统模式 (逐条)'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">每批推文数:</span>
                              <span className="ml-2 font-medium">{record.requestDetails?.batchSize || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">总推文数:</span>
                              <span className="ml-2 font-medium text-green-600">{record.totalTweets}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">成功处理:</span>
                              <span className="ml-2 font-medium text-green-600">{record.processedTweets - record.failedTweets}</span>
                            </div>
                          </div>
                        </div>

                        {/* AI请求与响应详情 */}
                        {record.responseDetails && Array.isArray(record.responseDetails) && record.responseDetails.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-gray-800 mb-3">💬 AI交互详情</h5>
                            <div className="space-y-3">
                              {record.responseDetails.map((response: any, idx: number) => (
                                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                                  {/* 请求头部信息 */}
                                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                      <span className="font-medium text-gray-800">第 {idx + 1} 次API调用</span>
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        response.responseStatus === 200 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {response.responseStatus === 200 ? '✅ 成功' : '❌ 失败'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {response.processingTime}ms
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(response.timestamp).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="p-4 space-y-4">
                                    {/* 发送给AI的内容 */}
                                    <div>
                                      <h6 className="font-medium text-green-700 mb-2 flex items-center">
                                        📤 发送给AI
                                        <span className="ml-2 text-xs text-gray-500">
                                          ({response.results?.length || 0} 条推文)
                                        </span>
                                      </h6>
                                      <div className="bg-green-50 p-3 rounded border border-green-200">
                                        {record.requestDetails?.tweets && (
                                          <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {record.requestDetails.tweets.slice(0, 3).map((tweet: any, tweetIdx: number) => (
                                              <div key={tweetIdx} className="text-xs p-2 bg-white rounded border">
                                                <div className="font-medium text-gray-600">推文 ID: {tweet.id}</div>
                                                <div className="text-gray-700 mt-1">
                                                  {tweet.content.length > 100 ? `${tweet.content.substring(0, 100)}...` : tweet.content}
                                                </div>
                                              </div>
                                            ))}
                                            {record.requestDetails.tweets.length > 3 && (
                                              <div className="text-xs text-gray-500 text-center py-1">
                                                ... 还有 {record.requestDetails.tweets.length - 3} 条推文
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* 系统提示词概览 */}
                                        {record.requestDetails?.systemPrompt && (
                                          <details className="mt-3">
                                            <summary className="cursor-pointer text-green-600 hover:text-green-800 text-xs font-medium">
                                              📝 查看系统提示词
                                            </summary>
                                            <div className="mt-2 p-2 bg-white border rounded text-xs max-h-24 overflow-y-auto whitespace-pre-wrap">
                                              {record.requestDetails.systemPrompt.substring(0, 500)}
                                              {record.requestDetails.systemPrompt.length > 500 && '...'}
                                            </div>
                                          </details>
                                        )}
                                      </div>
                                    </div>

                                    {/* AI返回的内容 */}
                                    <div>
                                      <h6 className="font-medium text-blue-700 mb-2 flex items-center">
                                        📥 AI返回结果
                                        {response.responseData?.usage && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            ({response.responseData.usage.total_tokens} tokens)
                                          </span>
                                        )}
                                      </h6>
                                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                        {response.responseData?.error ? (
                                          <div className="text-red-600 text-sm">
                                            <strong>错误:</strong> {response.responseData.error}
                                          </div>
                                        ) : (
                                          <>
                                            {/* 解析后的结果摘要 */}
                                            {response.results && response.results.length > 0 && (
                                              <div className="space-y-2">
                                                <div className="text-sm font-medium text-blue-800 mb-2">
                                                  解析结果摘要:
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-xs">
                                                  <div>
                                                    <span className="text-gray-600">有价值推文:</span>
                                                    <span className="ml-1 font-medium text-green-600">
                                                      {response.results.filter((r: any) => !r.result?.isValueless).length}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-600">无价值推文:</span>
                                                    <span className="ml-1 font-medium text-orange-600">
                                                      {response.results.filter((r: any) => r.result?.isValueless).length}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-600">处理失败:</span>
                                                    <span className="ml-1 font-medium text-red-600">
                                                      {response.results.filter((r: any) => r.error).length}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-600">成功率:</span>
                                                    <span className="ml-1 font-medium">
                                                      {Math.round((response.results.filter((r: any) => !r.error).length / response.results.length) * 100)}%
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* 详细结果展示 */}
                                                <details className="mt-3">
                                                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium">
                                                    📊 查看每条推文的分析结果 ({response.results.length}条)
                                                  </summary>
                                                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                                    {response.results.map((result: any, resultIdx: number) => (
                                                      <div key={resultIdx} className="p-2 bg-white border rounded text-xs">
                                                        <div className="flex justify-between items-start">
                                                          <div className="flex-1">
                                                            <div><strong>推文ID:</strong> {result.tweetId}</div>
                                                            {result.error ? (
                                                              <div className="text-red-600"><strong>错误:</strong> {result.error}</div>
                                                            ) : result.result ? (
                                                              <>
                                                                <div><strong>价值判断:</strong> {result.result.isValueless ? '❌ 无价值' : '✅ 有价值'}</div>
                                                                {result.result.keywords?.length > 0 && (
                                                                  <div><strong>关键词:</strong> {result.result.keywords.join(', ')}</div>
                                                                )}
                                                                {result.result.contentTypes?.length > 0 && (
                                                                  <div><strong>内容类型:</strong> {result.result.contentTypes.join(', ')}</div>
                                                                )}
                                                                {result.result.topicTags?.length > 0 && (
                                                                  <div><strong>主题标签:</strong> {result.result.topicTags.join(', ')}</div>
                                                                )}
                                                              </>
                                                            ) : (
                                                              <div className="text-gray-500">无结果数据</div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </details>
                                              </div>
                                            )}

                                            {/* AI原始响应内容 */}
                                            {response.responseData?.choices?.[0]?.message?.content && (
                                              <details className="mt-3">
                                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs font-medium">
                                                  🔍 查看AI原始响应内容
                                                </summary>
                                                <div className="mt-2 p-2 bg-white border rounded text-xs max-h-32 overflow-auto whitespace-pre-wrap">
                                                  {response.responseData.choices[0].message.content}
                                                </div>
                                              </details>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 处理日志（简化显示） */}
                      {record.processingLogs && record.processingLogs.length > 0 && (
                        <details className="mt-4 border-t pt-3">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800 text-sm font-medium">
                            📋 查看处理日志 ({record.processingLogs.length} 条)
                          </summary>
                          <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                            {record.processingLogs.map((log: any, idx: number) => (
                              <div key={idx} className={`text-xs p-2 rounded ${
                                log.level === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-700 border border-gray-200'
                              }`}>
                                <span className="font-medium">{new Date(log.timestamp).toLocaleTimeString()}</span> - {log.message}
                                {log.data?.processingTime && (
                                  <span className="ml-2 text-gray-500">({log.data.processingTime}ms)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
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

      {/* 主题标签编辑弹窗 */}
      {showTopicTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingTopicTagId ? '编辑主题标签' : '管理主题标签'}
              </h3>
              <button
                onClick={() => {
                  setShowTopicTagModal(false);
                  setEditingTopicTagId(null);
                  setNewTopicTag({ name: '', description: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* 编辑/添加标签表单 */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-3">
                {editingTopicTagId ? '编辑标签信息' : '添加新主题标签'}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标签名称</label>
                  <input
                    type="text"
                    value={newTopicTag.name}
                    onChange={(e) => setNewTopicTag(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：人工智能"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标签描述</label>
                  <textarea
                    value={newTopicTag.description}
                    onChange={(e) => setNewTopicTag(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="详细描述此标签的含义和适用范围，帮助AI做出更准确的判断"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (newTopicTag.name.trim()) {
                      if (editingTopicTagId) {
                        updateTopicTag.mutate({
                          id: editingTopicTagId,
                          data: {
                            name: newTopicTag.name.trim(),
                            description: newTopicTag.description.trim() || undefined,
                          },
                        });
                      } else {
                        createTopicTag.mutate(newTopicTag);
                      }
                    }
                  }}
                  disabled={!newTopicTag.name.trim() || createTopicTag.isPending || updateTopicTag.isPending}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {(createTopicTag.isPending || updateTopicTag.isPending) 
                    ? (editingTopicTagId ? '更新中...' : '添加中...') 
                    : (editingTopicTagId ? '更新标签' : '添加标签')}
                </button>
              </div>
            </div>

            {/* 现有标签列表 */}
            <div>
              <h4 className="font-medium mb-3">现有主题标签</h4>
              {topicTags && topicTags.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topicTags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="font-semibold text-sm text-gray-900 truncate">{tag.name}</div>
                        {tag.description && (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{tag.description}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingTopicTagId(tag.id);
                            setNewTopicTag({ name: tag.name, description: tag.description || '' });
                          }}
                          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteTopicTag.mutate({ id: tag.id })}
                          disabled={deleteTopicTag.isPending}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="删除"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v-1a1 1 0 10-2 0v1zm4 0a1 1 0 102 0v-1a1 1 0 10-2 0v1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4 bg-gray-50 rounded border-2 border-dashed border-gray-200">
                  <div className="text-2xl mb-2">🏷️</div>
                  <div>暂无主题标签</div>
                  <div className="text-xs mt-1">点击上方"添加标签"创建第一个标签</div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowTopicTagModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 内容类型编辑弹窗 */}
      {showContentTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingContentTypeId ? '编辑内容类型' : '管理内容类型'}
              </h3>
              <button
                onClick={() => {
                  setShowContentTypeModal(false);
                  setEditingContentTypeId(null);
                  setNewContentType({ name: '', description: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* 编辑/添加类型表单 */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-3">
                {editingContentTypeId ? '编辑类型信息' : '添加新内容类型'}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型名称</label>
                  <input
                    type="text"
                    value={newContentType.name}
                    onChange={(e) => setNewContentType(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：教程"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型描述</label>
                  <textarea
                    value={newContentType.description}
                    onChange={(e) => setNewContentType(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="详细描述此内容类型的特征和判断标准，帮助AI准确识别"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (newContentType.name.trim()) {
                      if (editingContentTypeId) {
                        updateContentType.mutate({
                          id: editingContentTypeId,
                          data: {
                            name: newContentType.name.trim(),
                            description: newContentType.description.trim() || undefined,
                          },
                        });
                      } else {
                        createContentType.mutate(newContentType);
                      }
                    }
                  }}
                  disabled={!newContentType.name.trim() || createContentType.isPending || updateContentType.isPending}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                >
                  {(createContentType.isPending || updateContentType.isPending) 
                    ? (editingContentTypeId ? '更新中...' : '添加中...') 
                    : (editingContentTypeId ? '更新类型' : '添加类型')}
                </button>
              </div>
            </div>

            {/* 现有类型列表 */}
            <div>
              <h4 className="font-medium mb-3">现有内容类型</h4>
              {contentTypes && contentTypes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contentTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="font-semibold text-sm text-gray-900 truncate">{type.name}</div>
                        {type.description && (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{type.description}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingContentTypeId(type.id);
                            setNewContentType({ name: type.name, description: type.description || '' });
                          }}
                          className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteContentType.mutate({ id: type.id })}
                          disabled={deleteContentType.isPending}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="删除"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v-1a1 1 0 10-2 0v1zm4 0a1 1 0 102 0v-1a1 1 0 10-2 0v1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4 bg-gray-50 rounded border-2 border-dashed border-gray-200">
                  <div className="text-2xl mb-2">📂</div>
                  <div>暂无内容类型</div>
                  <div className="text-xs mt-1">点击上方"添加类型"创建第一个类型</div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowContentTypeModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                完成
              </button>
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
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 API密钥和Base URL现在在<a href="/ai-settings" className="underline font-medium">综合AI设置</a>中统一管理
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI 提供商</label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const provider = e.target.value as 'openai' | 'openai-badger' | 'zhipu' | 'anthropic';
                    setAIConfig(prev => ({ 
                      ...prev, 
                      provider,
                      // 切换供应商时自动设置对应的默认模型
                      model: provider === 'openai-badger' ? 'gpt-4o-mini' :
                             provider === 'zhipu' ? 'glm-4.5-flash' :
                             provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o'
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="openai-badger">OpenAI-badger</option>
                  <option value="zhipu">智谱AI (GLM)</option>
                  <option value="anthropic">Anthropic Claude</option>
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
                  ) : aiConfig.provider === 'zhipu' ? (
                    <>
                      <option value="glm-4.5-flash">GLM-4.5-Flash</option>
                      <option value="glm-4.5">GLM-4.5</option>
                      <option value="glm-4.5-air">GLM-4.5-Air</option>
                      <option value="glm-4.5-x">GLM-4.5-X</option>
                      <option value="glm-4.5-airx">GLM-4.5-Airx</option>
                    </>
                  ) : aiConfig.provider === 'anthropic' ? (
                    <>
                      <option value="claude-3-5-sonnet-20241022">Claude-3.5-Sonnet</option>
                      <option value="claude-3-opus-20240229">Claude-3-Opus</option>
                      <option value="claude-3-sonnet-20240229">Claude-3-Sonnet</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">批量处理模式</label>
                <select
                  value={batchProcessingMode}
                  onChange={(e) => setBatchProcessingMode(e.target.value as 'optimized' | 'traditional')}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="optimized">优化模式（推荐）- 单次调用批量处理多条推文</option>
                  <option value="traditional">传统模式 - 逐条调用AI处理</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {batchProcessingMode === 'optimized' 
                    ? '优化模式可显著提高处理速度并降低API成本，同时保持处理质量'
                    : '传统模式逐条处理，速度较慢但兼容性更好'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">单次处理推文数量</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {batchProcessingMode === 'optimized' 
                    ? '优化模式下，该数量指每次AI调用处理的推文数（推荐10-15条）'
                    : '传统模式下，该数量指每个批次处理的推文数'
                  }
                </p>
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
    </DashboardLayout>
  );
}
