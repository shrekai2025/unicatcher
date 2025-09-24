'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '~/components/dashboard-layout';

interface AIConfig {
  provider: 'openai' | 'openai-badger' | 'zhipu';
  model: string;
  apiKey: string;
  baseURL?: string;
}

interface Task {
  id: string;
  tweetId: string;
  tweetUrl: string;
  status: 'queued' | 'running' | 'completed' | 'failed';

  // 推文信息
  tweetContent?: string;
  authorUsername?: string;
  authorNickname?: string;
  authorProfileImage?: string;

  // 处理结果
  translatedContent?: string;
  aiComments?: (string | { content: string; reasoning?: string })[];
  userExtraInfo?: string;

  // 时间信息
  startedAt?: string;
  completedAt?: string;
  createdAt: string;

  // 错误信息
  errorMessage?: string;
}

export default function XHelperPage() {
  const [mounted, setMounted] = useState(false);
  const [tweetUrl, setTweetUrl] = useState('');
  const [userExtraInfo, setUserExtraInfo] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReTranslating, setIsReTranslating] = useState(false);
  const [isReGeneratingComments, setIsReGeneratingComments] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // AI配置状态
  const [translationAIConfig, setTranslationAIConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: ''
  });

  const [commentAIConfig, setCommentAIConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: ''
  });

  const [showAIConfig, setShowAIConfig] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadAIConfigs();
    loadTaskHistory();
  }, []);

  // 从localStorage加载AI配置
  const loadAIConfigs = () => {
    try {
      const savedTranslationConfig = localStorage.getItem('x-helper-translation-ai-config');
      const savedCommentConfig = localStorage.getItem('x-helper-comment-ai-config');
      const savedUserExtraInfo = localStorage.getItem('x-helper-user-extra-info');
      const savedSystemPrompt = localStorage.getItem('x-helper-system-prompt');

      if (savedTranslationConfig) {
        setTranslationAIConfig(JSON.parse(savedTranslationConfig));
      }
      if (savedCommentConfig) {
        setCommentAIConfig(JSON.parse(savedCommentConfig));
      }
      if (savedUserExtraInfo) {
        setUserExtraInfo(savedUserExtraInfo);
      }
      if (savedSystemPrompt) {
        setSystemPrompt(savedSystemPrompt);
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
    }
  };

  // 保存AI配置到localStorage
  const saveAIConfigs = () => {
    try {
      localStorage.setItem('x-helper-translation-ai-config', JSON.stringify(translationAIConfig));
      localStorage.setItem('x-helper-comment-ai-config', JSON.stringify(commentAIConfig));
      localStorage.setItem('x-helper-user-extra-info', userExtraInfo);
      localStorage.setItem('x-helper-system-prompt', systemPrompt);
      setShowAIConfig(false);
      console.log('AI配置已保存');
    } catch (error) {
      console.error('保存AI配置失败:', error);
    }
  };

  // Debug：显示当前历史记录信息
  const debugHistoryInfo = () => {
    console.log('[Debug] 当前历史记录状态:', {
      taskHistoryLength: taskHistory.length,
      taskHistoryPreview: taskHistory.slice(0, 3).map(task => ({
        id: task.id,
        tweetUrl: task.tweetUrl,
        userExtraInfo: !!task.userExtraInfo,
        status: task.status
      })),
      currentTaskId: currentTask?.id
    });
  };

  // 从localStorage加载任务历史
  const loadTaskHistory = () => {
    try {
      const saved = localStorage.getItem('x-helper-task-history');
      if (saved) {
        const history = JSON.parse(saved);
        setTaskHistory(history);
        if (history.length > 0 && !currentTask) {
          setCurrentTask(history[0]);
        }
      }
    } catch (error) {
      console.error('加载任务历史失败:', error);
    }
  };

  // 保存任务历史到localStorage
  const saveTaskHistory = (history: Task[]) => {
    try {
      localStorage.setItem('x-helper-task-history', JSON.stringify(history));
      setTaskHistory(history);
    } catch (error) {
      console.error('保存任务历史失败:', error);
    }
  };

  // 验证推文URL
  const validateTweetUrl = (url: string): boolean => {
    const tweetUrlPattern = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/;
    return tweetUrlPattern.test(url);
  };

  // 处理推文
  const processTweet = async () => {
    if (!tweetUrl.trim()) {
      alert('请输入推文链接');
      return;
    }

    if (!validateTweetUrl(tweetUrl)) {
      alert('推文链接格式不正确，请输入有效的Twitter/X链接');
      return;
    }

    if (!translationAIConfig.apiKey || !commentAIConfig.apiKey) {
      alert('请先配置AI密钥');
      setShowAIConfig(true);
      return;
    }

    console.log('[X Helper] 开始处理推文:', tweetUrl);
    setIsProcessing(true);

    try {
      // 调用推文处理接口
      const response = await fetch('/api/external/x-helper/process-tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo'
        },
        body: JSON.stringify({
          tweetUrl,
          translationAIConfig,
          commentAIConfig,
          userExtraInfo,
          systemPrompt
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('[X Helper] 任务创建成功:', result);

      // 创建任务对象
      const newTask: Task = {
        id: result.data.taskId,
        tweetId: result.data.tweetId,
        tweetUrl: tweetUrl, // 使用用户输入的推文链接
        status: 'queued',
        createdAt: new Date().toISOString(),
        userExtraInfo
      };

      // 更新状态
      setCurrentTask(newTask);
      const newHistory = [newTask, ...taskHistory];
      saveTaskHistory(newHistory);

      // 开始轮询任务状态
      pollTaskStatus(result.data.taskId);

      // 清空输入框
      setTweetUrl('');

    } catch (error) {
      console.error('[X Helper] 处理失败:', error);
      alert(`处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 60; // 最多轮询60次（5分钟）
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;

        const response = await fetch(`/api/external/x-helper/task/${taskId}`, {
          headers: {
            'x-api-key': 'unicatcher-api-key-demo'
          }
        });

        if (!response.ok) {
          if (attempts >= maxAttempts) {
            throw new Error('任务状态查询超时');
          }
          setTimeout(poll, 5000);
          return;
        }

        const result = await response.json();
        const taskData = result.data;

        console.log(`[X Helper] 任务状态更新: ${taskData.status}`);

        // 更新任务数据
        const updatedTask: Task = {
          id: taskData.taskId,
          tweetId: taskData.tweetId,
          tweetUrl: taskData.tweetUrl,
          status: taskData.status,
          tweetContent: taskData.tweetContent,
          authorUsername: taskData.authorUsername,
          authorNickname: taskData.authorNickname,
          authorProfileImage: taskData.authorProfileImage,
          translatedContent: taskData.translatedContent,
          aiComments: taskData.aiComments || [],
          userExtraInfo: taskData.userExtraInfo,
          startedAt: taskData.startedAt,
          completedAt: taskData.completedAt,
          createdAt: taskData.createdAt,
          errorMessage: taskData.errorMessage
        };

        // 更新当前任务和历史记录
        setCurrentTask(updatedTask);
        setTaskHistory(prevHistory => {
          const newHistory = prevHistory.map(t => t.id === taskId ? updatedTask : t);
          saveTaskHistory(newHistory);
          return newHistory;
        });

        // 如果任务完成或失败，停止轮询
        if (taskData.status === 'completed' || taskData.status === 'failed') {
          console.log(`[X Helper] 任务结束: ${taskData.status}`);
          return;
        }

        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          throw new Error('任务处理超时');
        }

      } catch (error) {
        console.error('[X Helper] 轮询任务状态失败:', error);

        // 更新任务为失败状态
        const failedTask: Task = {
          id: taskId,
          tweetId: currentTask?.tweetId || '',
          tweetUrl: currentTask?.tweetUrl || '',
          status: 'failed',
          createdAt: currentTask?.createdAt || new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : '未知错误'
        };

        setCurrentTask(failedTask);
        setTaskHistory(prevHistory => {
          const newHistory = prevHistory.map(t => t.id === taskId ? failedTask : t);
          saveTaskHistory(newHistory);
          return newHistory;
        });
      }
    };

    // 开始轮询
    setTimeout(poll, 2000);
  };

  // 选择历史任务
  const selectTask = (task: Task) => {
    setCurrentTask(task);
  };

  // 检查是否有任务正在运行
  const hasRunningTask = () => {
    return currentTask && (currentTask.status === 'queued' || currentTask.status === 'running');
  };

  // 从历史回填数据
  const backfillFromHistory = (task: Task) => {
    if (hasRunningTask()) {
      alert('有任务正在运行中，无法进行回填');
      return;
    }

    // 回填基本信息
    if (task.tweetUrl) {
      setTweetUrl(task.tweetUrl);
    }

    // 回填用户额外信息
    if (task.userExtraInfo) {
      setUserExtraInfo(task.userExtraInfo);
    }

    // 关闭弹窗
    setShowHistoryModal(false);

    console.log('[X Helper] 已从历史回填数据:', {
      tweetUrl: task.tweetUrl,
      userExtraInfo: task.userExtraInfo
    });
  };

  // 重新翻译
  const handleReTranslate = async () => {
    if (!currentTask || !currentTask.tweetContent) {
      console.error('[X Helper] 无法重新翻译：缺少任务或推文内容');
      return;
    }

    setIsReTranslating(true);

    try {
      console.log('[X Helper] 开始重新翻译');

      const response = await fetch('/api/external/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo'
        },
        body: JSON.stringify({
          content: currentTask.tweetContent,
          targetLanguage: 'zh-CN',
          aiConfig: translationAIConfig
        })
      });

      const result = await response.json();

      if (result.success) {
        // 更新当前任务的翻译内容
        const updatedTask = {
          ...currentTask,
          translatedContent: result.data.translatedContent
        };
        setCurrentTask(updatedTask);

        // 更新任务历史
        setTaskHistory(prevHistory => {
          const newHistory = prevHistory.map(t =>
            t.id === currentTask.id ? updatedTask : t
          );
          saveTaskHistory(newHistory);
          return newHistory;
        });

        console.log('[X Helper] 重新翻译成功');
      } else {
        console.error('[X Helper] 重新翻译失败:', result.error);
      }
    } catch (error) {
      console.error('[X Helper] 重新翻译异常:', error);
    } finally {
      setIsReTranslating(false);
    }
  };

  // 重新生成评论
  const handleReGenerateComments = async () => {
    if (!currentTask || !currentTask.tweetContent) {
      console.error('[X Helper] 无法重新生成评论：缺少任务或推文内容');
      return;
    }

    setIsReGeneratingComments(true);

    try {
      console.log('[X Helper] 开始重新生成评论');

      const response = await fetch('/api/external/generate-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo'
        },
        body: JSON.stringify({
          tweetId: currentTask.tweetId,
          content: currentTask.tweetContent,
          authorUsername: currentTask.authorUsername,
          authorNickname: currentTask.authorNickname,
          aiConfig: commentAIConfig,
          includeExistingComments: false,
          userInfo: userExtraInfo,
          systemPrompt: systemPrompt,
          commentLength: 'medium',
          commentCount: 3,
          language: 'zh-CN'
        })
      });

      const result = await response.json();

      if (result.success && result.data.comments) {
        // 更新当前任务的AI评论
        const updatedTask = {
          ...currentTask,
          aiComments: result.data.comments
        };
        setCurrentTask(updatedTask);

        // 更新任务历史
        setTaskHistory(prevHistory => {
          const newHistory = prevHistory.map(t =>
            t.id === currentTask.id ? updatedTask : t
          );
          saveTaskHistory(newHistory);
          return newHistory;
        });

        console.log('[X Helper] 重新生成评论成功');
      } else {
        console.error('[X Helper] 重新生成评论失败:', result.error);
      }
    } catch (error) {
      console.error('[X Helper] 重新生成评论异常:', error);
    } finally {
      setIsReGeneratingComments(false);
    }
  };

  // 清理任务
  const clearTask = (taskId: string) => {
    const newHistory = taskHistory.filter(t => t.id !== taskId);
    saveTaskHistory(newHistory);

    if (currentTask?.id === taskId) {
      setCurrentTask(newHistory.length > 0 ? newHistory[0] || null : null);
    }
  };

  // 重试任务
  const retryTask = (task: Task) => {
    setTweetUrl(task.tweetUrl);
    setUserExtraInfo(task.userExtraInfo || '');
    processTweet();
  };

  if (!mounted) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">X 辅助器</h1>
          <button
            onClick={() => setShowAIConfig(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            AI配置
          </button>

          {/* Debug按钮 */}
          <button
            onClick={debugHistoryInfo}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors text-sm"
            title="调试历史记录信息"
          >
            Debug
          </button>
        </div>

        {/* 推文处理表单 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">处理推文</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                推文链接
              </label>
              <input
                type="url"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://twitter.com/username/status/123456789"
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户额外信息 (可选)
              </label>
              <textarea
                value={userExtraInfo}
                onChange={(e) => setUserExtraInfo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入你的身份信息、观点偏好等，AI会基于这些信息生成更符合你风格的评论"
                rows={3}
                disabled={isProcessing}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={processTweet}
                disabled={isProcessing || !tweetUrl.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
              >
                {isProcessing ? '处理中...' : '开始处理'}
              </button>

              {taskHistory.length > 0 && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  disabled={hasRunningTask() || isProcessing}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-md transition-colors whitespace-nowrap"
                  title={hasRunningTask() ? '有任务正在运行，无法回填' : '从历史任务中回填数据'}
                >
                  从历史回填
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 当前任务状态 */}
        {currentTask && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">当前任务</h2>
              <StatusBadge status={currentTask.status} />
            </div>

            <div className="space-y-4">
              {/* 推文信息 */}
              {currentTask.tweetContent && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">推文内容</h3>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center space-x-3 mb-2">
                      {currentTask.authorProfileImage && (
                        <img
                          src={currentTask.authorProfileImage}
                          alt="头像"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{currentTask.authorNickname}</p>
                        <p className="text-sm text-gray-500">@{currentTask.authorUsername}</p>
                      </div>
                    </div>
                    <p className="text-gray-800">{currentTask.tweetContent}</p>
                  </div>
                </div>
              )}

              {/* 翻译结果 */}
              {currentTask.translatedContent && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">翻译结果</h3>
                    <button
                      onClick={handleReTranslate}
                      disabled={isReTranslating}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isReTranslating ? '重新翻译中...' : '重新翻译'}
                    </button>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-blue-900">{currentTask.translatedContent}</p>
                  </div>
                </div>
              )}

              {/* AI评论 */}
              {currentTask.aiComments && currentTask.aiComments.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">AI生成评论</h3>
                    <button
                      onClick={handleReGenerateComments}
                      disabled={isReGeneratingComments}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isReGeneratingComments ? '重新生成中...' : '重新生成评论'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {currentTask.aiComments.map((comment, index) => (
                      <div key={index} className="bg-green-50 p-3 rounded-md">
                        <p className="text-green-900">
                          {typeof comment === 'string' ? comment : comment.content}
                        </p>
                        {typeof comment === 'object' && comment.reasoning && (
                          <p className="text-green-700 text-sm mt-1 italic">
                            理由: {comment.reasoning}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 用户额外信息 */}
              {currentTask.userExtraInfo && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">用户信息</h3>
                  <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="text-yellow-900">{currentTask.userExtraInfo}</p>
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {currentTask.status === 'failed' && currentTask.errorMessage && (
                <div>
                  <h3 className="font-medium text-red-900 mb-2">错误信息</h3>
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-red-900">{currentTask.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* 时间信息 */}
              <div className="text-sm text-gray-500">
                <p>创建时间: {new Date(currentTask.createdAt).toLocaleString()}</p>
                {currentTask.startedAt && (
                  <p>开始时间: {new Date(currentTask.startedAt).toLocaleString()}</p>
                )}
                {currentTask.completedAt && (
                  <p>完成时间: {new Date(currentTask.completedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 任务历史 */}
        {mounted && taskHistory.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">处理历史</h3>
            <div className="space-y-3">
              {taskHistory.map((task) => (
                <div
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    currentTask?.id === task.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {task.authorNickname || task.tweetUrl}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(task.createdAt).toLocaleString()}
                      </p>
                      {task.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">错误: {task.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={task.status} size="sm" />

                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-1 ml-2">
                        {task.status === 'failed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              retryTask(task);
                            }}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            title="重试任务"
                          >
                            重试
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearTask(task.id);
                          }}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                          title="从历史中移除"
                        >
                          清理
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI配置弹窗 */}
        {showAIConfig && (
          <AIConfigModal
            translationConfig={translationAIConfig}
            commentConfig={commentAIConfig}
            userExtraInfo={userExtraInfo}
            systemPrompt={systemPrompt}
            onTranslationConfigChange={setTranslationAIConfig}
            onCommentConfigChange={setCommentAIConfig}
            onUserExtraInfoChange={setUserExtraInfo}
            onSystemPromptChange={setSystemPrompt}
            onSave={saveAIConfigs}
            onCancel={() => setShowAIConfig(false)}
          />
        )}

        {/* 历史回填弹窗 */}
        {showHistoryModal && (
          <HistoryModal
            tasks={taskHistory}
            onSelect={backfillFromHistory}
            onCancel={() => setShowHistoryModal(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';

  switch (status) {
    case 'queued':
      return <span className={`${sizeClasses} bg-gray-100 text-gray-700 rounded-full`}>队列中</span>;
    case 'running':
      return <span className={`${sizeClasses} bg-blue-100 text-blue-700 rounded-full`}>处理中</span>;
    case 'completed':
      return <span className={`${sizeClasses} bg-green-100 text-green-700 rounded-full`}>完成</span>;
    case 'failed':
      return <span className={`${sizeClasses} bg-red-100 text-red-700 rounded-full`}>失败</span>;
    default:
      return <span className={`${sizeClasses} bg-gray-100 text-gray-700 rounded-full`}>未知</span>;
  }
}

function AIConfigModal({
  translationConfig,
  commentConfig,
  userExtraInfo,
  systemPrompt,
  onTranslationConfigChange,
  onCommentConfigChange,
  onUserExtraInfoChange,
  onSystemPromptChange,
  onSave,
  onCancel
}: {
  translationConfig: AIConfig;
  commentConfig: AIConfig;
  userExtraInfo: string;
  systemPrompt: string;
  onTranslationConfigChange: (config: AIConfig) => void;
  onCommentConfigChange: (config: AIConfig) => void;
  onUserExtraInfoChange: (info: string) => void;
  onSystemPromptChange: (prompt: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  // 根据供应商获取可选模型
  const getModelsForProvider = (provider: string) => {
    switch (provider) {
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case 'openai-badger':
        return [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case 'zhipu':
        return [
          { value: 'glm-4.5-flash', label: 'GLM-4.5-Flash' },
          { value: 'glm-4.5', label: 'GLM-4.5' },
          { value: 'glm-4.5-air', label: 'GLM-4.5-Air' }
        ];
      default:
        return [];
    }
  };

  // 获取供应商的默认模型
  const getDefaultModelForProvider = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'gpt-4o';
      case 'openai-badger':
        return 'gpt-4o-mini';
      case 'zhipu':
        return 'glm-4.5-flash';
      default:
        return '';
    }
  };

  // 处理翻译AI供应商变更
  const handleTranslationProviderChange = (provider: string) => {
    const defaultModel = getDefaultModelForProvider(provider);
    onTranslationConfigChange({
      ...translationConfig,
      provider: provider as AIConfig['provider'],
      model: defaultModel
    });
  };

  // 处理评论AI供应商变更
  const handleCommentProviderChange = (provider: string) => {
    const defaultModel = getDefaultModelForProvider(provider);
    onCommentConfigChange({
      ...commentConfig,
      provider: provider as AIConfig['provider'],
      model: defaultModel
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-6">AI配置</h3>

        <div className="space-y-8">
          {/* 用户额外信息 */}
          <div>
            <h4 className="text-md font-medium mb-4">用户额外信息</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                个人信息和偏好 (用于AI评论生成)
              </label>
              <textarea
                value={userExtraInfo}
                onChange={(e) => onUserExtraInfoChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：我是一个软件工程师，关注技术创新，倾向于理性分析..."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                这些信息将帮助AI生成更符合你风格的评论
              </p>
            </div>
          </div>

          {/* 系统提示词配置 */}
          <div>
            <h4 className="text-md font-medium mb-4">AI提示词配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                系统提示词 (自定义AI评论生成指令)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="你是一个专业的社交媒体评论助手，请根据推文内容和用户信息生成恰当的评论回复..."
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                留空将使用默认评论生成提示词。你可以自定义AI生成评论的风格和要求。
              </p>
            </div>
          </div>

          {/* 翻译AI配置 */}
          <div>
            <h4 className="text-md font-medium mb-4">翻译AI</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API密钥</label>
                <input
                  type="password"
                  value={translationConfig.apiKey}
                  onChange={(e) => onTranslationConfigChange({ ...translationConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入翻译API密钥"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                <select
                  value={translationConfig.provider}
                  onChange={(e) => handleTranslationProviderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="openai-badger">OpenAI-Badger</option>
                  <option value="zhipu">智谱AI (GLM)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
                <select
                  value={translationConfig.model}
                  onChange={(e) => onTranslationConfigChange({ ...translationConfig, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getModelsForProvider(translationConfig.provider).map(model => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">基础URL (可选)</label>
                <input
                  type="url"
                  value={translationConfig.baseURL || ''}
                  onChange={(e) => onTranslationConfigChange({ ...translationConfig, baseURL: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="自定义API端点URL"
                />
              </div>
            </div>
          </div>

          {/* 评论AI配置 */}
          <div>
            <h4 className="text-md font-medium mb-4">评论AI</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API密钥</label>
                <input
                  type="password"
                  value={commentConfig.apiKey}
                  onChange={(e) => onCommentConfigChange({ ...commentConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入评论API密钥"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                <select
                  value={commentConfig.provider}
                  onChange={(e) => handleCommentProviderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="openai-badger">OpenAI-Badger</option>
                  <option value="zhipu">智谱AI (GLM)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
                <select
                  value={commentConfig.model}
                  onChange={(e) => onCommentConfigChange({ ...commentConfig, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getModelsForProvider(commentConfig.provider).map(model => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">基础URL (可选)</label>
                <input
                  type="url"
                  value={commentConfig.baseURL || ''}
                  onChange={(e) => onCommentConfigChange({ ...commentConfig, baseURL: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="自定义API端点URL"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex justify-end space-x-3 mt-8">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({
  tasks,
  onSelect,
  onCancel
}: {
  tasks: Task[];
  onSelect: (task: Task) => void;
  onCancel: () => void;
}) {
  // 过滤出有效的历史任务（有推文链接或用户额外信息的任务）
  const validTasks = tasks.filter(task =>
    task.tweetUrl || task.userExtraInfo
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-6">选择历史任务进行回填</h3>

        {validTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无可回填的历史任务</p>
            <p className="text-sm mt-2">历史任务需要包含推文链接或用户额外信息才能进行回填</p>
          </div>
        ) : (
          <div className="space-y-3">
            {validTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelect(task)}
                className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {task.authorNickname ? `@${task.authorNickname}` : '推文处理任务'}
                      </h4>
                      <StatusBadge status={task.status} size="sm" />
                    </div>

                    {task.tweetUrl && (
                      <p className="text-sm text-gray-600 truncate mb-1">
                        <span className="text-gray-500">链接:</span> {task.tweetUrl}
                      </p>
                    )}

                    {task.userExtraInfo && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="text-gray-500">用户信息:</span>
                        <span className="ml-1">{task.userExtraInfo.substring(0, 50)}{task.userExtraInfo.length > 50 ? '...' : ''}</span>
                      </p>
                    )}

                    <p className="text-xs text-gray-400">
                      {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(task);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors"
                    >
                      回填
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 按钮区域 */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}