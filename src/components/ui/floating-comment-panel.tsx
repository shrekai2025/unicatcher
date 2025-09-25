'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Copy, MessageCircle, X } from 'lucide-react';

interface GeneratedComment {
  content: string;
  reasoning?: string;
}

interface TweetWithComments {
  tweetId: string;
  tweetContent: string;
  comments: GeneratedComment[];
}

interface FloatingCommentPanelProps {
  tweetsWithComments: TweetWithComments[];
  onClearComments?: () => void;
}

export function FloatingCommentPanel({
  tweetsWithComments,
  onClearComments
}: FloatingCommentPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTweets, setExpandedTweets] = useState<Record<string, boolean>>({});

  // 如果没有生成的评论，不显示面板
  if (tweetsWithComments.length === 0) {
    return null;
  }

  const totalComments = tweetsWithComments.reduce((total, tweet) => total + tweet.comments.length, 0);

  const handleCopyComment = (content: string) => {
    navigator.clipboard.writeText(content);
    // 这里可以添加一个提示
  };

  const toggleTweetExpansion = (tweetId: string) => {
    setExpandedTweets(prev => ({
      ...prev,
      [tweetId]: !prev[tweetId]
    }));
  };

  const getTweetPreview = (content: string) => {
    return content.length > 20 ? content.substring(0, 20) + '...' : content;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 浮动面板 */}
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300 ${
        isExpanded ? 'w-96 h-96' : 'w-auto h-auto'
      }`}>

        {/* 面板头部 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              AI生成评论 ({totalComments})
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {isExpanded && (
              <button
                onClick={onClearComments}
                className="p-1 text-gray-400 hover:text-red-500 rounded"
                title="清空所有评论"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 面板内容 */}
        {isExpanded && (
          <div className="p-3 h-80 overflow-y-auto">
            <div className="space-y-4">
              {tweetsWithComments.map((tweet) => (
                <div key={tweet.tweetId} className="border border-gray-100 rounded-lg p-3">
                  {/* 推文预览 */}
                  <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleTweetExpansion(tweet.tweetId)}
                  >
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">推文内容:</p>
                      <p className="text-sm text-gray-800">
                        {getTweetPreview(tweet.tweetContent)}
                      </p>
                    </div>
                    <div className="ml-2 flex items-center space-x-1">
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {tweet.comments.length}条
                      </span>
                      {expandedTweets[tweet.tweetId] ? (
                        <ChevronUp className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* 生成的评论列表 */}
                  {expandedTweets[tweet.tweetId] && (
                    <div className="space-y-2 mt-3 border-t border-gray-100 pt-3">
                      {tweet.comments.map((comment, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-gray-500">评论 {index + 1}</span>
                            <button
                              onClick={() => handleCopyComment(comment.content)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              title="复制评论"
                            >
                              <Copy className="w-3 h-3" />
                              <span>复制</span>
                            </button>
                          </div>
                          <p className="text-gray-800 text-sm leading-relaxed">
                            {comment.content}
                          </p>
                          {comment.reasoning && (
                            <p className="text-xs text-gray-500 mt-1">
                              <strong>生成理由：</strong>{comment.reasoning}
                            </p>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {comment.content.length} 字符
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 未展开时的简化显示 */}
        {!isExpanded && (
          <div className="p-2">
            <div className="text-xs text-gray-600">
              {tweetsWithComments.length} 条推文有生成评论
            </div>
          </div>
        )}
      </div>
    </div>
  );
}