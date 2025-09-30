import type { ApiEndpoint } from '../../types';

export const twitterTasksEndpoints: ApiEndpoint[] = [
  // Twitter任务管理接口
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

];
