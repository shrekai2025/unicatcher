'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export default function StyleProfilesPage() {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<string[]>([]);

  // 获取所有用户列表
  const usersQuery = api.styleProfiles.getUsernames.useQuery();

  // 获取选中用户的风格档案
  const profilesQuery = api.styleProfiles.getByUsername.useQuery(
    { username: selectedUsername! },
    { enabled: !!selectedUsername }
  );

  // 删除单个风格档案
  const deleteProfile = api.styleProfiles.deleteProfile.useMutation({
    onSuccess: () => {
      void profilesQuery.refetch();
      void usersQuery.refetch();
    },
  });

  // 批量删除用户的所有风格档案
  const deleteAllByUsername = api.styleProfiles.deleteAllByUsername.useMutation({
    onSuccess: () => {
      setSelectedUsername(null);
      void usersQuery.refetch();
    },
  });

  const handleDeleteProfile = async (profileId: string) => {
    if (confirm('确定要删除这个风格档案吗？')) {
      await deleteProfile.mutateAsync({ profileId });
    }
  };

  const handleDeleteAllProfiles = async (username: string) => {
    if (confirm(`确定要删除用户 @${username} 的所有风格档案吗？`)) {
      await deleteAllByUsername.mutateAsync({ username });
    }
  };

  const handleToggleProfile = (profileId: string) => {
    setExpandedProfiles(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const parseJsonField = (field: string | null) => {
    if (!field) return null;
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">用户风格档案</h1>
          <p className="mt-2 text-gray-600">
            查看所有用户的写作风格分析结果
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：用户列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-4 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                用户列表 ({usersQuery.data?.data?.totalUsers || 0})
              </h2>

              {usersQuery.isLoading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : usersQuery.data?.data?.users && usersQuery.data.data.users.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {usersQuery.data.data.users.map((user) => (
                    <button
                      key={user.username}
                      onClick={() => setSelectedUsername(user.username)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedUsername === user.username
                          ? 'bg-indigo-100 border-2 border-indigo-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            @{user.username}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {user.profileCount} 个档案
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        更新: {new Date(user.lastUpdated).toLocaleDateString('zh-CN')}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无用户数据
                </div>
              )}
            </div>
          </div>

          {/* 右侧：风格档案详情 */}
          <div className="lg:col-span-3">
            {!selectedUsername ? (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  选择一个用户
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  从左侧列表选择一个用户查看其风格档案
                </p>
              </div>
            ) : profilesQuery.isLoading ? (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : profilesQuery.data?.data?.profiles && profilesQuery.data.data.profiles.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        @{selectedUsername} 的风格档案
                      </h2>
                      <p className="text-sm text-gray-600">
                        共 {profilesQuery.data.data.totalProfiles} 个内容类型档案
                      </p>
                    </div>
                    <button
                      onClick={() => selectedUsername && handleDeleteAllProfiles(selectedUsername)}
                      disabled={deleteAllByUsername.isPending}
                      className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleteAllByUsername.isPending ? '删除中...' : '删除所有档案'}
                    </button>
                  </div>
                </div>

                {profilesQuery.data.data.profiles.map((profile) => (
                  <div key={profile.id} className="bg-white shadow rounded-lg overflow-hidden">
                    {/* 档案头部 */}
                    <div
                      className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors"
                      onClick={() => handleToggleProfile(profile.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-semibold text-indigo-900">
                              {profile.contentType}
                            </h3>
                            <span className="ml-3 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                              样本: {profile.sampleCount || 0}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              更新: {new Date(profile.updatedAt).toLocaleString('zh-CN')}
                            </div>
                            {profile.lastAnalyzedAt && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                分析: {new Date(profile.lastAnalyzedAt).toLocaleString('zh-CN')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProfile(profile.id);
                            }}
                            disabled={deleteProfile.isPending}
                            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-300 rounded hover:bg-red-100 disabled:opacity-50"
                          >
                            删除
                          </button>
                          <button className="text-indigo-600 hover:text-indigo-800">
                            <svg
                              className={`w-6 h-6 transform transition-transform ${
                                expandedProfiles.includes(profile.id) ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 档案详情 */}
                    {expandedProfiles.includes(profile.id) && (
                      <div className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 词汇特征 */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">词汇特征</h4>

                            {profile.vocabDiversity !== null && (
                              <div>
                                <div className="text-xs text-gray-600 mb-1">词汇多样性</div>
                                <div className="flex items-center">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{ width: `${profile.vocabDiversity * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{(profile.vocabDiversity * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            )}

                            {profile.wordComplexity !== null && (
                              <div>
                                <div className="text-xs text-gray-600 mb-1">词汇复杂度</div>
                                <div className="flex items-center">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${profile.wordComplexity * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{(profile.wordComplexity * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            )}

                            {profile.signatureWords && (
                              <div>
                                <div className="text-xs text-gray-600 mb-2">签名词汇</div>
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const words = parseJsonField(profile.signatureWords);
                                    if (Array.isArray(words)) {
                                      return words.slice(0, 10).map((word: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded">
                                          {word}
                                        </span>
                                      ));
                                    }
                                    return <span className="text-xs text-gray-400">无数据</span>;
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 句子特征 */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">句子特征</h4>

                            {profile.avgSentenceLength !== null && (
                              <div>
                                <div className="text-xs text-gray-600 mb-1">平均句子长度</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {profile.avgSentenceLength.toFixed(1)} <span className="text-sm font-normal text-gray-500">字符</span>
                                </div>
                              </div>
                            )}

                            {profile.avgContentLength !== null && (
                              <div>
                                <div className="text-xs text-gray-600 mb-1">平均内容长度</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {profile.avgContentLength.toFixed(0)} <span className="text-sm font-normal text-gray-500">字符</span>
                                </div>
                              </div>
                            )}

                            {profile.sentenceTypeDist && (
                              <div>
                                <div className="text-xs text-gray-600 mb-2">句子类型分布</div>
                                <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                                  {JSON.stringify(parseJsonField(profile.sentenceTypeDist), null, 2)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 专业特征 */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">专业特征</h4>

                            {profile.technicalTermUsage !== null && (
                              <div>
                                <div className="text-xs text-gray-600 mb-1">专业术语使用率</div>
                                <div className="flex items-center">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                    <div
                                      className="bg-purple-600 h-2 rounded-full"
                                      style={{ width: `${profile.technicalTermUsage * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{(profile.technicalTermUsage * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            )}

                            {profile.industryKnowledgeLevel && (
                              <div>
                                <div className="text-xs text-gray-600 mb-1">行业知识水平</div>
                                <div className="px-3 py-2 bg-purple-50 text-purple-700 rounded text-sm font-medium">
                                  {profile.industryKnowledgeLevel}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 风格特征 */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 text-sm border-b pb-2">风格特征</h4>

                            {profile.toneFeatures && (
                              <div>
                                <div className="text-xs text-gray-600 mb-2">语气特征</div>
                                <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(parseJsonField(profile.toneFeatures), null, 2)}</pre>
                                </div>
                              </div>
                            )}

                            {profile.commonOpenings && (
                              <div>
                                <div className="text-xs text-gray-600 mb-2">常用开头</div>
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const openings = parseJsonField(profile.commonOpenings);
                                    if (Array.isArray(openings)) {
                                      return openings.slice(0, 5).map((opening: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                                          {opening}
                                        </span>
                                      ));
                                    }
                                    return <span className="text-xs text-gray-400">无数据</span>;
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  暂无风格档案
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  该用户还没有生成风格档案，请先完成写作分析
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}