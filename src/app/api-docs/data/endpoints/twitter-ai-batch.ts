import type { ApiEndpoint } from '../../types';

export const twitterAIBatchEndpoints: ApiEndpoint[] = [
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

];
