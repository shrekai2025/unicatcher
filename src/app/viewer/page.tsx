'use client';

import { useState, useRef } from 'react';
import { Navigation } from '~/components/navigation';
import { FloatingVideoPlayer } from '~/components/floating-video-player';
import { api } from '~/trpc/react';
import { formatCount } from '~/lib/format';
import { getSession } from '~/lib/simple-auth';

interface MediaCard {
  id: string;
  type: 'image' | 'video' | 'text';
  mediaUrl: string;
  videoUrl?: string;
  tweetId: string;
  tweetContent: string;
  tweetUrl: string;
  userNickname: string;
  userUsername: string;
  profileImageUrl?: string;
  viewCount: number;
  publishedAt: number;
}

interface VideoData {
  id: string;
  videoUrl: string;
  previewUrl: string;
  tweetContent: string;
  userNickname: string;
  userUsername: string;
}

export default function ViewerPage() {
  const [listId, setListId] = useState('1952162308337324098');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  // 浮动播放器状态
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);

  // 获取媒体卡片数据
  const { data: mediaData, isLoading, refetch } = api.tweets.getMediaCards.useQuery({
    listId: listId || undefined,
    page: currentPage,
    limit: 100,
  });

  // 删除推文
  const deleteTweet = api.tweets.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSearch = () => {
    setCurrentPage(1);
    refetch();
  };

  const handleDelete = async (tweetId: string) => {
    const session = getSession();
    await deleteTweet.mutateAsync({ 
      id: tweetId, 
      deletedBy: session.username 
    });
  };

  const openTweet = (tweetUrl: string) => {
    window.open(tweetUrl, '_blank');
  };

  const openVideo = (videoUrl: string) => {
    window.open(videoUrl, '_blank');
  };

  const playVideo = (card: MediaCard) => {
    if (card.type === 'video' && card.videoUrl) {
      const videoData: VideoData = {
        id: card.id,
        videoUrl: card.videoUrl,
        previewUrl: card.mediaUrl,
        tweetContent: card.tweetContent,
        userNickname: card.userNickname,
        userUsername: card.userUsername,
      };
      setCurrentVideo(videoData);
      setIsPlayerOpen(true);
    }
  };

  const closePlayer = () => {
    setIsPlayerOpen(false);
    setCurrentVideo(null);
  };

  const MediaCardComponent = ({ card }: { card: MediaCard }) => {
    const isHovered = hoveredCard === card.id;

    return (
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        {/* 媒体内容区域 */}
        <div className="relative">
          {card.type === 'image' && (
            <img
              src={card.mediaUrl}
              alt="推文图片"
              className="w-full h-auto cursor-pointer"
              onClick={() => openTweet(card.tweetUrl)}
              loading="lazy"
            />
          )}
          
          {card.type === 'video' && (
            <div className="relative">
              {card.mediaUrl && (
                <img
                  src={card.mediaUrl}
                  alt="视频预览"
                  className="w-full h-auto"
                  loading="lazy"
                />
              )}
              
              {/* 播放按钮 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => playVideo(card)}
                  className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-3 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l7-5-7-5z" />
                  </svg>
                </button>
              </div>

              {/* 原视频按钮 */}
              {card.videoUrl && (
                <button
                  onClick={() => openVideo(card.videoUrl!)}
                  className="absolute top-2 left-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                >
                  原视频
                </button>
              )}
            </div>
          )}

          {card.type === 'text' && (
            <div
              className="p-4 min-h-[120px] flex items-center justify-center bg-gray-50 cursor-pointer"
              onClick={() => openTweet(card.tweetUrl)}
            >
              <p className="text-gray-600 text-center">📝 纯文字推文</p>
            </div>
          )}

          {/* 浏览量 */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            👁️ {formatCount(card.viewCount)}
          </div>

          {/* 隐藏按钮 */}
          <button
            onClick={() => handleDelete(card.tweetId)}
            className="absolute top-2 right-12 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={deleteTweet.isPending}
          >
            隐藏
          </button>

          {/* Hover显示用户信息 */}
          {isHovered && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white p-2">
              <div className="flex items-center space-x-2">
                {card.profileImageUrl ? (
                  <img
                    src={card.profileImageUrl}
                    alt={card.userNickname}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">
                    🐦
                  </div>
                )}
                <div className="text-xs">
                  <p className="font-medium">{card.userNickname}</p>
                  <p className="text-gray-300">@{card.userUsername}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 推文内容 */}
        <div className="p-3">
          <p className="text-sm text-gray-800 line-clamp-6">{card.tweetContent}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <Navigation />
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
        {/* 过滤区域 */}
        <div className="bg-white shadow-sm rounded p-3 mb-4">
          <div className="flex items-center space-x-3">
            <label htmlFor="listId" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              List ID
            </label>
            <input
              type="text"
              id="listId"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              placeholder="输入List ID进行过滤"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap"
            >
              筛选
            </button>
          </div>
        </div>

        {/* 加载状态 */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        )}

        {/* 媒体卡片瀑布流 */}
        {mediaData?.data.cards && mediaData.data.cards.length > 0 && (
          <>
            <div className="masonry-container mb-4">
              {mediaData.data.cards.map((card) => (
                <div key={card.id} className="masonry-item">
                  <MediaCardComponent card={card} />
                </div>
              ))}
            </div>

            {/* 分页 */}
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:text-gray-500 rounded-md transition-colors"
              >
                上一页
              </button>
              
              <span className="text-gray-600">
                第 {currentPage} 页 / 共 {Math.ceil(mediaData.data.total / 100)} 页
                （共 {mediaData.data.total} 个卡片）
              </span>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!mediaData.data.hasMore}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:text-gray-500 rounded-md transition-colors"
              >
                下一页
              </button>
            </div>
          </>
        )}

        {/* 无数据状态 */}
        {mediaData?.data.cards && mediaData.data.cards.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">没有找到相关数据</p>
          </div>
        )}
        </div>

        {/* 样式定义 */}
        <style jsx>{`
          .line-clamp-6 {
            display: -webkit-box;
            -webkit-line-clamp: 6;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .masonry-container {
            column-count: 2;
            column-gap: 12px;
            column-fill: balance;
          }
          
          @media (min-width: 768px) {
            .masonry-container {
              column-count: 3;
            }
          }
          
          @media (min-width: 1024px) {
            .masonry-container {
              column-count: 4;
            }
          }
          
          @media (min-width: 1280px) {
            .masonry-container {
              column-count: 5;
            }
          }
          
          @media (min-width: 1536px) {
            .masonry-container {
              column-count: 6;
            }
          }
          
          .masonry-item {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 12px;
          }
        `}</style>
      </div>

      {/* 浮动视频播放器 */}
      <FloatingVideoPlayer
        isOpen={isPlayerOpen}
        videoData={currentVideo}
        onClose={closePlayer}
      />
    </>
  );
}