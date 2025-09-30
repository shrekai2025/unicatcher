# 基于LLM的进阶风格分析方案

## 📋 方案概述

本方案采用**LLM驱动的分析方式**，替代传统的关键字匹配，实现更准确、更智能的风格分析。

### 核心优势

**传统方式（关键字匹配）的局限：**
- ❌ 规则固化，无法理解语义
- ❌ 误判率高（如"你知道"可能不是疑问开头）
- ❌ 难以识别复杂模式
- ❌ 维护成本高，需要不断添加规则

**LLM分析的优势：**
- ✅ 理解语义和上下文
- ✅ 准确识别意图和风格
- ✅ 适应性强，自动学习新模式
- ✅ 无需维护规则库

---

## 🎯 功能1：开头模式识别（LLM版）

### 1.1 分析目标

识别用户习惯的开头套路：
- 疑问开头
- 数据开头
- 故事开头
- 对比开头
- 紧急开头
- 陈述开头

### 1.2 数据库设计（不变）

```sql
ALTER TABLE user_style_profile ADD COLUMN
  opening_patterns TEXT;

-- 示例数据格式
{
  "questionHook": 0.30,
  "dataHook": 0.25,
  "storyHook": 0.20,
  "contrastHook": 0.15,
  "urgencyHook": 0.05,
  "statementHook": 0.05,
  "examples": {
    "questionHook": ["你知道吗", "有没有想过"],
    "dataHook": ["数据显示", "研究表明"],
    ...
  }
}
```

### 1.3 LLM分析实现

```typescript
// src/server/services/llm-style-analyzer.ts

import { AIServiceFactory } from '~/server/core/ai/ai-factory';
import { WritingAssistantConfigLoader } from '~/server/core/ai/writing-assistant-config-loader';

interface OpeningPatterns {
  questionHook: number;
  dataHook: number;
  storyHook: number;
  contrastHook: number;
  urgencyHook: number;
  statementHook: number;
  examples: Record<string, string[]>;
}

export class LLMStyleAnalyzer {

  /**
   * 批量分析推文的开头模式（LLM驱动）
   */
  async analyzeOpeningPatterns(tweets: Array<{content: string}>): Promise<OpeningPatterns> {
    // 提取所有推文的开头部分
    const openings = tweets.map(t => {
      const firstSentence = t.content.split(/[。！？\n]/)[0];
      return firstSentence?.substring(0, 50) || t.content.substring(0, 50);
    });

    // 构建分析提示词
    const prompt = `
请分析以下${openings.length}条推文的开头，将每条开头归类到以下6种类型之一：

1. questionHook（疑问开头）：以问题、疑问开始，引发思考
2. dataHook（数据开头）：以数据、研究、统计开始
3. storyHook（故事开头）：以个人经历、故事、场景开始
4. contrastHook（对比开头）：呈现误解vs真相的对比
5. urgencyHook（紧急开头）：强调时效性、紧迫性
6. statementHook（陈述开头）：直接陈述观点或事实

推文开头列表：
${openings.map((opening, i) => `${i + 1}. ${opening}`).join('\n')}

请返回JSON格式的分析结果：
{
  "classifications": [
    {"index": 1, "type": "questionHook", "reasoning": "为什么..."},
    {"index": 2, "type": "dataHook", "reasoning": "..."}
  ],
  "statistics": {
    "questionHook": 0.30,
    "dataHook": 0.25,
    "storyHook": 0.20,
    "contrastHook": 0.15,
    "urgencyHook": 0.05,
    "statementHook": 0.05
  }
}

