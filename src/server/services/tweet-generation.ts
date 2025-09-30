/**
 * 推文生成服务
 * 基于用户风格数据生成个性化推文
 */

import { db } from '~/server/db';
import { WritingAssistantConfigLoader } from '~/server/core/ai/writing-assistant-config-loader';
import { AIServiceFactory } from '~/server/core/ai/ai-factory';
import { TWEET_TYPES, type TweetType } from './tweet-analysis';

// 风格上下文接口
interface StyleContext {
  username: string;
  contentType: string;
  writingOverview: {
    personality: string;
    toneCharacteristics: string[];
    typicalOpenings: any;
    typicalDevelopment: any;
    typicalClosings: any;
    highFrequencySentences: any[];
    emotionalExpressions: any[];
    primaryHooks: any[];
    engagementTactics: any[];
    openingHooks: any[];
    sustainingTechniques: any[];
    closingTechniques: any[];
  };
  typeSpecificStyle: {
    signatureWords: any[];
    vocabDiversity: number | null;
    wordComplexity: number | null;
    avgSentenceLength: number | null;
    sentenceTypeDist: any;
    punctuationPattern: any;
    technicalTermUsage: number | null;
    industryKnowledgeLevel: string | null;
    commonOpenings: string[];
    commonClosings: string[];
    avgContentLength: number | null;
    toneFeatures: any;
    sampleCount: number | null;
  };
  exampleTweets: string[];
  typeDefinition: {
    category: string;
    keywords: readonly string[];
    patterns: readonly string[];
    tone: string;
  };
}

/**
 * 加载用户风格数据
 */
export async function loadUserStyleData(username: string, contentType: string): Promise<StyleContext> {

  // 1. 加载LLM驱动的写作概览
  let writingOverview = await db.userWritingOverview.findUnique({
    where: { username }
  });

  // 如果没有写作概览，自动生成
  if (!writingOverview) {
    console.log(`用户 ${username} 尚未生成写作概览，开始自动生成...`);
    try {
      const { LLMWritingOverviewService } = await import('./llm-writing-overview');
      const llmService = new LLMWritingOverviewService();
      await llmService.generateInitialOverview(username);

      // 重新获取
      writingOverview = await db.userWritingOverview.findUnique({
        where: { username }
      });

      if (!writingOverview) {
        throw new Error(`生成写作概览失败`);
      }
      console.log(`✅ 写作概览已自动生成`);
    } catch (error) {
      console.error(`自动生成写作概览失败:`, error);
      throw new Error(`用户 ${username} 尚未生成写作概览，且自动生成失败: ${error instanceof Error ? error.message : '未知错误'}。请确保该用户有足够的推文数据（至少5条）。`);
    }
  }

  const overview = JSON.parse(writingOverview.overviewContent);


  // 2. 加载该内容类型的风格档案
  const styleProfile = await db.userStyleProfile.findUnique({
    where: {
      username_contentType: { username, contentType }
    }
  });

  if (!styleProfile) {
    throw new Error(`用户 ${username} 尚未生成 "${contentType}" 类型的风格档案,请先运行类型分析`);
  }


  // 3. 获取该类型的推文样本 (最多10条,作为Few-shot示例)
  const typedTweets = await db.tweetTypeAnnotation.findMany({
    where: {
      username: username,
      tweetTypes: { contains: contentType }
    },
    include: {
      tweet: {
        select: { content: true }
      }
    },
    orderBy: { annotatedAt: 'desc' },
    take: 10
  });


  // 4. 获取该类型的配置信息
  const typeConfig = TWEET_TYPES[contentType as TweetType];

  if (!typeConfig) {
    throw new Error(`未找到内容类型 "${contentType}" 的配置`);
  }


  // 5. 构建风格上下文
  return {
    username,
    contentType,

    // 全局风格特征
    writingOverview: {
      personality: overview.overallStyle?.writingPersonality || '通用写作风格',
      toneCharacteristics: overview.overallStyle?.toneCharacteristics || [],

      // 典型结构
      typicalOpenings: overview.typicalStructure?.openingPatterns || {},
      typicalDevelopment: overview.typicalStructure?.developmentPatterns || {},
      typicalClosings: overview.typicalStructure?.closingPatterns || {},

      // 典型句式
      highFrequencySentences: overview.typicalSentences?.highFrequencyPatterns || [],
      emotionalExpressions: overview.typicalSentences?.emotionalExpressions || [],

      // 吸引力机制
      primaryHooks: overview.attractionMechanisms?.primaryHooks || [],
      engagementTactics: overview.attractionMechanisms?.engagementTactics || [],

      // 情绪钩子
      openingHooks: overview.emotionalHookStrategies?.openingHooks || [],
      sustainingTechniques: overview.emotionalHookStrategies?.sustainingTechniques || [],
      closingTechniques: overview.emotionalHookStrategies?.closingTechniques || []
    },

    // 类型特定风格
    typeSpecificStyle: {
      // 词汇特征
      signatureWords: styleProfile.signatureWords ? JSON.parse(styleProfile.signatureWords) : [],
      vocabDiversity: styleProfile.vocabDiversity,
      wordComplexity: styleProfile.wordComplexity,

      // 句式特征
      avgSentenceLength: styleProfile.avgSentenceLength,
      sentenceTypeDist: styleProfile.sentenceTypeDist ? JSON.parse(styleProfile.sentenceTypeDist) : null,
      punctuationPattern: styleProfile.punctuationPattern ? JSON.parse(styleProfile.punctuationPattern) : null,

      // 专业度
      technicalTermUsage: styleProfile.technicalTermUsage,
      industryKnowledgeLevel: styleProfile.industryKnowledgeLevel,

      // 该类型特有的开头/结尾
      commonOpenings: styleProfile.commonOpenings ? JSON.parse(styleProfile.commonOpenings) : [],
      commonClosings: styleProfile.commonClosings ? JSON.parse(styleProfile.commonClosings) : [],
      avgContentLength: styleProfile.avgContentLength,
      toneFeatures: styleProfile.toneFeatures ? JSON.parse(styleProfile.toneFeatures) : {},

      sampleCount: styleProfile.sampleCount
    },

    // Few-shot示例
    exampleTweets: typedTweets.map(t => t.tweet.content),

    // 类型定义
    typeDefinition: {
      category: typeConfig.category,
      keywords: typeConfig.keywords,
      patterns: typeConfig.patterns,
      tone: typeConfig.tone
    }
  };
}

