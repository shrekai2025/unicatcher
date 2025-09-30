import { db } from '~/server/db';
import { ValidationService, globalRateLimiter } from './validation';
import { createAnalysisError, withRetry } from './error-handling';
import { analysisCacheManager, deduplicationManager } from './cache-manager';
import { WritingAssistantConfigLoader } from '~/server/core/ai/writing-assistant-config-loader';
import { AIServiceFactory } from '~/server/core/ai/ai-factory';

// 推文类型定义
export const TWEET_TYPES = {
  // 内容导向类
  '新闻/事件': {
    category: '内容导向类',
    keywords: ['刚刚', '最新', '突发', '消息', '新闻', '事件', '发生', '报道', '据悉'],
    patterns: ['时间词 + 事件描述', '消息来源 + 事实陈述'],
    tone: 'objective'
  },
  '研究/数据': {
    category: '内容导向类',
    keywords: ['数据', '研究', '报告', '调查', '统计', '显示', '发现', '结果', '分析', '%', '倍', '增长'],
    patterns: ['数据引用', '研究结论', '趋势分析'],
    tone: 'analytical'
  },
  '科普': {
    category: '内容导向类',
    keywords: ['科普', '原理', '为什么', '如何', '什么是', '解释', '机制', '原因', '科学'],
    patterns: ['问题 + 解释', '概念 + 阐述'],
    tone: 'educational'
  },
  '教程/技巧': {
    category: '内容导向类',
    keywords: ['教程', '技巧', '方法', '如何', '步骤', '窍门', '攻略', '指南', '经验'],
    patterns: ['步骤描述', '方法分享', '技巧总结'],
    tone: 'instructional'
  },
  '产品使用记录与介绍': {
    category: '内容导向类',
    keywords: ['使用', '体验', '测试', '试用', '功能', '特性', '性能', '效果', '操作', '界面', '配置', '版本', '更新'],
    patterns: ['产品介绍 + 使用体验', '功能演示 + 效果记录', '使用场景 + 实际感受'],
    tone: 'experiential'
  },

  // 观点表达类
  '时事评论': {
    category: '观点表达类',
    keywords: ['评论', '看法', '观点', '认为', '觉得', '应该', '不应该', '问题', '分析'],
    patterns: ['事件 + 个人观点', '现象 + 评论'],
    tone: 'opinionated'
  },
  '洞见/观点/观察': {
    category: '观点表达类',
    keywords: ['发现', '观察', '思考', '洞察', '本质', '背后', '其实', '可能', '也许'],
    patterns: ['观察 + 洞见', '现象 + 深层思考'],
    tone: 'reflective'
  },
  '价值观表达': {
    category: '观点表达类',
    keywords: ['相信', '坚持', '价值', '原则', '重要', '意义', '应当', '必须'],
    patterns: ['价值观陈述', '理念表达'],
    tone: 'philosophical'
  },

  // 生活情感类
  '日常生活': {
    category: '生活情感类',
    keywords: ['今天', '昨天', '刚刚', '早上', '晚上', '吃', '喝', '看', '听', '买'],
    patterns: ['时间 + 活动', '生活场景描述'],
    tone: 'casual'
  },
  '心情表达': {
    category: '生活情感类',
    keywords: ['开心', '高兴', '难过', '累', '焦虑', '兴奋', '失望', '满足', '感动'],
    patterns: ['情绪词 + 原因', '感受表达'],
    tone: 'emotional'
  },
  '个人经历/成长': {
    category: '生活情感类',
    keywords: ['经历', '成长', '学到', '收获', '反思', '感悟', '经验', '教训'],
    patterns: ['经历描述 + 感悟', '成长总结'],
    tone: 'reflective'
  },

  // 互动传播类
  '资源分享': {
    category: '互动传播类',
    keywords: ['推荐', '分享', '好用', '不错', '值得', '链接', 'http', '资源'],
    patterns: ['推荐理由 + 资源', '使用体验分享'],
    tone: 'sharing'
  },
  '互动话题': {
    category: '互动传播类',
    keywords: ['大家', '你们', '怎么看', '什么看法', '讨论', '话题', '投票'],
    patterns: ['话题抛出 + 互动引导', '问题 + 征求意见'],
    tone: 'interactive'
  },
  '搞笑': {
    category: '互动传播类',
    keywords: ['哈哈', '搞笑', '有趣', '好玩', '逗', '笑', '幽默'],
    patterns: ['段子', '幽默观察', '搞笑吐槽'],
    tone: 'humorous'
  },
  '推广/促销': {
    category: '互动传播类',
    keywords: ['限时', '优惠', '折扣', '特价', '促销', '活动', '福利', '免费', '赠送', '抢购', '秒杀', '新品', '上线', '发布'],
    patterns: ['产品/服务介绍 + 优惠信息', '活动通知 + 行动号召', '限时优惠 + 紧迫感'],
    tone: 'promotional'
  }
} as const;

