import type { ApiEndpoint } from '../../types';

export const twitterProcessingEndpoints: ApiEndpoint[] = [
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
        description: '自定义系统提示词（会覆盖/ai-settings中配置的默认提示词）',
        example: '请生成专业且友好的评论回复'
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: '评论类型，用于拼接到系统提示词中的{{type}}占位符。可根据场景自定义，如："技术讨论"、"产品反馈"、"营销推广"等',
        example: '技术讨论型'
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

];