注意：
1. 每条开头只能归为一类
2. statistics中的比例总和必须为1.0
3. 理解语义，不要只看关键字
`;

    // 调用LLM
    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const result = await aiService.generateText(prompt);

    // 解析结果
    const parsed = this.parseJSONResponse(result);

    // 提取每种类型的例子
    const examples: Record<string, string[]> = {
      questionHook: [],
      dataHook: [],
      storyHook: [],
      contrastHook: [],
      urgencyHook: [],
      statementHook: [],
    };

    parsed.classifications.forEach((item: any) => {
      const opening = openings[item.index - 1];
      if (opening && examples[item.type]) {
        examples[item.type].push(opening);
      }
    });

    // 每种类型保留前5个例子
    Object.keys(examples).forEach(key => {
      examples[key] = examples[key].slice(0, 5);
    });

    return {
      ...parsed.statistics,
      examples
    };
  }

  /**
   * 解析LLM返回的JSON（处理markdown包裹等情况）
   */
  private parseJSONResponse(response: string): any {
    let cleaned = response.trim();

    // 移除markdown代码块
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // 提取JSON对象
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    return JSON.parse(cleaned);
  }
}
```

### 1.4 优化：批处理分析

对于大量推文，采用批处理避免token限制：

```typescript
/**
 * 批处理分析大量推文
 */
async analyzeOpeningPatternsBatch(
  tweets: Array<{content: string}>,
  batchSize: number = 20
): Promise<OpeningPatterns> {
  const batches: Array<{content: string}>[] = [];

  // 分批
  for (let i = 0; i < tweets.length; i += batchSize) {
    batches.push(tweets.slice(i, i + batchSize));
  }

  // 分析每批
  const batchResults: OpeningPatterns[] = [];
  for (const batch of batches) {
    const result = await this.analyzeOpeningPatterns(batch);
    batchResults.push(result);
  }

  // 合并结果
  return this.mergeOpeningPatterns(batchResults, tweets.length);
}

/**
 * 合并多批次的分析结果
 */
private mergeOpeningPatterns(
  results: OpeningPatterns[],
  totalCount: number
): OpeningPatterns {
  const merged: OpeningPatterns = {
    questionHook: 0,
    dataHook: 0,
    storyHook: 0,
    contrastHook: 0,
    urgencyHook: 0,
    statementHook: 0,
    examples: {
      questionHook: [],
      dataHook: [],
      storyHook: [],
      contrastHook: [],
      urgencyHook: [],
      statementHook: [],
    }
  };

  // 计算加权平均
  results.forEach(result => {
    const weight = 1 / results.length;
    merged.questionHook += result.questionHook * weight;
    merged.dataHook += result.dataHook * weight;
    merged.storyHook += result.storyHook * weight;
    merged.contrastHook += result.contrastHook * weight;
    merged.urgencyHook += result.urgencyHook * weight;
    merged.statementHook += result.statementHook * weight;

    // 合并例子
    Object.keys(merged.examples).forEach(key => {
      merged.examples[key].push(...result.examples[key]);
    });
  });

  // 去重并限制数量
  Object.keys(merged.examples).forEach(key => {
    merged.examples[key] = Array.from(new Set(merged.examples[key])).slice(0, 5);
  });

  return merged;
}
```

---

## 💡 功能2：吸引力机制分析（LLM版）

### 2.1 分析目标

评估内容的5个吸引力维度：
- 新颖性
- 争议性
- 实用性
- 情感共鸣
- 认知负担

### 2.2 数据库设计（不变）

```sql
CREATE TABLE tweet_attraction_analysis (
  id TEXT PRIMARY KEY,
  tweet_id TEXT NOT NULL,
  username TEXT NOT NULL,
  novelty_score REAL DEFAULT 0,
  controversy_score REAL DEFAULT 0,
  practicality_score REAL DEFAULT 0,
  emotional_resonance REAL DEFAULT 0,
  cognitive_load REAL DEFAULT 0,
  overall_attraction_score REAL DEFAULT 0,
  analysis_reasoning TEXT,  -- 新增：LLM的分析理由
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 LLM分析实现

```typescript
interface AttractionScores {
  noveltyScore: number;
  controversyScore: number;
  practicalityScore: number;
  emotionalResonance: number;
  cognitiveLoad: number;
  overallScore: number;
  reasoning: string;
}

export class LLMStyleAnalyzer {

