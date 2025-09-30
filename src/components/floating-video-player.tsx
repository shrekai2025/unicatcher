'use client';

import { useState, useEffect, useRef } from 'react';

interface VideoData {
  id: string;
  videoUrl: string;
  previewUrl: string;
  tweetContent: string;
  tweetUrl: string;
  userNickname: string;
  userUsername: string;
}

interface FloatingVideoPlayerProps {
  isOpen: boolean;
  videoData: VideoData | null;
  onClose: () => void;
}

export function FloatingVideoPlayer({ isOpen, videoData, onClose }: FloatingVideoPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 当视频数据变化时，重新加载视频
  useEffect(() => {
    if (videoRef.current && videoData?.videoUrl) {
      videoRef.current.load();
    }
  }, [videoData?.videoUrl]);

  if (!isOpen || !videoData) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 z-50 ${
        isMinimized ? 'w-16 h-16' : 'w-80'
      }`}
      style={{ maxHeight: isMinimized ? '64px' : '90vh' }}
    >
      {/* 最小化状态 */}
      {isMinimized && (
        <div 
          className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50"
          onClick={toggleMinimized}
        >
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 5v10l7-5-7-5z" />
            </svg>
          </div>
        </div>
      )}

      {/* 正常状态 */}
      {!isMinimized && (
        <>
          {/* 播放器头部 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v10l7-5-7-5z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-900 truncate">
                  @{videoData.userUsername}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleExpanded}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isExpanded ? "收起" : "展开"}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isExpanded ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  )}
                </svg>
              </button>
              <button
                onClick={toggleMinimized}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="最小化"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="关闭"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 播放器内容 */}
          {isExpanded && (
            <div className="p-3">
              {/* 视频播放器 */}
              <div className="relative bg-black rounded overflow-hidden mb-3">
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-auto"
                  poster={videoData.previewUrl}
                  preload="metadata"
                >
                  <source src={videoData.videoUrl} type="video/mp4" />
                  您的浏览器不支持视频播放。
                </video>
              </div>

              {/* 推文信息 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  {videoData.userNickname}
                </p>
                <p className="text-xs text-gray-600 line-clamp-3">
                  {videoData.tweetContent}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => window.open(videoData.tweetUrl, '_blank')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded transition-colors"
                >
                  原推文
                </button>
                <button
                  onClick={toggleExpanded}
                  className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                >
                  收起
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 样式定义 */}
      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}