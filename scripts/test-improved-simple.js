// 简化版的改进测试（纯JavaScript，避免TypeScript导入问题）
import jieba from 'nodejieba';

// 模拟改进的分析逻辑
class SimpleImprovedAnalyzer {
  constructor() {
    this.customDict = new Set([
      '机器学习', '深度学习', '人工智能', '神经网络',
      '数据科学', '算法优化', '技术分享', '开发技巧'
    ]);

    // 添加自定义词典
    this.customDict.forEach(word => {
      jieba.insertWord(word);
    });

    // 改进的规则
    this.rules = {
      '研究/数据': {
        keywords: [
          { word: '数据', weight: 2.0, required: true },
          { word: '研究', weight: 2.0 },
          { word: '显示', weight: 1.2 },
          { word: '发现', weight: 1.0 },
          { word: '分析', weight: 1.0 },
          { word: '实验', weight: 1.5 }
        ],
        patterns: [
          { regex: /\d+%/, weight: 2.0 },
          { regex: /\d+倍/, weight: 1.5 },
          { regex: /(研究|调查|报告)(显示|表明|发现)/, weight: 2.0 }
        ],
        minScore: 3.0,
        excludeQuestion: true
      },

      '教程/技巧': {
        keywords: [
          { word: '教程', weight: 2.5 },
          { word: '技巧', weight: 2.0 },
          { word: '方法', weight: 1.5 },
          { word: '如何', weight: 2.0 },
          { word: '步骤', weight: 2.0 },
          { word: '分享', weight: 1.0 }
        ],
        patterns: [
          { regex: /第?[一二三四五六七八九十\d]+[步、点、条]/, weight: 2.0 },
          { regex: /\d+[）)]/, weight: 1.8 },
          { regex: /(首先|然后|接着|最后|其次)/, weight: 1.5 }
        ],
        minScore: 2.5,
        excludeQuestion: false
      },

      '洞见/观点/观察': {
        keywords: [
          { word: '发现', weight: 1.8 },
          { word: '观察', weight: 2.0 },
          { word: '觉得', weight: 1.8 },
          { word: '认为', weight: 1.8 },
          { word: '可能', weight: 1.0 },
          { word: '也许', weight: 1.0 }
        ],
        patterns: [
          { regex: /(我觉得|我认为|我想|个人认为)/, weight: 2.0 },
          { regex: /(可能会|也许会|或许会)/, weight: 1.5 },
          { regex: /(有趣的是|值得注意的是|令人.*的是)/, weight: 1.8 }
        ],
        minScore: 2.0
      },

      '新闻/事件': {
        keywords: [
          { word: '刚刚', weight: 2.5 },
          { word: '最新', weight: 2.0 },
          { word: '突发', weight: 3.0 },
          { word: '消息', weight: 1.8 },
          { word: '报道', weight: 2.0 },
          { word: '据悉', weight: 2.0 }
        ],
        patterns: [
          { regex: /(突发|刚刚|最新).{0,10}(消息|新闻|事件)/, weight: 3.0 },
          { regex: /(据.*报道|根据.*消息)/, weight: 2.0 }
        ],
        minScore: 2.5,
        excludeQuestion: true
      },

      '个人经历/成长': {
        keywords: [
          { word: '经历', weight: 2.0 },
          { word: '成长', weight: 2.0 },
          { word: '学到', weight: 1.8 },
          { word: '收获', weight: 1.8 },
          { word: '今天', weight: 1.2 },
          { word: '学习', weight: 1.5 }
        ],
        patterns: [
          { regex: /(今天|昨天|这几天).{0,20}(学|做|去|看|听)/, weight: 1.8 },
          { regex: /(我.*了|刚.*了)/, weight: 1.5 }
        ],
        minScore: 2.0
      }
    };
  }

  // 智能分词
  tokenize(text) {
    // 预处理
    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, '[LINK]')
      .replace(/@[^\s]+/g, '[MENTION]')
      .replace(/#[^\s]+/g, '[HASHTAG]');

    // jieba分词
    try {
      const tokens = jieba.tag(cleanText);

      if (!Array.isArray(tokens)) {
        console.log('jieba返回结果不是数组，使用简单分词');
        return this.fallbackTokenize(cleanText);
      }

      return tokens.map(([word, pos]) => ({
        word: word.trim(),
        pos,
        weight: this.calculateWeight(word, pos)
      })).filter(token =>
        token.word.length > 0 &&
        !['的', '了', '在', '是', '我', '有', '和'].includes(token.word)
      );
    } catch (error) {
      console.log('jieba分词失败，使用简单分词:', error.message);
      return this.fallbackTokenize(cleanText);
    }
  }

  // 备用分词方法
  fallbackTokenize(text) {
    const words = text
      .replace(/[，。！？；：""''（）【】]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0 && !['的', '了', '在', '是', '我', '有', '和'].includes(w));

    return words.map(word => ({
      word: word.trim(),
      pos: 'unknown',
      weight: this.calculateWeight(word, 'unknown')
    }));
  }

  calculateWeight(word, pos) {
    let weight = 1.0;

    // 自定义词典加权
    if (this.customDict.has(word)) {
      weight += 0.5;
    }

    // 词性权重
    if (pos.startsWith('n')) weight += 0.3; // 名词
    if (pos.startsWith('v')) weight += 0.2; // 动词
    if (pos.startsWith('a')) weight += 0.2; // 形容词

    // 词长权重
    if (word.length >= 3) weight += 0.2;
    if (word.length === 1) weight -= 0.2;

    // 数字权重
    if (/\d+%|\d+倍/.test(word)) weight += 0.4;

    return Math.max(0.1, weight);
  }

  // 分析推文类型
  analyzeTweet(content) {
    const tokens = this.tokenize(content);
    const hasQuestion = /[？?]/.test(content) || /[吗呢么]$/.test(content);
    const hasNumbers = /\d/.test(content);

    const results = [];

    Object.entries(this.rules).forEach(([typeName, rule]) => {
      let score = 0;
      const matchedFeatures = [];

      // 关键词评分
      let keywordScore = 0;
      let requiredMet = true;

      rule.keywords.forEach(keywordRule => {
        const found = tokens.find(t =>
          t.word.includes(keywordRule.word) ||
          keywordRule.word.includes(t.word)
        );

        if (found) {
          keywordScore += keywordRule.weight * found.weight;
          matchedFeatures.push(`关键词: ${keywordRule.word}`);
        } else if (keywordRule.required) {
          requiredMet = false;
        }
      });

      if (!requiredMet) return; // 必需关键词不满足，跳过

      score += keywordScore;

      // 模式评分
      rule.patterns.forEach(pattern => {
        if (pattern.regex.test(content)) {
          score += pattern.weight;
          matchedFeatures.push('模式匹配');
        }
      });

      // 特征检查
      if (rule.excludeQuestion && hasQuestion) {
        score *= 0.3; // 大幅降低分数
      }

      // 如果达到最低分数，加入结果
      if (score >= rule.minScore) {
        results.push({
          type: typeName,
          score: score,
          confidence: Math.min(score / (rule.minScore * 2), 1.0),
          matchedFeatures
        });
      }
    });

    // 处理互斥（简化版）
    const filtered = results.sort((a, b) => b.score - a.score);

    // 避免过度分类：如果最高分和第二高分差距很大，只返回最高分
    if (filtered.length > 1 && filtered[0].score > filtered[1].score * 1.5) {
      return [filtered[0]];
    }

    // 最多返回2个分类
    return filtered.slice(0, 2);
  }
}

