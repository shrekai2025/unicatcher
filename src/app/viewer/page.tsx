'use client';

import { useState, useRef, useEffect } from 'react';
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
  isReply: boolean;
  contentTypes?: string[];  // 解析后的内容类型数组
  keywords?: string[];      // 解析后的主题标签数组(来源于topicTags字段)
}

interface VideoData {
  id: string;
  videoUrl: string;
  previewUrl: string;
  tweetContent: string;
  tweetUrl: string;
  userNickname: string;
  userUsername: string;
}

export default function ViewerPage() {
  const [listId, setListId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'masonry' | 'compact' | 'compact-image'>('masonry');
  const [isMounted, setIsMounted] = useState(false);
  
  // 浮动播放器状态
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);

  // 数据库中的listId记录
  const [dbListIds, setDbListIds] = useState<{id: string, listId: string, name: string}[]>([]);
  const [selectedDbListIds, setSelectedDbListIds] = useState<{id: string, listId: string, name: string}[]>([]);
  const [showAddListIdForm, setShowAddListIdForm] = useState(false);
  const [newListIdForm, setNewListIdForm] = useState({ listId: '', name: '' });

  // 初始化组件并加载本地存储的设置
  useEffect(() => {
    setIsMounted(true);
    
    // 从本地存储加载设置
    const savedViewMode = localStorage.getItem('viewer-viewMode') as 'masonry' | 'compact' | 'compact-image';
    if (savedViewMode && ['masonry', 'compact', 'compact-image'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
    
    const savedListId = localStorage.getItem('viewer-listId');
    if (savedListId) {
      setListId(savedListId);
    }

    // 从本地存储加载选中的数据库ListId记录
    const savedSelectedDbListIds = localStorage.getItem('viewer-selectedDbListIds');
    if (savedSelectedDbListIds) {
      try {
        const parsedSelectedDbListIds = JSON.parse(savedSelectedDbListIds) as {id: string, listId: string, name: string}[];
        setSelectedDbListIds(parsedSelectedDbListIds);
      } catch (error) {
        console.error('加载选中的数据库ListId记录失败:', error);
      }
    }
  }, []);

  // 保存viewMode到本地存储
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('viewer-viewMode', viewMode);
    }
  }, [viewMode, isMounted]);

  // 保存listId到本地存储（延迟保存，避免频繁写入）
  useEffect(() => {
    if (isMounted) {
      const timeoutId = setTimeout(() => {
        if (listId.trim()) {
          localStorage.setItem('viewer-listId', listId);
        } else {
          localStorage.removeItem('viewer-listId');
        }
      }, 500); // 延迟500ms保存

      return () => clearTimeout(timeoutId);
    }
  }, [listId, isMounted]);


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
            localStorage.setItem('viewer-selectedDbListIds', JSON.stringify(filteredSelection));
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
      localStorage.setItem('viewer-selectedDbListIds', JSON.stringify(selectedDbListIds));
    }
  }, [selectedDbListIds, isMounted]);

  // 计算有效的listIds
  const effectiveListIds = selectedDbListIds.length > 0 
    ? selectedDbListIds.map(item => item.listId)
    : listId ? [listId] : undefined;

  // 获取媒体卡片数据
  const { data: mediaData, isLoading, refetch } = api.tweets.getMediaCards.useQuery({
    listIds: effectiveListIds,
    page: currentPage,
    limit: 100,
  });

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

  // 监听数据库选择变化，触发数据重新获取
  useEffect(() => {
    refetch();
  }, [selectedDbListIds, refetch]);

  // 删除推文
  const deleteTweet = api.tweets.delete.useMutation({
    onSuccess: () => {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      
      refetch().then(() => {
        // 恢复滚动位置
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      });
    },
  });

  const handleSearch = () => {
    setCurrentPage(1);
    // 清空数据库选择，使用手动输入的listId
    setSelectedDbListIds([]);
    refetch();
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
    setCurrentPage(1); // 重置到第一页
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
        tweetUrl: card.tweetUrl,
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


  // 瀑布流卡片组件
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

              {/* 原推文按钮 */}
              {card.videoUrl && (
                <button
                  onClick={() => openTweet(card.tweetUrl)}
                  className="absolute top-2 left-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                >
                  原推文
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

          {/* 回复标识 */}
          {card.isReply && (
            <div className="absolute top-8 right-2 bg-blue-500 bg-opacity-80 text-white text-xs px-2 py-1 rounded">
              💬 回复
            </div>
          )}

          {/* 删除按钮 */}
          <button
            onClick={() => handleDelete(card.tweetId)}
            className="absolute top-2 right-12 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded transition-colors"
            disabled={deleteTweet.isPending}
          >
            {deleteTweet.isPending ? '...' : '删除'}
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

  // 紧凑列表组件
  const CompactCardComponent = ({ card }: { card: MediaCard }) => {
    const cleanContent = card.tweetContent.replace(/\s+/g, ' ').trim();
    
    // 获取标签数据（现在已经是解析后的数组了）
    const contentTypes = card.contentTypes || [];
    const keywords = card.keywords || [];
    
    return (
      <div className="bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => openTweet(card.tweetUrl)}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-800 flex-1 pr-2">
              {cleanContent} @{card.userUsername}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(card.tweetId);
              }}
              className="text-red-500 hover:text-red-600 transition-colors p-1 flex-shrink-0"
              disabled={deleteTweet.isPending}
              title="删除推文"
            >
              {deleteTweet.isPending ? '⏳' : '🗑️'}
            </button>
          </div>
          
          {/* 标签区域 */}
          {(contentTypes.length > 0 || keywords.length > 0) && (
            <div className="space-y-1">
              {/* 内容类型标签 */}
              {contentTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">内容类型:</span>
                  {contentTypes.map((type, index) => (
                    <span
                      key={`type-${index}`}
                      className="inline-block px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}
              {/* 主题标签 */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">主题标签:</span>
                  {keywords.map((keyword, index) => (
                    <span
                      key={`keyword-${index}`}
                      className="inline-block px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 紧凑图组件
  const CompactImageCardComponent = ({ card }: { card: MediaCard }) => {
    const cleanContent = card.tweetContent.replace(/\s+/g, ' ').trim();
    
    // 获取标签数据
    const contentTypes = card.contentTypes || [];
    const keywords = card.keywords || [];
    
    // 判断是否有媒体文件
    const hasMedia = card.type !== 'text';
    
    return (
      <div className="bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => openTweet(card.tweetUrl)}>
        <div className="p-3">
          <div className="flex gap-3">
            {/* 媒体文件区域 */}
            {hasMedia && (
              <div className="flex-shrink-0">
                {card.type === 'image' && (
                  <img
                    src={card.mediaUrl}
                    alt="推文图片"
                    className="w-24 h-24 object-cover rounded cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTweet(card.tweetUrl);
                    }}
                    loading="lazy"
                  />
                )}
                
                {card.type === 'video' && (
                  <div className="relative w-24 h-24">
                    {card.mediaUrl && (
                      <img
                        src={card.mediaUrl}
                        alt="视频预览"
                        className="w-24 h-24 object-cover rounded"
                        loading="lazy"
                      />
                    )}
                    
                    {/* 播放按钮 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playVideo(card);
                        }}
                        className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 5v10l7-5-7-5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 内容区域 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-800 flex-1 pr-2">
                  {cleanContent} @{card.userUsername}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(card.tweetId);
                  }}
                  className="text-red-500 hover:text-red-600 transition-colors p-1 flex-shrink-0"
                  disabled={deleteTweet.isPending}
                  title="删除推文"
                >
                  {deleteTweet.isPending ? '⏳' : '🗑️'}
                </button>
              </div>
              
              {/* 标签区域 */}
              {(contentTypes.length > 0 || keywords.length > 0) && (
                <div className="space-y-1">
                  {/* 内容类型标签 */}
                  {contentTypes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">内容类型:</span>
                      {contentTypes.map((type, index) => (
                        <span
                          key={`type-${index}`}
                          className="inline-block px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 主题标签 */}
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">主题标签:</span>
                      {keywords.map((keyword, index) => (
                        <span
                          key={`keyword-${index}`}
                          className="inline-block px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 过滤区域 */}
        <div className="bg-white shadow-sm rounded p-3 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
            {/* List ID 和操作按钮 */}
            <div className="flex items-center space-x-3 flex-1">
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
                disabled={selectedDbListIds.length > 0}
              />
              <button
                onClick={handleSearch}
                disabled={selectedDbListIds.length > 0}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap"
              >
                筛选
              </button>
            </div>

            {/* 布局切换 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`px-2 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                    viewMode === 'masonry'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>🔳</span>
                  <span className="hidden lg:inline">瀑布流</span>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-2 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                    viewMode === 'compact'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>📋</span>
                  <span className="hidden lg:inline">紧凑</span>
                </button>
                <button
                  onClick={() => setViewMode('compact-image')}
                  className={`px-2 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                    viewMode === 'compact-image'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>🖼️</span>
                  <span className="hidden lg:inline">紧凑图</span>
                </button>
              </div>
            </div>
          </div>

          {/* 数据库中的List ID记录 */}
          <div className="border-t pt-3">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto mb-3">
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
              <div className="text-xs text-gray-500">
                已选择 {selectedDbListIds.length} 个List ID：
                {selectedDbListIds.map(p => p.name).join(', ')}
              </div>
            )}
          </div>

        </div>

        {/* 加载状态 */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-500">加载中...</p>
          </div>
        )}

        {/* 数据展示区域 */}
        {mediaData?.data.cards && mediaData.data.cards.length > 0 && (
          <>
            {viewMode === 'masonry' ? (
              // 瀑布流布局
              <div className="masonry-container mb-4">
                {mediaData.data.cards.map((card) => (
                  <div key={card.id} className="masonry-item">
                    <MediaCardComponent card={card} />
                  </div>
                ))}
              </div>
            ) : viewMode === 'compact' ? (
              // 紧凑列表布局
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 max-w-4xl mx-auto overflow-hidden">
                {mediaData.data.cards.map((card) => (
                  <CompactCardComponent key={card.id} card={card} />
                ))}
              </div>
            ) : (
              // 紧凑图布局
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 max-w-4xl mx-auto overflow-hidden">
                {mediaData.data.cards.map((card) => (
                  <CompactImageCardComponent key={card.id} card={card} />
                ))}
              </div>
            )}

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
      </div>
    </div>
  );
}