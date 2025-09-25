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
  // 推文翻译接口
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
        description: 'AI提供商，支持OpenAI、OpenAI-Badger、智谱AI、Anthropic Claude，默认openai',
        options: ['openai', 'openai-badger', 'zhipu', 'anthropic'],
        example: 'openai'
      },
      {
        name: 'aiConfig.model',
        type: 'string',
        required: false,
        description: 'AI模型名称，支持gpt-4o、glm-4.5-flash、claude-3-5-sonnet-20241022等，默认gpt-4o',
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
  }'

# Anthropic Claude 示例
curl -X POST http://43.153.84.145:3067/api/external/ai-batch/start \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "listIds": ["1948042550071496895"],
    "batchSize": 10,
    "batchProcessingMode": "optimized",
    "aiConfig": {
      "apiKey": "sk-ant-api03-xxxxxx",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022"
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
        description: 'AI提供商，支持OpenAI、OpenAI-Badger、智谱AI、Anthropic Claude，默认openai',
        options: ['openai', 'openai-badger', 'zhipu', 'anthropic'],
        example: 'openai'
      },
      {
        name: 'aiConfig.model',
        type: 'string',
        required: false,
        description: 'AI模型名称，支持gpt-4o、glm-4.5-flash、claude-3-5-sonnet-20241022等，默认gpt-4o',
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
  }'

