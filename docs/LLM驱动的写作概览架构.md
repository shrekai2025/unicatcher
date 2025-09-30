# LLM驱动的写作概览架构设计

## 🎯 核心理念

**用LLM替代规则分析**，维护一个**用户写作概览**（User Writing Profile），每次新推文分析时都让AI检查是否需要更新概览。

## 📋 写作概览结构

### 固定分析框架
```typescript
interface UserWritingOverview {
  username: string;
  lastUpdated: string;
  totalTweetsAnalyzed: number;

  // 典型行文结构
  typicalStructure: {
    openingPatterns: {
      primaryPattern: string;        // 主要开头模式
      description: string;           // 描述
      examples: string[];            // 典型例子（2-3个）
      frequency: string;             // 使用频率描述："经常"、"偶尔"等
    };

    developmentPatterns: {
      primaryPattern: string;        // 主要展开方式
      description: string;
      examples: string[];
      characteristics: string[];     // 特征描述
    };

    closingPatterns: {
      primaryPattern: string;        // 主要结尾方式
      description: string;
      examples: string[];
    };
  };

  // 典型句式
  typicalSentences: {
    highFrequencyPatterns: Array<{
      pattern: string;               // 句式模板
      description: string;           // 用法描述
      examples: string[];            // 实际例子
      context: string;               // 使用场景
    }>;

    emotionalExpressions: Array<{
      emotion: string;               // 情感类型
      expressions: string[];         // 表达方式
      examples: string[];
    }>;
  };

  // 吸引力机制
  attractionMechanisms: {
    primaryHooks: Array<{
      type: string;                  // 钩子类型
      description: string;           // 工作机制
      examples: string[];            // 成功例子
      effectiveness: string;         // 效果评估
    }>;

    engagementTactics: Array<{
      tactic: string;                // 互动策略
      description: string;
      examples: string[];
      whenToUse: string;             // 使用时机
    }>;
  };

  // 情绪钩子设置
  emotionalHookStrategies: {
    openingHooks: Array<{
      strategy: string;              // 策略名称
      mechanism: string;             // 工作机制
      examples: string[];            // 实例
      effectiveness: string;         // 有效性评价
    }>;

    sustainingTechniques: Array<{
      technique: string;
      description: string;
      examples: string[];
    }>;

    closingTechniques: Array<{
      technique: string;
      description: string;
      examples: string[];
    }>;
  };

  // 整体风格特征
  overallStyle: {
    writingPersonality: string;      // 写作人格："理性分析型"、"感性故事型"等
    toneCharacteristics: string[];   // 语调特征
    strengthsAnalysis: string;       // 优势分析
    improvementAreas: string;        // 改进建议
  };

  // 生成建议
  generationGuidelines: {
    recommendedStructures: string[]; // 推荐使用的结构
    effectiveOpenings: string[];     // 有效的开头方式
    engagementTips: string[];        // 互动技巧
    styleConsistency: string;        // 风格一致性要求
  };
}
```

## 🔄 LLM分析流程

### 1. 初始概览生成

当用户首次分析时，提供所有推文给LLM：

```typescript
const INITIAL_ANALYSIS_PROMPT = `
作为写作风格专家，请分析以下用户的推文，生成一个全面的写作概览。

用户名：{username}
推文数据：{tweets}

请按照以下框架进行分析：

1. **典型行文结构分析**
   - 开头模式：用户最常用的开头方式，并分析其特点
   - 展开模式：内容展开的逻辑和方式
   - 结尾模式：如何收束和互动

2. **典型句式提取**
   - 识别高频使用的句式模板
   - 分析情感表达的句式特点
   - 提供具体例子

3. **吸引力机制分析**
   - 识别这些推文为什么吸引人
   - 分析成功的互动策略
   - 评估不同钩子的有效性

4. **情绪钩子策略**
   - 开头如何抓住注意力
   - 中间如何维持兴趣
   - 结尾如何促进互动

5. **生成指导建议**
   - 基于分析提供内容生成建议
   - 保持风格一致性的要点

请用JSON格式返回分析结果，包含具体例子和实用建议。
`;
```

### 2. 增量更新机制

每次新推文分析后，检查是否需要更新概览：

```typescript
const UPDATE_CHECK_PROMPT = `
当前用户写作概览：{currentOverview}

新分析的推文：{newTweets}

请分析：
1. 新推文是否展现了之前未识别的写作模式？
2. 是否有新的吸引力机制或情绪钩子？
3. 是否需要更新典型句式或结构模式？

如果需要更新，请返回更新的部分。如果不需要，请返回 "NO_UPDATE_NEEDED"。

更新规则：
- 只有显著的新模式才值得更新
- 确保例子的代表性和多样性
- 保持概览的精简性（每个类别不超过3-5个要点）
`;
```