export type TweetType = keyof typeof TWEET_TYPES;

// 推文类型分析服务
export class TweetAnalysisService {


  // LLM驱动的类型分析
  private async analyzeByLLM(content: string): Promise<Array<{type: TweetType, score: number, reason: string}>> {
    // 构建所有可用类型的完整描述
    const allTypes = Object.entries(TWEET_TYPES).map(([type, config]) => {
      return `- ${type}: ${config.category} - ${config.patterns.join('，')}`;
    }).join('\n');

    const prompt = `请分析以下推文属于哪些类型。你需要准确识别推文的核心内容特征，可以选择1-2个最匹配的类型。

推文内容：${content}

可选类型：
${allTypes}

分析要求：
1. 仔细理解推文的主要内容和表达方式
2. 选择1-2个最匹配的类型
3. 给出每个类型的匹配度（0.1-1.0之间的小数）
4. 提供简要的选择理由

**重要：必须返回标准JSON格式，所有字符串值必须使用双引号(")，不能使用单引号(')！**

输出格式（严格的JSON）：
{
  "types": [
    {"type": "类型名称", "score": 0.8, "reason": "选择理由"}
  ]
}

示例输出：
{
  "types": [
    {"type": "观点见解", "score": 0.9, "reason": "推文表达了对某个问题的深入见解"}
  ]
}`;

    try {
      // 调用写作辅助AI配置
      const config = await WritingAssistantConfigLoader.getAnalysisConfig();
      const aiService = AIServiceFactory.createService({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: config.baseURL
      });

      const result = await aiService.generateText(prompt);

      // 清理可能的 markdown 代码块标记和其他格式
      let cleanedResult = result.trim();

      // 移除 markdown 代码块标记
      if (cleanedResult.startsWith('```json')) {
        cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // 尝试从响应中提取 JSON 对象
      // 匹配第一个 { 到最后一个 }
      const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResult = jsonMatch[0];
      }

      let parsed;
      try {
        // 直接尝试解析标准JSON
        parsed = JSON.parse(cleanedResult);
      } catch (firstError) {
        // 第一次解析失败，尝试修复
        console.warn('JSON解析失败，尝试修复...原始内容:', cleanedResult.substring(0, 200));

        try {
          // 修复策略1: 处理单引号值（但保留reason中的引号内容）
          let fixedResult = cleanedResult;

          // 将值中使用单引号的情况改为双引号，同时转义内部的双引号和反斜杠
          fixedResult = fixedResult.replace(/"([^"]+)":\s*'([^']*(?:'[^']*)*)'(?=\s*[,}])/g, (match, key, value) => {
            // 先转义反斜杠，再转义双引号
            const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${key}": "${escaped}"`;
          });

          parsed = JSON.parse(fixedResult);
          console.log('JSON修复成功');
        } catch (secondError) {
          // 修复策略2: 使用更激进的方法
          console.warn('第一次修复失败，尝试更激进的修复...');

          try {
            // 移除所有字符串值中的转义单引号
            let aggressiveFix = cleanedResult;

            // 将 \' 替换为普通单引号，然后再处理
            aggressiveFix = aggressiveFix.replace(/\\'/g, "'");

            // 将单引号值转为双引号
            aggressiveFix = aggressiveFix.replace(/"([^"]+)":\s*'([^']*)'(?=\s*[,}])/g, (match, key, value) => {
              // 转义内部的双引号和反斜杠
              const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              return `"${key}": "${escaped}"`;
            });

