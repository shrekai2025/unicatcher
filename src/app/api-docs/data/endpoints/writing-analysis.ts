import type { ApiEndpoint } from '../../types';

export const writingAnalysisEndpoints: ApiEndpoint[] = [
  {
    id: 'merge-tweets',
    method: 'POST',
    path: '/api/writing-analysis/merge-tweets',
    title: '合并推文数据',
    description: '将Tweet表和ManualTweetText表的数据按用户名合并、排重，并按发布时间排序存入写作分析表',
    params: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      }
    ],
    responses: [
      {
        status: 200,
        description: '数据合并成功',
        example: {
          success: true,
          message: 'Successfully merged tweets for user: elonmusk',
          data: {
            username: 'elonmusk',
            totalFound: 456,
            newInserted: 123,
            existingSkipped: 333,
            fromTweetTable: 400,
            fromManualTable: 56,
            mergedAt: '2025-01-15T10:30:00.000Z'
          }
        }
      },
      {
        status: 400,
        description: '请求参数错误',
        example: {
          error: 'Username is required'
        }
      }
    ],
    example: `curl -X POST "/api/writing-analysis/merge-tweets" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "elonmusk"}'`
  },

  {
    id: 'get-merged-tweets',
    method: 'GET',
    path: '/api/writing-analysis/merge-tweets',
    title: '获取合并后的推文数据',
    description: '查询指定用户已合并的写作分析推文数据，支持分页',
    queryParams: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '返回数量限制（最大1000）',
        example: 50
      },
      {
        name: 'offset',
        type: 'number',
        required: false,
        description: '跳过数量（分页偏移）',
        example: 0
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          data: {
            tweets: [
              {
                id: 'clxxx123',
                content: 'AI is going to change everything...',
                tweetId: '1234567890',
                userUsername: 'elonmusk',
                publishedAt: '1640995200000',
                sourceType: 'tweet',
                replyCount: 145,
                retweetCount: 892,
                likeCount: 5432
              }
            ],
            pagination: {
              total: 456,
              limit: 50,
              offset: 0,
              hasMore: true
            }
          }
        }
      }
    ],
    example: `curl -X GET "/api/writing-analysis/merge-tweets?username=elonmusk&limit=50" \\
  -H "X-API-Key: unicatcher-api-key-demo"`
  },

  {
    id: 'analyze-tweet-types',
    method: 'POST',
    path: '/api/writing-analysis/analyze-types',
    title: '分析推文类型',
    description: '对指定用户的推文进行类型自动标注，识别推文属于哪些类型（可多标签）',
    params: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '分析数量限制（最大500条）',
        example: 200
      }
    ],
    responses: [
      {
        status: 200,
        description: '类型分析成功',
        example: {
          success: true,
          message: 'Successfully analyzed tweet types for user: elonmusk',
          data: {
            username: 'elonmusk',
            analyzedLimit: 200,
            typeDistribution: {
              '洞见/观点/观察': { count: 45, percentage: 23 },
              '研究/数据': { count: 38, percentage: 19 },
              '时事评论': { count: 32, percentage: 16 },
              '个人经历/成长': { count: 28, percentage: 14 },
              '日常生活': { count: 25, percentage: 13 }
            },
            analyzedAt: '2025-01-15T10:45:00.000Z'
          }
        }
      }
    ],
    example: `curl -X POST "/api/writing-analysis/analyze-types" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "elonmusk", "limit": 200}'`
  },

  {
    id: 'get-tweet-types',
    method: 'GET',
    path: '/api/writing-analysis/analyze-types',
    title: '获取推文类型分布',
    description: '获取指定用户的推文类型分布统计结果',
    queryParams: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          data: {
            username: 'elonmusk',
            typeDistribution: {
              '洞见/观点/观察': { count: 45, percentage: 23 },
              '研究/数据': { count: 38, percentage: 19 },
              '时事评论': { count: 32, percentage: 16 }
            },
            topTypes: [
              { type: '洞见/观点/观察', count: 45, percentage: 23 },
              { type: '研究/数据', count: 38, percentage: 19 },
              { type: '时事评论', count: 32, percentage: 16 }
            ],
            totalTypes: 12,
            queriedAt: '2025-01-15T10:50:00.000Z'
          }
        }
      }
    ],
    example: `curl -X GET "/api/writing-analysis/analyze-types?username=elonmusk" \\
  -H "X-API-Key: unicatcher-api-key-demo"`
  },

  {
    id: 'analyze-style',
    method: 'POST',
    path: '/api/writing-analysis/analyze-style',
    title: '分析用户风格特征',
    description: '深度分析用户的写作风格特征，包括词汇、句式、专业度等维度',
    params: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      },
      {
        name: 'forceUpdate',
        type: 'boolean',
        required: false,
        description: '是否强制重新分析（默认false）',
        example: false
      }
    ],
    responses: [
      {
        status: 200,
        description: '风格分析成功',
        example: {
          success: true,
          message: 'Successfully analyzed style features for user: elonmusk',
          data: {
            username: 'elonmusk',
            styleFeatures: {
              lexical: {
                vocabDiversity: 0.67,
                wordComplexity: 2.1,
                topWords: [
                  { word: 'AI', frequency: 42, tfidf: 15.6 },
                  { word: 'Tesla', frequency: 38, tfidf: 14.2 }
                ],
                posDistribution: {
                  noun: 0.35,
                  verb: 0.28,
                  adjective: 0.15,
                  adverb: 0.12,
                  other: 0.10
                }
              },
              syntactic: {
                avgSentenceLength: 18.5,
                sentenceTypeDistribution: {
                  declarative: 0.65,
                  interrogative: 0.20,
                  exclamatory: 0.12,
                  imperative: 0.03
                },
                punctuationPattern: {
                  exclamationDensity: 0.15,
                  questionDensity: 0.08,
                  ellipsisDensity: 0.03
                }
              },
              professional: {
                technicalTermUsage: 0.12,
                dataCitationStyle: {
                  usesNumbers: true,
                  citesPercentages: true,
                  mentionsStudies: false
                },
                industryKnowledgeLevel: 'expert'
              },
              typeBasedStylesCount: 8
            },
            analyzedAt: '2025-01-15T11:00:00.000Z'
          }
        }
      }
    ],
    example: `curl -X POST "/api/writing-analysis/analyze-style" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{"username": "elonmusk", "forceUpdate": false}'`
  },

  {
    id: 'get-style-profile',
    method: 'GET',
    path: '/api/writing-analysis/analyze-style',
    title: '获取用户风格档案',
    description: '获取用户已分析的风格档案数据',
    queryParams: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      },
      {
        name: 'detailed',
        type: 'boolean',
        required: false,
        description: '是否返回详细特征数据',
        example: true
      }
    ],
    responses: [
      {
        status: 200,
        description: '查询成功',
        example: {
          success: true,
          data: {
            username: 'elonmusk',
            lastAnalyzedAt: '2025-01-15T11:00:00.000Z',
            basicFeatures: {
              vocabDiversity: 0.67,
              wordComplexity: 2.1,
              avgSentenceLength: 18.5,
              technicalTermUsage: 0.12,
              industryKnowledgeLevel: 'expert'
            },
            detailedFeatures: {
              signatureWords: [
                { word: 'AI', frequency: 42, tfidf: 15.6 }
              ],
              tweetTypeStyles: {
                '研究/数据': {
                  commonOpenings: ['数据显示', '根据研究'],
                  commonClosings: ['...', '值得关注'],
                  avgLength: 145,
                  toneFeatures: {
                    enthusiasm: 0.3,
                    formality: 0.8,
                    certainty: 0.7,
                    emotion: 0.2
                  }
                }
              }
            }
          }
        }
      }
    ],
    example: `curl -X GET "/api/writing-analysis/analyze-style?username=elonmusk&detailed=true" \\
  -H "X-API-Key: unicatcher-api-key-demo"`
  },

  {
    id: 'complete-analysis',
    method: 'POST',
    path: '/api/writing-analysis/complete-analysis',
    title: '完整写作分析流程',
    description: '执行完整的写作分析流程：数据合并→类型分析→风格分析，一键完成所有步骤',
    params: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      },
      {
        name: 'steps',
        type: 'array',
        required: false,
        description: '要执行的步骤',
        options: ['merge', 'types', 'style'],
        example: ['merge', 'types', 'style']
      },
      {
        name: 'options',
        type: 'object',
        required: false,
        description: '分析选项配置',
        example: {
          forceUpdate: false,
          typeAnalysisLimit: 200,
          styleAnalysisLimit: 500
        }
      }
    ],
    responses: [
      {
        status: 200,
        description: '完整分析成功',
        example: {
          success: true,
          message: 'Complete analysis finished for user: elonmusk',
          data: {
            username: 'elonmusk',
            steps: ['merge', 'types', 'style'],
            results: {
              merge: {
                success: true,
                totalMerged: 456,
                fromTweetTable: 400,
                fromManualTable: 56
              },
              types: {
                success: true,
                typeDistribution: {
                  '洞见/观点/观察': { count: 45, percentage: 23 }
                },
                analyzedLimit: 200
              },
              style: {
                success: true,
                basicFeatures: {
                  vocabDiversity: 0.67,
                  wordComplexity: 2.1,
                  avgSentenceLength: 18.5,
                  technicalTermUsage: 0.12,
                  industryKnowledgeLevel: 'expert'
                },
                typeBasedStylesCount: 8
              }
            },
            processingTime: '12340ms',
            completedAt: '2025-01-15T11:15:00.000Z'
          }
        }
      },
      {
        status: 500,
        description: '部分步骤失败',
        example: {
          success: false,
          error: 'Style analysis failed: insufficient data',
          data: {
            username: 'elonmusk',
            completedSteps: ['merge', 'types'],
            partialResults: {
              merge: { success: true },
              types: { success: true }
            },
            processingTime: '8500ms'
          }
        }
      }
    ],
    example: `curl -X POST "/api/writing-analysis/complete-analysis" \\
  -H "X-API-Key: unicatcher-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "elonmusk",
    "steps": ["merge", "types", "style"],
    "options": {
      "forceUpdate": false,
      "typeAnalysisLimit": 200,
      "styleAnalysisLimit": 500
    }
  }'`
  },

  {
    id: 'get-analysis-status',
    method: 'GET',
    path: '/api/writing-analysis/complete-analysis',
    title: '获取分析状态',
    description: '查看用户的完整分析状态，了解各个步骤的完成情况',
    queryParams: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: '目标用户名',
        example: 'elonmusk'
      }
    ],
    responses: [
      {
        status: 200,
        description: '状态查询成功',
        example: {
          success: true,
          data: {
            username: 'elonmusk',
            analysisStatus: {
              dataReady: true,
              typesAnalyzed: true,
              styleAnalyzed: true,
              tweetCount: 456,
              typeAnnotationCount: 200,
              lastStyleUpdate: '2025-01-15T11:00:00.000Z'
            },
            queriedAt: '2025-01-15T11:20:00.000Z'
          }
        }
      }
    ],
    example: `curl -X GET "/api/writing-analysis/complete-analysis?username=elonmusk" \\
  -H "X-API-Key: unicatcher-api-key-demo"`
  }
];