// 测试样本
const testSamples = [
  {
    content: "今天学习了机器学习算法，发现深度学习在图像识别方面效果很好。数据显示准确率提升了25%。",
    expectedTypes: ["研究/数据", "个人经历/成长"],
    difficulty: "medium"
  },
  {
    content: "分享一个实用技巧：使用Python pandas处理数据时，记得先检查缺失值。具体步骤：1)导入库 2)检查数据 3)处理缺失值",
    expectedTypes: ["教程/技巧"],
    difficulty: "easy"
  },
  {
    content: "刚刚看到一个很有趣的观察，觉得现在的AI发展速度真是令人惊叹，可能会改变整个行业的格局。",
    expectedTypes: ["洞见/观点/观察"],
    difficulty: "medium"
  },
  {
    content: "突发：OpenAI发布了GPT-5模型，据官方报道，新模型在推理能力上比上一代提升了40%，引发了业界广泛关注。",
    expectedTypes: ["新闻/事件"],
    difficulty: "easy"
  },
  {
    content: "这个想法很有创意，不过我觉得在实际应用中可能会遇到一些挑战，特别是在用户体验方面。",
    expectedTypes: ["洞见/观点/观察"],
    difficulty: "hard"
  }
];

async function testImprovedAnalysis() {
  console.log('🧪 测试改进后的分类准确率 (简化版)...\n');

  const analyzer = new SimpleImprovedAnalyzer();

  let totalTests = 0;
  let exactMatches = 0;
  let partialMatches = 0;

  console.log('详细测试结果:\n');

  testSamples.forEach((sample, i) => {
    const predicted = analyzer.analyzeTweet(sample.content);
    const predictedTypes = predicted.map(p => p.type);
    const expected = sample.expectedTypes;

    totalTests++;

    // 检查匹配情况
    const exactMatch = predictedTypes.length === expected.length &&
                      predictedTypes.every(p => expected.includes(p));

    const intersection = predictedTypes.filter(p => expected.includes(p));
    const hasIntersection = intersection.length > 0;

    let status;
    if (exactMatch) {
      exactMatches++;
      status = '✅ 完全正确';
    } else if (hasIntersection) {
      partialMatches++;
      status = '⚠️ 部分正确';
    } else {
      status = '❌ 完全错误';
    }

    console.log(`${status} - 测试 ${i + 1}:`);
    console.log(`   预期: [${expected.join(', ')}]`);
    console.log(`   预测: [${predictedTypes.join(', ') || '无分类'}]`);

    if (predicted.length > 0) {
      console.log(`   详细结果:`);
      predicted.forEach((result, idx) => {
        console.log(`     ${idx + 1}. ${result.type} (分数: ${result.score.toFixed(2)}, 置信度: ${(result.confidence * 100).toFixed(1)}%)`);
      });
    }

    console.log(`   内容: "${sample.content.substring(0, 50)}..."`);
    console.log(`   难度: ${sample.difficulty}\n`);
  });

  // 计算指标
  const exactAccuracy = exactMatches / totalTests;
  const partialAccuracy = (exactMatches + partialMatches) / totalTests;

  console.log('📊 改进后的评估结果:');
  console.log(`总测试数: ${totalTests}`);
  console.log(`完全正确: ${exactMatches} (${(exactAccuracy * 100).toFixed(1)}%)`);
  console.log(`部分正确: ${partialMatches} (${(partialMatches/totalTests * 100).toFixed(1)}%)`);
  console.log(`完全错误: ${totalTests - exactMatches - partialMatches}`);
  console.log();

  console.log(`📈 对比结果:`);
  console.log(`精确匹配率: ${(exactAccuracy * 100).toFixed(1)}% (改进前: 20.0%)`);
  console.log(`改进幅度: +${((exactAccuracy - 0.2) * 100).toFixed(1)}%`);
  console.log();

  // 评估改进效果
  if (exactAccuracy >= 0.6) {
    console.log('🎉 Phase 1 改进效果显著!');
    console.log('   ✅ jieba分词和规则优化成功');
    console.log('   📈 准确率达到可用水平');
    console.log('   💡 建议: 继续在实际数据上验证，暂不需要向量化');
  } else if (exactAccuracy >= 0.4) {
    console.log('👍 Phase 1 有明显改进');
    console.log('   🔧 建议: 进一步调优参数');
    console.log('   📊 可以考虑小规模向量化试点');
  } else {
    console.log('😅 Phase 1 改进有限');
    console.log('   🚨 建议: 考虑Phase 2向量化方案');
  }

  return {
    exactAccuracy,
    partialAccuracy,
    improvement: exactAccuracy - 0.2
  };
}

// 运行测试
testImprovedAnalysis()
  .then(result => {
    console.log(`\n🏆 最终评估: 改进幅度 +${(result.improvement * 100).toFixed(1)}%`);
  })
  .catch(console.error);