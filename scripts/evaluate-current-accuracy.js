// 评估当前分类准确率的简单测试
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// 测试样本：手动标注的推文
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

async function evaluateCurrentAccuracy() {
  console.log('🧪 评估当前关键词分类方法的准确率...\n');

  const keywordRules = {
    '研究/数据': ['数据', '研究', '报告', '调查', '统计', '显示', '发现', '结果', '分析', '%', '倍', '增长'],
    '教程/技巧': ['教程', '技巧', '方法', '如何', '步骤', '窍门', '攻略', '指南', '经验'],
    '洞见/观点/观察': ['发现', '观察', '思考', '洞察', '本质', '背后', '其实', '可能', '也许', '觉得', '认为'],
    '新闻/事件': ['刚刚', '最新', '突发', '消息', '新闻', '事件', '发生', '报道', '据悉'],
    '个人经历/成长': ['经历', '成长', '学到', '收获', '反思', '感悟', '经验', '教训', '今天', '刚刚']
  };

  function classifyByKeywords(content) {
    const results = [];

    Object.entries(keywordRules).forEach(([type, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          score++;
        }
      });

      if (score > 0) {
        results.push({
          type,
          score: score / keywords.length
        });
      }
    });

    return results.sort((a, b) => b.score - a.score).map(r => r.type);
  }

  let totalTests = 0;
  let correctPredictions = 0;
  let partialMatches = 0;
  const errorAnalysis = {
    falseNegatives: [], // 应该分类但没分类出来
    falsePositives: [], // 错误分类
    ambiguousCases: [] // 模糊情况
  };

  console.log('测试结果:\n');

  testSamples.forEach((sample, index) => {
    const predicted = classifyByKeywords(sample.content);
    const expected = sample.expectedTypes;

    totalTests++;

    // 检查完全匹配
    const exactMatch = predicted.length === expected.length &&
                      predicted.every(p => expected.includes(p));

    // 检查部分匹配
    const intersection = predicted.filter(p => expected.includes(p));
    const hasIntersection = intersection.length > 0;

    if (exactMatch) {
      correctPredictions++;
      console.log(`✅ 测试 ${index + 1}: 完全正确`);
    } else if (hasIntersection) {
      partialMatches++;
      console.log(`⚠️ 测试 ${index + 1}: 部分正确`);
      console.log(`   预期: [${expected.join(', ')}]`);
      console.log(`   预测: [${predicted.join(', ')}]`);
      console.log(`   匹配: [${intersection.join(', ')}]`);
    } else {
      console.log(`❌ 测试 ${index + 1}: 完全错误`);
      console.log(`   预期: [${expected.join(', ')}]`);
      console.log(`   预测: [${predicted.join(', ') || '无分类'}]`);
    }

    console.log(`   内容: "${sample.content.substring(0, 50)}..."`);
    console.log(`   难度: ${sample.difficulty}\n`);

    // 错误分析
    if (!exactMatch) {
      const missing = expected.filter(e => !predicted.includes(e));
      const extra = predicted.filter(p => !expected.includes(p));

      if (missing.length > 0) {
        errorAnalysis.falseNegatives.push({
          content: sample.content,
          missing: missing
        });
      }

      if (extra.length > 0) {
        errorAnalysis.falsePositives.push({
          content: sample.content,
          extra: extra
        });
      }

      if (sample.difficulty === 'hard') {
        errorAnalysis.ambiguousCases.push({
          content: sample.content,
          reason: '语义复杂，关键词不明显'
        });
      }
    }
  });

  // 计算指标
  const exactAccuracy = correctPredictions / totalTests;
  const partialAccuracy = (correctPredictions + partialMatches) / totalTests;

  console.log('📊 评估结果:');
  console.log(`总测试数: ${totalTests}`);
  console.log(`完全正确: ${correctPredictions} (${(exactAccuracy * 100).toFixed(1)}%)`);
  console.log(`部分正确: ${partialMatches} (${(partialMatches/totalTests * 100).toFixed(1)}%)`);
  console.log(`完全错误: ${totalTests - correctPredictions - partialMatches}`);
  console.log();

  console.log(`精确匹配率: ${(exactAccuracy * 100).toFixed(1)}%`);
  console.log(`部分匹配率: ${(partialAccuracy * 100).toFixed(1)}%\n`);

  // 分析结果
  console.log('🔍 问题分析:');
  console.log(`漏分类 (False Negatives): ${errorAnalysis.falseNegatives.length} 个`);
  console.log(`误分类 (False Positives): ${errorAnalysis.falsePositives.length} 个`);
  console.log(`模糊情况: ${errorAnalysis.ambiguousCases.length} 个\n`);

  // 给出建议
  console.log('💡 改进建议:');

  if (exactAccuracy < 0.5) {
    console.log('❌ 当前方法准确率过低，强烈建议：');
    console.log('   1. 立即引入jieba分词改进');
    console.log('   2. 考虑向量化方案');
    console.log('   3. 扩充关键词规则');
  } else if (exactAccuracy < 0.7) {
    console.log('⚠️ 当前方法有改进空间，建议：');
    console.log('   1. 优先引入jieba分词');
    console.log('   2. 优化关键词规则');
    console.log('   3. 收集更多数据后考虑向量化');
  } else {
    console.log('✅ 当前方法基本可用，建议：');
    console.log('   1. 继续优化关键词规则');
    console.log('   2. 数据量增加后再考虑向量化');
  }

  console.log();

  // 向量化必要性评估
  const needsVectorization = exactAccuracy < 0.6 ||
                           errorAnalysis.ambiguousCases.length > totalTests * 0.3;

  console.log('🎯 向量化必要性评估:');
  if (needsVectorization) {
    console.log('✅ 建议考虑向量化方案');
    console.log('   理由: 准确率低或语义复杂情况多');
  } else {
    console.log('❌ 暂时不需要向量化');
    console.log('   理由: 关键词方法基本满足需求');
  }

  return {
    exactAccuracy,
    partialAccuracy,
    needsVectorization,
    errorAnalysis,
    recommendation: needsVectorization ? 'CONSIDER_VECTORIZATION' : 'IMPROVE_KEYWORDS'
  };
}

// 运行评估
evaluateCurrentAccuracy()
  .then(() => db.$disconnect())
  .catch(console.error);