import { db } from '~/server/db';
import { deduplicationManager } from './cache-manager';

// 风格特征接口定义
export interface StyleFeatures {
  // 词汇特征
  lexical: {
    signatureWords: Array<{word: string, frequency: number, tfidf: number}>;
    vocabDiversity: number; // TTR
    wordComplexity: number; // 平均词长
    posDistribution: Record<string, number>; // 词性分布
  };

  // 句式特征
  syntactic: {
    avgSentenceLength: number;
    sentenceTypeDistribution: {
      declarative: number;    // 陈述句
      interrogative: number;  // 疑问句
      exclamatory: number;   // 感叹句
      imperative: number;    // 祈使句
    };
    punctuationPattern: {
      exclamationDensity: number;  // 感叹号密度
      questionDensity: number;     // 问号密度
      ellipsisDensity: number;     // 省略号密度
    };
  };

  // 推文类型相关风格差异
  typeBasedStyles: Record<string, {
    commonOpenings: string[];
    commonClosings: string[];
    avgLength: number;
    toneFeatures: Record<string, number>;
  }>;

  // 专业度特征
  professional: {
    technicalTermUsage: number; // 专业术语使用频率
    dataCitationStyle: {
      usesNumbers: boolean;
      citesPercentages: boolean;
      mentionsStudies: boolean;
    };
    industryKnowledgeLevel: 'basic' | 'intermediate' | 'expert';
  };
}

export class StyleAnalysisService {

