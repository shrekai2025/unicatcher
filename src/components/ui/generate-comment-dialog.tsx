'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';

interface GeneratedComment {
  content: string;
  reasoning?: string;
}

interface AIConfig {
  apiKey: string;
  provider: 'openai' | 'openai-badger' | 'zhipu' | 'anthropic';
  model: string;
  baseURL?: string;
}

interface GenerateCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tweetId?: string;
  tweetContent?: string;
  aiConfig?: AIConfig;
  onGenerate?: (comments: GeneratedComment[]) => void;
  onShowAIConfig?: () => void;
}

export function GenerateCommentDialog({
  open,
  onOpenChange,
  tweetId,
  tweetContent,
  aiConfig,
  onGenerate,
  onShowAIConfig
}: GenerateCommentDialogProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [includeExistingComments, setIncludeExistingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(2);
  const [commentLength, setCommentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [language, setLanguage] = useState<'zh-CN' | 'en-US'>('zh-CN');
  const [generating, setGenerating] = useState(false);
  const [generatedComments, setGeneratedComments] = useState<GeneratedComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!tweetId) {
      setError('推文ID不能为空');
      return;
    }

    if (!aiConfig?.apiKey) {
      setError('请先配置AI服务');
      onShowAIConfig?.();
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/tweet-processor/generate-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'your-api-key',
        },
        body: JSON.stringify({
          tweetId,
          commentCount,
          commentLength,
          language,
          userInfo: userPrompt.trim() || undefined,
          includeExistingComments,
          aiConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成评论失败');
      }

      const result = await response.json();

      if (result.success) {
        const comments = result.data.comments || [];
        setGeneratedComments(comments);
        onGenerate?.(comments);
      } else {
        throw new Error(result.message || '生成评论失败');
      }

    } catch (error) {
      console.error('生成评论失败:', error);
      setError(error instanceof Error ? error.message : '未知错误');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setUserPrompt('');
    setGeneratedComments([]);
    setError(null);
    onOpenChange(false);
  };

  const handleCopyComment = (content: string) => {
    navigator.clipboard.writeText(content);
    // 这里可以添加一个提示
  };

  const getLengthDescription = (length: 'short' | 'medium' | 'long') => {
    const descriptions = {
      'zh-CN': {
        short: '20-60字符，简洁一句话',
        medium: '60-200字符，2-3句完整观点',
        long: '200-500字符，多句详细分析带个人观点'
      },
      'en-US': {
        short: '20-60 characters, concise one sentence',
        medium: '60-200 characters, 2-3 complete sentences',
        long: '200-500 characters, detailed analysis with personal opinion'
      }
    };
    return descriptions[language][length];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI生成评论</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">

          {/* 推文内容显示 */}
          {tweetContent && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">原推文内容：</h4>
              <p className="text-sm text-gray-900">{tweetContent}</p>
            </div>
          )}

          {/* 生成配置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  语言设置
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'zh-CN' | 'en-US')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">美国英语</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  评论数量
                </label>
                <select
                  value={commentCount}
                  onChange={(e) => setCommentCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <option key={num} value={num}>{num} 条</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  评论长度
                </label>
                <select
                  value={commentLength}
                  onChange={(e) => setCommentLength(e.target.value as 'short' | 'medium' | 'long')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="short">短评论</option>
                  <option value="medium">中等评论</option>
                  <option value="long">长评论</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {getLengthDescription(commentLength)}
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeExistingComments}
                    onChange={(e) => setIncludeExistingComments(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm text-gray-700">
                    参考已有评论
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户额外提示词（可选）
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="输入您的额外要求或上下文信息，例如：请生成一些支持性的评论、关注用户的情感表达等..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    生成失败
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !tweetId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? '生成中...' : '生成评论'}
            </button>
          </div>

          {/* 生成结果 */}
          {generatedComments.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                生成结果 ({generatedComments.length} 条评论)
              </h3>
              <div className="space-y-3">
                {generatedComments.map((comment, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        评论 {index + 1}
                      </span>
                      <button
                        onClick={() => handleCopyComment(comment.content)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        复制
                      </button>
                    </div>
                    <p className="text-gray-900 mb-2">{comment.content}</p>
                    {comment.reasoning && (
                      <p className="text-xs text-gray-500">
                        <strong>生成理由：</strong>{comment.reasoning}
                      </p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      长度：{comment.content.length} 字符
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}