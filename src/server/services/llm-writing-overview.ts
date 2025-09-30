// LLM驱动的写作概览服务
import { db } from '~/server/db';
import { WritingAssistantConfigLoader } from '~/server/core/ai/writing-assistant-config-loader';
import { AIServiceFactory } from '~/server/core/ai/ai-factory';
import { deduplicationManager } from './cache-manager';

// 用户写作概览接口
export interface UserWritingOverview {
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

export class LLMWritingOverviewService {

  constructor() {
    console.log('🧠 LLM写作概览服务初始化');
    // 确保有默认配置
    this.ensureDefaultConfig();
  }

  // 确保有默认配置
  private async ensureDefaultConfig() {
    try {
      await WritingAssistantConfigLoader.createDefaultConfigIfNotExists();
    } catch (error) {
      console.warn('创建默认写作AI配置失败:', error);
    }
  }

  // 生成初始概览
  async generateInitialOverview(username: string): Promise<UserWritingOverview> {
    // 使用去重管理器防止重复的昂贵LLM调用
    return await deduplicationManager.deduplicate(
      `generate_initial_overview:${username}`,
      async () => {
        console.log(`🔄 为用户 ${username} 生成初始写作概览...`);

    // 1. 获取用户所有推文
    const tweets = await this.getUserTweets(username);

    if (tweets.length < 5) {
      throw new Error(`需要至少5条推文才能生成有效的写作概览，当前只有${tweets.length}条`);
    }

    console.log(`📝 分析 ${tweets.length} 条推文...`);

    // 2. 构建LLM prompt
    const prompt = this.buildInitialAnalysisPrompt(username, tweets);

    // 3. 调用LLM分析
    const llmResponse = await this.callLLM(prompt, {
      model: 'claude-3-sonnet',
      maxTokens: 4000,
      temperature: 0.3
    });

    // 4. 解析和验证结果
    const overview = this.parseAndValidateOverview(llmResponse, username, tweets.length);

    // 5. 保存到数据库
    await this.saveOverview(overview);

    // 6. 记录更新日志
    await this.logUpdate(username, 'INITIAL', tweets.length, '初始生成概览');

    // 7. 自动更新用户的类型化风格档案
    try {
      const { styleAnalysisService } = await import('./style-analysis');
      await styleAnalysisService.updateUserAllTypeProfiles(username);
      console.log(`用户 ${username} 的类型化风格档案已自动更新`);
    } catch (error) {
      console.error(`自动更新风格档案失败:`, error);
      // 不阻断主流程
    }

        console.log(`✅ 用户 ${username} 的写作概览生成完成`);
        return overview;
      }
    );
  }

  // 检查并更新概览
  async checkAndUpdateOverview(username: string, newTweets: Array<{content: string}>): Promise<{
    updated: boolean;
    changes?: string[];
    newOverview?: UserWritingOverview;
  }> {
    // 使用去重管理器防止重复的昂贵LLM调用
    return await deduplicationManager.deduplicate(
      `check_update_overview:${username}:${newTweets.length}`,
      async () => {
        console.log(`🔍 检查用户 ${username} 是否需要更新概览 (${newTweets.length} 条新推文)...`);

        // 1. 获取当前概览
        const currentOverview = await this.getCurrentOverview(username);
        if (!currentOverview) {
          console.log(`📋 用户 ${username} 没有现有概览，生成初始概览...`);
          const overview = await this.generateInitialOverview(username);
          return { updated: true, newOverview: overview };
        }

        // 2. 如果新推文太少，不进行更新
        if (newTweets.length < 3) {
          console.log(`📊 新推文数量过少 (${newTweets.length}条)，跳过更新检查`);
          return { updated: false };
        }

        // 3. 构建更新检查prompt
        const prompt = this.buildUpdateCheckPrompt(currentOverview, newTweets);

        // 4. 调用LLM检查
        const llmResponse = await this.callLLM(prompt, {
          model: 'claude-3-haiku',
          maxTokens: 1500,
          temperature: 0.2
        });

        // 5. 解析响应
        if (llmResponse.trim() === 'NO_UPDATE_NEEDED' || llmResponse.includes('NO_UPDATE_NEEDED')) {
          console.log(`⏭️ LLM判断无需更新概览`);
          return { updated: false };
        }

        // 6. 应用更新
        console.log(`🔄 应用概览更新...`);
        const updatedOverview = await this.applyUpdates(currentOverview, llmResponse, newTweets.length);

        // 7. 保存更新
        await this.saveOverview(updatedOverview);
        await this.logUpdate(username, 'INCREMENTAL', newTweets.length, llmResponse);

        console.log(`✅ 用户 ${username} 的概览已更新`);

        // 自动更新用户的类型化风格档案
        try {
          const { styleAnalysisService } = await import('./style-analysis');
          await styleAnalysisService.updateUserAllTypeProfiles(username);
          console.log(`用户 ${username} 的类型化风格档案已自动更新`);
        } catch (error) {
          console.error(`自动更新风格档案失败:`, error);
          // 不阻断主流程
        }

        return {
          updated: true,
          changes: this.extractChanges(llmResponse),
          newOverview: updatedOverview
        };
      }
    );
  }

