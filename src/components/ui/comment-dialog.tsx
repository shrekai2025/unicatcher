"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
// import { MessageCircle, Heart, Clock, User, ExternalLink } from "lucide-react";

interface CommentData {
  commentId: string;
  content: string;
  authorUsername: string;
  authorNickname: string;
  authorProfileImage?: string;
  replyCount: number;
  likeCount: number;
  publishedAt: number;
  scrapedAt: number;
  isReply: boolean;
  parentCommentId?: string;
  tweetId: string;
}

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: CommentData[];
  loading?: boolean;
  tweetId?: string;
  tweetContent?: string;
  onRefresh?: () => void;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return '刚刚';
  if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}小时前`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}天前`;

  return date.toLocaleDateString('zh-CN');
};

const formatNumber = (num: number) => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
};

const CommentItem: React.FC<{ comment: CommentData }> = ({ comment }) => {
  return (
    <div className="flex space-x-3 p-4 hover:bg-gray-50 transition-colors">
      {/* 头像 */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage
          src={comment.authorProfileImage}
          alt={comment.authorNickname}
        />
        <AvatarFallback>
          👤
        </AvatarFallback>
      </Avatar>

      {/* 评论内容 */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* 用户信息 */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-gray-900 truncate">
              {comment.authorNickname || comment.authorUsername}
            </span>
            {comment.authorNickname && comment.authorUsername && (
              <span className="text-gray-500 text-sm truncate">
                @{comment.authorUsername}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {comment.isReply && (
              <Badge variant="secondary" className="text-xs">
                回复
              </Badge>
            )}
            <span className="text-gray-500 text-sm flex items-center">
              🕐
              <span className="ml-1">{formatTime(comment.publishedAt)}</span>
            </span>
          </div>
        </div>

        {/* 评论文本 */}
        <div className="text-gray-900">
          <p className="whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        {/* 互动数据 */}
        <div className="flex items-center space-x-4 text-gray-500">
          <div className="flex items-center space-x-1">
            💬
            <span className="text-sm">{formatNumber(comment.replyCount)}</span>
          </div>
          <div className="flex items-center space-x-1">
            ❤️
            <span className="text-sm">{formatNumber(comment.likeCount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CommentDialog: React.FC<CommentDialogProps> = ({
  open,
  onOpenChange,
  comments,
  loading = false,
  tweetId,
  tweetContent,
  onRefresh,
}) => {
  // 按时间排序评论（最新的在前）
  const sortedComments = [...comments].sort((a, b) => b.publishedAt - a.publishedAt);

  // 分组评论：主评论和回复
  const mainComments = sortedComments.filter(comment => !comment.isReply);
  const replyComments = sortedComments.filter(comment => comment.isReply);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center justify-between mb-2">
            <span>推文评论</span>
            <div className="flex items-center space-x-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  刷新
                </Button>
              )}
              <Badge variant="outline">
                {comments.length} 条评论
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="ml-2"
              >
                ✕
              </Button>
            </div>
          </DialogTitle>
          {tweetContent && (
            <DialogDescription className="text-left">
              <div className="bg-gray-50 rounded-lg p-3 mt-2">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {tweetContent}
                </p>
                {tweetId && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => window.open(`https://x.com/i/status/${tweetId}`, '_blank')}
                    >
                      🔗 查看原推文
                    </Button>
                  </div>
                )}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">加载评论中...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-gray-500">暂无评论数据</p>
              </div>
            ) : (
              <div>
                {/* 主评论区域 */}
                {mainComments.length > 0 && (
                  <div>
                    <div className="px-6 py-2 bg-gray-50">
                      <h3 className="text-sm font-medium text-gray-700">
                        主评论 ({mainComments.length})
                      </h3>
                    </div>
                    {mainComments.map((comment) => (
                      <CommentItem key={comment.commentId} comment={comment} />
                    ))}
                  </div>
                )}

                {/* 回复评论区域 */}
                {replyComments.length > 0 && (
                  <div>
                    {mainComments.length > 0 && <Separator />}
                    <div className="px-6 py-2 bg-gray-50">
                      <h3 className="text-sm font-medium text-gray-700">
                        回复评论 ({replyComments.length})
                      </h3>
                    </div>
                    {replyComments.map((comment) => (
                      <CommentItem key={comment.commentId} comment={comment} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部信息 */}
        {comments.length > 0 && (
          <div className="p-4 bg-gray-50 text-center">
            <p className="text-xs text-gray-500">
              最后更新: {formatTime(Math.max(...comments.map(c => c.scrapedAt)))}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};