## 🏗️ 实现架构

### 1. 数据表设计

```sql
-- 用户写作概览表
CREATE TABLE user_writing_overview (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,

  -- 概览内容（JSON格式存储）
  overview_content TEXT NOT NULL,

  -- 元数据
  total_tweets_analyzed INTEGER DEFAULT 0,
  last_updated DATETIME NOT NULL,
  version INTEGER DEFAULT 1,

  -- 更新历史
  update_history TEXT, -- JSON: 记录主要更新

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 概览更新日志
CREATE TABLE overview_update_log (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,

  -- 更新信息
  update_type TEXT NOT NULL, -- INITIAL, INCREMENTAL, MAJOR_REVISION
  new_tweets_count INTEGER,
  changes_made TEXT, -- JSON: 具体更改内容

  -- LLM信息
  llm_model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES user_writing_overview(username)
);
```

### 2. 核心服务实现

```typescript
export class LLMWritingOverviewService {

  // 生成初始概览
  async generateInitialOverview(username: string): Promise<UserWritingOverview> {
    // 1. 获取用户所有推文
    const tweets = await this.getUserTweets(username);

    if (tweets.length < 10) {
      throw new Error('需要至少10条推文才能生成有效的写作概览');
    }

    // 2. 构建LLM prompt
    const prompt = this.buildInitialAnalysisPrompt(username, tweets);

    // 3. 调用LLM分析
    const llmResponse = await this.callLLM(prompt, {
      model: 'claude-3-sonnet',
      maxTokens: 4000,
      temperature: 0.3
    });

    // 4. 解析和验证结果
    const overview = this.parseAndValidateOverview(llmResponse);
    overview.username = username;
    overview.totalTweetsAnalyzed = tweets.length;
    overview.lastUpdated = new Date().toISOString();

    // 5. 保存到数据库
    await this.saveOverview(overview);

    // 6. 记录更新日志
    await this.logUpdate(username, 'INITIAL', tweets.length, llmResponse);

    return overview;
  }

  // 检查并更新概览
  async checkAndUpdateOverview(username: string, newTweets: Array<{content: string}>): Promise<{
    updated: boolean;
    changes?: string[];
    newOverview?: UserWritingOverview;
  }> {

    // 1. 获取当前概览
    const currentOverview = await this.getCurrentOverview(username);
    if (!currentOverview) {
      // 如果没有概览，生成初始概览
      const overview = await this.generateInitialOverview(username);
      return { updated: true, newOverview: overview };
    }

    // 2. 构建更新检查prompt
    const prompt = this.buildUpdateCheckPrompt(currentOverview, newTweets);

    // 3. 调用LLM检查
    const llmResponse = await this.callLLM(prompt, {
      model: 'claude-3-haiku', // 使用更快的模型进行检查
      maxTokens: 1500,
      temperature: 0.2
    });

    // 4. 解析响应
    if (llmResponse.trim() === 'NO_UPDATE_NEEDED') {
      return { updated: false };
    }

    // 5. 应用更新
    const updatedOverview = this.applyUpdates(currentOverview, llmResponse);
    updatedOverview.totalTweetsAnalyzed += newTweets.length;
    updatedOverview.lastUpdated = new Date().toISOString();

    // 6. 保存更新
    await this.saveOverview(updatedOverview);
    await this.logUpdate(username, 'INCREMENTAL', newTweets.length, llmResponse);

    return {
      updated: true,
      changes: this.extractChanges(llmResponse),
      newOverview: updatedOverview
    };
  }

  // 构建初始分析prompt
  private buildInitialAnalysisPrompt(username: string, tweets: Array<{content: string}>): string {
    const tweetTexts = tweets.map((t, i) => `${i + 1}. ${t.content}`).join('\n');

    return `
作为专业的写作风格分析师，请深度分析用户"${username}"的推文写作风格。

推文内容（共${tweets.length}条）：
${tweetTexts}

请按照以下结构进行全面分析：

## 1. 典型行文结构
分析开头、展开、结尾的模式，提供2-3个典型例子。

## 2. 典型句式模板
识别高频句式，分析情感表达特点，给出具体例子。

## 3. 吸引力机制
分析为什么这些推文能吸引读者，识别成功的策略。

## 4. 情绪钩子策略
分析如何设置开头钩子、维持兴趣、促进互动。

## 5. 风格特征总结
总结写作人格、语调特征、优势和改进点。

## 6. 生成指导建议
基于分析提供具体的内容生成建议。

