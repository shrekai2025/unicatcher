import type { ApiEndpoint } from '../../types';

export const manualTweetsEndpoints: ApiEndpoint[] = [
  // 手采推文分类管理接口
  {
    id: 'create-manual-tweet-category',
    method: 'POST',
    path: '/api/external/manual-tweet-categories',
    title: '创建手采推文分类',
    description: '创建新的手采推文分类，用于组织和管理手采推文数据',
    params: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: '分类名称',
        example: 'AI技术'
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: '分类描述',
        example: '关于人工智能技术发展的推文内容'
      },
      {
        name: 'color',
        type: 'string',
        required: false,
        description: '分类标签颜色',
        example: '#3B82F6'
      }
    ],
    responses: [
      {
        status: 201,
        description: '分类创建成功',
        example: {
          success: true,
          message: '分类创建成功',
          data: {
            id: 'cat_123456',
            name: 'AI技术',
            description: '关于人工智能技术发展的推文内容',
            color: '#3B82F6',
            createdAt: '2025-01-15T10:35:22.456Z',
            updatedAt: '2025-01-15T10:35:22.456Z'
          }
        }
      },
      {
        status: 400,
        description: '参数错误',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Category name is required'
          }
        }
      },
      {
        status: 401,
        description: 'API密钥无效',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/manual-tweet-categories \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "name": "AI技术",
    "description": "关于人工智能技术发展的推文内容",
    "color": "#3B82F6"
  }'`
  },

  {
    id: 'get-manual-tweet-categories',
    method: 'GET',
    path: '/api/external/manual-tweet-categories',
    title: '查询手采推文分类',
    description: '获取所有手采推文分类列表',
    queryParams: [
      {
        name: 'page',
        type: 'number',
        required: false,
        description: '页码，从1开始',
        example: 1
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '每页数量，最大100',
        example: 20
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          data: {
            categories: [
              {
                id: 'cat_123456',
                name: 'AI技术',
                description: '关于人工智能技术发展的推文内容',
                color: '#3B82F6',
                textCount: 25,
                createdAt: '2025-01-15T10:35:22.456Z',
                updatedAt: '2025-01-15T10:35:22.456Z'
              },
              {
                id: 'cat_789012',
                name: '区块链',
                description: '区块链技术和加密货币相关内容',
                color: '#10B981',
                textCount: 18,
                createdAt: '2025-01-15T11:20:15.123Z',
                updatedAt: '2025-01-15T11:20:15.123Z'
              }
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1
            }
          }
        }
      },
      {
        status: 401,
        description: 'API密钥无效',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key'
          }
        }
      }
    ],
    example: `curl -X GET "http://localhost:3067/api/external/manual-tweet-categories?page=1&limit=20" \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  {
    id: 'delete-manual-tweet-category',
    method: 'DELETE',
    path: '/api/external/manual-tweet-categories/[categoryId]',
    title: '删除手采推文分类',
    description: '删除指定的手采推文分类。注意：删除分类会同时删除该分类下的所有文本数据',
    pathParams: [
      {
        name: 'categoryId',
        type: 'string',
        required: true,
        description: '分类ID',
        example: 'cat_123456'
      }
    ],
    responses: [
      {
        status: 200,
        description: '删除成功',
        example: {
          success: true,
          message: '分类删除成功',
          data: {
            deletedCategory: {
              id: 'cat_123456',
              name: 'AI技术',
              description: '关于人工智能技术发展的推文内容'
            },
            deletedTextsCount: 25
          }
        }
      },
      {
        status: 404,
        description: '分类不存在',
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found'
          }
        }
      },
      {
        status: 401,
        description: 'API密钥无效',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key'
          }
        }
      }
    ],
    example: `curl -X DELETE http://localhost:3067/api/external/manual-tweet-categories/cat_123456 \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  // 手采推文文本数据接口
  {
    id: 'create-manual-tweet-texts',
    method: 'POST',
    path: '/api/external/manual-tweet-texts',
    title: '批量添加手采推文文本',
    description: '批量添加手采推文文本数据到指定分类中，需要提供推文ID、用户名和发布时间',
    params: [
      {
        name: 'data',
        type: 'array',
        required: true,
        description: '文本数据数组，每项需包含categoryId、content、tweetId、userUsername、publishedAt',
        example: [
          {
            categoryId: 'cat_123456',
            content: 'AI正在改变我们的工作方式，这是一个令人兴奋的时代。',
            tweetId: '1234567890',
            userUsername: 'elonmusk',
            publishedAt: 1705334400000
          },
          {
            categoryId: 'cat_123456',
            content: '机器学习算法的突破让AI应用变得更加实用和高效。',
            tweetId: '1234567891',
            userUsername: 'sama',
            publishedAt: 1705420800000
          }
        ]
      }
    ],
    responses: [
      {
        status: 201,
        description: '文本添加成功',
        example: {
          success: true,
          message: '成功添加 2 条文本数据',
          data: {
            categoryId: 'cat_123456',
            addedTexts: [
              {
                id: 'txt_789012',
                content: 'AI正在改变我们的工作方式，这是一个令人兴奋的时代。',
                categoryId: 'cat_123456',
                source: 'manual',
                metadata: {
                  author: '科技博主',
                  platform: 'Twitter',
                  date: '2025-01-15'
                },
                createdAt: '2025-01-15T10:35:22.456Z'
              },
              {
                id: 'txt_345678',
                content: '机器学习算法的突破让AI应用变得更加实用和高效。',
                categoryId: 'cat_123456',
                source: 'manual',
                metadata: {
                  author: 'AI研究员',
                  platform: 'Twitter',
                  date: '2025-01-15'
                },
                createdAt: '2025-01-15T10:35:22.456Z'
              }
            ],
            totalAdded: 2
          }
        }
      },
      {
        status: 400,
        description: '参数错误',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Category ID and texts array are required'
          }
        }
      },
      {
        status: 404,
        description: '分类不存在',
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found'
          }
        }
      },
      {
        status: 401,
        description: 'API密钥无效',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/manual-tweet-texts \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "data": [
      {
        "categoryId": "cat_123456",
        "content": "AI正在改变我们的工作方式，这是一个令人兴奋的时代。",
        "tweetId": "1234567890",
        "userUsername": "elonmusk",
        "publishedAt": 1705334400000
      },
      {
        "categoryId": "cat_123456",
        "content": "机器学习算法的突破让AI应用变得更加实用和高效。",
        "tweetId": "1234567891",
        "userUsername": "sama",
        "publishedAt": 1705420800000
      }
    ]
  }'`
  },

  {
    id: 'get-manual-tweet-texts',
    method: 'GET',
    path: '/api/external/manual-tweet-texts',
    title: '查询手采推文文本',
    description: '查询手采推文文本数据，支持按分类筛选和分页',
    queryParams: [
      {
        name: 'categoryId',
        type: 'string',
        required: false,
        description: '分类ID，不传则查询所有分类的文本',
        example: 'cat_123456'
      },
      {
        name: 'page',
        type: 'number',
        required: false,
        description: '页码，从1开始',
        example: 1
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '每页数量，最大100',
        example: 20
      },
      {
        name: 'search',
        type: 'string',
        required: false,
        description: '搜索关键词，在文本内容中搜索',
        example: 'AI'
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          data: {
            texts: [
              {
                id: 'txt_789012',
                content: 'AI正在改变我们的工作方式，这是一个令人兴奋的时代。',
                categoryId: 'cat_123456',
                categoryName: 'AI技术',
                source: 'manual',
                metadata: {
                  author: '科技博主',
                  platform: 'Twitter',
                  date: '2025-01-15'
                },
                createdAt: '2025-01-15T10:35:22.456Z',
                updatedAt: '2025-01-15T10:35:22.456Z'
              },
              {
                id: 'txt_345678',
                content: '机器学习算法的突破让AI应用变得更加实用和高效。',
                categoryId: 'cat_123456',
                categoryName: 'AI技术',
                source: 'manual',
                metadata: {
                  author: 'AI研究员',
                  platform: 'Twitter',
                  date: '2025-01-15'
                },
                createdAt: '2025-01-15T10:35:22.456Z',
                updatedAt: '2025-01-15T10:35:22.456Z'
              }
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1
            },
            filters: {
              categoryId: 'cat_123456',
              search: null
            }
          }
        }
      },
      {
        status: 401,
        description: 'API密钥无效',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key'
          }
        }
      }
    ],
    example: `curl -X GET "http://localhost:3067/api/external/manual-tweet-texts?categoryId=cat_123456&page=1&limit=20&search=AI" \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  {
    id: 'delete-manual-tweet-text',
    method: 'DELETE',
    path: '/api/external/manual-tweet-texts/[textId]',
    title: '删除手采推文文本',
    description: '删除指定的手采推文文本数据',
    pathParams: [
      {
        name: 'textId',
        type: 'string',
        required: true,
        description: '文本ID',
        example: 'txt_789012'
      }
    ],
    responses: [
      {
        status: 200,
        description: '删除成功',
        example: {
          success: true,
          message: '文本删除成功',
          data: {
            deletedText: {
              id: 'txt_789012',
              content: 'AI正在改变我们的工作方式，这是一个令人兴奋的时代。',
              categoryId: 'cat_123456',
              categoryName: 'AI技术'
            }
          }
        }
      },
      {
        status: 404,
        description: '文本不存在',
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Text not found'
          }
        }
      },
      {
        status: 401,
        description: 'API密钥无效',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key'
          }
        }
      }
    ],
    example: `curl -X DELETE http://localhost:3067/api/external/manual-tweet-texts/txt_789012 \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  // 通过用户名获取推文接口
  {
    id: 'get-tweets-by-username',
    method: 'GET',
    path: '/api/external/tweets-by-username',
    title: '通过用户名获取推文',
    description: '根据推特用户名(handler)获取该作者的推文，支持分页。会跨Tweet表和ManualTweetText表查询，按推文ID去重后按发布时间降序返回。',
    queryParams: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '推特用户名（不含@符号）',
        example: 'elonmusk'
      },
      {
        name: 'limit',
        type: 'number',
        required: true,
        description: '获取推文数量，范围1-1000',
        example: 10
      },
      {
        name: 'cursor',
        type: 'string',
        required: false,
        description: '推文ID游标，从该推文之前开始获取（不包含该推文）。不传则从最新推文开始',
        example: '1234567890'
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          data: [
            {
              tweet_id: '1234567892',
              content: '最新的推文内容',
              publish_time: '2024-01-16T10:30:00.000Z'
            },
            {
              tweet_id: '1234567891',
              content: '机器学习算法的突破让AI应用变得更加实用和高效。',
              publish_time: '2024-01-15T14:30:00.000Z'
            },
            {
              tweet_id: '1234567890',
              content: 'AI正在改变我们的工作方式，这是一个令人兴奋的时代。',
              publish_time: '2024-01-15T10:30:00.000Z'
            }
          ],
          meta: {
            username: 'elonmusk',
            count: 3,
            hasMore: false
          }
        }
      },
      {
        status: 400,
        description: '参数错误',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required parameter: username'
          }
        }
      },
      {
        status: 401,
        description: 'API密钥无效',
        example: {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key'
          }
        }
      }
    ],
    example: `# 获取最新的10条推文
curl -X GET "http://localhost:3067/api/external/tweets-by-username?username=elonmusk&limit=10" \\
  -H "x-api-key: unicatcher-api-key-demo"

# 使用游标获取更早的推文
curl -X GET "http://localhost:3067/api/external/tweets-by-username?username=elonmusk&limit=10&cursor=1234567890" \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

];
