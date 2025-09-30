// 测试改进后的分类准确率
import { improvedTweetAnalysisService } from '../src/server/services/improved-tweet-analysis.ts';

// 同样的测试样本
const testSamples = [
  {
    content: "今天学习了机器学习算法，发现深度学习在图像识别方面效果很好。数据显示准确率提升了25%。",
    expectedTypes: ["研究/数据", "个人经历/成长"],
    difficulty: "medium",
    description: "包含个人学习和数据引用"
  },
  {
    content: "分享一个实用技巧：使用Python pandas处理数据时，记得先检查缺失值。具体步骤：1)导入库 2)检查数据 3)处理缺失值",
    expectedTypes: ["教程/技巧"],
    difficulty: "easy",
    description: "明显的教程格式"
  },
  {
    content: "刚刚看到一个很有趣的观察，觉得现在的AI发展速度真是令人惊叹，可能会改变整个行业的格局。",
    expectedTypes: ["洞见/观点/观察"],
    difficulty: "medium",
    description: "个人观点表达"
  },
  {
    content: "突发：OpenAI发布了GPT-5模型，据官方报道，新模型在推理能力上比上一代提升了40%，引发了业界广泛关注。",
    expectedTypes: ["新闻/事件"],
    difficulty: "easy",
    description: "典型新闻格式"
  },
  {
    content: "这个想法很有创意，不过我觉得在实际应用中可能会遇到一些挑战，特别是在用户体验方面。",
    expectedTypes: ["洞见/观点/观察"],
    difficulty: "hard",
    description: "复杂的观点表达，语义不明显"
  },
  // 新增测试用例
  {
    content: "如何提升工作效率？首先要做好时间管理，其次是优化工作流程，最后要学会合理授权。",
    expectedTypes: ["教程/技巧"],
    difficulty: "medium",
    description: "疑问开头但实际是教程"
  },
  {
    content: "昨天参加了一个技术分享会，学到了很多新的开发技巧，特别是关于代码优化的部分，让我收获颇丰。",
    expectedTypes: ["个人经历/成长"],
    difficulty: "easy",
    description: "典型个人经历"
  },
  {
    content: "最新研究表明，远程工作可以提升员工满意度15%，同时降低公司运营成本约20%。",
    expectedTypes: ["研究/数据"],
    difficulty: "easy",
    description: "纯粹的研究数据"
  }
];