请用JSON格式返回，确保每个分析点都有具体例子支撑。重点关注：
- 可操作的模式识别
- 具体的例子引用
- 实用的生成建议
`;
  }

  // 构建更新检查prompt
  private buildUpdateCheckPrompt(currentOverview: UserWritingOverview, newTweets: Array<{content: string}>): string {
    const newTweetTexts = newTweets.map((t, i) => `${i + 1}. ${t.content}`).join('\n');

    return `
当前用户写作概览：
${JSON.stringify(currentOverview, null, 2)}

新分析的推文（${newTweets.length}条）：
${newTweetTexts}

请检查新推文是否包含需要更新概览的重要信息：

1. **新的结构模式**：是否有之前未识别的开头、展开或结尾模式？
2. **新的句式特征**：是否有新的高频句式或表达方式？
3. **新的吸引力机制**：是否展现了新的吸引读者的策略？
4. **新的情绪钩子**：是否有新的情绪设置技巧？

**更新标准**：
- 必须是显著的新模式（不是偶然出现）
- 必须有助于提升内容生成质量
- 必须有具体例子支撑

如果需要更新，请返回JSON格式的更新内容，只包含需要添加或修改的部分。
如果不需要更新，请返回：NO_UPDATE_NEEDED

例子格式：
{
  "typicalStructure": {
    "openingPatterns": {
      "newPattern": "新识别的开头模式",
      "examples": ["例子1", "例子2"]
    }
  },
  "updateReason": "更新原因说明"
}
`;
  }

  // 调用LLM
  private async callLLM(prompt: string, options: {
    model: string;
    maxTokens: number;
    temperature: number;
  }): Promise<string> {
    // 这里集成实际的LLM API调用
    // 可以是OpenAI、Claude、或其他LLM服务

    // 示例使用fetch调用（需要替换为实际实现）
    const response = await fetch('/api/llm/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        ...options
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API调用失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content;
  }

  // 获取当前概览
  private async getCurrentOverview(username: string): Promise<UserWritingOverview | null> {
    const record = await db.userWritingOverview.findUnique({
      where: { username }
    });

    if (!record) return null;

    return JSON.parse(record.overviewContent) as UserWritingOverview;
  }

  // 保存概览
  private async saveOverview(overview: UserWritingOverview): Promise<void> {
    await db.userWritingOverview.upsert({
      where: { username: overview.username },
      update: {
        overviewContent: JSON.stringify(overview),
        totalTweetsAnalyzed: overview.totalTweetsAnalyzed,
        lastUpdated: new Date(overview.lastUpdated),
        version: { increment: 1 }
      },
      create: {
        id: `overview_${overview.username}_${Date.now()}`,
        username: overview.username,
        overviewContent: JSON.stringify(overview),
        totalTweetsAnalyzed: overview.totalTweetsAnalyzed,
        lastUpdated: new Date(overview.lastUpdated),
        version: 1
      }
    });
  }

  // 记录更新日志
  private async logUpdate(username: string, updateType: string, newTweetsCount: number, llmResponse: string): Promise<void> {
    await db.overviewUpdateLog.create({
      data: {
        id: `log_${username}_${Date.now()}`,
        username,
        updateType,
        newTweetsCount,
        changesMade: JSON.stringify({ llmResponse }),
        llmModel: 'claude-3-sonnet', // 记录使用的模型
        promptTokens: 0, // TODO: 从LLM响应中获取
        completionTokens: 0
      }
    });
  }
}
```

## 🎯 使用示例

### 初次生成概览
```typescript
const overviewService = new LLMWritingOverviewService();

// 为用户生成初始写作概览
const overview = await overviewService.generateInitialOverview('@testuser');

console.log('典型开头模式:', overview.typicalStructure.openingPatterns);
console.log('主要吸引力机制:', overview.attractionMechanisms.primaryHooks);
```

### 增量更新
```typescript
// 新推文分析后检查更新
const result = await overviewService.checkAndUpdateOverview('@testuser', [
  { content: '今天发现了一个有趣的现象...' },
  { content: '数据显示这个趋势很明显...' }
]);

if (result.updated) {
  console.log('概览已更新:', result.changes);
}
```

### 生成内容时使用概览
```typescript
const overview = await overviewService.getCurrentOverview('@testuser');

// 基于用户的典型开头模式生成新内容
const recommendedOpening = overview.typicalStructure.openingPatterns.primaryPattern;
const effectiveHooks = overview.attractionMechanisms.primaryHooks;

// 使用这些信息指导内容生成...
```

## 🎁 优势

1. **智能化**：LLM理解语言细节，分析更准确
2. **自适应**：随着新数据自动更新概览
3. **实用性**：提供具体的生成指导建议
4. **精简性**：维护紧凑但全面的用户画像
5. **例子驱动**：每个分析都有具体例子支撑

这个架构将写作风格分析从**规则检测**升级为**智能理解**！🚀