            parsed = JSON.parse(aggressiveFix);
            console.log('激进修复成功');
          } catch (thirdError) {
            console.error('JSON修复失败，原始响应:', result.substring(0, 500));
            throw firstError;
          }
        }
      }

      if (parsed.types && Array.isArray(parsed.types)) {
        return parsed.types.filter((item: any) =>
          item.type &&
          item.score &&
          item.reason &&
          Object.keys(TWEET_TYPES).includes(item.type)
        );
      }

      throw new Error('Invalid LLM response format');

    } catch (error) {
      console.error('LLM类型分析失败:', error);
      throw new Error(`推文类型分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 分析单条推文的类型
  async analyzeTweetTypes(content: string): Promise<Array<{type: TweetType, score: number, reason: string}>> {
    if (!content || content.trim().length === 0) {
      return [{ type: '日常生活', score: 0.5, reason: '空白内容默认分类' }];
    }

    // 使用LLM进行类型分析
    const results = await this.analyzeByLLM(content);

    // 确保至少有一个类型
    if (results.length === 0) {
      return [{ type: '日常生活', score: 0.5, reason: '无法确定具体类型，默认为日常生活' }];
    }

    return results;
  }

  // 批量分析推文类型
  async batchAnalyzeTweets(username: string, limit: number = 100): Promise<{ analyzedCount: number }> {
    // 输入验证
    const validatedUsername = ValidationService.validateUsername(username);
    const validatedLimit = Math.min(Math.max(limit, 1), 500);

    // 速率限制检查
    globalRateLimiter.checkRate(`batch_analyze:${validatedUsername}`);

    // 去重处理
    return await deduplicationManager.deduplicate(
      `batch_analyze:${validatedUsername}:${validatedLimit}`,
      async () => {
        try {
          // 检查缓存
          const cached = analysisCacheManager.getUserTypeDistribution(validatedUsername);
          if (cached) {
            console.log(`使用缓存的类型分布: ${validatedUsername}`);
            return { analyzedCount: 0 }; // 返回0表示使用缓存，无需重新分析
          }

          // 先获取所有推文数量
          const totalTweets = await db.writingAnalysisTweet.count({
            where: { userUsername: validatedUsername }
          });

          if (totalTweets === 0) {
            throw createAnalysisError('NO_TWEETS_FOUND', `用户 ${validatedUsername} 没有推文数据`);
          }

          if (totalTweets < 10) {
            throw createAnalysisError('INSUFFICIENT_DATA', `推文数量过少 (${totalTweets}条)，无法进行可靠分析（需要至少10条）`);
          }

          // 获取已标注的推文ID
          const annotatedTweetIds = await db.tweetTypeAnnotation.findMany({
            where: { username: validatedUsername },
            select: { tweetId: true }
          });
          const annotatedIds = annotatedTweetIds.map(r => r.tweetId);

          console.log(`用户 ${validatedUsername} 已标注推文数: ${annotatedIds.length}条，总推文数: ${totalTweets}条`);

          // 获取未标注的推文（跳过已分析的推文）
          const tweets = await db.writingAnalysisTweet.findMany({
            where: {
              userUsername: validatedUsername,
              id: {
                notIn: annotatedIds
              }
            },
            take: validatedLimit,
            orderBy: { publishedAt: 'asc' }
          });

          // 如果没有未标注的推文
          if (tweets.length === 0) {
            console.log(`用户 ${validatedUsername} 的所有推文都已标注完成，无需重新分析`);

            // 但仍然需要更新风格档案（基于已有的标注数据）
            try {
              // 更新缓存
              const distribution = await this.getUserTypeDistribution(validatedUsername);
              analysisCacheManager.setUserTypeDistribution(validatedUsername, distribution);

              // 更新用户的类型化风格档案
              const { styleAnalysisService } = await import('./style-analysis');
              await styleAnalysisService.updateUserAllTypeProfiles(validatedUsername);
              console.log(`用户 ${validatedUsername} 的类型化风格档案已基于现有标注更新`);
            } catch (error) {
              console.error(`更新风格档案失败:`, error);
            }

            return { analyzedCount: 0 };
          }

          // 如果未标注推文不足但有已标注推文，说明大部分推文已经分析过
          if (tweets.length < 10 && annotatedIds.length > 0) {
            console.log(`用户 ${validatedUsername} 还有 ${tweets.length} 条未标注推文，将继续分析这些推文`);
          }

          console.log(`开始分析 ${tweets.length} 条推文的类型...`);

          // 批量处理推文 - 减小并发数避免API限流
          const batchSize = 5; // 减小批处理大小从20到5
          let successCount = 0;
          let failureCount = 0;

          for (let i = 0; i < tweets.length; i += batchSize) {
            const batch = tweets.slice(i, i + batchSize);
            console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(tweets.length / batchSize)} (${batch.length}条)`);

            await Promise.all(batch.map(async (tweet) => {
              try {
                const typeResults = await withRetry(
                  () => this.analyzeTweetTypes(tweet.content),
                  2
                );

                // 构建类型权重分布
                const typeDistribution: Record<string, number> = {};
                let totalScore = typeResults.reduce((sum, r) => sum + r.score, 0);

                if (totalScore > 0) {
                  typeResults.forEach(result => {
                    typeDistribution[result.type] = result.score / totalScore;
                  });
                } else {
                  typeDistribution['日常生活'] = 1.0;
                }

                // 保存标注结果
                await db.tweetTypeAnnotation.create({
                  data: {
                    tweetId: tweet.id,
                    username: tweet.userUsername,
                    tweetTypes: JSON.stringify(typeDistribution),
                    confidenceScore: typeResults[0]?.score || 0.5,
                    annotationMethod: 'auto',
                    annotatedAt: new Date()
                  }
                });

                successCount++;
                console.log(`✓ 推文 ${successCount}/${tweets.length} 标注完成:`, Object.keys(typeDistribution).join(', '));

              } catch (error) {
                failureCount++;
                console.error(`✗ 推文分析失败 (${failureCount}):`, error instanceof Error ? error.message : error);
                // 继续处理其他推文
              }
            }));

            // 批次间延迟 - 增加延迟避免API限流
            if (i + batchSize < tweets.length) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 从500ms增加到1000ms
            }
          }

          console.log(`分析完成: 成功 ${successCount} 条, 失败 ${failureCount} 条`);

          // 更新缓存
          const distribution = await this.getUserTypeDistribution(validatedUsername);
          analysisCacheManager.setUserTypeDistribution(validatedUsername, distribution);

          // 自动更新用户的类型化风格档案
          try {
            const { styleAnalysisService } = await import('./style-analysis');
            await styleAnalysisService.updateUserAllTypeProfiles(validatedUsername);
            console.log(`用户 ${validatedUsername} 的类型化风格档案已自动更新`);
          } catch (error) {
            console.error(`自动更新风格档案失败:`, error);
            // 不阻断主流程
          }

          console.log(`用户 ${validatedUsername} 的推文类型分析完成！`);

          return { analyzedCount: tweets.length };

        } catch (error) {
          console.error('批量分析推文类型失败:', error);
          throw error;
        }
      }
    );
  }

  // 获取用户的推文类型分布
  async getUserTypeDistribution(username: string): Promise<Record<TweetType, {count: number, percentage: number}>> {
    const annotations = await db.tweetTypeAnnotation.findMany({
      where: { username }
    });

    const typeStats: Record<string, number> = {};
    let totalTweets = 0;

    annotations.forEach(annotation => {
      const types = JSON.parse(annotation.tweetTypes) as Record<string, number>;
      Object.entries(types).forEach(([type, weight]) => {
        typeStats[type] = (typeStats[type] || 0) + weight;
        totalTweets += weight;
      });
    });

    // 计算百分比
    const result: Record<string, {count: number, percentage: number}> = {};
    Object.entries(typeStats).forEach(([type, count]) => {
      result[type] = {
        count: Math.round(count),
        percentage: Math.round((count / totalTweets) * 100)
      };
    });

    return result as Record<TweetType, {count: number, percentage: number}>;
  }
}

// 导出单例
export const tweetAnalysisService = new TweetAnalysisService();