/**
 * 构建生成Prompt
 */
export function buildGenerationPrompt(styleContext: StyleContext, topic?: string, count: number = 3): string {

  const { username, contentType, writingOverview, typeSpecificStyle, exampleTweets, typeDefinition } = styleContext;

  return `你是一个专业的社交媒体内容创作助手。你的任务是模仿用户"${username}"的写作风格,生成${count}条"${contentType}"类型的推文。

# 用户写作风格档案

## 整体写作人格
- **写作人格**: ${writingOverview.personality}
- **语调特征**: ${writingOverview.toneCharacteristics.join('、') || '自然流畅'}

## 典型行文结构

### 开头模式
- **主要模式**: ${writingOverview.typicalOpenings.primaryPattern || '直接切入主题'}
- **描述**: ${writingOverview.typicalOpenings.description || '开门见山'}
${writingOverview.typicalOpenings.examples?.length > 0 ? `- **典型例子**:\n${writingOverview.typicalOpenings.examples.map((ex: string, i: number) => `  ${i+1}. "${ex}"`).join('\n')}` : ''}

### 展开模式
- **主要模式**: ${writingOverview.typicalDevelopment.primaryPattern || '逻辑推进'}
- **描述**: ${writingOverview.typicalDevelopment.description || '层层递进'}
${writingOverview.typicalDevelopment.characteristics?.length > 0 ? `- **特征**: ${writingOverview.typicalDevelopment.characteristics.join('、')}` : ''}

### 结尾模式
- **主要模式**: ${writingOverview.typicalClosings.primaryPattern || '总结升华'}
- **描述**: ${writingOverview.typicalClosings.description || '点题收尾'}

## "${contentType}"类型专属风格

### 内容类型定义
- **类别**: ${typeDefinition.category}
- **典型特征**: ${typeDefinition.patterns.join('、')}
- **语气**: ${typeDefinition.tone}

### 该类型的词汇特征
- **词汇丰富度**: ${((typeSpecificStyle.vocabDiversity || 0) * 100).toFixed(0)}%
- **平均词长**: ${(typeSpecificStyle.wordComplexity || 2).toFixed(1)}字符
${typeSpecificStyle.signatureWords.length > 0 ? `- **高频词汇参考** (仅供理解词汇风格，不要直接照搬): ${typeSpecificStyle.signatureWords.slice(0, 10).map((w: any) => w.word).join('、')}
  注意：这些词汇仅展示用户的用词特点（如：偏好简洁词/专业术语/口语化等），生成时应该根据新话题选择合适词汇，而不是直接复制这些词。` : ''}

### 该类型的句式特征
- **平均句长**: ${(typeSpecificStyle.avgSentenceLength || 20).toFixed(0)}字
${typeSpecificStyle.sentenceTypeDist ? `
- **句型分布**:
  - 陈述句: ${(typeSpecificStyle.sentenceTypeDist.declarative * 100).toFixed(0)}%
  - 疑问句: ${(typeSpecificStyle.sentenceTypeDist.interrogative * 100).toFixed(0)}%
  - 感叹句: ${(typeSpecificStyle.sentenceTypeDist.exclamatory * 100).toFixed(0)}%
` : ''}

${typeSpecificStyle.commonOpenings.length > 0 ? `### 该类型常用开头 (从以下模式中选择或组合)
${typeSpecificStyle.commonOpenings.slice(0, 5).map((opening: string, i: number) => `${i+1}. "${opening}"`).join('\n')}` : ''}

${typeSpecificStyle.commonClosings.length > 0 ? `### 该类型常用结尾 (从以下模式中选择或组合)
${typeSpecificStyle.commonClosings.slice(0, 5).map((closing: string, i: number) => `${i+1}. "${closing}"`).join('\n')}` : ''}

${Object.keys(typeSpecificStyle.toneFeatures || {}).length > 0 ? `### 该类型的语气特征
${Object.entries(typeSpecificStyle.toneFeatures || {})
  .filter(([_, value]) => (value as number) > 0.2)
  .map(([tone, value]) => `- ${tone}: ${((value as number) * 100).toFixed(0)}%`)
  .join('\n')}` : ''}

### 该类型的专业度
- **技术术语使用率**: ${((typeSpecificStyle.technicalTermUsage || 0) * 100).toFixed(0)}%
- **行业知识水平**: ${typeSpecificStyle.industryKnowledgeLevel || 'intermediate'}

### 该类型的典型长度
- **平均字符数**: ${(typeSpecificStyle.avgContentLength || 140).toFixed(0)}字符

${exampleTweets.length > 0 ? `## 实际写作样本 (Few-shot Examples)

⚠️ **重要说明**：以下样本仅用于学习"如何表达"，而非"表达什么"

以下是用户"${username}"实际发布的"${contentType}"类型推文,供你参考模仿其写作风格:

${exampleTweets.slice(0, 5).map((tweet: string, i: number) => `
【样本${i+1}】
${tweet}
`).join('\n---\n')}

📌 **如何使用这些样本**：
- ✅ 学习其句式结构、开头方式、结尾技巧、语气风格
- ✅ 观察其如何组织逻辑、如何过渡、如何强调重点
- ❌ 不要复制样本中的专有名词、具体事件、数据数字
- ❌ 不要将样本话题的内容带入新话题` : ''}

---

# 生成任务

${topic ? `
## 指定话题
${topic}

请围绕这个话题,以用户的风格生成推文。
` : `
## 自由创作
请基于用户的常见话题和风格,生成符合"${contentType}"类型特征的推文。
`}

## 生成要求

1. **严格模仿风格，而非复制内容**:
   - 必须使用用户的典型开头模式之一（但不要照抄例子中的具体内容）
   - 必须使用用户的高频句式模板
   - 必须体现用户的语调特征
   - 内容长度接近用户该类型的平均长度

2. **符合类型定义**:
   - 内容必须符合"${contentType}"的类型特征
   - 使用该类型的典型结构模式
   - 体现该类型的语气特征

3. **保持吸引力**:
   - 使用用户有效的钩子策略
   - 如果适用,包含互动元素
   - 确保内容有价值或有趣

4. **自然真实**:
   - 不要刻意堆砌特征
   - 保持内容的自然流畅
   - 像用户本人在写作

⚠️ **关键：话题边界和内容隔离**

5. **仅模仿写作方法，不要复制具体内容**:
   参考推文样本的作用仅仅是学习"如何表达"，而不是"表达什么"。

   ✅ 应该借鉴的：
   - 开头方式、句式结构、修辞手法、语气风格、逻辑组织

   ❌ 绝对不能复制的：
   - 参考推文中提到的专有名词（项目名、人名、公司名等）
   - 参考推文讨论的具体事件和数据
   - 参考推文的具体话题内容

6. **保持话题一致性和聚焦**:
   ${topic ? `
   - 当前话题是："${topic}"
   - 生成的推文必须100%围绕这个话题展开
   - 不要引入参考推文中与当前话题无关的任何内容
   - 如果参考推文讨论话题A，当前话题是B，则只借鉴表达方式，不借鉴内容
   ` : `
   - 虽然是自由创作，但要基于用户的常见话题领域
   - 不要直接重复参考推文中的具体内容
   - 创造新的话题和观点，只保持风格一致
   `}

7. **专有名词隔离原则**:
   - 参考推文中出现的专有名词（如项目名、人名、币种符号等），如果与当前话题无关，绝对不能出现在生成结果中
   - 如果需要专有名词，应该根据当前话题重新选择，而不是从参考推文中照搬

   示例：
   - 参考推文："$BTC今天涨了10%，市场情绪高涨"
   - 当前话题："AI技术发展"
   - 错误生成："$BTC的技术就像AI一样发展迅速" ❌（引入了无关的$BTC）
   - 正确生成："AI技术今年进展迅速，市场热度持续上升" ✅（保持结构和风格，但内容完全围绕新话题）

## 输出格式

请生成${count}条推文,用JSON格式返回:

\`\`\`json
{
  "tweets": [
    {
      "content": "推文内容",
      "styleAnalysis": {
        "openingPattern": "使用的开头模式",
        "sentencePatterns": ["使用的句式模板1", "使用的句式模板2"],
        "hooks": ["使用的钩子策略1"],
        "styleScore": 0.95,
        "explanation": "为什么这条推文符合用户风格的简要说明"
      }
    }
  ]
}
\`\`\`

现在请开始生成:`;
}

