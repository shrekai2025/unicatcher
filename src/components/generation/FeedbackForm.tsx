'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Star, Send, Loader2, Lightbulb } from 'lucide-react';

interface FeedbackFormProps {
  taskId: string;
  userId: string;
  contentType: string;
  generatedContent: string;
  stage: 'outline' | 'draft' | 'final';
  onSubmitSuccess?: () => void;
}

export function FeedbackForm({
  taskId,
  userId,
  contentType,
  generatedContent,
  stage,
  onSubmitSuccess
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [adjustmentTarget, setAdjustmentTarget] = useState<'overview' | 'profile'>('profile');

  const submitFeedback = api.articleGeneration.submitFeedback.useMutation({
    onSuccess: () => {
      // 重置表单
      setRating(0);
      setFeedbackText('');
      setSelectedTags([]);
      setAdjustmentTarget('profile');
      onSubmitSuccess?.();
    }
  });

  const commonFeedbackTags = [
    '太书面化',
    '不够口语化',
    '语调过于严肃',
    '缺乏个人特色',
    '开头过于突兀',
    '结尾不够有力',
    '逻辑不够清晰',
    '内容过于浅显',
    '专业术语过多',
    '表达过于复杂',
    '语言过于平淡',
    '缺乏互动感'
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getRecommendedTarget = (feedbackText: string, selectedTags: string[]): 'overview' | 'profile' => {
    const allText = [feedbackText, ...selectedTags].join(' ').toLowerCase();

    // 全局风格问题
    const globalPatterns = ['书面化', '口语化', '语言习惯', '表达方式', '语调', '个人特色'];

    // 类型化问题
    const profilePatterns = ['开头', '结尾', '结构', '逻辑', '专业术语', '内容深度'];

    const globalMatches = globalPatterns.filter(pattern => allText.includes(pattern)).length;
    const profileMatches = profilePatterns.filter(pattern => allText.includes(pattern)).length;

    return globalMatches > profileMatches ? 'overview' : 'profile';
  };

  const recommendedTarget = getRecommendedTarget(feedbackText, selectedTags);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0 || feedbackText.trim() === '') {
      return;
    }

    submitFeedback.mutate({
      taskId,
      userId,
      rating,
      feedback: feedbackText.trim(),
      feedbackTags: selectedTags,
      contentType
    });
  };

  const getStageText = (stage: 'outline' | 'draft' | 'final') => {
    switch (stage) {
      case 'outline': return '大纲';
      case 'draft': return '初稿';
      case 'final': return '最终版';
    }
  };

  return (
    <Card className="feedback-container">
      <CardContent className="space-y-6 pt-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            内容反馈 - {getStageText(stage)}
          </h3>
          <p className="text-sm text-gray-600">
            您的反馈将帮助系统学习并优化写作风格
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 评分组件 */}
          <div>
            <Label className="text-base font-medium">整体满意度 *</Label>
            <div className="flex items-center space-x-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-600">
                  {rating === 1 ? '很不满意' :
                   rating === 2 ? '不满意' :
                   rating === 3 ? '一般' :
                   rating === 4 ? '满意' : '很满意'}
                </span>
              )}
            </div>
          </div>

          {/* 快速标签选择 */}
          <div>
            <Label className="text-base font-medium">常见问题（可多选）</Label>
            <div className="flex flex-wrap gap-2 mt-3">
              {commonFeedbackTags.map(tag => (
                <div
                  key={tag}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  <Badge
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="hover:bg-gray-100 transition-colors"
                  >
                    {tag}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* 详细反馈 */}
          <div>
            <Label htmlFor="feedback-text" className="text-base font-medium">
              具体建议 *
            </Label>
            <Textarea
              id="feedback-text"
              placeholder="请描述具体问题和改进建议..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              className="mt-2"
              required
            />
          </div>

          {/* 调整目标选择 */}
          <div>
            <Label className="text-base font-medium">反馈作用范围</Label>
            <RadioGroup
              value={adjustmentTarget}
              onValueChange={(value: 'overview' | 'profile') => setAdjustmentTarget(value)}
              className="mt-3"
            >
              <div className="space-y-3">
                <Label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="profile" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">类型化风格调整</div>
                    <div className="text-sm text-gray-600 mt-1">
                      只影响"{contentType}"类型的写作风格
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      推荐用于：特定内容类型的表达方式调整
                    </div>
                  </div>
                </Label>

                <Label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="overview" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">全局风格调整</div>
                    <div className="text-sm text-gray-600 mt-1">
                      影响所有内容类型的整体写作风格
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      推荐用于：语言习惯、表达偏好等基础调整
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 智能推荐 */}
          {(feedbackText.trim() || selectedTags.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium">智能推荐</div>
                  <div className="mt-1">
                    基于您的反馈内容，建议选择
                    <strong className="mx-1">
                      {recommendedTarget === 'overview' ? '全局风格调整' : '类型化风格调整'}
                    </strong>
                    {recommendedTarget !== adjustmentTarget && (
                      <button
                        type="button"
                        onClick={() => setAdjustmentTarget(recommendedTarget)}
                        className="ml-2 text-blue-700 underline hover:text-blue-900"
                      >
                        采用推荐
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={submitFeedback.isPending || rating === 0 || feedbackText.trim() === ''}
              className="min-w-24"
            >
              {submitFeedback.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交反馈
                </>
              )}
            </Button>
          </div>

          {/* 成功消息 */}
          {submitFeedback.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-800">
                ✅ 反馈提交成功！系统将根据您的反馈优化写作风格。
              </div>
            </div>
          )}

          {/* 错误消息 */}
          {submitFeedback.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-800">
                ❌ 反馈提交失败：{submitFeedback.error?.message || '未知错误'}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}