  // 获取用户推文（优先获取未分析的推文）
  private async getUserTweets(username: string): Promise<Array<{content: string}>> {
    // 获取当前概览记录，检查已分析的推文数量
    const currentOverview = await db.userWritingOverview.findUnique({
      where: { username },
      select: {
        totalTweetsAnalyzed: true,
        lastUpdated: true
      }
    });

    // 如果有现有概览，优先获取未分析的推文（在lastUpdated之后发布的）
    if (currentOverview?.lastUpdated) {
      // 将Date转换为BigInt时间戳（毫秒）
      const lastUpdatedTimestamp = BigInt(currentOverview.lastUpdated.getTime());

      const newTweets = await db.writingAnalysisTweet.findMany({
        where: {
          userUsername: username,
          publishedAt: {
            gt: lastUpdatedTimestamp
          }
        },
        select: { content: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 100
      });

      // 如果有足够的新推文，只返回新推文
      if (newTweets.length >= 5) {
        console.log(`📊 获取到 ${newTweets.length} 条新推文（发布于 ${currentOverview.lastUpdated} 之后）`);
        return newTweets;
      }

      // 如果新推文不足，补充一些旧推文
      const oldTweets = await db.writingAnalysisTweet.findMany({
        where: {
          userUsername: username,
          publishedAt: {
            lte: lastUpdatedTimestamp
          }
        },
        select: { content: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 100 - newTweets.length
      });

      console.log(`📊 获取到 ${newTweets.length} 条新推文 + ${oldTweets.length} 条旧推文`);
      return [...newTweets, ...oldTweets];
    }

    // 首次分析，获取所有推文
    const tweets = await db.writingAnalysisTweet.findMany({
      where: { userUsername: username },
      select: { content: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 100 // 最多分析100条推文
    });

    console.log(`📊 首次分析，获取 ${tweets.length} 条推文`);
    return tweets;
  }

  // 构建初始分析prompt
  private buildInitialAnalysisPrompt(username: string, tweets: Array<{content: string}>): string {
    const tweetTexts = tweets.map((t, i) => `${i + 1}. ${t.content}`).join('\n\n');

    return `作为专业的写作风格分析师，请深度分析用户"${username}"的推文写作风格。

推文内容（共${tweets.length}条）：
${tweetTexts}

请按照以下结构进行全面分析，返回JSON格式结果：

{
  "typicalStructure": {
    "openingPatterns": {
      "primaryPattern": "主要开头模式的名称",
      "description": "详细描述这种开头的特点和风格",
      "examples": ["具体例子1", "具体例子2", "具体例子3"],
      "frequency": "使用频率描述"
    },
    "developmentPatterns": {
      "primaryPattern": "主要内容展开方式",
      "description": "展开方式的详细描述",
      "examples": ["例子1", "例子2"],
      "characteristics": ["特征1", "特征2", "特征3"]
    },
    "closingPatterns": {
      "primaryPattern": "主要结尾方式",
      "description": "结尾特点描述",
      "examples": ["例子1", "例子2"]
    }
  },
  "typicalSentences": {
    "highFrequencyPatterns": [
      {
        "pattern": "句式模板",
        "description": "用法描述",
        "examples": ["实际例子1", "实际例子2"],
        "context": "使用场景"
      }
    ],
    "emotionalExpressions": [
      {
        "emotion": "情感类型",
        "expressions": ["表达方式1", "表达方式2"],
        "examples": ["例子1", "例子2"]
      }
    ]
  },
  "attractionMechanisms": {
    "primaryHooks": [
      {
        "type": "钩子类型",
        "description": "工作机制说明",
        "examples": ["成功例子1", "成功例子2"],
        "effectiveness": "效果评估"
      }
    ],
    "engagementTactics": [
      {
        "tactic": "互动策略",
        "description": "策略描述",
        "examples": ["例子1", "例子2"],
        "whenToUse": "使用时机"
      }
    ]
  },
  "emotionalHookStrategies": {
    "openingHooks": [
      {
        "strategy": "开头策略",
        "mechanism": "工作机制",
        "examples": ["例子1", "例子2"],
        "effectiveness": "有效性评价"
      }
    ],
    "sustainingTechniques": [
      {
        "technique": "维持技巧",
        "description": "技巧描述",
        "examples": ["例子1", "例子2"]
      }
    ],
    "closingTechniques": [
      {
        "technique": "结尾技巧",
        "description": "技巧描述",
        "examples": ["例子1", "例子2"]
      }
    ]
  },
  "overallStyle": {
    "writingPersonality": "写作人格类型",
    "toneCharacteristics": ["语调特征1", "语调特征2"],
    "strengthsAnalysis": "优势分析",
    "improvementAreas": "改进建议"
  },
  "generationGuidelines": {
    "recommendedStructures": ["推荐结构1", "推荐结构2"],
    "effectiveOpenings": ["有效开头1", "有效开头2"],
    "engagementTips": ["互动技巧1", "互动技巧2"],
    "styleConsistency": "风格一致性要求"
  }
}

分析要求：
1. 重点识别可复制的写作模式
2. 每个分析点都要有具体的推文例子支撑
3. 关注吸引力机制和情绪钩子的设置
4. 提供实用的内容生成指导
5. 保持分析的准确性和实用性

请确保返回有效的JSON格式。`;
  }

  // 构建更新检查prompt
  private buildUpdateCheckPrompt(currentOverview: UserWritingOverview, newTweets: Array<{content: string}>): string {
    const newTweetTexts = newTweets.map((t, i) => `${i + 1}. ${t.content}`).join('\n\n');

    return `当前用户写作概览的关键信息：

开头模式：${currentOverview.typicalStructure.openingPatterns.primaryPattern}
展开模式：${currentOverview.typicalStructure.developmentPatterns.primaryPattern}
结尾模式：${currentOverview.typicalStructure.closingPatterns.primaryPattern}

主要吸引力机制：${currentOverview.attractionMechanisms.primaryHooks.map(h => h.type).join(', ')}
情绪钩子策略：${currentOverview.emotionalHookStrategies.openingHooks.map(h => h.strategy).join(', ')}

写作人格：${currentOverview.overallStyle.writingPersonality}

新分析的推文（${newTweets.length}条）：
${newTweetTexts}

请检查新推文是否包含需要更新概览的重要信息：

**检查要点：**
1. 是否有显著的新结构模式（开头、展开、结尾）？
2. 是否有新的高频句式或表达特征？
3. 是否展现了新的吸引力机制或互动策略？
4. 是否有新的情绪钩子设置技巧？
5. 是否需要调整写作人格描述？

**更新标准：**
- 必须是在多条推文中出现的模式（不是偶然）
- 必须对内容生成有实际指导价值
- 必须有具体例子支撑

如果需要更新，请返回JSON格式的更新内容，只包含需要添加或修改的部分：

{
  "updateReason": "更新原因说明",
  "updates": {
    // 只包含需要更新的字段，例如：
    "typicalStructure": {
      "openingPatterns": {
        "primaryPattern": "更新的模式",
        "examples": ["新例子1", "新例子2"]
      }
    },
    "attractionMechanisms": {
      "primaryHooks": [
        {
          "type": "新钩子类型",
          "description": "描述",
          "examples": ["例子1"]
        }
      ]
    }
  }
}

如果不需要更新，请直接返回：NO_UPDATE_NEEDED`;
  }

  // 调用LLM进行分析
  private async callLLM(prompt: string, options: {
    model: string;
    maxTokens: number;
    temperature: number;
  }): Promise<string> {

    console.log(`🤖 调用LLM (${options.model})...`);

    try {
      // 根据调用类型选择合适的配置
      let config;
      if (prompt.includes('深度分析') || prompt.includes('generateInitialOverview')) {
        config = await WritingAssistantConfigLoader.getAnalysisConfig();
        console.log(`📊 使用分析配置: ${config.provider}/${config.model}`);
      } else if (prompt.includes('新分析的推文')) {
        config = await WritingAssistantConfigLoader.getUpdateCheckConfig();
        console.log(`🔍 使用更新检查配置: ${config.provider}/${config.model}`);
      } else {
        config = await WritingAssistantConfigLoader.getDefaultConfig();
        console.log(`⚙️ 使用默认配置: ${config.provider}/${config.model}`);
      }

      // 创建AI服务实例
      const aiService = AIServiceFactory.createService({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: config.baseURL
      });

      // 调用AI服务的通用文本生成方法
      const result = await aiService.generateText(prompt);

      console.log(`✅ LLM调用成功，返回内容长度: ${result.length} 字符`);
      return result;

    } catch (error) {
      console.error('LLM调用失败:', error);
      throw new Error(`LLM服务调用失败: ${error instanceof Error ? error.message : '未知错误'}，请检查AI配置或网络连接`);
    }
  }



  // 解析和验证概览
  private parseAndValidateOverview(llmResponse: string, username: string, tweetCount: number): UserWritingOverview {
    try {
      // 清理可能的 markdown 代码块标记
      let cleanedResponse = llmResponse.trim();

      // 移除 markdown 代码块标记
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // 尝试从响应中提取 JSON 对象
      // 匹配第一个 { 到最后一个 }
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanedResponse);

      // 添加元数据
      parsed.username = username;
      parsed.lastUpdated = new Date().toISOString();
      parsed.totalTweetsAnalyzed = tweetCount;

      // 基本验证
      if (!parsed.typicalStructure || !parsed.attractionMechanisms || !parsed.overallStyle) {
        throw new Error('LLM返回的数据结构不完整');
      }

      return parsed as UserWritingOverview;

    } catch (error) {
      console.error('解析LLM响应失败:', error);
      throw new Error(`解析LLM分析结果失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 应用更新
  private async applyUpdates(currentOverview: UserWritingOverview, llmResponse: string, newTweetsCount: number): Promise<UserWritingOverview> {
    try {
      // 清理可能的 markdown 代码块标记
      let cleanedResponse = llmResponse.trim();

      // 移除 markdown 代码块标记
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // 尝试从响应中提取 JSON 对象
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      const updateData = JSON.parse(cleanedResponse);

      if (!updateData.updates) {
        throw new Error('更新数据格式不正确');
      }

      // 深度合并更新
      const updatedOverview = this.deepMerge(currentOverview, updateData.updates);

      // 更新元数据
      updatedOverview.lastUpdated = new Date().toISOString();
      updatedOverview.totalTweetsAnalyzed += newTweetsCount;

      return updatedOverview;

    } catch (error) {
      console.error('应用更新失败:', error);
      throw new Error(`应用概览更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // 深度合并对象
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (Array.isArray(source[key])) {
        // 对于数组，追加新项目
        result[key] = [...(result[key] || []), ...source[key]];
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // 提取更新变化
  private extractChanges(llmResponse: string): string[] {
    try {
      const updateData = JSON.parse(llmResponse);
      const changes = [];

      if (updateData.updateReason) {
        changes.push(updateData.updateReason);
      }

      if (updateData.updates) {
        Object.keys(updateData.updates).forEach(key => {
          changes.push(`更新了 ${key} 部分`);
        });
      }

      return changes;

    } catch (error) {
      return ['概览已更新但无法解析具体变化'];
    }
  }

  // 获取当前概览
  async getCurrentOverview(username: string): Promise<UserWritingOverview | null> {
    try {
      const record = await db.userWritingOverview.findUnique({
        where: { username }
      });

      if (!record) return null;

      return JSON.parse(record.overviewContent) as UserWritingOverview;

    } catch (error) {
      console.error('获取概览失败:', error);
      return null;
    }
  }

  // 保存概览
  private async saveOverview(overview: UserWritingOverview): Promise<void> {
    try {
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

      console.log(`💾 概览已保存: ${overview.username}`);

    } catch (error) {
      console.error('保存概览失败:', error);
      throw error;
    }
  }

  // 记录更新日志
  private async logUpdate(username: string, updateType: string, newTweetsCount: number, changes: string): Promise<void> {
    try {
      await db.overviewUpdateLog.create({
        data: {
          id: `log_${username}_${Date.now()}`,
          username,
          updateType,
          newTweetsCount,
          changesMade: JSON.stringify({ changes }),
          llmModel: 'claude-3-sonnet',
          promptTokens: 0,
          completionTokens: 0
        }
      });

    } catch (error) {
      console.error('记录更新日志失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  // 获取概览统计
  async getOverviewStats(username: string): Promise<{
    hasOverview: boolean;
    lastUpdated?: string;
    totalTweetsAnalyzed?: number;
    updateHistory?: Array<{
      updateType: string;
      newTweetsCount: number;
      createdAt: string;
    }>;
  }> {

    const overview = await this.getCurrentOverview(username);
    if (!overview) {
      return { hasOverview: false };
    }

    // 获取更新历史
    const updateHistory = await db.overviewUpdateLog.findMany({
      where: { username },
      select: {
        updateType: true,
        newTweetsCount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return {
      hasOverview: true,
      lastUpdated: overview.lastUpdated,
      totalTweetsAnalyzed: overview.totalTweetsAnalyzed,
      updateHistory: updateHistory.map(log => ({
        updateType: log.updateType,
        newTweetsCount: log.newTweetsCount ?? 0,
        createdAt: log.createdAt.toISOString()
      }))
    };
  }
}

// 导出单例
export const llmWritingOverviewService = new LLMWritingOverviewService();