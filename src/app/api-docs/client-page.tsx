'use client';

import { useState, useEffect } from 'react';
import { apiEndpoints } from './data/api-endpoints';
import { ApiEndpointCard } from './components';

export default function ApiDocsClientPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('tweet-processing');
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('zh-CN'));
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const categories = {
    'twitter': {
      title: 'Twitter 模块',
      description: 'Twitter 相关的所有API接口',
      icon: '🐦',
      subcategories: {
        'tasks': {
          title: '任务管理',
          description: '创建、查询和管理爬取任务',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/tasks'))
        },
        'data': {
          title: '数据管理',
          description: '获取和提取推文数据',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/data'))
        },
        'ai-batch': {
          title: 'AI批处理',
          description: 'AI自动分析推文内容，支持OpenAI、OpenAI-Badger、智谱AI、Anthropic Claude供应商',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/ai-batch'))
        },
        'tweet-processing': {
          title: '推文处理',
          description: '推文翻译、评论生成、推文信息查询等API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/external') && (ep.path.includes('/translate') || ep.path.includes('/generate-comments') || ep.path.includes('/tweet-info')))
        },
        'manual-tweets': {
          title: '手采推文',
          description: '手采推文分类管理和文本数据管理API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/manual-tweet'))
        }
      }
    },
    'youtube': {
      title: 'YouTube 模块',
      description: 'YouTube 相关的所有API接口',
      icon: '🎥',
      subcategories: {
        'channel-monitor': {
          title: 'Channel监控',
          description: 'YouTube频道监控相关API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/youtube'))
        }
      }
    },
    'writing-assistant': {
      title: '写作辅助模块',
      description: '写作辅助相关的所有API接口',
      icon: '✍️',
      subcategories: {
        'content-platforms': {
          title: '内容平台管理',
          description: '内容平台的增删改查API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/writing-assistant') && ep.path.includes('/content-platforms'))
        },
        'article-types': {
          title: '文章类型管理',
          description: '文章类型的增删改查API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/writing-assistant') && ep.path.includes('/article-types'))
        },
        'articles': {
          title: '采集文章管理',
          description: '采集文章的增删改查API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/writing-assistant') && ep.path.includes('/collected-articles'))
        },
        'stats': {
          title: '统计数据',
          description: '写作辅助模块的统计信息API',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/writing-assistant') && ep.path.includes('/stats'))
        },
        'url2text': {
          title: 'URL转文本',
          description: 'URL转文本功能API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/url2text'))
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">UniCatcher API 文档</h1>
          <p className="mt-4 text-lg text-gray-600">
            交互式 API 接口文档，点击展开查看详细参数说明
          </p>
          <div className="mt-4 flex space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              REST API 可用
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              交互式文档
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              v1.0.0
            </span>
          </div>
        </div>

        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">🔧 基础信息</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">服务器地址</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm">http://43.153.84.145:3067</code>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">REST API 基础路径</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm">/api/external</code>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">认证方式</h3>
                <div className="space-y-2">
                  <div className="p-2 bg-purple-50 rounded text-sm">
                    <strong>X-API-Key:</strong> <code>unicatcher-api-key-demo</code>
                  </div>
                  <div className="p-2 bg-purple-50 rounded text-sm">
                    <strong>Authorization:</strong> <code>Bearer unicatcher-api-key-demo</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">文档更新时间</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm">{currentTime}</code>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">内容格式</h3>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm">application/json</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {Object.entries(categories).map(([categoryKey, category]) => (
          <div key={categoryKey} className="mb-6">
            <div className="rounded-lg bg-white shadow">
              <div
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(categoryKey)}
              >
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {category.icon} {category.title}
                  </h2>
                  <p className="mt-2 text-gray-600">{category.description}</p>
                </div>
                <svg
                  className={`h-6 w-6 text-gray-400 transition-transform ${expandedCategory === categoryKey ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {expandedCategory === categoryKey && (
                <div className="border-t border-gray-200 p-6">
                  {Object.entries(category.subcategories).map(([subKey, subcategory]) => (
                    <div key={subKey} className="mb-8 last:mb-0">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800">{subcategory.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{subcategory.description}</p>
                      </div>
                      <div className="space-y-4">
                        {subcategory.endpoints.map((endpoint) => (
                          <ApiEndpointCard key={endpoint.id} endpoint={endpoint} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}