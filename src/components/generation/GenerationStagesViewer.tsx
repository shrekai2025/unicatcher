'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Copy, FileText, Edit3, CheckCircle2, Loader2 } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';

interface GenerationStagesViewerProps {
  taskId: string;
  username?: string;
  contentType?: string;
  onCopy: (text: string) => void;
}

export function GenerationStagesViewer({ taskId, username, contentType, onCopy }: GenerationStagesViewerProps) {
  const [activeStage, setActiveStage] = useState<'outline' | 'draft' | 'final'>('final');
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: task, refetch, isLoading } = api.articleGeneration.getTask.useQuery({ taskId });

  // 轮询处理中的任务
  useEffect(() => {
    if (task?.status === 'processing') {
      const interval = setInterval(() => {
        refetch();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [task?.status, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">加载任务详情中...</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">任务未找到</h3>
        <p className="mt-1 text-sm text-gray-500">请检查任务ID是否正确</p>
      </div>
    );
  }

  const stages = [
    {
      key: 'outline' as const,
      label: '大纲',
      icon: FileText,
      content: task.result?.outlineContent,
      description: '内容结构规划'
    },
    {
      key: 'draft' as const,
      label: '初稿',
      icon: Edit3,
      content: task.result?.draftContent,
      description: '基于大纲扩展内容'
    },
    {
      key: 'final' as const,
      label: '最终版',
      icon: CheckCircle2,
      content: task.result?.finalContent || task.result?.generatedContent,
      description: '自查优化后的最终内容'
    }
  ];

  const getStageStatus = (stageKey: 'outline' | 'draft' | 'final') => {
    if (task.status === 'failed') return 'failed';
    if (!task.result) return 'pending';

    switch (stageKey) {
      case 'outline':
        return task.result.outlineContent ? 'completed' : 'pending';
      case 'draft':
        return task.result.draftContent ? 'completed' : 'pending';
      case 'final':
        return (task.result.finalContent || task.result.generatedContent) ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="space-y-6">
      {/* 任务信息概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{task.topic}</CardTitle>
            <Badge className={getStatusColor(task.status)}>
              {getStatusText(task.status)}
            </Badge>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>平台：{task.platform.name}</div>
            <div>创建时间：{new Date(task.createdAt).toLocaleString('zh-CN')}</div>
            {task.additionalRequirements && (
              <div>附加要求：{task.additionalRequirements}</div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 三阶段内容展示 */}
      <Tabs value={activeStage} onValueChange={(value) => setActiveStage(value as 'outline' | 'draft' | 'final')}>
        <TabsList className="grid w-full grid-cols-3">
          {stages.map((stage) => {
            const stageStatus = getStageStatus(stage.key);
            const StageIcon = stage.icon;

            return (
              <TabsTrigger
                key={stage.key}
                value={stage.key}
                className="flex items-center space-x-2"
              >
                <StageIcon className="h-4 w-4" />
                <span>{stage.label}</span>
                {stageStatus === 'completed' && (
                  <Badge variant="outline" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    ✓
                  </Badge>
                )}
                {task.status === 'processing' && stageStatus === 'pending' && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {stages.map((stage) => (
          <TabsContent key={stage.key} value={stage.key} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <stage.icon className="h-5 w-5" />
                      <span>{stage.label}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                  </div>
                  {stage.content && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopy(stage.content!)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      复制
                    </Button>
                  )}
                </div>

                {/* 自查优化说明 */}
                {stage.key === 'final' && task.result?.selfReviewNotes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-1">自查优化说明</div>
                    <div className="text-sm text-blue-800">{task.result.selfReviewNotes}</div>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {!stage.content ? (
                  <div className="text-center py-8">
                    {task.status === 'processing' ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-gray-600">正在生成{stage.label}...</span>
                      </div>
                    ) : task.status === 'failed' ? (
                      <div className="text-red-600">
                        <div className="font-medium">生成失败</div>
                        <div className="text-sm mt-1">{task.errorMessage || '未知错误'}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <stage.icon className="mx-auto h-8 w-8 mb-2" />
                        <div>尚未生成{stage.label}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                        {stage.content}
                      </pre>
                    </div>

                    {/* 内容统计信息 */}
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <div>
                        字数：{stage.content.length}字
                      </div>
                      {task.result && (
                        <div>
                          模型：{task.result.aiProvider}/{task.result.aiModel}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 反馈收集区域 */}
            {stage.content && username && contentType && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">内容反馈</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFeedback(!showFeedback)}
                    >
                      {showFeedback ? '收起反馈' : '提供反馈'}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    您的反馈将帮助AI优化写作风格，提供更符合您需求的内容
                  </p>
                </CardHeader>

                {showFeedback && (
                  <CardContent>
                    <FeedbackForm
                      taskId={taskId}
                      userId={username}
                      contentType={contentType}
                      generatedContent={stage.content}
                      stage={stage.key}
                      onSubmitSuccess={() => {
                        setShowFeedback(false);
                        // 可以在这里添加成功提示
                      }}
                    />
                  </CardContent>
                )}
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}