async function testImprovedAccuracy() {
  console.log('🧪 测试改进后的分类准确率...\n');

  try {
    // 初始化改进的分析服务
    await improvedTweetAnalysisService.initialize();

    let totalTests = 0;
    let exactMatches = 0;
    let partialMatches = 0;
    const detailedResults = [];

    console.log('详细测试结果:\n');

    for (let i = 0; i < testSamples.length; i++) {
      const sample = testSamples[i];
      const predicted = await improvedTweetAnalysisService.analyzeTweetTypes(sample.content);
      const predictedTypes = predicted.map(p => p.type);
      const expected = sample.expectedTypes;

      totalTests++;

      // 检查完全匹配
      const exactMatch = predictedTypes.length === expected.length &&
                         predictedTypes.every(p => expected.includes(p));

      // 检查部分匹配
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
          console.log(`        匹配特征: ${result.matchedFeatures.join(', ')}`);
          console.log(`        原因: ${result.reason}`);
        });
      }

      console.log(`   内容: "${sample.content.substring(0, 60)}..."`);
      console.log(`   难度: ${sample.difficulty} | ${sample.description}\n`);

      detailedResults.push({
        testId: i + 1,
        content: sample.content,
        expected,
        predicted: predictedTypes,
        scores: predicted,
        exactMatch,
        hasIntersection,
        difficulty: sample.difficulty
      });
    }

    // 计算指标
    const exactAccuracy = exactMatches / totalTests;
    const partialAccuracy = (exactMatches + partialMatches) / totalTests;
    const failureRate = (totalTests - exactMatches - partialMatches) / totalTests;

    console.log('📊 改进后的评估结果:');
    console.log(`总测试数: ${totalTests}`);
    console.log(`完全正确: ${exactMatches} (${(exactAccuracy * 100).toFixed(1)}%)`);
    console.log(`部分正确: ${partialMatches} (${(partialMatches/totalTests * 100).toFixed(1)}%)`);
    console.log(`完全错误: ${totalTests - exactMatches - partialMatches} (${(failureRate * 100).toFixed(1)}%)`);
    console.log();

    console.log(`📈 关键指标:`);
    console.log(`精确匹配率: ${(exactAccuracy * 100).toFixed(1)}% (改进前: 20.0%)`);
    console.log(`部分匹配率: ${(partialAccuracy * 100).toFixed(1)}% (改进前: 100.0%)`);
    console.log(`失败率: ${(failureRate * 100).toFixed(1)}% (改进前: 0.0%)`);
    console.log();

    // 按难度分析
    const byDifficulty = {
      easy: detailedResults.filter(r => r.difficulty === 'easy'),
      medium: detailedResults.filter(r => r.difficulty === 'medium'),
      hard: detailedResults.filter(r => r.difficulty === 'hard')
    };

    console.log('🎯 按难度分析:');
    Object.entries(byDifficulty).forEach(([difficulty, results]) => {
      if (results.length > 0) {
        const exactCount = results.filter(r => r.exactMatch).length;
        const partialCount = results.filter(r => r.hasIntersection && !r.exactMatch).length;
        const accuracy = (exactCount / results.length * 100).toFixed(1);

        console.log(`   ${difficulty}: ${exactCount}/${results.length} (${accuracy}%) 完全正确`);
      }
    });
    console.log();

    // 问题分析
    const problems = [];
    const overClassification = detailedResults.filter(r => r.predicted.length > r.expected.length);
    const underClassification = detailedResults.filter(r => r.predicted.length < r.expected.length && r.hasIntersection);
    const missedClassification = detailedResults.filter(r => r.predicted.length === 0);

    if (overClassification.length > 0) {
      problems.push(`过度分类: ${overClassification.length}个 (${(overClassification.length/totalTests*100).toFixed(1)}%)`);
    }
    if (underClassification.length > 0) {
      problems.push(`分类不足: ${underClassification.length}个 (${(underClassification.length/totalTests*100).toFixed(1)}%)`);
    }
    if (missedClassification.length > 0) {
      problems.push(`完全漏分类: ${missedClassification.length}个 (${(missedClassification.length/totalTests*100).toFixed(1)}%)`);
    }

    console.log('🔍 问题分析:');
    if (problems.length > 0) {
      problems.forEach(problem => console.log(`   ⚠️ ${problem}`));
    } else {
      console.log('   ✅ 未发现明显问题');
    }
    console.log();

    // 改进建议
    console.log('💡 改进效果评估:');

    const significantImprovement = exactAccuracy >= 0.6;
    const moderateImprovement = exactAccuracy >= 0.4;
    const needsFurtherWork = exactAccuracy < 0.4;

    if (significantImprovement) {
      console.log('🎉 显著改进! Phase 1优化效果良好');
      console.log('   ✅ 当前分类方法基本可用');
      console.log('   📈 建议继续优化阈值和规则');
      console.log('   ⏳ 暂时不需要向量化，数据量增加后再考虑');
    } else if (moderateImprovement) {
      console.log('👍 中等改进，还有提升空间');
      console.log('   🔧 建议进一步调优规则参数');
      console.log('   📊 可以考虑收集更多测试数据');
      console.log('   🤔 如果业务关键，可考虑引入简单的向量化');
    } else {
      console.log('😅 改进有限，需要更深入的优化');
      console.log('   🚨 建议优先考虑向量化方案');
      console.log('   📝 或者重新设计分类规则');
      console.log('   🔍 可能需要更多的语义理解能力');
    }

    console.log();
    console.log('🎯 下一步建议:');

    if (overClassification.length > totalTests * 0.5) {
      console.log('   1. 提高分类阈值，减少过度分类');
      console.log('   2. 优化互斥规则');
    }

    if (exactAccuracy < 0.5) {
      console.log('   3. 考虑Phase 2: 引入语义向量化');
      console.log('   4. 扩展测试数据集');
    } else {
      console.log('   3. 继续优化现有规则');
      console.log('   4. 在实际数据上测试');
    }

    return {
      exactAccuracy,
      partialAccuracy,
      improvementFromBaseline: exactAccuracy - 0.2, // 基线20%
      detailedResults,
      recommendation: significantImprovement ? 'CONTINUE_OPTIMIZATION' :
                      moderateImprovement ? 'CONSIDER_VECTORIZATION' :
                      'NEED_VECTORIZATION'
    };

  } catch (error) {
    console.error('❌ 测试失败:', error);
    return null;
  }
}

// 运行测试
testImprovedAccuracy()
  .then(result => {
    if (result) {
      console.log(`\n🏆 总体评估: ${result.recommendation}`);
      console.log(`📊 改进幅度: +${(result.improvementFromBaseline * 100).toFixed(1)}%`);
    }
  })
  .catch(console.error);