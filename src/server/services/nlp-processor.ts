// 改进的NLP处理器 - Phase 1优化
import jieba from 'nodejieba';

export interface TokenInfo {
  word: string;
  pos: string;
  weight: number; // 词汇权重
}

export class NLPProcessor {
  private customDict: Set<string>;
  private stopWords: Set<string>;
  private initialized = false;

  constructor() {
    // 自定义词典（推特和技术相关术语）
    this.customDict = new Set([
      // 技术术语
      '机器学习', '深度学习', '人工智能', '神经网络', '算法优化',
      '数据科学', '大数据', '云计算', '区块链', '物联网',
      'AI', 'ML', 'DL', 'NLP', 'CV', 'GPU',

      // 研究相关
      '数据显示', '研究表明', '实验结果', '统计分析', '调查发现',
      '论文发表', '学术研究', '科学发现',

      // 推特常用词
      '推文', '转发', '点赞', '评论', '话题', '热搜',
      '网友', '博主', '大V', '粉丝',

      // 情感表达
      '令人惊叹', '非常有趣', '值得关注', '深度思考'
    ]);

    // 停用词
    this.stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '也', '上', '来', '说', '这', '时', '要', '没', '看', '去', '对', '好', '会', '那', '还', '到', '什么', '很', '可以', '这个', '但是', '如果', '还是', '因为', '所以'
    ]);
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // 添加自定义词典到jieba
      this.customDict.forEach(word => {
        jieba.insertWord(word);
      });

      this.initialized = true;
      console.log('✅ NLP处理器初始化完成');
    } catch (error) {
      console.error('❌ NLP处理器初始化失败:', error);
    }
  }

  // 智能分词和词性标注
  tokenize(text: string): TokenInfo[] {
    if (!this.initialized) {
      throw new Error('NLP处理器未初始化');
    }

    // 预处理文本
    const cleanText = this.preprocess(text);

    // jieba分词和词性标注
    const tokens = jieba.tag(cleanText) as unknown as Array<[string, string]>;

    return tokens
      .map(([word, pos]) => ({
        word: word.trim(),
        pos: this.normalizePOS(pos),
        weight: this.calculateWordWeight(word, pos)
      }))
      .filter(token =>
        token.word.length > 0 &&
        !this.stopWords.has(token.word) &&
        token.word !== '[LINK]' &&
        token.word !== '[MENTION]' &&
        token.word !== '[HASHTAG]'
      );
  }

  // 文本预处理
  private preprocess(text: string): string {
    return text
      // 替换特殊内容
      .replace(/https?:\/\/[^\s]+/g, '[LINK]')
      .replace(/@[^\s]+/g, '[MENTION]')
      .replace(/#[^\s]+/g, '[HASHTAG]')
      // 标准化标点符号
      .replace(/[!！]{2,}/g, '!')
      .replace(/[?？]{2,}/g, '?')
      .replace(/[.。]{2,}/g, '...')
      // 移除多余空白
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 词性标准化
  private normalizePOS(pos: string): string {
    const posMap: Record<string, string> = {
      'n': 'noun',       // 名词
      'nr': 'noun',      // 人名
      'ns': 'noun',      // 地名
      'nt': 'noun',      // 机构名
      'nz': 'noun',      // 其他专名
      'v': 'verb',       // 动词
      'vd': 'verb',      // 副动词
      'vn': 'verb',      // 名动词
      'a': 'adjective',  // 形容词
      'ad': 'adjective', // 副形词
      'an': 'adjective', // 名形词
      'd': 'adverb',     // 副词
      'r': 'pronoun',    // 代词
      'p': 'preposition', // 介词
      'c': 'conjunction', // 连词
      'u': 'auxiliary',   // 助词
      'o': 'onomatopoeia', // 拟声词
      'i': 'interjection', // 感叹词
      'm': 'numeral',     // 数词
      'q': 'classifier',  // 量词
      'x': 'punctuation', // 标点
      'w': 'punctuation', // 标点
      'eng': 'english',   // 英文
      't': 'time',        // 时间词
      'f': 'direction',   // 方位词
    };

    return posMap[pos] || 'other';
  }

  // 计算词汇权重
  private calculateWordWeight(word: string, pos: string): number {
    let weight = 1.0;

    // 自定义词典加权
    if (this.customDict.has(word)) {
      weight += 0.5;
    }

    // 词性权重
    switch (pos.charAt(0)) {
      case 'n': // 名词
        weight += 0.3;
        break;
      case 'v': // 动词
        weight += 0.2;
        break;
      case 'a': // 形容词
        weight += 0.2;
        break;
      case 'd': // 副词
        weight += 0.1;
        break;
    }

    // 词长权重
    if (word.length >= 3) {
      weight += 0.2;
    } else if (word.length === 1) {
      weight -= 0.2;
    }

    // 英文单词权重
    if (/^[a-zA-Z]+$/.test(word) && word.length > 2) {
      weight += 0.3;
    }

    // 数字相关权重
    if (/\d+%|\d+倍|\d+\.?\d*/.test(word)) {
      weight += 0.4;
    }

    return Math.max(0.1, weight); // 最小权重0.1
  }

  // 提取关键词（按权重排序）
  extractKeywords(text: string, topK: number = 10): Array<{word: string, weight: number, pos: string}> {
    const tokens = this.tokenize(text);

    // 统计词频并结合权重
    const wordStats: Record<string, {count: number, weight: number, pos: string}> = {};

    tokens.forEach(token => {
      if (!wordStats[token.word]) {
        wordStats[token.word] = {
          count: 0,
          weight: token.weight,
          pos: token.pos
        };
      }
      wordStats[token.word]!.count++;
    });

    // 计算综合得分
    const keywords = Object.entries(wordStats)
      .map(([word, stats]) => ({
        word,
        weight: stats.weight * Math.log(stats.count + 1), // TF权重
        pos: stats.pos
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, topK);

    return keywords;
  }

  // 句子分割（改进版）
  splitSentences(text: string): string[] {
    const cleanText = this.preprocess(text);

    return cleanText
      .split(/[。！？\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // 检测文本特征
  analyzeTextFeatures(text: string): {
    hasQuestion: boolean;
    hasExclamation: boolean;
    hasNumbers: boolean;
    hasEnglish: boolean;
    hasTechnicalTerms: boolean;
    sentimentIndicators: {
      positive: string[];
      negative: string[];
      neutral: string[];
    };
  } {
    const tokens = this.tokenize(text);

    const positiveWords = ['好', '棒', '优秀', '完美', '惊艳', '有趣', '值得', '推荐', '喜欢', '赞', '支持'];
    const negativeWords = ['差', '糟', '失望', '问题', '错误', '困难', '挑战', '不好', '不行', '批评'];

    return {
      hasQuestion: /[？?]/.test(text) || /[吗呢么]$/.test(text),
      hasExclamation: /[！!]/.test(text),
      hasNumbers: /\d/.test(text),
      hasEnglish: /[a-zA-Z]/.test(text),
      hasTechnicalTerms: tokens.some(t => this.customDict.has(t.word)),
      sentimentIndicators: {
        positive: tokens.filter(t => positiveWords.includes(t.word)).map(t => t.word),
        negative: tokens.filter(t => negativeWords.includes(t.word)).map(t => t.word),
        neutral: tokens.filter(t => !positiveWords.includes(t.word) && !negativeWords.includes(t.word)).map(t => t.word).slice(0, 5)
      }
    };
  }
}

// 全局单例
export const nlpProcessor = new NLPProcessor();