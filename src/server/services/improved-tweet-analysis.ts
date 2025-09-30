// 改进的推文类型分析 - Phase 1优化
import { nlpProcessor, type TokenInfo } from './nlp-processor';

export interface TweetTypeRule {
  name: string;
  category: string;

  // 关键词规则（加权）
  keywords: Array<{
    word: string;
    weight: number;  // 关键词权重
    required?: boolean; // 是否必需
  }>;

  // 模式规则
  patterns: Array<{
    regex: RegExp;
    weight: number;
    description: string;
  }>;

  // 特征规则
  features: {
    minLength?: number;
    maxLength?: number;
    requiresNumbers?: boolean;
    requiresQuestion?: boolean;
    requiresExclamation?: boolean;
    excludeFeatures?: string[]; // 排斥特征
  };

  // 互斥类型
  mutuallyExclusive?: string[];

  // 最小阈值分数
  minScore: number;
}

// 改进的推文类型规则定义
const IMPROVED_TWEET_TYPE_RULES: TweetTypeRule[] = [
  {
    name: '研究/数据',
    category: '内容导向类',
    keywords: [
      { word: '数据', weight: 2.0, required: true },
      { word: '研究', weight: 2.0 },
      { word: '报告', weight: 1.8 },
      { word: '调查', weight: 1.8 },
      { word: '统计', weight: 1.5 },
      { word: '显示', weight: 1.2 },
      { word: '发现', weight: 1.0 },
      { word: '结果', weight: 1.0 },
      { word: '分析', weight: 1.0 },
      { word: '实验', weight: 1.5 }
    ],
    patterns: [
      { regex: /\d+%/, weight: 2.0, description: '包含百分比' },
      { regex: /\d+倍/, weight: 1.5, description: '包含倍数' },
      { regex: /增长了?\d+/, weight: 1.5, description: '增长数据' },
      { regex: /(据|根据).*(显示|表明|指出)/, weight: 1.8, description: '数据引用格式' },
      { regex: /(研究|调查|报告)(显示|表明|发现)/, weight: 2.0, description: '研究结论格式' }
    ],
    features: {
      requiresNumbers: true,
      excludeFeatures: ['hasQuestion'] // 研究数据类通常不是疑问句
    },
    minScore: 3.0
  },

  {
    name: '教程/技巧',
    category: '内容导向类',
    keywords: [
      { word: '教程', weight: 2.5, required: false },
      { word: '技巧', weight: 2.0 },
      { word: '方法', weight: 1.5 },
      { word: '如何', weight: 2.0 },
      { word: '步骤', weight: 2.0 },
      { word: '窍门', weight: 1.8 },
      { word: '攻略', weight: 1.8 },
      { word: '指南', weight: 1.8 },
      { word: '经验', weight: 1.2 },
      { word: '分享', weight: 1.0 }
    ],
    patterns: [
      { regex: /第?[一二三四五六七八九十\d]+[步、点、条]/, weight: 2.0, description: '步骤编号' },
      { regex: /\d+[）)]/, weight: 1.8, description: '编号列表' },
      { regex: /(首先|然后|接着|最后|其次)/, weight: 1.5, description: '逻辑连接词' },
      { regex: /(记得|注意|要|需要|应该)/, weight: 1.2, description: '提醒词汇' }
    ],
    features: {
      minLength: 20, // 教程通常较长
      excludeFeatures: ['hasQuestion'] // 教程通常是陈述句
    },
    mutuallyExclusive: ['个人经历/成长'], // 避免与个人经历混淆
    minScore: 2.5
  },

  {
    name: '洞见/观点/观察',
    category: '观点表达类',
    keywords: [
      { word: '发现', weight: 1.8 },
      { word: '观察', weight: 2.0 },
      { word: '思考', weight: 1.8 },
      { word: '洞察', weight: 2.0 },
      { word: '本质', weight: 1.8 },
      { word: '背后', weight: 1.5 },
      { word: '其实', weight: 1.5 },
      { word: '可能', weight: 1.0 },
      { word: '也许', weight: 1.0 },
      { word: '觉得', weight: 1.8 },
      { word: '认为', weight: 1.8 },
      { word: '个人看法', weight: 2.0 }
    ],
    patterns: [
      { regex: /(我觉得|我认为|我想|个人认为)/, weight: 2.0, description: '个人观点表达' },
      { regex: /(可能会|也许会|或许会)/, weight: 1.5, description: '推测性语言' },
      { regex: /(有趣的是|值得注意的是|令人.*的是)/, weight: 1.8, description: '观察性表达' }
    ],
    features: {
      excludeFeatures: ['requiresNumbers'] // 观点类通常不是数据驱动
    },
    minScore: 2.0
  },

  {
    name: '新闻/事件',
    category: '内容导向类',
    keywords: [
      { word: '刚刚', weight: 2.5 },
      { word: '最新', weight: 2.0 },
      { word: '突发', weight: 3.0, required: false },
      { word: '消息', weight: 1.8 },
      { word: '新闻', weight: 2.0 },
      { word: '事件', weight: 1.5 },
      { word: '发生', weight: 1.0 },
      { word: '报道', weight: 2.0 },
      { word: '据悉', weight: 2.0 },
      { word: '官方', weight: 1.5 }
    ],
    patterns: [
      { regex: /(突发|刚刚|最新).{0,10}(消息|新闻|事件)/, weight: 3.0, description: '突发新闻格式' },
      { regex: /(据.*报道|根据.*消息)/, weight: 2.0, description: '新闻来源格式' },
      { regex: /(今天|昨天|刚才).{0,20}(发布|宣布|发生)/, weight: 1.8, description: '时间+事件格式' }
    ],
    features: {
      excludeFeatures: ['hasQuestion'], // 新闻通常是陈述句
      minLength: 15
    },
    mutuallyExclusive: ['个人经历/成长', '洞见/观点/观察'],
    minScore: 2.5
  },

  {
    name: '个人经历/成长',
    category: '生活情感类',
    keywords: [
      { word: '经历', weight: 2.0 },
      { word: '成长', weight: 2.0 },
      { word: '学到', weight: 1.8 },
      { word: '收获', weight: 1.8 },
      { word: '反思', weight: 1.8 },
      { word: '感悟', weight: 1.8 },
      { word: '经验', weight: 1.5 },
      { word: '教训', weight: 1.8 },
      { word: '今天', weight: 1.2 },
      { word: '刚刚', weight: 1.0 },
      { word: '学习', weight: 1.5 }
    ],
    patterns: [
      { regex: /(今天|昨天|这几天).{0,20}(学|做|去|看|听)/, weight: 1.8, description: '日常活动记录' },
      { regex: /(我.*了|刚.*了)/, weight: 1.5, description: '完成时态' },
      { regex: /(感觉|觉得).{0,10}(自己|很)/, weight: 1.5, description: '自我反思' }
    ],
    features: {
      // 个人经历可以有各种特征，不做严格限制
    },
    minScore: 2.0
  }
];