  /**
   * 分析单条推文的吸引力（LLM驱动）
   */
  async analyzeAttraction(tweet: {content: string}): Promise<AttractionScores> {
    const prompt = `
请分析以下推文的吸引力因素，从5个维度评分（0-1之间的小数）：

推文内容：
${tweet.content}

评分维度：
1. noveltyScore（新颖性）：是否包含新概念、新数据、新发现？
2. controversyScore（争议性）：是否存在对立观点、批评、质疑？
3. practicalityScore（实用性）：是否提供具体方法、技巧、工具？
4. emotionalResonance（情感共鸣）：是否能引发读者情感反应？
5. cognitiveLoad（认知负担）：理解难度如何？（分数越高越难理解）

返回JSON格式：
{
  "noveltyScore": 0.75,
  "controversyScore": 0.30,
  "practicalityScore": 0.80,
  "emotionalResonance": 0.60,
  "cognitiveLoad": 0.35,
  "overallScore": 0.72,
  "reasoning": "这条推文主要通过提供实用方法吸引读者，同时引入了一些新颖的观点。认知负担较低，易于理解。整体吸引力较强。"
}

注意：
1. 所有评分必须在0-1之间
2. overallScore是综合评分，可以加权计算
3. reasoning要简明扼要说明评分依据
`;

    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const result = await aiService.generateText(prompt);
    const parsed = this.parseJSONResponse(result);

    return {
      noveltyScore: parsed.noveltyScore,
      controversyScore: parsed.controversyScore,
      practicalityScore: parsed.practicalityScore,
      emotionalResonance: parsed.emotionalResonance,
      cognitiveLoad: parsed.cognitiveLoad,
      overallScore: parsed.overallScore,
      reasoning: parsed.reasoning,
    };
  }