/**
 * 生成推文
 */
export async function generateTweets(
  username: string,
  contentType: string,
  options: {
    topic?: string;
    count?: number;
    aiProvider?: string;
    aiModel?: string;
    temperature?: number;
  } = {}
) {

  const {
    topic,
    count = 3,
    aiProvider = 'openai',
    aiModel = 'gpt-4o',
    temperature = 0.7
  } = options;


  // 1. 创建任务记录
  const task = await db.tweetGenerationTask.create({
    data: {
      username,
      contentType,
      topic: topic || null,
      generateCount: count,
      aiProvider,
      aiModel,
      temperature,
      status: 'processing',
      startedAt: new Date()
    }
  });


  try {
    // 2. 加载风格数据
    console.log(`[${task.id}] 加载用户 ${username} 的 "${contentType}" 风格数据...`);
    const styleContext = await loadUserStyleData(username, contentType);


    // 3. 构建生成prompt
    console.log(`[${task.id}] 构建生成prompt...`);
    const prompt = buildGenerationPrompt(styleContext, topic, count);


    // 4. 调用AI生成
    console.log(`[${task.id}] 调用 ${aiProvider}/${aiModel} 生成推文...`);
    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: aiProvider as 'openai' | 'openai-badger' | 'zhipu' | 'anthropic',
      model: aiModel,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const rawResult = await aiService.generateText(prompt);


    // 5. 解析结果
    console.log(`[${task.id}] 解析生成结果...`);
    const cleanResult = rawResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanResult);

    if (!parsed.tweets || !Array.isArray(parsed.tweets)) {
      throw new Error('生成结果格式错误');
    }


    // 6. 保存结果
    console.log(`[${task.id}] 保存生成结果...`);
    const results = await Promise.all(
      parsed.tweets.map(async (tweet: any) => {
        return await db.tweetGenerationResult.create({
          data: {
            taskId: task.id,
            generatedContent: tweet.content,
            contentLength: tweet.content.length,
            styleScore: tweet.styleAnalysis?.styleScore || null,
            styleAnalysis: JSON.stringify(tweet.styleAnalysis || {}),
            styleDataSnapshot: JSON.stringify({
              username,
              contentType,
              profileSampleCount: styleContext.typeSpecificStyle.sampleCount,
              usedOpeningPattern: tweet.styleAnalysis?.openingPattern,
              usedSentencePatterns: tweet.styleAnalysis?.sentencePatterns,
              usedHooks: tweet.styleAnalysis?.hooks
            }),
            aiProvider,
            aiModel
          }
        });
      })
    );


    // 7. 更新任务状态
    await db.tweetGenerationTask.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    console.log(`[${task.id}] ✅ 成功生成 ${results.length} 条推文`);
    return results;

  } catch (error) {
    console.error(`[${task.id}] ❌ 生成失败:`, error);

    await db.tweetGenerationTask.update({
      where: { id: task.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '未知错误',
        completedAt: new Date()
      }
    });

    throw error;
  }
}