  // 常见英文停用词列表
  private readonly ENGLISH_STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with',
    'or', 'via', 'but', 'not', 'can', 'if', 'this', 'you', 'your', 'their', 'our',
    'we', 'they', 'them', 'what', 'when', 'where', 'who', 'why', 'how', 'all', 'each',
    'every', 'some', 'any', 'few', 'more', 'most', 'other', 'such', 'no', 'nor', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'visual', 'example', 'system'
  ]);

  // 常见中文停用词列表
  private readonly CHINESE_STOPWORDS = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没', '看', '好',
    '自己', '这', '那', '里', '与', '及', '而', '等', '对', '把', '或', '被', '让',
    '由', '但', '可以', '已经', '还', '从', '给', '用', '吗', '啊', '呢', '吧'
  ]);

  // 文本预处理：简单的中文分词和清理
  private preprocessText(content: string): {
    sentences: string[];
    words: string[];
    cleanedText: string;
  } {
    // 移除URL、@mentions、#hashtags
    let cleanedText = content
      .replace(/https?:\/\/[^\s]+/g, '[LINK]')
      .replace(/@[^\s]+/g, '[MENTION]')
      .replace(/#[^\s]+/g, '[HASHTAG]');

    // 简单句子分割
    const sentences = cleanedText
      .split(/[。！？\n]/)
      .filter(s => s.trim().length > 0);

    // 简单分词：按标点符号和空格分割
    const words = cleanedText
      .replace(/[，。！？；：""''（）【】]/g, ' ')
      .split(/\s+/)
      .filter(w => {
        // 过滤条件：
        // 1. 长度大于0
        if (w.length === 0) return false;

        // 2. 排除特殊标记
        if (w === '[LINK]' || w === '[MENTION]' || w === '[HASHTAG]') return false;

        // 3. 排除纯数字
        if (/^\d+$/.test(w)) return false;

        // 4. 排除纯英文单字符
        if (/^[a-zA-Z]$/.test(w)) return false;

        // 5. 排除英文停用词（转小写匹配）
        if (/^[a-zA-Z]+$/.test(w) && this.ENGLISH_STOPWORDS.has(w.toLowerCase())) return false;

        // 6. 排除中文停用词
        if (this.CHINESE_STOPWORDS.has(w)) return false;

        // 7. 至少包含一个中文字符或长度>1的英文词
        const hasChinese = /[\u4e00-\u9fa5]/.test(w);
        const isLongEnglish = /^[a-zA-Z]{2,}$/.test(w) && w.length >= 3;

        return hasChinese || isLongEnglish;
      });

    return { sentences, words, cleanedText };
  }

  // 计算词汇特征
  private analyzeLexicalFeatures(tweets: Array<{content: string}>): StyleFeatures['lexical'] {
    const allWords: string[] = [];
    const wordCounts: Record<string, number> = {};

    tweets.forEach(tweet => {
      const { words } = this.preprocessText(tweet.content);
      allWords.push(...words);

      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    // 词汇丰富度 (TTR)
    const uniqueWords = Object.keys(wordCounts).length;
    const totalWords = allWords.length;
    const vocabDiversity = totalWords > 0 ? uniqueWords / totalWords : 0;

    // 词汇复杂度（平均词长）
    const wordComplexity = allWords.length > 0
      ? allWords.reduce((sum, word) => sum + word.length, 0) / allWords.length
      : 0;

    // 提取高频词（简化的TF-IDF）
    const signatureWords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 50)
      .map(([word, freq]) => ({
        word,
        frequency: freq,
        tfidf: freq * Math.log(tweets.length / 1) // 简化版TF-IDF
      }));

    // 词性分布（简化：根据词的特征模拟）
    const posDistribution = this.estimatePOSDistribution(allWords);

    return {
      signatureWords,
      vocabDiversity,
      wordComplexity,
      posDistribution
    };
  }

  // 简化的词性分布估算
  private estimatePOSDistribution(words: string[]): Record<string, number> {
    const pos: Record<string, number> = {
      noun: 0,      // 名词
      verb: 0,      // 动词
      adjective: 0, // 形容词
      adverb: 0,    // 副词
      other: 0      // 其他
    };

    words.forEach(word => {
      // 简单的规则判断（实际项目中应使用专业分词工具）
      if (/^(我|你|他|她|它|我们|你们|他们|她们)$/.test(word)) {
        pos.other = (pos.other || 0) + 1; // 代词归为其他
      } else if (/^(是|有|在|做|去|来|看|说|想|觉得|认为|发现)/.test(word)) {
        pos.verb = (pos.verb || 0) + 1;
      } else if (/^(很|非常|特别|比较|还|都|也|就)/.test(word)) {
        pos.adverb = (pos.adverb || 0) + 1;
      } else if (/^(好|坏|大|小|新|旧|高|低|快|慢)/.test(word)) {
        pos.adjective = (pos.adjective || 0) + 1;
      } else if (word.length >= 2) {
        pos.noun = (pos.noun || 0) + 1; // 长词多为名词
      } else {
        pos.other = (pos.other || 0) + 1;
      }
    });

    const total = Object.values(pos).reduce((sum, count) => sum + count, 0);

    // 转换为比例
    Object.keys(pos).forEach(key => {
      const currentValue = pos[key as keyof typeof pos] || 0;
      pos[key as keyof typeof pos] = total > 0 ? currentValue / total : 0;
    });

    return pos;
  }

  // 计算句式特征
  private analyzeSyntacticFeatures(tweets: Array<{content: string}>): StyleFeatures['syntactic'] {
    let totalSentences = 0;
    let totalLength = 0;

    const sentenceTypes = {
      declarative: 0,
      interrogative: 0,
      exclamatory: 0,
      imperative: 0
    };

    const punctuationCounts = {
      exclamation: 0,
      question: 0,
      ellipsis: 0,
      total: 0
    };

    tweets.forEach(tweet => {
      const { sentences } = this.preprocessText(tweet.content);

      sentences.forEach(sentence => {
        totalSentences++;
        totalLength += sentence.length;

        // 句型分类
        if (sentence.includes('？') || /吗|呢|么/.test(sentence)) {
          sentenceTypes.interrogative++;
        } else if (sentence.includes('！')) {
          sentenceTypes.exclamatory++;
        } else if (/^(请|让|要|别|不要|应该)/.test(sentence)) {
          sentenceTypes.imperative++;
        } else {
          sentenceTypes.declarative++;
        }
      });

      // 标点符号统计
      punctuationCounts.exclamation += (tweet.content.match(/！/g) || []).length;
      punctuationCounts.question += (tweet.content.match(/？/g) || []).length;
      punctuationCounts.ellipsis += (tweet.content.match(/…/g) || []).length;
      punctuationCounts.total += tweet.content.length;
    });

    // 计算平均句长
    const avgSentenceLength = totalSentences > 0 ? totalLength / totalSentences : 0;

    // 句型分布（转换为比例）
    const sentenceTypeDistribution = {
      declarative: totalSentences > 0 ? sentenceTypes.declarative / totalSentences : 0,
      interrogative: totalSentences > 0 ? sentenceTypes.interrogative / totalSentences : 0,
      exclamatory: totalSentences > 0 ? sentenceTypes.exclamatory / totalSentences : 0,
      imperative: totalSentences > 0 ? sentenceTypes.imperative / totalSentences : 0,
    };

    // 标点符号模式
    const punctuationPattern = {
      exclamationDensity: punctuationCounts.total > 0 ? punctuationCounts.exclamation / tweets.length : 0,
      questionDensity: punctuationCounts.total > 0 ? punctuationCounts.question / tweets.length : 0,
      ellipsisDensity: punctuationCounts.total > 0 ? punctuationCounts.ellipsis / tweets.length : 0,
    };

    return {
      avgSentenceLength,
      sentenceTypeDistribution,
      punctuationPattern
    };
  }

  // 分析推文类型相关的风格差异
  private async analyzeTypeBasedStyles(username: string): Promise<StyleFeatures['typeBasedStyles']> {
    // 获取用户的类型标注数据
    const typeAnnotations = await db.tweetTypeAnnotation.findMany({
      where: { username },
      include: { tweet: true }
    });

    const typeBasedStyles: Record<string, {
      commonOpenings: string[];
      commonClosings: string[];
      avgLength: number;
      toneFeatures: Record<string, number>;
    }> = {};

    // 按类型分组分析
    const typeGroups: Record<string, Array<{content: string}>> = {};

    typeAnnotations.forEach(annotation => {
      const types = JSON.parse(annotation.tweetTypes) as Record<string, number>;

      Object.entries(types).forEach(([type, weight]) => {
        if (weight > 0.3) { // 只考虑权重较高的类型
          if (!typeGroups[type]) {
            typeGroups[type] = [];
          }
          typeGroups[type].push({ content: annotation.tweet.content });
        }
      });
    });

    // 分析每个类型的特征
    Object.entries(typeGroups).forEach(([type, tweets]) => {
      if (tweets.length < 5) return; // 样本太少跳过

      // 提取开头和结尾模式
      const openings: string[] = [];
      const closings: string[] = [];
      let totalLength = 0;

      tweets.forEach(tweet => {
        const content = tweet.content;
        totalLength += content.length;

        // 提取开头（前10个字符的模式）
        const opening = content.substring(0, Math.min(10, content.length));
        openings.push(opening);

        // 提取结尾（后10个字符的模式）
        const closing = content.substring(Math.max(0, content.length - 10));
        closings.push(closing);
      });

      // 找出高频开头和结尾
      const commonOpenings = this.findCommonPatterns(openings).slice(0, 5);
      const commonClosings = this.findCommonPatterns(closings).slice(0, 5);

      typeBasedStyles[type] = {
        commonOpenings,
        commonClosings,
        avgLength: tweets.length > 0 ? totalLength / tweets.length : 0,
        toneFeatures: this.analyzeToneFeatures(tweets)
      };
    });

    return typeBasedStyles;
  }

  // 找出高频模式
  private findCommonPatterns(patterns: string[]): string[] {
    const counts: Record<string, number> = {};

    patterns.forEach(pattern => {
      // 提取前几个字符作为模式
      const key = pattern.substring(0, Math.min(5, pattern.length));
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([pattern]) => pattern);
  }

  // 分析语气特征
  private analyzeToneFeatures(tweets: Array<{content: string}>): Record<string, number> {
    const toneFeatures = {
      enthusiasm: 0,  // 热情度
      formality: 0,   // 正式度
      certainty: 0,   // 确定性
      emotion: 0      // 情感强度
    };

    tweets.forEach(tweet => {
      const content = tweet.content;

      // 热情度：感叹号、emoji等
      toneFeatures.enthusiasm += (content.match(/[！!]/g) || []).length * 0.1;

      // 正式度：长句子、专业词汇等
      toneFeatures.formality += content.length > 50 ? 0.1 : 0;

      // 确定性：确定词汇
      toneFeatures.certainty += /一定|肯定|确实|必须/.test(content) ? 0.2 : 0;

      // 情感强度：情感词汇
      toneFeatures.emotion += /开心|难过|激动|失望|愤怒/.test(content) ? 0.2 : 0;
    });

    // 标准化
    const tweetCount = tweets.length;
    Object.keys(toneFeatures).forEach(key => {
      toneFeatures[key as keyof typeof toneFeatures] = tweetCount > 0 ? toneFeatures[key as keyof typeof toneFeatures] / tweetCount : 0;
    });

    return toneFeatures;
  }

  // 分析专业度特征
  private analyzeProfessionalFeatures(tweets: Array<{content: string}>): StyleFeatures['professional'] {
    let technicalTermCount = 0;
    let totalWords = 0;

    const citationStyle = {
      usesNumbers: false,
      citesPercentages: false,
      mentionsStudies: false
    };

    tweets.forEach(tweet => {
      const { words } = this.preprocessText(tweet.content);
      totalWords += words.length;

      // 检测专业术语（简化版）
      words.forEach(word => {
        if (/^(算法|数据|模型|系统|架构|框架|API|SDK|分析|优化|性能)/.test(word)) {
          technicalTermCount++;
        }
      });

      // 检测引用风格
      if (/\d+%/.test(tweet.content)) {
        citationStyle.citesPercentages = true;
      }
      if (/\d+(\.\d+)?[万亿千百十]?/.test(tweet.content)) {
        citationStyle.usesNumbers = true;
      }
      if (/研究|报告|调查|数据|显示/.test(tweet.content)) {
        citationStyle.mentionsStudies = true;
      }
    });

    const technicalTermUsage = totalWords > 0 ? technicalTermCount / totalWords : 0;

    // 根据特征判断知识水平
    let industryKnowledgeLevel: 'basic' | 'intermediate' | 'expert' = 'basic';

    if (technicalTermUsage > 0.1 && citationStyle.mentionsStudies) {
      industryKnowledgeLevel = 'expert';
    } else if (technicalTermUsage > 0.05 || citationStyle.usesNumbers) {
      industryKnowledgeLevel = 'intermediate';
    }

    return {
      technicalTermUsage,
      dataCitationStyle: citationStyle,
      industryKnowledgeLevel
    };
  }


  // 按类型分析用户的写作风格
  async analyzeUserStyleByType(username: string, contentType: string): Promise<{
    commonOpenings: string[];
    commonClosings: string[];
    avgContentLength: number;
    avgSentenceLength: number;
    toneFeatures: Record<string, number>;
    vocabDiversity: number;
    wordComplexity: number;
    signatureWords: string[];
    technicalTermUsage: number;
    industryKnowledgeLevel: string;
    sentenceTypeDist: Record<string, number>;
    sampleCount: number;
  }> {
    // 获取该用户该类型的推文
    const typeAnnotations = await db.tweetTypeAnnotation.findMany({
      where: {
        username,
        tweetTypes: {
          contains: contentType
        }
      },
      include: { tweet: true }
    });

    const relevantTweets: Array<{content: string}> = [];

    typeAnnotations.forEach(annotation => {
      const types = JSON.parse(annotation.tweetTypes) as Record<string, number>;
      if (types[contentType] && types[contentType] > 0.3) { // 权重大于0.3才算该类型
        relevantTweets.push({ content: annotation.tweet.content });
      }
    });

    if (relevantTweets.length < 3) {
      throw new Error(`用户 ${username} 的 ${contentType} 类型样本不足（需要至少3条）`);
    }

    // 分析该类型的特征
    const openings: string[] = [];
    const closings: string[] = [];
    let totalLength = 0;
    let totalSentences = 0;
    let totalSentenceLength = 0;
    const allWords: string[] = [];
    const wordCounts: Record<string, number> = {};

    relevantTweets.forEach(tweet => {
      const content = tweet.content;
      totalLength += content.length;

      // 提取开头模式（前15个字符）
      const opening = content.substring(0, Math.min(15, content.length)).trim();
      if (opening.length > 0) openings.push(opening);

      // 提取结尾模式（后15个字符）
      const closing = content.substring(Math.max(0, content.length - 15)).trim();
      if (closing.length > 0) closings.push(closing);

      // 分析句子和词汇
      const { sentences, words } = this.preprocessText(content);
      totalSentences += sentences.length;
      sentences.forEach(s => {
        totalSentenceLength += s.length;
      });

      allWords.push(...words);
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    // 计算词汇特征
    const uniqueWords = Object.keys(wordCounts).length;
    const totalWords = allWords.length;
    const vocabDiversity = totalWords > 0 ? uniqueWords / totalWords : 0;
    const wordComplexity = allWords.length > 0
      ? allWords.reduce((sum, word) => sum + word.length, 0) / allWords.length / 10  // 归一化到0-1
      : 0;

    // 提取签名词汇（高频词）
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // 简单的技术术语检测（包含英文字母或数字的词）
    const technicalWords = allWords.filter(word => /[a-zA-Z0-9]/.test(word));
    const technicalTermUsage = totalWords > 0 ? technicalWords.length / totalWords : 0;

    // 行业知识水平判断（基于技术术语使用率）
    let industryKnowledgeLevel = 'basic';
    if (technicalTermUsage > 0.3) industryKnowledgeLevel = 'expert';
    else if (technicalTermUsage > 0.15) industryKnowledgeLevel = 'intermediate';

    // 句子类型分布（简单判断）
    const sentenceTypeDist = {
      declarative: 0.7,  // 陈述句（默认最多）
      interrogative: 0.1, // 疑问句
      exclamatory: 0.1,  // 感叹句
      imperative: 0.1    // 祈使句
    };

    return {
      commonOpenings: this.findCommonPatterns(openings).slice(0, 5),
      commonClosings: this.findCommonPatterns(closings).slice(0, 5),
      avgContentLength: relevantTweets.length > 0 ? totalLength / relevantTweets.length : 0,
      avgSentenceLength: totalSentences > 0 ? totalSentenceLength / totalSentences : 0,
      toneFeatures: this.analyzeToneFeatures(relevantTweets),
      vocabDiversity,
      wordComplexity,
      signatureWords: sortedWords,
      technicalTermUsage,
      industryKnowledgeLevel,
      sentenceTypeDist,
      sampleCount: relevantTweets.length
    };
  }

  // 保存类型化风格档案到数据库
  async saveUserStyleProfileByType(username: string, contentType: string, styleData: {
    commonOpenings: string[];
    commonClosings: string[];
    avgContentLength: number;
    avgSentenceLength: number;
    toneFeatures: Record<string, number>;
    vocabDiversity: number;
    wordComplexity: number;
    signatureWords: string[];
    technicalTermUsage: number;
    industryKnowledgeLevel: string;
    sentenceTypeDist: Record<string, number>;
    sampleCount: number;
  }): Promise<void> {
    await db.userStyleProfile.upsert({
      where: {
        username_contentType: {
          username,
          contentType
        }
      },
      update: {
        commonOpenings: JSON.stringify(styleData.commonOpenings),
        commonClosings: JSON.stringify(styleData.commonClosings),
        avgContentLength: styleData.avgContentLength,
        avgSentenceLength: styleData.avgSentenceLength,
        toneFeatures: JSON.stringify(styleData.toneFeatures),
        vocabDiversity: styleData.vocabDiversity,
        wordComplexity: styleData.wordComplexity,
        signatureWords: JSON.stringify(styleData.signatureWords),
        technicalTermUsage: styleData.technicalTermUsage,
        industryKnowledgeLevel: styleData.industryKnowledgeLevel,
        sentenceTypeDist: JSON.stringify(styleData.sentenceTypeDist),
        sampleCount: styleData.sampleCount,
        lastAnalyzedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        username,
        contentType,
        commonOpenings: JSON.stringify(styleData.commonOpenings),
        commonClosings: JSON.stringify(styleData.commonClosings),
        avgContentLength: styleData.avgContentLength,
        avgSentenceLength: styleData.avgSentenceLength,
        toneFeatures: JSON.stringify(styleData.toneFeatures),
        vocabDiversity: styleData.vocabDiversity,
        wordComplexity: styleData.wordComplexity,
        signatureWords: JSON.stringify(styleData.signatureWords),
        technicalTermUsage: styleData.technicalTermUsage,
        industryKnowledgeLevel: styleData.industryKnowledgeLevel,
        sentenceTypeDist: JSON.stringify(styleData.sentenceTypeDist),
        sampleCount: styleData.sampleCount,
        lastAnalyzedAt: new Date()
      }
    });

    console.log(`用户 ${username} 的 ${contentType} 类型风格档案已保存`);
  }

  // 批量更新用户的所有类型风格档案
  async updateUserAllTypeProfiles(username: string): Promise<void> {
    // 使用去重管理器防止并发更新
    return await deduplicationManager.deduplicate(
      `update_style_profiles:${username}`,
      async () => {
        // 获取用户所有的类型标注
        const typeAnnotations = await db.tweetTypeAnnotation.findMany({
          where: { username }
        });

        // 统计各类型的推文数量
        const typeStats: Record<string, number> = {};
        typeAnnotations.forEach(annotation => {
          const types = JSON.parse(annotation.tweetTypes) as Record<string, number>;
          Object.entries(types).forEach(([type, weight]) => {
            if (weight > 0.3) {
              typeStats[type] = (typeStats[type] || 0) + 1;
            }
          });
        });

        // 只为样本数量充足的类型生成档案
        const validTypes = Object.entries(typeStats)
          .filter(([type, count]) => count >= 3)
          .map(([type]) => type);

        console.log(`用户 ${username} 将更新 ${validTypes.length} 个类型的风格档案：${validTypes.join(', ')}`);

        // 为每个类型生成风格档案
        for (const contentType of validTypes) {
          try {
            const styleData = await this.analyzeUserStyleByType(username, contentType);
            await this.saveUserStyleProfileByType(username, contentType, styleData);
          } catch (error) {
            console.error(`更新用户 ${username} 的 ${contentType} 类型档案失败:`, error);
          }
        }

        console.log(`用户 ${username} 的类型化风格档案更新完成`);
      }
    );
  }
}

// 导出单例
export const styleAnalysisService = new StyleAnalysisService();