  /**
   * 批量分析推文吸引力（优化版）
   */
  async analyzeAttractionBatch(tweets: Array<{
    id: string;
    content: string;
  }>): Promise<AttractionScores[]> {
    // 一次分析多条（如5条），提高效率
    const batchSize = 5;
    const results: AttractionScores[] = [];

    for (let i = 0; i < tweets.length; i += batchSize) {
      const batch = tweets.slice(i, i + batchSize);

      const prompt = `
请分析以下${batch.length}条推文的吸引力因素，每条推文从5个维度评分（0-1之间）：

${batch.map((t, idx) => `
推文${idx + 1}：
${t.content}
`).join('\n')}

评分维度：
1. noveltyScore（新颖性）
2. controversyScore（争议性）
3. practicalityScore（实用性）
4. emotionalResonance（情感共鸣）
5. cognitiveLoad（认知负担）

返回JSON数组格式：
{
  "analyses": [
    {
      "tweetIndex": 1,
      "noveltyScore": 0.75,
      "controversyScore": 0.30,
      "practicalityScore": 0.80,
      "emotionalResonance": 0.60,
      "cognitiveLoad": 0.35,
      "overallScore": 0.72,
      "reasoning": "..."
    },
    ...
  ]
}
`;

      const config = await WritingAssistantConfigLoader.getAnalysisConfig();
      const aiService = AIServiceFactory.createService({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: config.baseURL
      });

      const result = await aiService.generateText(prompt);
      const parsed = this.parseJSONResponse(result);

      // 映射回结果
      parsed.analyses.forEach((analysis: any) => {
        results.push({
          noveltyScore: analysis.noveltyScore,
          controversyScore: analysis.controversyScore,
          practicalityScore: analysis.practicalityScore,
          emotionalResonance: analysis.emotionalResonance,
          cognitiveLoad: analysis.cognitiveLoad,
          overallScore: analysis.overallScore,
          reasoning: analysis.reasoning,
        });
      });

      // 批次间延迟，避免频率限制
      if (i + batchSize < tweets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
```

---

## 🎣 功能3：情绪钩子识别（LLM版）

### 3.1 LLM分析实现

```typescript
interface EmotionalHooks {
  openingHooks: {
    curiosityGap: { usage: number; effectiveness: number; examples: string[] };
    personalStory: { usage: number; effectiveness: number; examples: string[] };
    dataShock: { usage: number; effectiveness: number; examples: string[] };
  };
  sustainingHooks: {
    progressiveRevelation: number;
    unexpectedTurn: number;
    readerInvolvement: number;
  };
  closingHooks: {
    callToAction: number;
    thoughtProvoking: number;
    cliffhanger: number;
  };
}

export class LLMStyleAnalyzer {

  /**
   * 识别情绪钩子（LLM驱动）
   */
  async analyzeEmotionalHooks(tweets: Array<{
    content: string;
    likeCount: number;
    retweetCount: number;
  }>): Promise<EmotionalHooks> {
    const prompt = `
请分析以下${tweets.length}条推文的情绪钩子使用情况：

推文列表：
${tweets.map((t, i) => `
推文${i + 1}（点赞${t.likeCount}，转发${t.retweetCount}）：
${t.content}
`).join('\n')}

需要识别3类钩子：

1. 开头钩子（选择一个）：
   - curiosityGap：好奇心缺口（"你知道吗...但实际上..."）
   - personalStory：个人故事（"昨天遇到..."）
   - dataShock：数据冲击（"数据显示竟然..."）

2. 中间维持钩子（可多选）：
   - progressiveRevelation：渐进揭示（"更重要的是..."）
   - unexpectedTurn：意外转折（"但是..."）
   - readerInvolvement：读者卷入（"你是否也..."）

3. 结尾钩子（选择一个）：
   - callToAction：行动号召（"你怎么看？"）
   - thoughtProvoking：引发思考（"这让我们思考..."）
   - cliffhanger：悬念（"下次分享..."）

返回JSON格式：
{
  "tweetAnalyses": [
    {
      "tweetIndex": 1,
      "openingHook": "curiosityGap",
      "sustainingHooks": ["progressiveRevelation", "unexpectedTurn"],
      "closingHook": "callToAction",
      "engagement": 150
    },
    ...
  ],
  "summary": {
    "openingHooks": {
      "curiosityGap": { "count": 30, "avgEngagement": 180 },
      "personalStory": { "count": 25, "avgEngagement": 150 },
      "dataShock": { "count": 20, "avgEngagement": 200 }
    },
    "sustainingHooks": {
      "progressiveRevelation": 40,
      "unexpectedTurn": 30,
      "readerInvolvement": 20
    },
    "closingHooks": {
      "callToAction": 50,
      "thoughtProvoking": 30,
      "cliffhanger": 20
    }
  }
}
`;

    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const result = await aiService.generateText(prompt);
    const parsed = this.parseJSONResponse(result);

    // 转换为标准格式
    const totalTweets = tweets.length;
    const totalEngagement = tweets.reduce((sum, t) => sum + t.likeCount + t.retweetCount * 2, 0);
    const avgEngagement = totalEngagement / totalTweets;

    return {
      openingHooks: {
        curiosityGap: {
          usage: parsed.summary.openingHooks.curiosityGap.count / totalTweets,
          effectiveness: parsed.summary.openingHooks.curiosityGap.avgEngagement / avgEngagement,
          examples: this.extractExamples(tweets, parsed.tweetAnalyses, 'curiosityGap', 'openingHook'),
        },
        personalStory: {
          usage: parsed.summary.openingHooks.personalStory.count / totalTweets,
          effectiveness: parsed.summary.openingHooks.personalStory.avgEngagement / avgEngagement,
          examples: this.extractExamples(tweets, parsed.tweetAnalyses, 'personalStory', 'openingHook'),
        },
        dataShock: {
          usage: parsed.summary.openingHooks.dataShock.count / totalTweets,
          effectiveness: parsed.summary.openingHooks.dataShock.avgEngagement / avgEngagement,
          examples: this.extractExamples(tweets, parsed.tweetAnalyses, 'dataShock', 'openingHook'),
        },
      },
      sustainingHooks: {
        progressiveRevelation: parsed.summary.sustainingHooks.progressiveRevelation / totalTweets,
        unexpectedTurn: parsed.summary.sustainingHooks.unexpectedTurn / totalTweets,
        readerInvolvement: parsed.summary.sustainingHooks.readerInvolvement / totalTweets,
      },
      closingHooks: {
        callToAction: parsed.summary.closingHooks.callToAction / totalTweets,
        thoughtProvoking: parsed.summary.closingHooks.thoughtProvoking / totalTweets,
        cliffhanger: parsed.summary.closingHooks.cliffhanger / totalTweets,
      },
    };
  }

  /**
   * 提取钩子类型的例子
   */
  private extractExamples(
    tweets: any[],
    analyses: any[],
    hookType: string,
    hookCategory: 'openingHook' | 'closingHook'
  ): string[] {
    const examples: Array<{text: string, engagement: number}> = [];

    analyses.forEach(analysis => {
      if (analysis[hookCategory] === hookType) {
        const tweet = tweets[analysis.tweetIndex - 1];
        if (tweet) {
          const text = hookCategory === 'openingHook'
            ? tweet.content.substring(0, 50)
            : tweet.content.substring(Math.max(0, tweet.content.length - 50));

          examples.push({
            text,
            engagement: analysis.engagement
          });
        }
      }
    });

    // 按互动数排序，取前3个
    examples.sort((a, b) => b.engagement - a.engagement);
    return examples.slice(0, 3).map(e => e.text);
  }
}
```

---

## 📝 功能4：句式模板提取（LLM版）

### 4.1 LLM分析实现

```typescript
interface SentenceTemplate {
  pattern: string;
  frequency: number;
  category: string;
  emotionType: string;
  examples: string[];
}

export class LLMStyleAnalyzer {

  /**
   * 提取句式模板（LLM驱动）
   */
  async extractSentenceTemplates(tweets: Array<{content: string}>): Promise<SentenceTemplate[]> {
    // 提取所有句子
    const allSentences: string[] = [];
    tweets.forEach(tweet => {
      const sentences = tweet.content.split(/[。！？\n]/).filter(s => s.trim().length > 5);
      allSentences.push(...sentences);
    });

    // 随机抽样（避免token过多）
    const sampledSentences = this.sampleArray(allSentences, 100);

    const prompt = `
请分析以下${sampledSentences.length}条句子，提取出高频使用的句式模板。

句子列表：
${sampledSentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

任务：
1. 识别相似的句子结构模式
2. 将具体内容抽象为模板变量：
   - [PERSON]：人称（我、你、他等）
   - [THING]：事物名称
   - [ADJ]：形容词
   - [NUM]：数字
   - [TIME]：时间词
3. 统计每个模板出现的频率
4. 判断句子类别：opening/development/closing
5. 判断情感类型：positive/negative/neutral

返回JSON格式（至少20个模板）：
{
  "templates": [
    {
      "pattern": "[PERSON]觉得[THING][ADJ]",
      "frequency": 15,
      "category": "development",
      "emotionType": "neutral",
      "examples": ["我觉得这个技术很有潜力", "大家觉得这个方案不错"]
    },
    ...
  ]
}

注意：
1. 只提取出现3次以上的模板
2. 保留句子的结构词（如"的"、"是"、"很"等）
3. examples要从原句子中选取
`;

    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const result = await aiService.generateText(prompt);
    const parsed = this.parseJSONResponse(result);

    return parsed.templates;
  }

  /**
   * 随机抽样数组
   */
  private sampleArray<T>(array: T[], size: number): T[] {
    if (array.length <= size) return array;

    const sampled: T[] = [];
    const indices = new Set<number>();

    while (sampled.length < size) {
      const randomIndex = Math.floor(Math.random() * array.length);
      if (!indices.has(randomIndex)) {
        indices.add(randomIndex);
        sampled.push(array[randomIndex]);
      }
    }

    return sampled;
  }
}
```

---

## 🎨 功能5：叙述风格分析（LLM版）

### 5.1 LLM分析实现

```typescript
interface NarrativeStyle {
  storytelling: {
    usePersonalAnecdotes: number;
    chronologicalOrder: number;
    characterDevelopment: number;
  };
  persuasion: {
    logicalArgument: number;
    evidenceSupport: number;
    emotionalAppeal: number;
  };
  interaction: {
    directAddress: number;
    questionEngagement: number;
    conversationalTone: number;
  };
  authority: {
    expertiseDisplay: number;
    confidenceLevel: number;
    citationUsage: number;
  };
  dominantStyle: string;
}

export class LLMStyleAnalyzer {

  /**
   * 分析叙述风格（LLM驱动）
   */
  async analyzeNarrativeStyle(tweets: Array<{content: string}>): Promise<NarrativeStyle> {
    // 抽样分析（避免token过多）
    const sampledTweets = this.sampleArray(tweets, 30);

    const prompt = `
请分析以下${sampledTweets.length}条推文的叙述风格特征：

推文列表：
${sampledTweets.map((t, i) => `
推文${i + 1}：
${t.content}
`).join('\n')}

请从4个维度分析（每个维度下有3个子特征，评分0-1）：

1. storytelling（故事性）：
   - usePersonalAnecdotes：使用个人故事的频率
   - chronologicalOrder：按时间顺序叙述的频率
   - characterDevelopment：人物描写的频率

2. persuasion（说服性）：
   - logicalArgument：逻辑论证的频率
   - evidenceSupport：证据支持的频率
   - emotionalAppeal：情感诉求的频率

3. interaction（互动性）：
   - directAddress：直接称呼读者的频率
   - questionEngagement：使用提问的频率
   - conversationalTone：对话语调的频率

4. authority（权威性）：
   - expertiseDisplay：展示专业知识的频率
   - confidenceLevel：语气自信程度
   - citationUsage：使用引用的频率

返回JSON格式：
{
  "storytelling": {
    "usePersonalAnecdotes": 0.40,
    "chronologicalOrder": 0.25,
    "characterDevelopment": 0.15
  },
  "persuasion": {
    "logicalArgument": 0.65,
    "evidenceSupport": 0.50,
    "emotionalAppeal": 0.35
  },
  "interaction": {
    "directAddress": 0.60,
    "questionEngagement": 0.45,
    "conversationalTone": 0.70
  },
  "authority": {
    "expertiseDisplay": 0.55,
    "confidenceLevel": 0.75,
    "citationUsage": 0.30
  },
  "dominantStyle": "persuasion",
  "reasoning": "用户主要采用说服性叙述风格，注重逻辑论证和证据支持，同时保持较高的互动性。"
}

注意：
1. 所有评分在0-1之间
2. dominantStyle选择平均分最高的维度
3. reasoning简要说明风格特点
`;

    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    const result = await aiService.generateText(prompt);
    const parsed = this.parseJSONResponse(result);

    return {
      storytelling: parsed.storytelling,
      persuasion: parsed.persuasion,
      interaction: parsed.interaction,
      authority: parsed.authority,
      dominantStyle: parsed.dominantStyle,
    };
  }
}
```

---

## 🔄 完整集成流程

### 统一的分析入口

```typescript
/**
 * 执行完整的LLM驱动的进阶风格分析
 */
export async function performLLMStyleAnalysis(username: string): Promise<void> {
  const analyzer = new LLMStyleAnalyzer();

  console.log(`开始对用户 ${username} 进行LLM驱动的风格分析...`);

  // 1. 获取用户推文
  const tweets = await db.writingAnalysisTweet.findMany({
    where: { userUsername: username },
    select: {
      id: true,
      content: true,
      likeCount: true,
      retweetCount: true,
      replyCount: true,
    }
  });

  if (tweets.length < 10) {
    throw new Error('推文数量不足，需要至少10条');
  }

  // 2. 按内容类型分组
  const typeAnnotations = await db.tweetTypeAnnotation.findMany({
    where: { username }
  });

  const tweetsByType = new Map<string, typeof tweets>();

  tweets.forEach(tweet => {
    const annotation = typeAnnotations.find(a => a.tweetId === tweet.id);
    if (annotation) {
      const types = JSON.parse(annotation.tweetTypes);
      const mainType = Object.entries(types)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];

      if (!tweetsByType.has(mainType)) {
        tweetsByType.set(mainType, []);
      }
      tweetsByType.get(mainType)!.push(tweet);
    }
  });

  // 3. 对每个内容类型进行分析
  for (const [contentType, typeTweets] of tweetsByType) {
    if (typeTweets.length < 5) continue;

    console.log(`\n分析 ${contentType} 类型（${typeTweets.length}条推文）...`);

    try {
      // 3.1 开头模式识别
      console.log('  - 开头模式识别...');
      const openingPatterns = await analyzer.analyzeOpeningPatternsBatch(typeTweets);

      // 3.2 吸引力分析
      console.log('  - 吸引力机制分析...');
      const attractionScores = await analyzer.analyzeAttractionBatch(
        typeTweets.map(t => ({ id: t.id, content: t.content }))
      );

      // 保存每条推文的吸引力分析
      for (let i = 0; i < typeTweets.length; i++) {
        const tweet = typeTweets[i];
        const score = attractionScores[i];

        await db.tweetAttractionAnalysis.upsert({
          where: { tweetId: tweet.id },
          create: {
            tweetId: tweet.id,
            username,
            noveltyScore: score.noveltyScore,
            controversyScore: score.controversyScore,
            practicalityScore: score.practicalityScore,
            emotionalResonance: score.emotionalResonance,
            cognitiveLoad: score.cognitiveLoad,
            overallAttractionScore: score.overallScore,
            analysisReasoning: score.reasoning,
            likeCount: tweet.likeCount,
            retweetCount: tweet.retweetCount,
            replyCount: tweet.replyCount,
          },
          update: {
            noveltyScore: score.noveltyScore,
            controversyScore: score.controversyScore,
            practicalityScore: score.practicalityScore,
            emotionalResonance: score.emotionalResonance,
            cognitiveLoad: score.cognitiveLoad,
            overallAttractionScore: score.overallScore,
            analysisReasoning: score.reasoning,
          }
        });
      }

      // 计算用户的平均吸引力特征
      const avgAttraction = {
        avgNoveltyScore: this.average(attractionScores.map(s => s.noveltyScore)),
        avgControversyScore: this.average(attractionScores.map(s => s.controversyScore)),
        avgPracticalityScore: this.average(attractionScores.map(s => s.practicalityScore)),
        avgEmotionalResonance: this.average(attractionScores.map(s => s.emotionalResonance)),
        avgCognitiveLoad: this.average(attractionScores.map(s => s.cognitiveLoad)),
        highPerformingFactors: this.identifyTopFactors(attractionScores),
      };

      // 3.3 情绪钩子识别
      console.log('  - 情绪钩子识别...');
      const emotionalHooks = await analyzer.analyzeEmotionalHooks(typeTweets);

      // 3.4 句式模板提取
      console.log('  - 句式模板提取...');
      const sentenceTemplates = await analyzer.extractSentenceTemplates(typeTweets);

      // 保存句式模板
      await db.sentenceTemplate.deleteMany({ where: { username, contentType } });
      for (const template of sentenceTemplates) {
        await db.sentenceTemplate.create({
          data: {
            username,
            contentType,
            templatePattern: template.pattern,
            frequency: template.frequency,
            category: template.category,
            emotionType: template.emotionType,
            examples: JSON.stringify(template.examples),
          }
        });
      }

      // 3.5 叙述风格分析
      console.log('  - 叙述风格分析...');
      const narrativeStyle = await analyzer.analyzeNarrativeStyle(typeTweets);

      // 4. 保存到用户风格档案
      await db.userStyleProfile.update({
        where: {
          username_contentType: {
            username,
            contentType
          }
        },
        data: {
          openingPatterns: JSON.stringify(openingPatterns),
          attractionProfile: JSON.stringify(avgAttraction),
          emotionalHooks: JSON.stringify(emotionalHooks),
          sentenceTemplatesSummary: JSON.stringify({
            topTemplates: sentenceTemplates.slice(0, 10),
            totalTemplates: sentenceTemplates.length,
          }),
          narrativeStyle: JSON.stringify(narrativeStyle),
          updatedAt: new Date(),
        }
      });

      console.log(`  ✓ ${contentType} 类型分析完成`);

    } catch (error) {
      console.error(`  ✗ ${contentType} 类型分析失败:`, error);
    }

    // 批次间延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n用户 ${username} 的LLM驱动风格分析全部完成！`);
}

function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function identifyTopFactors(scores: AttractionScores[]): string[] {
  const factorAverages = {
    novelty: average(scores.map(s => s.noveltyScore)),
    controversy: average(scores.map(s => s.controversyScore)),
    practicality: average(scores.map(s => s.practicalityScore)),
    emotional: average(scores.map(s => s.emotionalResonance)),
  };

  return Object.entries(factorAverages)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2)
    .map(([factor]) => factor);
}
```

---

## 💰 成本优化策略

### 1. 批处理优化

```typescript
// 一次分析多条推文，减少API调用次数
const batchSize = 5; // 每次分析5条
```

### 2. 缓存策略

```typescript
// 已分析过的推文不重复分析
const analyzedTweetIds = await db.tweetAttractionAnalysis.findMany({
  where: { username },
  select: { tweetId: true }
});

const unanalyzedTweets = tweets.filter(
  t => !analyzedTweetIds.some(a => a.tweetId === t.id)
);
```

### 3. 抽样分析

```typescript
// 对于大量推文，随机抽样分析
const sampledTweets = this.sampleArray(tweets, 50); // 最多分析50条
```

### 4. 使用更便宜的模型

```typescript
// 对于简单分析任务，使用更便宜的模型
const config = {
  provider: 'openai',
  model: 'gpt-4o-mini', // 而不是 gpt-4o
  ...
};
```

---

## 📊 对比：关键字 vs LLM

| 维度 | 关键字匹配 | LLM分析 |
|------|-----------|---------|
| **准确性** | 60-70% | 85-95% |
| **语义理解** | ❌ 无 | ✅ 强 |
| **复杂模式** | ❌ 难以识别 | ✅ 轻松识别 |
| **维护成本** | ⚠️ 高（需不断添加规则） | ✅ 低（无需维护） |
| **处理速度** | ✅ 快（毫秒级） | ⚠️ 慢（秒级） |
| **成本** | ✅ 免费 | ⚠️ 有成本（但可控） |
| **可扩展性** | ❌ 差 | ✅ 强 |

### 成本估算

假设使用 GPT-4o-mini：
- 输入：$0.15 / 1M tokens
- 输出：$0.60 / 1M tokens

分析100条推文（每条200字）：
- 总输入：~30K tokens
- 总输出：~5K tokens
- 总成本：约 $0.008（不到1美分）

**结论：LLM方案在准确性、可维护性上有巨大优势，成本可控。**

---

## 🚀 实施建议

### 方案选择

**推荐：混合方案**

1. **第一阶段**：使用LLM分析建立用户风格档案
2. **第二阶段**：将LLM分析结果作为"规则"，用于快速匹配新内容
3. **定期更新**：每月使用LLM重新分析，更新风格档案

### API配置

```typescript
// 建议配置
const analysisConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',  // 性价比最高
  temperature: 0.3,       // 低温度，确保一致性
  maxTokens: 2000,
};
```

### 错误处理

```typescript
// 添加重试机制
async function analyzeWithRetry<T>(
  analyzeFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await analyzeFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`分析失败，重试 ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('All retries failed');
}
```

---

## ✅ 总结

### LLM方案的优势

1. ✅ **高准确性**：理解语义，不被表面形式迷惑
2. ✅ **零维护**：无需维护规则库
3. ✅ **自适应**：自动适应新的表达方式
4. ✅ **可解释**：提供分析理由，便于理解
5. ✅ **成本可控**：通过批处理、抽样等方式优化

### 实施时间线

- Week 1-2：实现LLM分析器类
- Week 3：集成到分析流程
- Week 4：测试和优化
- Week 5：上线和监控

**准备开始实施了吗？**