# 继续Anthropic Claude处理
curl -X POST http://43.153.84.145:3067/api/external/ai-batch/continue \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -d '{
    "previousBatchId": "batch_1703123456789_abc123",
    "listIds": ["1948042550071496895"],
    "batchSize": 10,
    "aiConfig": {
      "apiKey": "sk-ant-api03-xxxxxx",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022"
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
  },

  // 翻译接口
  {
    id: 'translate-text',
    method: 'POST',
    path: '/api/tweet-processor/translate',
    title: '独立翻译接口',
    description: '对任意文本进行AI翻译，不涉及数据库存储',
    params: [
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '需要翻译的文本内容',
        example: 'Hello world! This is a test message.'
      },
      {
        name: 'targetLanguage',
        type: 'string',
        required: false,
        description: '目标语言，默认为zh-CN',
        options: ['zh-CN', 'en-US'],
        example: 'zh-CN'
      },
      {
        name: 'aiConfig',
        type: 'object',
        required: true,
        description: 'AI服务配置',
        example: {
          apiKey: 'your-api-key',
          provider: 'zhipu',
          model: 'glm-4.5-flash',
          baseURL: 'https://open.bigmodel.cn/api'
        }
      }
    ],
    responses: [
      {
        status: 200,
        description: '翻译成功',
        example: {
          success: true,
          data: {
            originalContent: 'Hello world! This is a test message.',
            translatedContent: '你好世界！这是一条测试消息。',
            originalLanguage: 'en',
            isTranslated: true,
            targetLanguage: 'zh-CN',
            provider: 'zhipu',
            model: 'glm-4.5-flash',
            translatedAt: '2024-01-01T12:00:00.000Z'
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
            message: 'Missing or invalid content'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/tweet-processor/translate \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello world! This is a test message.",
    "targetLanguage": "zh-CN",
    "aiConfig": {
      "apiKey": "your-api-key",
      "provider": "zhipu",
      "model": "glm-4.5-flash"
    }
  }'`
  },
  {
    id: 'translate-tweet',
    method: 'POST',
    path: '/api/tweet-processor/translate-tweet',
    title: '推文翻译接口',
    description: '翻译指定推文并保存到数据库',
    params: [
      {
        name: 'tweetId',
        type: 'string',
        required: true,
        description: '推文ID',
        example: '1234567890123456789'
      },
      {
        name: 'targetLanguage',
        type: 'string',
        required: false,
        description: '目标语言，默认为zh-CN',
        options: ['zh-CN', 'en-US'],
        example: 'zh-CN'
      },
      {
        name: 'aiConfig',
        type: 'object',
        required: true,
        description: 'AI服务配置',
        example: {
          apiKey: 'your-api-key',
          provider: 'zhipu',
          model: 'glm-4.5-flash',
          baseURL: 'https://open.bigmodel.cn/api'
        }
      }
    ],
    responses: [
      {
        status: 200,
        description: '翻译成功，返回更新后的推文数据',
        example: {
          success: true,
          data: {
            tweet: {
              id: '1234567890123456789',
              content: 'Hello world! This is a test tweet.',
              translatedContent: '你好世界！这是一条测试推文。',
              isTranslated: true,
              originalLanguage: 'en',
              translationProvider: 'zhipu',
              translationModel: 'glm-4.5-flash',
              translatedAt: '2024-01-01T12:00:00.000Z'
            },
            translation: {
              originalLanguage: 'en',
              translatedContent: '你好世界！这是一条测试推文。',
              isTranslated: true
            }
          }
        }
      },
      {
        status: 404,
        description: '推文不存在或已删除',
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tweet not found or deleted'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/tweet-processor/translate-tweet \\
  -H "Content-Type: application/json" \\
  -d '{
    "tweetId": "1234567890123456789",
    "targetLanguage": "zh-CN",
    "aiConfig": {
      "apiKey": "your-api-key",
      "provider": "zhipu",
      "model": "glm-4.5-flash"
    }
  }'`
  },

  // 推文处理接口
  {
    id: 'translate-text',
    method: 'POST',
    path: '/api/external/translate',
    title: '推文翻译',
    description: '使用AI服务翻译推文内容，支持OpenAI、OpenAI-Badger、智谱AI、Anthropic Claude等多种AI供应商',
    params: [
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '待翻译的推文内容',
        example: 'Hello world, this is a test tweet!'
      },
      {
        name: 'aiConfig',
        type: 'object',
        required: true,
        description: 'AI服务配置',
        example: {
          provider: 'zhipu',
          apiKey: 'your-api-key',
          model: 'glm-4.5-flash'
        }
      }
    ],
    responses: [
      {
        status: 200,
        description: '翻译成功',
        example: {
          success: true,
          message: '翻译成功',
          data: {
            originalContent: 'Hello world, this is a test tweet!',
            translatedContent: '你好世界，这是一条测试推文！',
            originalLanguage: 'en',
            targetLanguage: 'zh-CN',
            translationProvider: 'zhipu',
            translationModel: 'glm-4.5-flash',
            translatedAt: '2024-01-01T12:00:00Z'
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
            message: 'Missing or invalid content'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/translate \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello world, this is a test tweet!",
    "aiConfig": {
      "provider": "zhipu",
      "apiKey": "your-api-key",
      "model": "glm-4.5-flash"
    }
  }'`
  },

  {
    id: 'generate-comments',
    method: 'POST',
    path: '/api/external/generate-comments',
    title: 'AI评论生成',
    description: '根据推文内容使用AI生成参考评论，支持OpenAI、OpenAI-Badger、智谱AI、Anthropic Claude等AI供应商',
    params: [
      {
        name: 'tweetId',
        type: 'string',
        required: true,
        description: '推文ID',
        example: '1234567890123456789'
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '推文内容',
        example: '今天天气很好，适合出门散步。'
      },
      {
        name: 'aiConfig',
        type: 'object',
        required: true,
        description: 'AI服务配置',
        example: {
          provider: 'zhipu',
          apiKey: 'your-api-key',
          model: 'glm-4.5-flash'
        }
      },
      {
        name: 'commentCount',
        type: 'number',
        required: false,
        description: '生成评论数量 (1-10)',
        example: 3
      },
      {
        name: 'commentLength',
        type: 'string',
        required: false,
        description: '评论长度',
        options: ['short', 'medium', 'long'],
        example: 'medium'
      },
      {
        name: 'language',
        type: 'string',
        required: false,
        description: '生成语言',
        options: ['zh-CN', 'en-US'],
        example: 'zh-CN'
      },
      {
        name: 'referenceTweetCategoryId',
        type: 'string',
        required: false,
        description: '参考推文分类ID，用于从手采推文数据库中获取同类型推文作为AI生成时的参考',
        example: 'clm123456789'
      },
      {
        name: 'referenceCount',
        type: 'number',
        required: false,
        description: '参考推文数量 (0-20)，默认5条',
        example: 5
      }
    ],
    responses: [
      {
        status: 200,
        description: '评论生成成功',
        example: {
          success: true,
          message: '成功生成 3 条评论',
          data: {
            tweetId: '1234567890123456789',
            comments: [
              { content: '确实是这样，好天气让人心情都变好了！', reasoning: '积极回应天气话题' },
              { content: '我也想出去走走，有推荐的地方吗？', reasoning: '互动性提问' },
              { content: '散步对身体真的很有好处。', reasoning: '健康话题延伸' }
            ],
            basedOnExistingComments: true,
            aiProvider: 'zhipu',
            aiModel: 'glm-4.5-flash',
            language: 'zh-CN',
            generatedAt: '2024-01-01T12:00:00Z'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/generate-comments \\
  -H "Content-Type: application/json" \\
  -d '{
    "tweetId": "1234567890123456789",
    "content": "今天天气很好，适合出门散步。",
    "aiConfig": {
      "provider": "zhipu",
      "apiKey": "your-api-key",
      "model": "glm-4.5-flash"
    },
    "commentCount": 3,
    "commentLength": "medium",
    "language": "zh-CN",
    "referenceTweetCategoryId": "clm123456789",
    "referenceCount": 5
  }'`
  },

  {
    id: 'tweet-info',
    method: 'GET',
    path: '/api/external/tweet-info/[tweetId]',
    title: '推文信息查询',
    description: '获取推文的详细信息，包括翻译、AI分析结果等',
    pathParams: [
      {
        name: 'tweetId',
        type: 'string',
        required: true,
        description: '推文ID',
        example: '1234567890123456789'
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          message: '推文信息获取成功',
          data: {
            tweetId: '1234567890123456789',
            content: '今天天气很好，适合出门散步。',
            author: {
              username: 'example_user',
              nickname: '示例用户',
              profileImage: 'https://example.com/avatar.jpg'
            },
            stats: {
              replyCount: 15,
              retweetCount: 32,
              likeCount: 128,
              viewCount: 1024,
              commentCount: 8
            },
            translation: {
              isTranslated: true,
              translatedContent: 'The weather is nice today, perfect for going out for a walk.',
              originalLanguage: 'zh',
              translationProvider: 'zhipu',
              translationModel: 'glm-4.5-flash',
              translatedAt: '2024-01-01T12:00:00Z'
            },
            aiAnalysis: {
              keywords: ['天气', '散步', '户外活动'],
              topicTags: ['生活', '健康'],
              contentTypes: ['日常分享'],
              isValueless: false,
              processedAt: '2024-01-01T12:00:00Z'
            },
            publishedAt: 1704067200000,
            publishedAtFormatted: '2024/1/1 12:00:00',
            tweetUrl: 'https://x.com/example_user/status/1234567890123456789'
          }
        }
      },
      {
        status: 404,
        description: '推文未找到',
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tweet not found'
          }
        }
      }
    ],
    example: `curl -X GET http://localhost:3067/api/external/tweet-info/1234567890123456789`
  },

  // 独立外部接口 (无需数据库存储)
  {
    id: 'translate-standalone',
    method: 'POST',
    path: '/api/external/translate-standalone',
    title: '独立翻译接口',
    description: '独立的推文翻译接口，无需将数据存储到unicatcher数据库中。外部项目可以传入推文信息进行翻译并自行管理数据。',
    params: [
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '要翻译的推文内容',
        example: 'Hello world! This is a test tweet.'
      },
      {
        name: 'aiConfig',
        type: 'object',
        required: true,
        description: 'AI配置对象',
        example: {
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: 'your-openai-api-key',
          baseURL: 'https://api.openai.com/v1'
        }
      },
      {
        name: 'targetLanguage',
        type: 'string',
        required: false,
        description: '目标语言',
        options: ['zh-CN', 'en-US'],
        example: 'zh-CN'
      },
      {
        name: 'tweetId',
        type: 'string',
        required: false,
        description: '推文ID（仅用于记录）',
        example: '1234567890'
      },
      {
        name: 'tweetUrl',
        type: 'string',
        required: false,
        description: '推文链接（仅用于记录）',
        example: 'https://x.com/user/status/1234567890'
      },
      {
        name: 'authorUsername',
        type: 'string',
        required: false,
        description: '作者用户名（仅用于记录）',
        example: 'example_user'
      },
      {
        name: 'authorNickname',
        type: 'string',
        required: false,
        description: '作者昵称（仅用于记录）',
        example: '示例用户'
      }
    ],
    responses: [
      {
        status: 200,
        description: '翻译成功',
        example: {
          success: true,
          message: '翻译成功',
          data: {
            tweetId: '1234567890',
            tweetUrl: 'https://x.com/user/status/1234567890',
            authorUsername: 'example_user',
            authorNickname: '示例用户',
            originalContent: 'Hello world! This is a test tweet.',
            translatedContent: '你好世界！这是一条测试推文。',
            originalLanguage: 'en',
            targetLanguage: 'zh-CN',
            translationProvider: 'openai',
            translationModel: 'gpt-4o',
            translatedAt: '2025-01-15T10:30:45.123Z'
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
      },
      {
        status: 400,
        description: '参数错误',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing or invalid content'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/translate-standalone \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "content": "Hello world! This is a test tweet about AI.",
    "targetLanguage": "zh-CN",
    "aiConfig": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "your-openai-api-key"
    },
    "tweetId": "1234567890",
    "tweetUrl": "https://x.com/user/status/1234567890",
    "authorUsername": "example_user",
    "authorNickname": "示例用户"
  }'`
  },

  {
    id: 'generate-comments-standalone',
    method: 'POST',
    path: '/api/external/generate-comments-standalone',
    title: '独立评论生成接口',
    description: '独立的推文评论生成接口，无需将数据存储到unicatcher数据库中。为传入的推文内容生成AI评论，支持OpenAI、OpenAI-Badger、智谱AI、Anthropic Claude等AI供应商，外部项目可以自行管理数据。',
    params: [
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '推文内容',
        example: '分享一个关于AI发展的有趣观点：AI不会替代人类，而是让人类变得更强大。'
      },
      {
        name: 'aiConfig',
        type: 'object',
        required: true,
        description: 'AI配置对象',
        example: {
          provider: 'zhipu',
          model: 'glm-4.5-flash',
          apiKey: 'your-zhipu-api-key'
        }
      },
      {
        name: 'tweetId',
        type: 'string',
        required: false,
        description: '推文ID（仅用于记录）',
        example: '1234567890'
      },
      {
        name: 'tweetUrl',
        type: 'string',
        required: false,
        description: '推文链接（仅用于记录）',
        example: 'https://x.com/user/status/1234567890'
      },
      {
        name: 'authorUsername',
        type: 'string',
        required: false,
        description: '作者用户名（仅用于记录）',
        example: 'ai_enthusiast'
      },
      {
        name: 'authorNickname',
        type: 'string',
        required: false,
        description: '作者昵称（仅用于记录）',
        example: 'AI爱好者'
      },
      {
        name: 'commentCount',
        type: 'number',
        required: false,
        description: '生成评论数量，1-10，默认3',
        example: 3
      },
      {
        name: 'commentLength',
        type: 'string',
        required: false,
        description: '评论长度，默认medium',
        options: ['short', 'medium', 'long'],
        example: 'medium'
      },
      {
        name: 'language',
        type: 'string',
        required: false,
        description: '评论语言，默认zh-CN',
        options: ['zh-CN', 'en-US'],
        example: 'zh-CN'
      },
      {
        name: 'userInfo',
        type: 'string',
        required: false,
        description: '用户信息，用于个性化评论',
        example: '我是一名软件工程师，对AI技术很感兴趣'
      },
      {
        name: 'systemPrompt',
        type: 'string',
        required: false,
        description: '自定义系统提示词',
        example: '请生成专业且友好的评论回复'
      },
      {
        name: 'existingComments',
        type: 'array',
        required: false,
        description: '现有评论列表（一般不使用）',
        example: []
      },
      {
        name: 'referenceTweetCategoryId',
        type: 'string',
        required: false,
        description: '参考推文分类ID，用于从手采推文数据库中获取同类型推文作为AI生成时的参考',
        example: 'clm123456789'
      },
      {
        name: 'referenceCount',
        type: 'number',
        required: false,
        description: '参考推文数量 (0-20)，默认5条',
        example: 5
      }
    ],
    responses: [
      {
        status: 200,
        description: '评论生成成功',
        example: {
          success: true,
          message: '成功生成 3 条评论',
          data: {
            tweetId: '1234567890',
            tweetUrl: 'https://x.com/user/status/1234567890',
            authorUsername: 'ai_enthusiast',
            authorNickname: 'AI爱好者',
            tweetContent: '分享一个关于AI发展的有趣观点...',
            comments: [
              {
                content: '这个观点很有启发性！AI确实在改变我们的工作方式。',
                reasoning: '基于推文内容，表达赞同并延伸讨论'
              },
              {
                content: '感谢分享，这让我对AI的未来更加乐观了。',
                reasoning: '表达感谢并分享个人感受'
              },
              {
                content: '非常同意！期待看到更多这样的深度分析。',
                reasoning: '表达赞同并鼓励更多分享'
              }
            ],
            commentCount: 3,
            commentLength: 'medium',
            language: 'zh-CN',
            basedOnExistingComments: false,
            existingCommentsCount: 0,
            aiProvider: 'zhipu',
            aiModel: 'glm-4.5-flash',
            generatedAt: '2025-01-15T10:35:22.456Z'
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
      },
      {
        status: 400,
        description: '参数错误',
        example: {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing or invalid content'
          }
        }
      }
    ],
    example: `curl -X POST http://localhost:3067/api/external/generate-comments-standalone \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: unicatcher-api-key-demo" \\
  -d '{
    "content": "分享一个关于AI发展的有趣观点：AI不会替代人类，而是让人类变得更强大。技术的进步应该服务于人类的创造力和想象力。",
    "aiConfig": {
      "provider": "zhipu",
      "model": "glm-4.5-flash",
      "apiKey": "your-zhipu-api-key"
    },
    "commentCount": 5,
    "commentLength": "medium",
    "language": "zh-CN",
    "userInfo": "我是一名软件工程师，对AI技术很感兴趣",
    "tweetId": "1234567890",
    "authorUsername": "ai_enthusiast",
    "authorNickname": "AI爱好者",
    "referenceTweetCategoryId": "clm123456789",
    "referenceCount": 5
  }'`
  },

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
    description: '批量添加手采推文文本数据到指定分类中',
    params: [
      {
        name: 'data',
        type: 'array',
        required: true,
        description: '文本数据数组',
        example: [
          {
            categoryId: 'cat_123456',
            content: 'AI正在改变我们的工作方式，这是一个令人兴奋的时代。'
          },
          {
            categoryId: 'cat_123456',
            content: '机器学习算法的突破让AI应用变得更加实用和高效。'
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
        "content": "AI正在改变我们的工作方式，这是一个令人兴奋的时代。"
      },
      {
        "categoryId": "cat_123456",
        "content": "机器学习算法的突破让AI应用变得更加实用和高效。"
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
        name: 'description',
        type: 'string',
        required: false,
        description: '平台描述',
        example: '更新后的描述'
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
    "description": "更新后的描述"
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
    parameters: [
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

function ApiEndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const methodColors = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800'
  };

  // 生成Markdown格式的API文档
  const generateMarkdown = () => {
    let markdown = `# ${endpoint.title}\n\n`;
    markdown += `**${endpoint.method}** \`${endpoint.path}\`\n\n`;
    markdown += `${endpoint.description}\n\n`;

    // 路径参数
    if (endpoint.pathParams && endpoint.pathParams.length > 0) {
      markdown += `## 路径参数\n\n`;
      markdown += `| 参数名 | 类型 | 必填 | 说明 | 示例 |\n`;
      markdown += `|--------|------|------|------|------|\n`;
      endpoint.pathParams.forEach(param => {
        const example = typeof param.example === 'object' ? JSON.stringify(param.example) : param.example;
        markdown += `| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${param.description} | ${example} |\n`;
      });
      markdown += `\n`;
    }

    // 查询参数
    if (endpoint.queryParams && endpoint.queryParams.length > 0) {
      markdown += `## 查询参数\n\n`;
      markdown += `| 参数名 | 类型 | 必填 | 可选值 | 说明 | 示例 |\n`;
      markdown += `|--------|------|------|--------|------|------|\n`;
      endpoint.queryParams.forEach(param => {
        const options = param.options ? param.options.join(', ') : '-';
        const example = typeof param.example === 'object' ? JSON.stringify(param.example) : param.example;
        markdown += `| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${options} | ${param.description} | ${example} |\n`;
      });
      markdown += `\n`;
    }

    // 请求参数
    if (endpoint.params && endpoint.params.length > 0) {
      markdown += `## 请求参数\n\n`;
      markdown += `| 参数名 | 类型 | 必填 | 可选值 | 说明 | 示例 |\n`;
      markdown += `|--------|------|------|--------|------|------|\n`;
      endpoint.params.forEach(param => {
        const options = param.options ? param.options.join(', ') : '-';
        const example = typeof param.example === 'object' ? JSON.stringify(param.example) : param.example;
        markdown += `| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${options} | ${param.description} | ${example} |\n`;
      });
      markdown += `\n`;
    }

    // 响应示例
    markdown += `## 响应示例\n\n`;
    endpoint.responses.forEach(response => {
      markdown += `### ${response.status} - ${response.description}\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(response.example, null, 2)}\n\`\`\`\n\n`;
    });

    // cURL示例
    markdown += `## cURL 示例\n\n`;
    markdown += `\`\`\`bash\n${endpoint.example}\n\`\`\`\n\n`;

    return markdown;
  };

  // 复制到剪贴板
  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发展开/收起
    try {
      const markdown = generateMarkdown();
      await navigator.clipboard.writeText(markdown);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
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
        <div className="flex items-center space-x-2">
          {/* 复制按钮 */}
          <button
            onClick={copyToClipboard}
            className={`p-2 rounded-md transition-colors ${
              copySuccess
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="复制Markdown文档"
          >
            {copySuccess ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

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
  const [expandedCategory, setExpandedCategory] = useState<string | null>('tweet-processing');
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString('zh-CN'));
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // 按导航模块分类组织接口
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
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/writing-assistant') && ep.path.includes('/platforms'))
        },
        'article-types': {
          title: '文章类型管理',
          description: '文章类型的增删改查API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/writing-assistant') && ep.path.includes('/article-types'))
        },
        'articles': {
          title: '采集文章管理',
          description: '采集文章的增删改查API接口',
          endpoints: apiEndpoints.filter(ep => ep.path.includes('/writing-assistant') && ep.path.includes('/articles'))
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
          {Object.entries(categories).map(([moduleKey, module]) => (
            <div key={moduleKey} className="rounded-lg bg-white shadow">
              {/* 模块头部 */}
              <div
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
                onClick={() => toggleCategory(moduleKey)}
              >
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{module.icon}</span>
                    <h2 className="text-2xl font-semibold text-gray-900">{module.title}</h2>
                  </div>
                  <p className="mt-2 text-gray-600">{module.description}</p>
                  <div className="mt-2 text-sm text-blue-600">
                    {Object.values(module.subcategories).reduce((total, sub) => total + sub.endpoints.length, 0)} 个接口
                  </div>
                </div>
                <div className="flex items-center">
                  <svg
                    className={`h-6 w-6 text-gray-400 transition-transform ${expandedCategory === moduleKey ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* 模块内容 */}
              {expandedCategory === moduleKey && (
                <div className="p-6">
                  {Object.entries(module.subcategories).map(([subKey, subcategory]) => (
                    <div key={subKey} className="mb-8 last:mb-0">
                      {/* 子分类头部 */}
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{subcategory.title}</h3>
                        <p className="text-sm text-gray-600">{subcategory.description}</p>
                        <div className="text-xs text-blue-600 mt-1">
                          {subcategory.endpoints.length} 个接口
                        </div>
                      </div>

                      {/* 子分类接口列表 */}
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
