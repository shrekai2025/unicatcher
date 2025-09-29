import type { ApiEndpoint } from '../../types';

export const twitterDataEndpoints: ApiEndpoint[] = [
  // 数据管理接口
  {
    id: 'data-extract',
    method: 'POST',
    path: '/api/external/data/extract',
    title: '批量数据提取',
    description: '批量提取推文数据，支持按条件筛选和状态管理',
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: '批次标识符，用于追踪提取记录',
        example: 'batch_001'
      },
      {
        name: 'maxCount',
        type: 'number',
        required: true,
        description: '最大提取数量',
        options: ['1-10000'],
        example: 1000
      },
      {
        name: 'listId',
        type: 'string',
        required: false,
        description: '按单个 List ID 筛选（兼容旧版）',
        example: '1948042550071496895'
      },
      {
        name: 'listIds',
        type: 'array<string>',
        required: false,
        description: '按多个 List IDs 筛选（推荐）',
        example: ['1948042550071496895', '1952162308337324098']
      },
      {
        name: 'username',
        type: 'string',
        required: false,
        description: '按用户名筛选',
        example: 'elonmusk'
      },
      {
        name: 'isExtracted',
        type: 'boolean',
        required: false,
        description: '提取状态筛选，默认false',
        example: false
      },
      {
        name: 'isRT',
        type: 'boolean',
        required: false,
        description: '是否仅筛选转推',
        example: false
      },
      {
        name: 'isReply',
        type: 'boolean',
        required: false,
        description: '是否仅筛选回复',
        example: false
      },
      {
        name: 'dryRun',
        type: 'boolean',
        required: false,
        description: '预览模式，不标记为已输出，默认false',
        example: false
      },
      {
        name: 'requireFullAmount',
        type: 'boolean',
        required: false,
        description: '是否要求足额返回，默认false',
        example: false
      }
    ],
    responses: [
      {
        status: 200,
        description: '提取成功',
        example: {
          success: true,
          message: "Data extracted successfully",
          data: {
            batchId: "batch_001",
            extractedCount: 150,
            tweets: ["Array<Tweet>"],
            extractedAt: "2024-01-15T10:30:00Z",
            isDryRun: false
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
            example: 'Data extracted successfully'
          },
          {
            name: 'data.batchId',
            type: 'string',
            description: '批次标识符',
            example: 'batch_001'
          },
          {
            name: 'data.extractedCount',
            type: 'number',
            description: '实际提取的推文数量',
            example: 150
          },
          {
            name: 'data.tweets',
            type: 'Array<Tweet>',
            description: '提取的推文数据数组',
            example: ["Array<Tweet>"]
          },
          {
            name: 'data.extractedAt',
            type: 'string',
            description: '提取时间（ISO 8601格式）',
            example: '2024-01-15T10:30:00Z'
          },
          {
            name: 'data.isDryRun',
            type: 'boolean',
            description: '是否为预览模式',
            example: false
          }
        ]
      },
      {
        status: 409,
        description: '数据不足（使用requireFullAmount时）',
        example: {
          error: "可用数据不足，无法满足足额返回要求",
          statusCode: "INSUFFICIENT_DATA",
          data: {
            requiredCount: 1000,
            availableCount: 654,
            shortage: 346
          }
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '可用数据不足，无法满足足额返回要求'
          },
          {
            name: 'statusCode',
            type: 'string',
            description: '错误代码',
            example: 'INSUFFICIENT_DATA'
          },
          {
            name: 'data.requiredCount',
            type: 'number',
            description: '要求的数量',
            example: 1000
          },
          {
            name: 'data.availableCount',
            type: 'number',
            description: '可用的数量',
            example: 654
          },
          {
            name: 'data.shortage',
            type: 'number',
            description: '缺少的数量',
            example: 346
          }
        ]
      }
    ],
    example: `curl -X POST http://43.153.84.145:3067/api/external/data/extract \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "batchId": "batch_001",
    "maxCount": 500,
    "listId": "1948042550071496895",
    "isExtracted": false
  }'`
  },

  {
    id: 'get-data',
    method: 'GET',
    path: '/api/external/data/[taskId]',
    title: '获取任务数据',
    description: '获取任务爬取的推文数据，支持 JSON 和 CSV 格式',
    pathParams: [
      {
        name: 'taskId',
        type: 'string',
        required: true,
        description: '任务唯一标识符',
        example: 'cmdih9v9d0000j7hoz84g1hir'
      }
    ],
    queryParams: [
      {
        name: 'page',
        type: 'number',
        required: false,
        description: '页码，从1开始，默认1',
        example: 1
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '每页数量，最大100，默认20',
        options: ['1-100'],
        example: 20
      },
      {
        name: 'format',
        type: 'string',
        required: false,
        description: '返回格式，默认json',
        options: ['json', 'csv'],
        example: 'json'
      }
    ],
    responses: [
      {
        status: 200,
        description: '获取成功 (JSON格式)',
        example: {
          success: true,
          data: {
            tweets: ["Array<Tweet>"],
            total: 45,
            page: 1,
            limit: 20,
            hasMore: true
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
            name: 'data.tweets',
            type: 'Array<Tweet>',
            description: '推文数据数组',
            example: ["Array<Tweet>"]
          },
          {
            name: 'data.total',
            type: 'number',
            description: '总推文数量',
            example: 45
          },
          {
            name: 'data.page',
            type: 'number',
            description: '当前页码',
            example: 1
          },
          {
            name: 'data.limit',
            type: 'number',
            description: '每页数量',
            example: 20
          },
          {
            name: 'data.hasMore',
            type: 'boolean',
            description: '是否还有更多数据',
            example: true
          }
        ]
      },
      {
        status: 404,
        description: '任务不存在',
        example: {
          error: "Task not found"
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: 'Task not found'
          }
        ]
      }
    ],
    example: `curl -H "X-API-Key: unicatcher-api-key-demo" \\
     "http://43.153.84.145:3067/api/external/data/cmdih9v9d0000j7hoz84g1hir?page=1&limit=50&format=json"`
  },

];
