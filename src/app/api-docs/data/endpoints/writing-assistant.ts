import type { ApiEndpoint } from '../../types';

export const writingAssistantEndpoints: ApiEndpoint[] = [
  // ========== 写作辅助模块 API ==========

  // 内容平台管理 API
  {
    id: 'get-content-platforms',
    method: 'GET',
    path: '/api/external/writing-assistant/content-platforms',
    title: '获取所有内容平台',
    description: '获取写作辅助模块的所有内容平台列表',
    responses: [
      {
        status: 200,
        description: '获取成功',
        example: {
          success: true,
          data: [
            {
              id: "platform_123",
              name: "微信公众号",
              platformId: "wechat",
              description: "微信公众号平台",
              isDefault: true,
              createdAt: "2024-01-15T10:30:00.000Z",
              updatedAt: "2024-01-15T10:30:00.000Z"
            }
          ]
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: true
          },
          {
            name: 'data',
            type: 'Array<Platform>',
            description: '内容平台列表数组',
            example: ["Array<Platform>"]
          },
          {
            name: 'data[].id',
            type: 'string',
            description: '平台唯一标识符',
            example: 'platform_123'
          },
          {
            name: 'data[].name',
            type: 'string',
            description: '平台名称',
            example: '微信公众号'
          },
          {
            name: 'data[].platformId',
            type: 'string',
            description: '平台代码标识',
            example: 'wechat'
          },
          {
            name: 'data[].description',
            type: 'string',
            description: '平台描述',
            example: '微信公众号平台'
          },
          {
            name: 'data[].isDefault',
            type: 'boolean',
            description: '是否为默认平台',
            example: true
          },
          {
            name: 'data[].createdAt',
            type: 'string',
            description: '创建时间 (ISO 8601)',
            example: '2024-01-15T10:30:00.000Z'
          },
          {
            name: 'data[].updatedAt',
            type: 'string',
            description: '更新时间 (ISO 8601)',
            example: '2024-01-15T10:30:00.000Z'
          }
        ]
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
    example: `curl -X GET http://localhost:3067/api/external/writing-assistant/content-platforms \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  {
    id: 'create-content-platform',
    method: 'POST',
    path: '/api/external/writing-assistant/content-platforms',
    title: '创建内容平台',
    description: '创建新的内容平台',
    params: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: '平台名称',
        example: '小红书'
      },
      {
        name: 'platformId',
        type: 'string',
        required: true,
        description: '平台英文ID，只能包含字母、数字、下划线和短横线',
        example: 'xiaohongshu'
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: '平台描述',
        example: '小红书社区平台'
      },
      {
        name: 'isDefault',
        type: 'boolean',
        required: false,
        description: '是否为默认平台',
        example: false
      }
    ],
    responses: [
      {
        status: 200,
        description: '创建成功',
        example: {
          success: true,
          message: '内容平台创建成功',
          data: {
            id: "platform_456",
            name: "小红书",
            platformId: "xiaohongshu",
            description: "小红书社区平台",
            isDefault: false,
            createdAt: "2024-01-15T10:35:00.000Z",
            updatedAt: "2024-01-15T10:35:00.000Z"
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
            message: 'Missing or invalid name'
          }
        }
      },
      {
        status: 409,
        description: '平台名称或ID已存在',
        example: {
          success: false,
          error: {
            code: 'DUPLICATE_VALUE',
            message: '平台名称已存在'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/writing-assistant/content-platforms \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "name": "小红书",
    "platformId": "xiaohongshu",
    "description": "小红书社区平台",
    "isDefault": false
  }'`
  },

  {
    id: 'update-content-platform',
    method: 'PUT',
    path: '/api/external/writing-assistant/content-platforms/[id]',
    title: '更新内容平台',
    description: '更新指定ID的内容平台信息',
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '平台ID',
        example: 'platform_456'
      }
    ],
    params: [
      {
        name: 'name',
        type: 'string',
        required: false,
        description: '平台名称',
        example: '小红书平台'
      },
      {
        name: 'platformId',
        type: 'string',
        required: false,
        description: '平台代码标识，只允许字母、数字、下划线和连字符',
        example: 'xiaohongshu'
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: '平台描述',
        example: '更新后的描述'
      },
      {
        name: 'isDefault',
        type: 'boolean',
        required: false,
        description: '是否设为默认平台',
        example: false
      }
    ],
    responses: [
      {
        status: 200,
        description: '更新成功',
        example: {
          success: true,
          message: '内容平台更新成功',
          data: {
            id: "platform_456",
            name: "小红书平台",
            platformId: "xiaohongshu",
            description: "更新后的描述",
            isDefault: false,
            createdAt: "2024-01-15T10:35:00.000Z",
            updatedAt: "2024-01-15T10:40:00.000Z"
          }
        }
      }
    ],
    example: `curl -X PUT http://localhost:3067/api/external/writing-assistant/content-platforms/platform_456 \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "name": "小红书平台",
    "platformId": "xiaohongshu",
    "description": "更新后的描述",
    "isDefault": false
  }'`
  },

  {
    id: 'batch-content-platform-operations',
    method: 'PUT',
    path: '/api/external/writing-assistant/content-platforms',
    title: '批量操作内容平台',
    description: '执行批量操作：设置默认平台或初始化默认平台',
    params: [
      {
        name: 'action',
        type: 'string',
        required: true,
        description: '操作类型：setDefault（设置默认平台）或 initDefaults（初始化默认平台）',
        example: 'setDefault'
      },
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '平台ID（当action为setDefault时必需）',
        example: 'platform_123'
      }
    ],
    responses: [
      {
        status: 200,
        description: '操作成功',
        example: {
          success: true,
          message: '默认平台设置成功',
          data: {
            id: "platform_123",
            name: "微信公众号",
            platformId: "wechat",
            description: "微信公众号平台",
            isDefault: true,
            createdAt: "2024-01-15T10:30:00.000Z",
            updatedAt: "2024-01-15T10:45:00.000Z"
          }
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: true
          },
          {
            name: 'message',
            type: 'string',
            description: '操作结果消息',
            example: '默认平台设置成功'
          },
          {
            name: 'data',
            type: 'Platform',
            description: '平台对象',
            example: "Platform对象"
          }
        ]
      },
      {
        status: 400,
        description: '请求参数无效',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid action or missing parameters'
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
    example: `curl -X PUT http://localhost:3067/api/external/writing-assistant/content-platforms \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "action": "setDefault",
    "id": "platform_123"
  }'`
  },

  {
    id: 'delete-content-platform',
    method: 'DELETE',
    path: '/api/external/writing-assistant/content-platforms/[id]',
    title: '删除内容平台',
    description: '删除指定ID的内容平台（不能删除默认平台）',
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '平台ID',
        example: 'platform_456'
      }
    ],
    responses: [
      {
        status: 200,
        description: '删除成功',
        example: {
          success: true,
          message: '内容平台删除成功'
        }
      },
      {
        status: 403,
        description: '不能删除默认平台',
        example: {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '不能删除默认平台'
          }
        }
      },
      {
        status: 404,
        description: '平台不存在',
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '内容平台不存在'
          }
        }
      }
    ],
    example: `curl -X DELETE http://localhost:3067/api/external/writing-assistant/content-platforms/platform_456 \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  // 文章类型管理 API
  {
    id: 'get-article-types',
    method: 'GET',
    path: '/api/external/writing-assistant/article-types',
    title: '获取所有文章类型',
    description: '获取写作辅助模块的所有文章类型列表',
    responses: [
      {
        status: 200,
        description: '获取成功',
        example: {
          success: true,
          data: [
            {
              id: "type_123",
              name: "技术教程",
              typeId: "tutorial",
              description: "技术相关的教程文章",
              isDefault: true,
              createdAt: "2024-01-15T10:30:00.000Z",
              updatedAt: "2024-01-15T10:30:00.000Z"
            }
          ]
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: true
          },
          {
            name: 'data',
            type: 'Array<ArticleType>',
            description: '文章类型列表数组',
            example: ["Array<ArticleType>"]
          },
          {
            name: 'data[].id',
            type: 'string',
            description: '类型唯一标识符',
            example: 'type_123'
          },
          {
            name: 'data[].name',
            type: 'string',
            description: '类型名称',
            example: '技术教程'
          },
          {
            name: 'data[].typeId',
            type: 'string',
            description: '类型代码标识',
            example: 'tutorial'
          },
          {
            name: 'data[].description',
            type: 'string',
            description: '类型描述',
            example: '技术相关的教程文章'
          },
          {
            name: 'data[].isDefault',
            type: 'boolean',
            description: '是否为默认类型',
            example: true
          },
          {
            name: 'data[].createdAt',
            type: 'string',
            description: '创建时间 (ISO 8601)',
            example: '2024-01-15T10:30:00.000Z'
          },
          {
            name: 'data[].updatedAt',
            type: 'string',
            description: '更新时间 (ISO 8601)',
            example: '2024-01-15T10:30:00.000Z'
          }
        ]
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
    example: `curl -X GET http://localhost:3067/api/external/writing-assistant/article-types \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  {
    id: 'create-article-type',
    method: 'POST',
    path: '/api/external/writing-assistant/article-types',
    title: '创建文章类型',
    description: '创建新的文章类型',
    params: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: '类型名称',
        example: '产品介绍'
      },
      {
        name: 'typeId',
        type: 'string',
        required: true,
        description: '类型英文ID，只能包含字母、数字、下划线和短横线',
        example: 'product_intro'
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: '类型描述',
        example: '产品介绍相关的文章类型'
      },
      {
        name: 'isDefault',
        type: 'boolean',
        required: false,
        description: '是否为默认类型',
        example: false
      }
    ],
    responses: [
      {
        status: 200,
        description: '创建成功',
        example: {
          success: true,
          message: '文章类型创建成功',
          data: {
            id: "type_456",
            name: "产品介绍",
            typeId: "product_intro",
            description: "产品介绍相关的文章类型",
            isDefault: false,
            createdAt: "2024-01-15T10:35:00.000Z",
            updatedAt: "2024-01-15T10:35:00.000Z"
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/writing-assistant/article-types \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "name": "产品介绍",
    "typeId": "product_intro",
    "description": "产品介绍相关的文章类型"
  }'`
  },

  {
    id: 'batch-article-type-operations',
    method: 'PUT',
    path: '/api/external/writing-assistant/article-types',
    title: '批量操作文章类型',
    description: '执行批量操作：设置默认类型或初始化默认类型',
    params: [
      {
        name: 'action',
        type: 'string',
        required: true,
        description: '操作类型：setDefault（设置默认类型）或 initDefaults（初始化默认类型）',
        example: 'setDefault'
      },
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '类型ID（当action为setDefault时必需）',
        example: 'type_123'
      }
    ],
    responses: [
      {
        status: 200,
        description: '操作成功',
        example: {
          success: true,
          message: '默认类型设置成功',
          data: {
            id: "type_123",
            name: "技术教程",
            typeId: "tutorial",
            description: "技术相关的教程文章",
            isDefault: true,
            createdAt: "2024-01-15T10:30:00.000Z",
            updatedAt: "2024-01-15T10:45:00.000Z"
          }
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: true
          },
          {
            name: 'message',
            type: 'string',
            description: '操作结果消息',
            example: '默认类型设置成功'
          },
          {
            name: 'data',
            type: 'ArticleType',
            description: '文章类型对象',
            example: "ArticleType对象"
          }
        ]
      },
      {
        status: 400,
        description: '请求参数无效',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid action or missing parameters'
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
    example: `curl -X PUT http://localhost:3067/api/external/writing-assistant/article-types \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "action": "setDefault",
    "id": "type_123"
  }'`
  },

  // 采集文章管理 API
  {
    id: 'get-collected-articles',
    method: 'GET',
    path: '/api/external/writing-assistant/collected-articles',
    title: '获取采集文章列表',
    description: '获取采集文章列表，支持筛选和分页',
    queryParams: [
      {
        name: 'page',
        type: 'number',
        required: false,
        description: '页码，默认1',
        example: 1
      },
      {
        name: 'pageSize',
        type: 'number',
        required: false,
        description: '每页数量，默认20，最大100',
        example: 20
      },
      {
        name: 'platformIds',
        type: 'string',
        required: false,
        description: '平台ID列表，逗号分隔',
        example: 'platform_123,platform_456'
      },
      {
        name: 'articleTypeIds',
        type: 'string',
        required: false,
        description: '文章类型ID列表，逗号分隔',
        example: 'type_123,type_456'
      },
      {
        name: 'startDate',
        type: 'string',
        required: false,
        description: '开始日期（YYYY-MM-DD）',
        example: '2024-01-01'
      },
      {
        name: 'endDate',
        type: 'string',
        required: false,
        description: '结束日期（YYYY-MM-DD）',
        example: '2024-01-31'
      },
      {
        name: 'author',
        type: 'string',
        required: false,
        description: '作者关键词搜索',
        example: '张三'
      },
      {
        name: 'title',
        type: 'string',
        required: false,
        description: '标题关键词搜索',
        example: '技术'
      }
    ],
    responses: [
      {
        status: 200,
        description: '获取成功',
        example: {
          success: true,
          data: {
            articles: [
              {
                id: "article_123",
                title: "React性能优化技巧",
                author: "张三",
                collectedAt: "2024-01-15T10:30:00.000Z",
                platforms: [
                  {
                    id: "rel_123",
                    platform: {
                      id: "platform_123",
                      name: "微信公众号",
                      platformId: "wechat"
                    }
                  }
                ],
                articleTypes: [
                  {
                    id: "rel_456",
                    articleType: {
                      id: "type_123",
                      name: "技术教程",
                      typeId: "tutorial"
                    }
                  }
                ]
              }
            ],
            pagination: {
              page: 1,
              pageSize: 20,
              total: 1,
              totalPages: 1
            }
          }
        }
      }
    ],
    example: `curl -X GET "http://localhost:3067/api/external/writing-assistant/collected-articles?page=1&pageSize=20&author=张三" \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  {
    id: 'create-collected-article',
    method: 'POST',
    path: '/api/external/writing-assistant/collected-articles',
    title: '创建采集文章',
    description: '创建新的采集文章记录',
    params: [
      {
        name: 'title',
        type: 'string',
        required: true,
        description: '文章标题',
        example: 'Vue3 组件开发最佳实践'
      },
      {
        name: 'author',
        type: 'string',
        required: true,
        description: '文章作者',
        example: '李四'
      },
      {
        name: 'content',
        type: 'string',
        required: false,
        description: '文章内容',
        example: '这是一篇关于Vue3组件开发的详细教程...'
      },
      {
        name: 'platformIds',
        type: 'array',
        required: true,
        description: '关联的平台ID数组',
        example: ['platform_123', 'platform_456']
      },
      {
        name: 'articleTypeIds',
        type: 'array',
        required: true,
        description: '关联的文章类型ID数组',
        example: ['type_123', 'type_456']
      }
    ],
    responses: [
      {
        status: 200,
        description: '创建成功',
        example: {
          success: true,
          message: '采集文章创建成功',
          data: {
            id: "article_789",
            title: "Vue3 组件开发最佳实践",
            author: "李四",
            content: "这是一篇关于Vue3组件开发的详细教程...",
            collectedAt: "2024-01-15T10:35:00.000Z",
            platforms: [
              {
                id: "rel_789",
                platform: {
                  id: "platform_123",
                  name: "微信公众号",
                  platformId: "wechat"
                }
              }
            ],
            articleTypes: [
              {
                id: "rel_890",
                articleType: {
                  id: "type_123",
                  name: "技术教程",
                  typeId: "tutorial"
                }
              }
            ]
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
            message: 'Missing or invalid title'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/writing-assistant/collected-articles \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "title": "Vue3 组件开发最佳实践",
    "author": "李四",
    "content": "这是一篇关于Vue3组件开发的详细教程...",
    "platformIds": ["platform_123"],
    "articleTypeIds": ["type_123"]
  }'`
  },

  {
    id: 'update-collected-article',
    method: 'PUT',
    path: '/api/external/writing-assistant/collected-articles/[id]',
    title: '更新采集文章',
    description: '更新指定ID的采集文章信息',
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '文章ID',
        example: 'article_789'
      }
    ],
    params: [
      {
        name: 'title',
        type: 'string',
        required: false,
        description: '文章标题',
        example: 'Vue3 组件开发最佳实践（更新版）'
      },
      {
        name: 'author',
        type: 'string',
        required: false,
        description: '文章作者',
        example: '李四'
      },
      {
        name: 'content',
        type: 'string',
        required: false,
        description: '文章内容',
        example: '更新后的文章内容...'
      },
      {
        name: 'platformIds',
        type: 'array',
        required: false,
        description: '关联的平台ID数组',
        example: ['platform_123', 'platform_456']
      },
      {
        name: 'articleTypeIds',
        type: 'array',
        required: false,
        description: '关联的文章类型ID数组',
        example: ['type_123']
      }
    ],
    responses: [
      {
        status: 200,
        description: '更新成功',
        example: {
          success: true,
          message: '采集文章更新成功',
          data: {
            id: "article_789",
            title: "Vue3 组件开发最佳实践（更新版）",
            author: "李四",
            content: "更新后的文章内容...",
            collectedAt: "2024-01-15T10:35:00.000Z",
            updatedAt: "2024-01-15T10:40:00.000Z"
          }
        }
      }
    ],
    example: `curl -X PUT http://localhost:3067/api/external/writing-assistant/collected-articles/article_789 \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "title": "Vue3 组件开发最佳实践（更新版）",
    "content": "更新后的文章内容..."
  }'`
  },

  {
    id: 'delete-collected-article',
    method: 'DELETE',
    path: '/api/external/writing-assistant/collected-articles/[id]',
    title: '删除采集文章',
    description: '删除指定ID的采集文章',
    pathParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: '文章ID',
        example: 'article_789'
      }
    ],
    responses: [
      {
        status: 200,
        description: '删除成功',
        example: {
          success: true,
          message: '采集文章删除成功'
        }
      },
      {
        status: 404,
        description: '文章不存在',
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '采集文章不存在'
          }
        }
      }
    ],
    example: `curl -X DELETE http://localhost:3067/api/external/writing-assistant/collected-articles/article_789 \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  // 统计数据 API
  {
    id: 'get-writing-assistant-stats',
    method: 'GET',
    path: '/api/external/writing-assistant/stats',
    title: '获取写作辅助统计数据',
    description: '获取写作辅助模块的统计信息',
    responses: [
      {
        status: 200,
        description: '获取成功',
        example: {
          success: true,
          data: {
            overview: {
              totalArticles: 156,
              totalPlatforms: 5,
              totalTypes: 8,
              recentArticles: 23
            },
            platforms: [
              {
                id: "platform_123",
                name: "微信公众号",
                platformId: "wechat",
                isDefault: true,
                articleCount: 89
              }
            ],
            types: [
              {
                id: "type_123",
                name: "技术教程",
                typeId: "tutorial",
                isDefault: true,
                articleCount: 67
              }
            ],
            summary: {
              averageArticlesPerPlatform: 31.2,
              averageArticlesPerType: 19.5,
              weeklyGrowthRate: 14.74
            }
          }
        }
      }
    ],
    example: `curl -X GET http://localhost:3067/api/external/writing-assistant/stats \\
  -H "x-api-key: unicatcher-api-key-demo"`
  },

  // URL转文本 API
  {
    id: 'writing-assistant-url2text',
    method: 'POST',
    path: '/api/external/writing-assistant/url2text',
    title: 'URL转文本',
    description: '将网页URL转换为结构化文本内容（标题、作者、正文）',
    params: [
      {
        name: 'url',
        type: 'string',
        required: true,
        description: '要转换的网页URL地址'
      },
      {
        name: 'authToken',
        type: 'string',
        required: true,
        description: '用于调用外部转换服务的认证Token'
      }
    ],
    responses: [
      {
        status: 200,
        description: '转换成功',
        example: {
          success: true,
          message: 'URL转文本成功',
          data: {
            title: '稳定币挤兑与套利中心化',
            author: '人大金融科技研究所',
            content: '稳定币是一种加密资产，旨在与美元挂钩，但由流动性并不完美的美元资产支持。……经营模式、发展影响与监管框架全球稳定币发展趋势与政策演变'
          }
        }
      },
      {
        status: 400,
        description: '请求参数错误',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '缺少或无效的URL参数'
          }
        }
      },
      {
        status: 401,
        description: '认证失败',
        example: {
          success: false,
          error: {
            code: 'WEBHOOK_UNAUTHORIZED',
            message: '外部服务认证失败，请检查authToken是否正确'
          }
        }
      },
      {
        status: 404,
        description: 'URL无法访问',
        example: {
          success: false,
          error: {
            code: 'URL_NOT_FOUND',
            message: '无法访问指定URL，请检查URL是否有效'
          }
        }
      },
      {
        status: 408,
        description: '请求超时',
        example: {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: '请求超时，请稍后重试'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/writing-assistant/url2text \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "url": "https://example.com/article-about-javascript",
    "authToken": "your-webhook-auth-token"
  }'`
  }
];