export class ImprovedTweetAnalysisService {
  private rules: TweetTypeRule[];

  constructor() {
    this.rules = IMPROVED_TWEET_TYPE_RULES;
  }

  // 初始化NLP处理器
  async initialize() {
    await nlpProcessor.initialize();
    console.log('✅ 改进的推文分析服务初始化完成');
  }

  // 分析单条推文的类型（改进版）
  async analyzeTweetTypes(content: string): Promise<Array<{
    type: string;
    score: number;
    confidence: number;
    matchedFeatures: string[];
    reason: string;
  }>> {
    // 1. NLP预处理
    const tokens = nlpProcessor.tokenize(content);
    const keywords = nlpProcessor.extractKeywords(content, 15);
    const features = nlpProcessor.analyzeTextFeatures(content);

    // 2. 对每种类型评分
    const typeScores: Array<{
      type: string;
      score: number;
      confidence: number;
      matchedFeatures: string[];
      reason: string;
    }> = [];

    for (const rule of this.rules) {
      const analysis = this.evaluateRule(rule, content, tokens, keywords, features);

      if (analysis.score >= rule.minScore) {
        typeScores.push({
          type: rule.name,
          score: analysis.score,
          confidence: Math.min(analysis.score / (rule.minScore * 2), 1.0),
          matchedFeatures: analysis.matchedFeatures,
          reason: analysis.reason
        });
      }
    }

    // 3. 处理互斥类型
    const filteredResults = this.handleMutualExclusion(typeScores);

    // 4. 按分数排序，最多返回3个类型
    return filteredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  // 评估单个规则
  private evaluateRule(
    rule: TweetTypeRule,
    content: string,
    tokens: TokenInfo[],
    keywords: Array<{word: string, weight: number, pos: string}>,
    features: ReturnType<typeof nlpProcessor.analyzeTextFeatures>
  ): {
    score: number;
    matchedFeatures: string[];
    reason: string;
  } {
    let score = 0;
    const matchedFeatures: string[] = [];
    const reasons: string[] = [];

    // 1. 关键词匹配评分
    let keywordScore = 0;
    let requiredKeywordsMet = true;

    for (const keywordRule of rule.keywords) {
      const found = keywords.find(k => k.word.includes(keywordRule.word) || keywordRule.word.includes(k.word));

      if (found) {
        keywordScore += keywordRule.weight * found.weight;
        matchedFeatures.push(`关键词: ${keywordRule.word}`);
        reasons.push(`匹配关键词"${keywordRule.word}"`);
      } else if (keywordRule.required) {
        requiredKeywordsMet = false;
        break;
      }
    }

    // 如果必需关键词不满足，直接返回0分
    if (!requiredKeywordsMet) {
      return {
        score: 0,
        matchedFeatures: [],
        reason: '缺少必需关键词'
      };
    }

    score += keywordScore;

    // 2. 模式匹配评分
    for (const pattern of rule.patterns) {
      if (pattern.regex.test(content)) {
        score += pattern.weight;
        matchedFeatures.push(`模式: ${pattern.description}`);
        reasons.push(`匹配模式: ${pattern.description}`);
      }
    }

    // 3. 特征检查
    if (rule.features.requiresNumbers && !features.hasNumbers) {
      score *= 0.5; // 降低分数而不是直接排除
      reasons.push('缺少数字特征');
    }

    if (rule.features.requiresQuestion && !features.hasQuestion) {
      score *= 0.5;
      reasons.push('缺少疑问特征');
    }

    if (rule.features.requiresExclamation && !features.hasExclamation) {
      score *= 0.5;
      reasons.push('缺少感叹特征');
    }

    // 4. 排斥特征检查
    if (rule.features.excludeFeatures) {
      for (const excludeFeature of rule.features.excludeFeatures) {
        if (
          (excludeFeature === 'hasQuestion' && features.hasQuestion) ||
          (excludeFeature === 'hasNumbers' && features.hasNumbers)
        ) {
          score *= 0.3; // 大幅降低分数
          reasons.push(`包含排斥特征: ${excludeFeature}`);
        }
      }
    }

    // 5. 长度检查
    if (rule.features.minLength && content.length < rule.features.minLength) {
      score *= 0.7;
      reasons.push('内容长度不足');
    }

    if (rule.features.maxLength && content.length > rule.features.maxLength) {
      score *= 0.8;
      reasons.push('内容过长');
    }

    return {
      score: Math.max(0, score),
      matchedFeatures,
      reason: reasons.length > 0 ? reasons.join(', ') : '未匹配特征'
    };
  }

  // 处理互斥类型
  private handleMutualExclusion(results: Array<{
    type: string;
    score: number;
    confidence: number;
    matchedFeatures: string[];
    reason: string;
  }>): Array<{
    type: string;
    score: number;
    confidence: number;
    matchedFeatures: string[];
    reason: string;
  }> {
    const filtered = [...results];

    // 检查互斥规则
    for (const rule of this.rules) {
      if (!rule.mutuallyExclusive) continue;

      const currentTypeIndex = filtered.findIndex(r => r.type === rule.name);
      if (currentTypeIndex === -1) continue;

      const currentResult = filtered[currentTypeIndex];

      // 检查是否有互斥类型存在且分数更高
      for (const exclusiveType of rule.mutuallyExclusive) {
        const exclusiveIndex = filtered.findIndex(r => r.type === exclusiveType);
        if (exclusiveIndex !== -1) {
          const exclusiveResult = filtered[exclusiveIndex];

          // 保留分数更高的类型
          if (exclusiveResult && currentResult && exclusiveResult.score > currentResult.score) {
            filtered.splice(currentTypeIndex, 1);
            break;
          } else {
            filtered.splice(exclusiveIndex, 1);
          }
        }
      }
    }

    return filtered;
  }

  // 批量分析推文类型
  async batchAnalyzeTweets(tweets: Array<{id: string, content: string}>): Promise<Map<string, Array<{
    type: string;
    score: number;
    confidence: number;
  }>>> {
    const results = new Map();

    for (const tweet of tweets) {
      try {
        const analysis = await this.analyzeTweetTypes(tweet.content);
        results.set(tweet.id, analysis.map(a => ({
          type: a.type,
          score: a.score,
          confidence: a.confidence
        })));
      } catch (error) {
        console.error(`分析推文 ${tweet.id} 失败:`, error);
        results.set(tweet.id, []);
      }
    }

    return results;
  }
}

// 导出单例
export const improvedTweetAnalysisService = new ImprovedTweetAnalysisService();