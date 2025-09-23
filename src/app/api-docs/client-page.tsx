'use client';

import { useState, useEffect } from 'react';

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  params?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    options?: string[];
    example?: any;
  }[];
  pathParams?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }[];
  queryParams?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    options?: string[];
    example?: any;
  }[];
  responses: {
    status: number;
    description: string;
    example: any;
    fields?: {
      name: string;
      type: string;
      description: string;
      example?: any;
    }[];
  }[];
  example: string;
}

const apiEndpoints: ApiEndpoint[] = [
  // 任务管理接口
  {
    id: 'create-task',
    method: 'POST',
    path: '/api/external/tasks',
    title: '创建爬取任务',
    description: '创建新的 Twitter List 爬取任务',
    params: [
      {
        name: 'listId',
        type: 'string',
        required: true,
        description: 'Twitter List ID，必须为纯数字字符串',
        example: '1948042550071496895'
      },
      {
        name: 'maxTweets',
        type: 'number',
        required: false,
        description: '最大爬取推文数量，默认20',
        options: ['1-100'],
        example: 30
      }
    ],
    responses: [
      {
        status: 201,
        description: '任务创建成功',
        example: {
          success: true,
          message: "Task created successfully",
          data: {
            taskId: "cmdih9v9d0000j7hoz84g1hir",
            listId: "1948042550071496895",
            maxTweets: 20,
            status: "created"
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
            example: 'Task created successfully'
          },
          {
            name: 'data.taskId',
            type: 'string',
            description: '任务唯一标识符',
            example: 'cmdih9v9d0000j7hoz84g1hir'
          },
          {
            name: 'data.listId',
            type: 'string',
            description: '目标List ID',
            example: '1948042550071496895'
          },
          {
            name: 'data.maxTweets',
            type: 'number',
            description: '最大爬取推文数量',
            example: 20
          },
          {
            name: 'data.status',
            type: 'string',
            description: '任务状态',
            example: 'created'
          }
        ]
      },
      {
        status: 409,
        description: '相同List ID的任务正在运行',
        example: {
          error: "Conflict: Task for this List ID is already running"
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: 'Conflict: Task for this List ID is already running'
          }
        ]
      }
    ],
    example: `curl -X POST http://43.153.84.145:3067/api/external/tasks \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{"listId": "1948042550071496895", "maxTweets": 30}'`
  },

  {
    id: 'get-tasks',
    method: 'GET',
    path: '/api/external/tasks',
    title: '获取任务列表',
    description: '获取任务列表，支持分页和状态筛选',
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
        options: ['1-100'],
        example: 10
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: '任务状态筛选',
        options: ['running', 'completed', 'failed'],
        example: 'completed'
      }
    ],
    responses: [
      {
        status: 200,
        description: '获取成功',
        example: {
          success: true,
          data: {
            tasks: ["Array<Task>"],
            total: 25,
            page: 1,
            limit: 10,
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
            name: 'data.tasks',
            type: 'Array<Task>',
            description: '任务列表数组',
            example: ["Array<Task>"]
          },
          {
            name: 'data.total',
            type: 'number',
            description: '总任务数量',
            example: 25
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
            example: 10
          },
          {
            name: 'data.hasMore',
            type: 'boolean',
            description: '是否还有更多数据',
            example: true
          }
        ]
      }
    ],
    example: `curl -H "X-API-Key: unicatcher-api-key-demo" \\
     "http://43.153.84.145:3067/api/external/tasks?page=1&limit=20&status=completed"`
  },

  {
    id: 'get-task-detail',
    method: 'GET',
    path: '/api/external/tasks/[taskId]',
    title: '获取任务详情',
    description: '根据 ID 获取任务详细信息',
    pathParams: [
      {
        name: 'taskId',
        type: 'string',
        required: true,
        description: '任务唯一标识符',
        example: 'cmdih9v9d0000j7hoz84g1hir'
      }
    ],
    responses: [
      {
        status: 200,
        description: '获取成功',
        example: {
          success: true,
          data: {
            id: "cmdih9v9d0000j7hoz84g1hir",
            listId: "1948042550071496895",
            status: "completed",
            tweetCount: 45,
            createdAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:05:00Z"
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
            name: 'data.id',
            type: 'string',
            description: '任务唯一标识符',
            example: 'cmdih9v9d0000j7hoz84g1hir'
          },
          {
            name: 'data.listId',
            type: 'string',
            description: '目标List ID',
            example: '1948042550071496895'
          },
          {
            name: 'data.status',
            type: 'string',
            description: '任务状态',
            example: 'completed'
          },
          {
            name: 'data.tweetCount',
            type: 'number',
            description: '爬取到的推文数量',
            example: 45
          },
          {
            name: 'data.createdAt',
            type: 'string',
            description: '任务创建时间（ISO 8601格式）',
            example: '2024-01-01T10:00:00Z'
          },
          {
            name: 'data.completedAt',
            type: 'string',
            description: '任务完成时间（ISO 8601格式）',
            example: '2024-01-01T10:05:00Z'
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
     http://43.153.84.145:3067/api/external/tasks/cmdih9v9d0000j7hoz84g1hir`
  },

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

  // AI批处理接口
  {
    id: 'ai-batch-start',
    method: 'POST',
    path: '/api/external/ai-batch/start',
    title: '启动AI批处理',
    description: '启动AI批处理任务（单批次模式，全局唯一）',
    params: [
      {
        name: 'listIds',
        type: 'array<string>',
        required: false,
        description: '筛选特定List的推文，支持多个List ID',
        example: ['1948042550071496895', '1952162308337324098']
      },
      {
        name: 'usernames',
        type: 'array<string>',
        required: false,
        description: '筛选特定用户的推文',
        example: ['elonmusk', 'sundarpichai']
      },
      {
        name: 'publishedAfter',
        type: 'string',
        required: false,
        description: '筛选发布时间在此之后的推文（ISO 8601格式）',
        example: '2024-01-01T00:00:00Z'
      },
      {
        name: 'isExtracted',
        type: 'string',
        required: false,
        description: '按提取状态筛选推文',
        options: ['all', 'true', 'false'],
        example: 'all'
      },
      {
        name: 'batchSize',
        type: 'number',
        required: false,
        description: '每批处理的推文数量，默认10',
        options: ['1-100'],
        example: 20
      },
      {
        name: 'batchProcessingMode',
        type: 'string',
        required: false,
        description: '批处理模式，默认optimized',
        options: ['optimized', 'traditional'],
        example: 'optimized'
      },
      {
        name: 'systemPrompt',
        type: 'string',
        required: false,
        description: '自定义系统提示词',
        example: '你是专业的推文分析师'
      },
      {
        name: 'aiConfig.apiKey',
        type: 'string',
        required: true,
        description: 'OpenAI API Key',
        example: 'sk-your-openai-api-key'
      },
      {
        name: 'aiConfig.provider',
        type: 'string',
        required: false,
        description: 'AI提供商，支持OpenAI、OpenAI-Badger、智谱AI，默认openai',
        options: ['openai', 'openai-badger', 'zhipu'],
        example: 'openai'
      },
      {
        name: 'aiConfig.model',
        type: 'string',
        required: false,
        description: 'AI模型名称，支持gpt-4o、glm-4.5-flash等，默认gpt-4o',
        example: 'gpt-4o'
      },
      {
        name: 'aiConfig.baseURL',
        type: 'string',
        required: false,
        description: '自定义API基础URL',
        example: 'https://api.openai.com/v1'
      }
    ],
    responses: [
      {
        status: 201,
        description: '任务启动成功',
        example: {
          success: true,
          message: "AI批处理任务启动成功",
          data: {
            batchId: "batch_1703123456789_abc123",
            status: "processing",
            totalTweets: 150,
            batchSize: 20,
            estimatedBatches: 8,
            mode: "optimized",
            startedAt: "2024-01-01T10:00:00Z"
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
            example: 'AI批处理任务启动成功'
          },
          {
            name: 'data.batchId',
            type: 'string',
            description: '批次唯一标识符',
            example: 'batch_1703123456789_abc123'
          },
          {
            name: 'data.status',
            type: 'string',
            description: '处理状态',
            example: 'processing'
          },
          {
            name: 'data.totalTweets',
            type: 'number',
            description: '符合条件的总推文数',
            example: 150
          },
          {
            name: 'data.batchSize',
            type: 'number',
            description: '每批处理数量',
            example: 20
          },
          {
            name: 'data.estimatedBatches',
            type: 'number',
            description: '预估需要的批次数',
            example: 8
          },
          {
            name: 'data.mode',
            type: 'string',
            description: '处理模式',
            example: 'optimized'
          },
          {
            name: 'data.startedAt',
            type: 'string',
            description: '开始处理时间（ISO 8601格式）',
            example: '2024-01-01T10:00:00Z'
          }
        ]
      },
      {
        status: 409,
        description: '任务正在运行中',
        example: {
          success: false,
          error: "AI批处理任务正在运行中",
          data: {
            status: "processing",
            currentBatchId: "batch_1703123456789_xyz456"
          }
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: false
          },
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: 'AI批处理任务正在运行中'
          },
          {
            name: 'data.status',
            type: 'string',
            description: '当前状态',
            example: 'processing'
          },
          {
            name: 'data.currentBatchId',
            type: 'string',
            description: '当前运行的批次ID',
            example: 'batch_1703123456789_xyz456'
          }
        ]
      }
    ],
    example: `# OpenAI 示例
curl -X POST http://43.153.84.145:3067/api/external/ai-batch/start \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "listIds": ["1948042550071496895"],
    "usernames": ["elonmusk"],
    "publishedAfter": "2024-01-01T00:00:00Z",
    "isExtracted": "all",
    "batchSize": 20,
    "batchProcessingMode": "optimized",
    "systemPrompt": "你是专业的推文分析师",
    "aiConfig": {
      "apiKey": "sk-your-openai-api-key",
      "provider": "openai",
      "model": "gpt-4o",
      "baseURL": "https://api.openai.com/v1"
    }
  }'

# 智谱AI 示例
curl -X POST http://43.153.84.145:3067/api/external/ai-batch/start \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "listIds": ["1948042550071496895"],
    "batchSize": 10,
    "batchProcessingMode": "optimized",
    "aiConfig": {
      "apiKey": "your-zhipu-api-key.xxxxxx",
      "provider": "zhipu",
      "model": "glm-4.5-flash"
    }
  }'`
  },

  {
    id: 'ai-batch-status',
    method: 'GET',
    path: '/api/external/ai-batch/status/[batchId]',
    title: '查询AI处理状态',
    description: '查询指定批次的AI处理状态和进度',
    pathParams: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: '批次ID，由启动接口返回',
        example: 'batch_1703123456789_abc123'
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          data: {
            batchId: "batch_1703123456789_abc123",
            status: "completed",
            progress: {
              total: 20,
              processed: 20,
              succeeded: 18,
              failed: 2,
              percentage: 100
            },
            error: null,
            isActive: false,
            message: "处理完成"
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
            name: 'data.batchId',
            type: 'string',
            description: '批次ID',
            example: 'batch_1703123456789_abc123'
          },
          {
            name: 'data.status',
            type: 'string',
            description: '处理状态：processing, completed, failed, cancelled',
            example: 'completed'
          },
          {
            name: 'data.progress.total',
            type: 'number',
            description: '本批次总推文数',
            example: 20
          },
          {
            name: 'data.progress.processed',
            type: 'number',
            description: '已处理推文数',
            example: 20
          },
          {
            name: 'data.progress.succeeded',
            type: 'number',
            description: '成功处理推文数',
            example: 18
          },
          {
            name: 'data.progress.failed',
            type: 'number',
            description: '失败处理推文数',
            example: 2
          },
          {
            name: 'data.progress.percentage',
            type: 'number',
            description: '处理完成百分比',
            example: 100
          },
          {
            name: 'data.error',
            type: 'string | null',
            description: '错误信息（如有）',
            example: null
          },
          {
            name: 'data.isActive',
            type: 'boolean',
            description: '是否正在处理中',
            example: false
          },
          {
            name: 'data.message',
            type: 'string',
            description: '状态描述信息',
            example: '处理完成'
          }
        ]
      },
      {
        status: 404,
        description: '批次不存在',
        example: {
          success: false,
          error: "批次 batch_xxx 不存在"
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: false
          },
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '批次 batch_xxx 不存在'
          }
        ]
      }
    ],
    example: `curl -H "X-API-Key: unicatcher-api-key-demo" \\
     http://43.153.84.145:3067/api/external/ai-batch/status/batch_1703123456789_abc123`
  },

  {
    id: 'ai-batch-continue',
    method: 'POST',
    path: '/api/external/ai-batch/continue',
    title: '继续AI批处理',
    description: '继续处理下一批次（参数与start接口相同）',
    params: [
      {
        name: 'previousBatchId',
        type: 'string',
        required: false,
        description: '上一个批次ID，用于追踪处理链',
        example: 'batch_1703123456789_abc123'
      },
      {
        name: 'listIds',
        type: 'array<string>',
        required: false,
        description: '筛选特定List的推文，支持多个List ID',
        example: ['1948042550071496895']
      },
      {
        name: 'usernames',
        type: 'array<string>',
        required: false,
        description: '筛选特定用户的推文',
        example: ['elonmusk']
      },
      {
        name: 'publishedAfter',
        type: 'string',
        required: false,
        description: '筛选发布时间在此之后的推文（ISO 8601格式）',
        example: '2024-01-01T00:00:00Z'
      },
      {
        name: 'isExtracted',
        type: 'string',
        required: false,
        description: '按提取状态筛选推文',
        options: ['all', 'true', 'false'],
        example: 'all'
      },
      {
        name: 'batchSize',
        type: 'number',
        required: false,
        description: '每批处理的推文数量，默认10',
        options: ['1-100'],
        example: 20
      },
      {
        name: 'batchProcessingMode',
        type: 'string',
        required: false,
        description: '批处理模式，默认optimized',
        options: ['optimized', 'traditional'],
        example: 'optimized'
      },
      {
        name: 'systemPrompt',
        type: 'string',
        required: false,
        description: '自定义系统提示词',
        example: '你是专业的推文分析师'
      },
      {
        name: 'aiConfig.apiKey',
        type: 'string',
        required: true,
        description: 'OpenAI API Key',
        example: 'sk-your-openai-api-key'
      },
      {
        name: 'aiConfig.provider',
        type: 'string',
        required: false,
        description: 'AI提供商，支持OpenAI、OpenAI-Badger、智谱AI，默认openai',
        options: ['openai', 'openai-badger', 'zhipu'],
        example: 'openai'
      },
      {
        name: 'aiConfig.model',
        type: 'string',
        required: false,
        description: 'AI模型名称，支持gpt-4o、glm-4.5-flash等，默认gpt-4o',
        example: 'gpt-4o'
      },
      {
        name: 'aiConfig.baseURL',
        type: 'string',
        required: false,
        description: '自定义API基础URL',
        example: 'https://api.openai.com/v1'
      }
    ],
    responses: [
      {
        status: 201,
        description: '继续处理任务启动成功',
        example: {
          success: true,
          message: "继续处理任务启动成功",
          data: {
            batchId: "batch_1703123456789_def456",
            previousBatchId: "batch_1703123456789_abc123",
            status: "processing",
            remainingTweets: 130,
            batchSize: 20,
            estimatedBatches: 7
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
            example: '继续处理任务启动成功'
          },
          {
            name: 'data.batchId',
            type: 'string',
            description: '新批次ID',
            example: 'batch_1703123456789_def456'
          },
          {
            name: 'data.previousBatchId',
            type: 'string',
            description: '上一个批次ID',
            example: 'batch_1703123456789_abc123'
          },
          {
            name: 'data.status',
            type: 'string',
            description: '处理状态',
            example: 'processing'
          },
          {
            name: 'data.remainingTweets',
            type: 'number',
            description: '剩余待处理推文数',
            example: 130
          },
          {
            name: 'data.batchSize',
            type: 'number',
            description: '每批处理数量',
            example: 20
          },
          {
            name: 'data.estimatedBatches',
            type: 'number',
            description: '预估剩余批次数',
            example: 7
          }
        ]
      },
      {
        status: 404,
        description: '没有更多数据需要处理',
        example: {
          success: false,
          error: "没有更多符合条件的推文需要处理",
          data: {
            remainingTweets: 0
          }
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: false
          },
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '没有更多符合条件的推文需要处理'
          },
          {
            name: 'data.remainingTweets',
            type: 'number',
            description: '剩余推文数（为0）',
            example: 0
          }
        ]
      }
    ],
    example: `# 继续OpenAI处理
curl -X POST http://43.153.84.145:3067/api/external/ai-batch/continue \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "previousBatchId": "batch_1703123456789_abc123",
    "listIds": ["1948042550071496895"],
    "batchSize": 20,
    "batchProcessingMode": "optimized",
    "aiConfig": {
      "apiKey": "sk-your-openai-api-key",
      "provider": "openai",
      "model": "gpt-4o"
    }
  }'

# 继续智谱AI处理
curl -X POST http://43.153.84.145:3067/api/external/ai-batch/continue \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "previousBatchId": "batch_1703123456789_abc123",
    "listIds": ["1948042550071496895"],
    "batchSize": 10,
    "aiConfig": {
      "apiKey": "your-zhipu-api-key.xxxxxx",
      "provider": "zhipu",
      "model": "glm-4.5-flash"
    }
  }'`
  },

  // 推文处理器接口
  {
    id: 'tweet-update',
    method: 'POST',
    path: '/api/tweet-processor/update',
    title: '更新推文数据',
    description: '🔄 异步更新单个推文的社交数据（评论数、转发数、点赞数、浏览量），支持防重复检查',
    params: [
      {
        name: 'tweetId',
        type: 'string',
        required: true,
        description: '推文ID，必须为纯数字字符串',
        example: '1969561815333159348'
      },
      {
        name: 'force',
        type: 'boolean',
        required: false,
        description: '是否强制更新（忽略10分钟防重复限制），默认false',
        example: false
      }
    ],
    responses: [
      {
        status: 202,
        description: '更新任务已提交（异步处理）',
        example: {
          success: true,
          message: "推文更新任务已提交",
          data: {
            taskId: "cmfw4cfn300003233jpx4ee3c",
            tweetId: "1969561815333159348",
            force: false,
            submittedAt: "2025-09-23T05:32:41.393Z"
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
            example: '推文更新任务已提交'
          },
          {
            name: 'data.taskId',
            type: 'string',
            description: '任务唯一标识符，用于查询任务状态',
            example: 'cmfw4cfn300003233jpx4ee3c'
          },
          {
            name: 'data.tweetId',
            type: 'string',
            description: '目标推文ID',
            example: '1969561815333159348'
          },
          {
            name: 'data.force',
            type: 'boolean',
            description: '是否为强制更新',
            example: false
          },
          {
            name: 'data.submittedAt',
            type: 'string',
            description: '任务提交时间（ISO 8601格式）',
            example: '2025-09-23T05:32:41.393Z'
          }
        ]
      },
      {
        status: 404,
        description: '推文不存在于数据库',
        example: {
          error: "推文 1234567890 不存在于数据库中",
          code: "TWEET_NOT_IN_DATABASE"
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '推文 1234567890 不存在于数据库中'
          },
          {
            name: 'code',
            type: 'string',
            description: '错误代码',
            example: 'TWEET_NOT_IN_DATABASE'
          }
        ]
      },
      {
        status: 409,
        description: '任务冲突或频率限制',
        example: {
          error: "推文 1234567890 的更新任务正在运行中",
          code: "TASK_ALREADY_RUNNING"
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '推文 1234567890 的更新任务正在运行中'
          },
          {
            name: 'code',
            type: 'string',
            description: '错误代码：TASK_ALREADY_RUNNING, RECENTLY_UPDATED',
            example: 'TASK_ALREADY_RUNNING'
          }
        ]
      },
      {
        status: 429,
        description: '并发限制或频率限制',
        example: {
          error: "并发任务数已达上限: 10",
          code: "MAX_CONCURRENT_REACHED"
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '并发任务数已达上限: 10'
          },
          {
            name: 'code',
            type: 'string',
            description: '错误代码',
            example: 'MAX_CONCURRENT_REACHED'
          }
        ]
      }
    ],
    example: `curl -X POST http://localhost:3067/api/tweet-processor/update \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-2024" \\
  -d '{"tweetId": "1969561815333159348", "force": false}'`
  },

  {
    id: 'tweet-status',
    method: 'GET',
    path: '/api/tweet-processor/status/[taskId]',
    title: '查询任务状态',
    description: '🔍 查询推文处理任务的执行状态和结果',
    pathParams: [
      {
        name: 'taskId',
        type: 'string',
        required: true,
        description: '任务唯一标识符，由更新接口返回',
        example: 'cmfw4cfn300003233jpx4ee3c'
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          message: "任务状态查询成功",
          data: {
            taskId: "cmfw4cfn300003233jpx4ee3c",
            tweetId: "1969561815333159348",
            taskType: "update_data",
            status: "completed",
            startedAt: "2025-09-23T05:32:41.393Z",
            completedAt: "2025-09-23T05:32:50.394Z",
            result: {
              success: true,
              message: "推文社交数据已更新",
              data: {
                tweetId: "1969561815333159348",
                oldData: {
                  replyCount: 5,
                  retweetCount: 1,
                  likeCount: 13,
                  viewCount: 681
                },
                newData: {
                  replyCount: 15,
                  retweetCount: 6,
                  likeCount: 114,
                  viewCount: 742
                },
                hasChanges: true,
                lastUpdatedAt: "2025.09.23 13:32:50"
              }
            }
          },
          timestamp: "2025-09-23T05:32:55.922Z"
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: true
          },
          {
            name: 'data.taskId',
            type: 'string',
            description: '任务ID',
            example: 'cmfw4cfn300003233jpx4ee3c'
          },
          {
            name: 'data.tweetId',
            type: 'string',
            description: '推文ID',
            example: '1969561815333159348'
          },
          {
            name: 'data.taskType',
            type: 'string',
            description: '任务类型：update_data, crawl_comments, generate_comments',
            example: 'update_data'
          },
          {
            name: 'data.status',
            type: 'string',
            description: '任务状态：queued, running, completed, failed',
            example: 'completed'
          },
          {
            name: 'data.result.data.oldData',
            type: 'object',
            description: '更新前的社交数据',
            example: { replyCount: 5, retweetCount: 1, likeCount: 13, viewCount: 681 }
          },
          {
            name: 'data.result.data.newData',
            type: 'object',
            description: '更新后的社交数据',
            example: { replyCount: 15, retweetCount: 6, likeCount: 114, viewCount: 742 }
          },
          {
            name: 'data.result.data.hasChanges',
            type: 'boolean',
            description: '数据是否发生变化',
            example: true
          },
          {
            name: 'data.result.data.lastUpdatedAt',
            type: 'string',
            description: '最后更新时间（中文格式）',
            example: '2025.09.23 13:32:50'
          }
        ]
      },
      {
        status: 404,
        description: '任务不存在',
        example: {
          error: "任务 invalid-task-id 不存在",
          code: "INVALID_REQUEST"
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '任务 invalid-task-id 不存在'
          },
          {
            name: 'code',
            type: 'string',
            description: '错误代码',
            example: 'INVALID_REQUEST'
          }
        ]
      }
    ],
    example: `curl -H "x-api-key: unicatcher-api-key-2024" \\
     http://localhost:3067/api/tweet-processor/status/cmfw4cfn300003233jpx4ee3c`
  },

  {
    id: 'tweet-cancel',
    method: 'DELETE',
    path: '/api/tweet-processor/status/[taskId]',
    title: '取消任务',
    description: '❌ 取消正在执行的推文处理任务',
    pathParams: [
      {
        name: 'taskId',
        type: 'string',
        required: true,
        description: '任务唯一标识符',
        example: 'cmfw4cfn300003233jpx4ee3c'
      }
    ],
    responses: [
      {
        status: 200,
        description: '取消成功',
        example: {
          success: true,
          message: "任务已取消",
          data: {
            taskId: "cmfw4cfn300003233jpx4ee3c",
            cancelledAt: "2025-09-23T05:35:00.000Z"
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
            example: '任务已取消'
          },
          {
            name: 'data.taskId',
            type: 'string',
            description: '被取消的任务ID',
            example: 'cmfw4cfn300003233jpx4ee3c'
          },
          {
            name: 'data.cancelledAt',
            type: 'string',
            description: '取消时间（ISO 8601格式）',
            example: '2025-09-23T05:35:00.000Z'
          }
        ]
      }
    ],
    example: `curl -X DELETE \\
  -H "x-api-key: unicatcher-api-key-2024" \\
  http://localhost:3067/api/tweet-processor/status/cmfw4cfn300003233jpx4ee3c`
  },

  // 推文评论处理接口
  {
    id: 'comment-crawl',
    method: 'POST',
    path: '/api/tweet-processor/crawl-comments',
    title: '爬取推文评论',
    description: '🔍 异步爬取指定推文的评论数据，支持全量爬取和增量爬取',
    params: [
      {
        name: 'tweetId',
        type: 'string',
        required: true,
        description: '推文ID',
        example: '1969561815333159348'
      },
      {
        name: 'incremental',
        type: 'boolean',
        required: false,
        description: '是否增量爬取（默认false，全量爬取）',
        example: false
      },
      {
        name: 'maxScrolls',
        type: 'number',
        required: false,
        description: '最大滚动次数，用于加载更多评论（1-10，默认3）',
        example: 3
      }
    ],
    responses: [
      {
        status: 202,
        description: '任务提交成功',
        example: {
          success: true,
          message: '评论爬取任务已提交',
          data: {
            taskId: 'cm4v7x8y9000008l4abc12345',
            tweetId: '1969561815333159348',
            incremental: false,
            maxScrolls: 20,
            status: 'queued',
            submittedAt: '2024-01-01T10:00:00Z'
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
            description: '操作结果信息',
            example: '评论爬取任务已提交'
          },
          {
            name: 'data.taskId',
            type: 'string',
            description: '任务ID，用于查询任务状态',
            example: 'cm4v7x8y9000008l4abc12345'
          },
          {
            name: 'data.status',
            type: 'string',
            description: '任务状态',
            example: 'queued'
          },
          {
            name: 'data.submittedAt',
            type: 'string',
            description: '任务提交时间（ISO 8601格式）',
            example: '2024-01-01T10:00:00Z'
          }
        ]
      },
      {
        status: 409,
        description: '任务已在运行中',
        example: {
          error: '推文 1969561815333159348 的评论爬取任务正在运行中',
          code: 'TASK_ALREADY_RUNNING'
        },
        fields: [
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '推文 1969561815333159348 的评论爬取任务正在运行中'
          },
          {
            name: 'code',
            type: 'string',
            description: '错误代码',
            example: 'TASK_ALREADY_RUNNING'
          }
        ]
      },
      {
        status: 429,
        description: '并发任务数达到上限',
        example: {
          error: '并发任务数已达上限: 10',
          code: 'MAX_CONCURRENT_REACHED'
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/tweet-processor/crawl-comments \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-2024" \\
  -d '{"tweetId": "1969561815333159348", "incremental": false, "maxScrolls": 20}'`
  },

  {
    id: 'comment-view',
    method: 'GET',
    path: '/api/tweet-processor/comments/[tweetId]',
    title: '获取推文评论',
    description: '📄 获取指定推文的评论数据和统计信息',
    pathParams: [
      {
        name: 'tweetId',
        type: 'string',
        required: true,
        description: '推文ID',
        example: '1969561815333159348'
      }
    ],
    queryParams: [
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '返回评论数量限制（默认50）',
        example: 50
      },
      {
        name: 'includeReplies',
        type: 'boolean',
        required: false,
        description: '是否包含回复评论（默认true）',
        example: true
      },
      {
        name: 'includeStats',
        type: 'boolean',
        required: false,
        description: '是否包含统计信息和爬取历史（默认true）',
        example: true
      }
    ],
    responses: [
      {
        status: 200,
        description: '获取成功',
        example: {
          success: true,
          message: '评论数据获取成功',
          data: {
            tweetId: '1969561815333159348',
            comments: [
              {
                commentId: '1969562000000000000',
                content: 'Great post! Thanks for sharing.',
                authorUsername: 'user123',
                authorNickname: 'John Doe',
                authorProfileImage: 'https://pbs.twimg.com/profile_images/...',
                replyCount: 2,
                likeCount: 15,
                publishedAt: 1703123456789,
                scrapedAt: 1703123500000,
                isReply: false,
                parentCommentId: null
              }
            ],
            pagination: {
              total: 125,
              returned: 50,
              hasMore: true
            },
            stats: {
              totalComments: 125,
              replyComments: 43,
              directComments: 82,
              latestCommentAt: '2024-01-01T10:30:00Z'
            },
            crawlHistory: [
              {
                sessionId: 'cm4v7x8y9000008l4def67890',
                status: 'completed',
                totalComments: 125,
                newComments: 15,
                isIncremental: true,
                startedAt: '2024-01-01T10:25:00Z',
                completedAt: '2024-01-01T10:27:00Z'
              }
            ]
          },
          timestamp: '2024-01-01T10:30:00Z'
        }
      },
      {
        status: 404,
        description: '推文不存在',
        example: {
          error: 'Tweet not found in database'
        }
      }
    ],
    example: `curl -H "x-api-key: unicatcher-api-key-2024" \\
     "http://localhost:3067/api/tweet-processor/comments/1969561815333159348?limit=20&includeStats=true"`
  },

  {
    id: 'comment-clear',
    method: 'DELETE',
    path: '/api/tweet-processor/clear-comments/[tweetId]',
    title: '清除推文评论',
    description: '🗑️ 删除指定推文的所有评论数据',
    pathParams: [
      {
        name: 'tweetId',
        type: 'string',
        required: true,
        description: '推文ID',
        example: '1969561815333159348'
      }
    ],
    responses: [
      {
        status: 200,
        description: '清除成功',
        example: {
          success: true,
          message: '评论清理完成',
          data: {
            tweetId: '1969561815333159348',
            deletedComments: 125,
            beforeStats: {
              totalComments: 125,
              replyComments: 43,
              latestCommentAt: '2024-01-01T10:25:00Z'
            },
            clearedAt: '2024-01-01T10:30:00Z'
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
            name: 'data.deletedComments',
            type: 'number',
            description: '删除的评论数量',
            example: 125
          },
          {
            name: 'data.beforeStats',
            type: 'object',
            description: '清除前的统计信息',
            example: {}
          }
        ]
      },
      {
        status: 404,
        description: '推文不存在',
        example: {
          error: 'Tweet not found in database'
        }
      }
    ],
    example: `curl -X DELETE -H "x-api-key: unicatcher-api-key-2024" \\
     http://localhost:3067/api/tweet-processor/clear-comments/1969561815333159348`
  },

  {
    id: 'tweet-processor-health',
    method: 'GET',
    path: '/api/tweet-processor/update',
    title: '推文处理器状态',
    description: '💚 获取推文处理器的健康状态和运行信息',
    responses: [
      {
        status: 200,
        description: '健康检查成功',
        example: {
          success: true,
          service: "tweet-processor-update",
          status: "healthy",
          data: {
            runningTasks: 2,
            maxConcurrentTasks: 10,
            runningTaskDetails: [
              {
                taskId: "task123",
                tweetId: "1234567890",
                taskType: "update_data",
                runningTime: 5000
              }
            ],
            timestamp: "2025-09-23T05:30:12.200Z"
          }
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '服务是否正常',
            example: true
          },
          {
            name: 'service',
            type: 'string',
            description: '服务名称',
            example: 'tweet-processor-update'
          },
          {
            name: 'status',
            type: 'string',
            description: '健康状态',
            example: 'healthy'
          },
          {
            name: 'data.runningTasks',
            type: 'number',
            description: '当前运行的任务数',
            example: 2
          },
          {
            name: 'data.maxConcurrentTasks',
            type: 'number',
            description: '最大并发任务数',
            example: 10
          },
          {
            name: 'data.runningTaskDetails',
            type: 'array',
            description: '正在运行的任务详情',
            example: [{ taskId: "task123", tweetId: "1234567890" }]
          }
        ]
      }
    ],
    example: `curl -H "x-api-key: unicatcher-api-key-2024" \\
     http://localhost:3067/api/tweet-processor/update`
  },

  // AI批处理清除接口
  {
    id: 'ai-batch-clear-post',
    method: 'POST',
    path: '/api/external/ai-batch/clear',
    title: '清除所有AI批处理任务',
    description: '🧹 强制清除所有AI批处理任务和状态（快速清理模式）',
    params: [],
    responses: [
      {
        status: 200,
        description: '清除成功',
        example: {
          success: true,
          message: "所有AI批处理任务已成功清除",
          data: {
            clearTime: "2025-09-22T11:48:00.000Z",
            beforeClear: {
              hasGlobalTask: true,
              currentBatchId: "batch_1758539874517_hyqk4w",
              activeProcessesCount: 1,
              processingRecordsCount: 1
            },
            afterClear: {
              hasGlobalTask: false,
              currentBatchId: null,
              activeProcessesCount: 0,
              processingRecordsCount: 0
            },
            clearedTasks: {
              processingRecords: 1,
              activeProcesses: 1,
              databaseUpdates: 1
            }
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
            example: '所有AI批处理任务已成功清除'
          },
          {
            name: 'data.clearTime',
            type: 'string',
            description: '清除操作时间（ISO 8601格式）',
            example: '2025-09-22T11:48:00.000Z'
          },
          {
            name: 'data.beforeClear',
            type: 'object',
            description: '清除前的状态信息',
            example: { hasGlobalTask: true, activeProcessesCount: 1 }
          },
          {
            name: 'data.afterClear',
            type: 'object',
            description: '清除后的状态信息',
            example: { hasGlobalTask: false, activeProcessesCount: 0 }
          },
          {
            name: 'data.clearedTasks',
            type: 'object',
            description: '清除的任务统计信息',
            example: { processingRecords: 1, activeProcesses: 1 }
          }
        ]
      },
      {
        status: 500,
        description: '清除失败',
        example: {
          success: false,
          error: "清除操作失败",
          details: "具体错误信息",
          timestamp: "2025-09-22T11:48:00.000Z"
        },
        fields: [
          {
            name: 'success',
            type: 'boolean',
            description: '操作是否成功',
            example: false
          },
          {
            name: 'error',
            type: 'string',
            description: '错误信息',
            example: '清除操作失败'
          },
          {
            name: 'details',
            type: 'string',
            description: '详细错误信息',
            example: '具体错误信息'
          }
        ]
      }
    ],
    example: `curl -X POST http://43.153.84.145:3067/api/external/ai-batch/clear \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{}'`
  },

  {
    id: 'ai-batch-clear-get',
    method: 'GET',
    path: '/api/external/ai-batch/clear',
    title: '预览清除操作',
    description: '🔍 预览清除操作（查看将要清除的任务，不执行实际清除）',
    responses: [
      {
        status: 200,
        description: '预览成功',
        example: {
          success: true,
          message: "发现 1 个任务待清除",
          data: {
            needsClear: true,
            currentStatus: {
              hasGlobalTask: true,
              currentBatchId: "batch_1758539874517_hyqk4w",
              globalMessage: "AI批处理任务正在运行中"
            },
            activeProcesses: {
              count: 1,
              batchIds: ["batch_1758539874517_hyqk4w"]
            },
            processingRecords: {
              count: 1,
              tasks: [
                {
                  batchId: "batch_1758539874517_hyqk4w",
                  startedAt: "2025-09-22T11:17:54.000Z",
                  progress: "10/710",
                  aiProvider: "openai-badger",
                  aiModel: "gpt-4o",
                  duration: "1800秒"
                }
              ]
            },
            estimation: {
              tasksToCancel: 1,
              memoryToReset: 1,
              globalStateToReset: true
            },
            timestamp: "2025-09-22T11:48:00.000Z"
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
            description: '预览结果描述',
            example: '发现 1 个任务待清除'
          },
          {
            name: 'data.needsClear',
            type: 'boolean',
            description: '是否需要清除',
            example: true
          },
          {
            name: 'data.currentStatus',
            type: 'object',
            description: '当前全局状态',
            example: { hasGlobalTask: true, currentBatchId: "batch_xxx" }
          },
          {
            name: 'data.activeProcesses',
            type: 'object',
            description: '活跃进程信息',
            example: { count: 1, batchIds: ["batch_xxx"] }
          },
          {
            name: 'data.processingRecords',
            type: 'object',
            description: '数据库中的处理记录',
            example: { count: 1, tasks: [] }
          },
          {
            name: 'data.estimation',
            type: 'object',
            description: '清除操作预估',
            example: { tasksToCancel: 1, memoryToReset: 1 }
          }
        ]
      }
    ],
    example: `curl -H "X-API-Key: unicatcher-api-key-demo" \\
     http://43.153.84.145:3067/api/external/ai-batch/clear`
  },

  {
    id: 'ai-batch-reset',
    method: 'POST',
    path: '/api/external/ai-batch/reset',
    title: '重置AI批处理状态',
    description: '🔧 智能重置AI批处理状态（状态修复模式，支持强制和温和模式）',
    params: [
      {
        name: 'force',
        type: 'boolean',
        required: true,
        description: '重置模式：true为强制重置，false为温和重置',
        example: true
      }
    ],
    responses: [
      {
        status: 200,
        description: '重置成功',
        example: {
          success: true,
          message: "强制重置完成",
          data: {
            previousStatus: {
              hasActiveTask: true,
              currentBatchId: "batch_xxx"
            },
            updatedRecords: 1,
            resetAt: "2025-09-22T11:48:00.000Z"
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
            description: '重置结果描述',
            example: '强制重置完成'
          },
          {
            name: 'data.previousStatus',
            type: 'object',
            description: '重置前的状态',
            example: { hasActiveTask: true }
          },
          {
            name: 'data.updatedRecords',
            type: 'number',
            description: '更新的记录数量',
            example: 1
          }
        ]
      }
    ],
    example: `curl -X POST http://43.153.84.145:3067/api/external/ai-batch/reset \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{"force": true}'`
  }
];

function ApiEndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const methodColors = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800'
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      {/* 折叠头部 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <span className={`inline-block px-3 py-1 text-sm font-semibold rounded ${methodColors[endpoint.method]}`}>
            {endpoint.method}
          </span>
          <code className="text-lg font-mono text-gray-800">{endpoint.path}</code>
          <span className="text-gray-600">- {endpoint.title}</span>
        </div>
        <div className="flex items-center">
          <svg 
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-gray-600 mb-6">{endpoint.description}</p>

          {/* 路径参数 */}
          {endpoint.pathParams && endpoint.pathParams.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">🔗 路径参数</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">参数名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">必填</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.pathParams.map((param, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 font-mono text-sm">{param.name}</td>
                        <td className="px-4 py-2 text-sm text-blue-600">{param.type}</td>
                        <td className="px-4 py-2 text-sm">
                          {param.required ? (
                            <span className="text-red-600 font-medium">必填</span>
                          ) : (
                            <span className="text-gray-500">可选</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{param.description}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {typeof param.example === 'object' ? JSON.stringify(param.example) : param.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 查询参数 */}
          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">🔍 查询参数</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">参数名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">必填</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">可选值</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.queryParams.map((param, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 font-mono text-sm">{param.name}</td>
                        <td className="px-4 py-2 text-sm text-blue-600">{param.type}</td>
                        <td className="px-4 py-2 text-sm">
                          {param.required ? (
                            <span className="text-red-600 font-medium">必填</span>
                          ) : (
                            <span className="text-gray-500">可选</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {param.options ? (
                            <div className="flex flex-wrap gap-1">
                              {param.options.map((option, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {option}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{param.description}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {typeof param.example === 'object' ? JSON.stringify(param.example) : param.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 请求参数 */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">📝 请求参数</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">参数名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">必填</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">可选值</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.params.map((param, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 font-mono text-sm">{param.name}</td>
                        <td className="px-4 py-2 text-sm text-blue-600">{param.type}</td>
                        <td className="px-4 py-2 text-sm">
                          {param.required ? (
                            <span className="text-red-600 font-medium">必填</span>
                          ) : (
                            <span className="text-gray-500">可选</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {param.options ? (
                            <div className="flex flex-wrap gap-1">
                              {param.options.map((option, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {option}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{param.description}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {typeof param.example === 'object' ? JSON.stringify(param.example) : param.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 响应示例 */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">📤 响应示例</h4>
            <div className="space-y-6">
              {endpoint.responses.map((response, index) => (
                <div key={index}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      response.status < 300 ? 'bg-green-100 text-green-800' : 
                      response.status < 400 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {response.status}
                    </span>
                    <span className="text-sm text-gray-600">{response.description}</span>
                  </div>
                  
                  {/* 响应字段说明 */}
                  {response.fields && response.fields.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">响应字段说明</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">字段名</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                            </tr>
                          </thead>
                          <tbody>
                            {response.fields.map((field, fieldIndex) => (
                              <tr key={fieldIndex} className="border-t border-gray-200">
                                <td className="px-4 py-2 font-mono text-sm">{field.name}</td>
                                <td className="px-4 py-2 text-sm text-blue-600">{field.type}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{field.description}</td>
                                <td className="px-4 py-2 text-sm font-mono text-gray-600">
                                  {typeof field.example === 'object' ? JSON.stringify(field.example) : field.example}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* JSON示例 */}
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <pre>{JSON.stringify(response.example, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* cURL示例 */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">💻 cURL 示例</h4>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
              <pre>{endpoint.example}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsClientPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('zh-CN'));
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // 按分类组织接口
  const categories = {
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
    'tweet-processor': {
      title: '推文处理器',
      description: '单推文数据更新、评论获取、AI评论生成，支持异步处理和并发控制',
      endpoints: apiEndpoints.filter(ep => ep.path.includes('/tweet-processor'))
    },
    'ai-batch': {
      title: 'AI批处理',
      description: 'AI自动分析推文内容，支持OpenAI、OpenAI-Badger、智谱AI供应商，单批次处理模式',
      endpoints: apiEndpoints.filter(ep => ep.path.includes('/ai-batch'))
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
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

        {/* 基础信息 */}
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
                <h3 className="font-medium text-gray-900 mb-2">HTTP 状态码</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <code className="text-green-600">200/201</code>
                    <span>成功</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-red-600">400</code>
                    <span>参数错误</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-red-600">401</code>
                    <span>认证失败</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="text-red-600">409</code>
                    <span>冲突/任务运行中</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">数据格式</h3>
                <div className="flex space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">JSON</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">CSV</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API接口分类 */}
        <div className="space-y-6">
          {Object.entries(categories).map(([key, category]) => (
            <div key={key} className="rounded-lg bg-white shadow">
              {/* 分类头部 */}
              <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
                onClick={() => toggleCategory(key)}
              >
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{category.title}</h2>
                  <p className="mt-2 text-gray-600">{category.description}</p>
                  <div className="mt-2 text-sm text-blue-600">
                    {category.endpoints.length} 个接口
                  </div>
                </div>
                <div className="flex items-center">
                  <svg 
                    className={`h-6 w-6 text-gray-400 transition-transform ${expandedCategory === key ? 'rotate-90' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* 分类内容 */}
              {expandedCategory === key && (
                <div className="p-6">
                  {category.endpoints.map((endpoint) => (
                    <ApiEndpointCard key={endpoint.id} endpoint={endpoint} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 页脚 */}
        <div className="text-center py-8 border-t border-gray-200 mt-12">
          <div className="text-gray-500 space-y-2">
            <p className="font-medium">UniCatcher v1.0.0 - 交互式API文档</p>
            <p className="text-sm">点击分类和接口展开查看详细参数说明和示例</p>
            <div className="flex justify-center space-x-4 text-sm">
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800">管理后台</a>
              <a href="/tasks" className="text-blue-600 hover:text-blue-800">任务管理</a>
              <a href="/tweets" className="text-blue-600 hover:text-blue-800">数据查看</a>
            </div>
            <p className="text-xs mt-4">
              如有疑问，请联系开发团队 | 文档最后更新：{currentTime || '加载中...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
