/**
 * OpenAI 服务类
 * 处理推文的 AI 分析，包括关键词提取和主题标签匹配
 */

export interface AIConfig {
  apiKey: string;
  provider: 'openai' | 'openai-badger';
  model: string;
  baseURL?: string;
}

export interface TweetAnalysisResult {
  isValueless: boolean; // 是否为无价值推文（打招呼、日常生活等）
  keywords: string[]; // AI提取的关键词
  topicTags: string[]; // 命中的主题标签
  contentTypes: string[]; // 内容类型（教程、产品介绍等）
}

export interface BatchTweetAnalysisResult {
  tweetId: string;
  isValueless: boolean;
  keywords: string[];
  topicTags: string[];
  contentTypes: string[];
}

export interface ProcessingStats {
  processed: number;
  succeeded: number;
  failed: number;
  valueless: number; // 被判定为无价值的推文数
}

export interface AIRequestDetails {
  timestamp: string;
  batchId?: string;
  tweets: Array<{ id: string; content: string }>;
  aiConfig: AIConfig;
  systemPrompt?: string;
  requestBody: any;
}

export interface AIResponseDetails {
  timestamp: string;
  batchId?: string;
  responseStatus: number;
  responseData: any;
  processingTime: number;
  results: Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }>;
}

export class OpenAIService {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config: AIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    
    // 根据供应商设置不同的baseURL和默认模型
    if (config.provider === 'openai-badger') {
      this.baseURL = config.baseURL || 'https://api.tu-zi.com/v1';
      this.model = config.model || 'gpt-4o-mini';
    } else {
      this.baseURL = config.baseURL || 'https://api.openai.com/v1';
      this.model = config.model || 'gpt-4o';
    }
  }

  /**
   * 分析单条推文
   */
  async analyzeTweet(
    tweetContent: string,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string
  ): Promise<TweetAnalysisResult> {
    const defaultSystemPrompt = this.getDefaultSystemPrompt(topicTags, contentTypes);
    const prompt = systemPrompt || defaultSystemPrompt;

    try {
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `请分析以下推文：\n\n${tweetContent}`,
          },
        ],
        temperature: 0.3, // 降低随机性，提高一致性
        max_tokens: 1000,
      };

      console.log(`[AI API] 调用请求 - 模型: ${this.model}, 端点: ${this.baseURL}/chat/completions`);
      console.log(`[AI API] 请求体:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.log(`[AI API] 请求失败 - 状态码: ${response.status}`);
        console.log(`[AI API] 错误内容:`, error);
        throw new Error(`OpenAI API 错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log(`[AI API] 响应数据:`, JSON.stringify(data, null, 2));
      
      const content = data.choices?.[0]?.message?.content;
      console.log(`[AI API] 提取的内容:`, content);

      if (!content) {
        console.log(`[AI API] 警告: OpenAI 返回内容为空`);
        throw new Error('OpenAI 返回内容为空');
      }

      const result = this.parseAnalysisResult(content, topicTags, contentTypes);
      console.log(`[AI API] 解析结果:`, JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('OpenAI API 调用失败:', error);
      throw error;
    }
  }

  /**
   * 真正的批量分析推文 - 在单次AI调用中处理多条推文
   */
  async analyzeTweetsBatchOptimized(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void,
    batchId?: string
  ): Promise<Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }>> {
    if (tweets.length === 0) {
      return [];
    }

    console.log(`[AI API 批量] 开始批量分析 ${tweets.length} 条推文`);
    
    const startTime = Date.now();

    try {
      // 构建批量分析的提示词
      const batchPrompt = this.getBatchAnalysisPrompt(topicTags, contentTypes, systemPrompt);
      
      // 构建推文列表字符串
      const tweetsContent = tweets.map((tweet, index) => 
        `推文ID: ${tweet.id}\n内容: ${tweet.content}\n---`
      ).join('\n');

      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: batchPrompt,
          },
          {
            role: 'user',
            content: `请分析以下 ${tweets.length} 条推文：\n\n${tweetsContent}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000, // 增加token限制以支持批量处理
      };

      // 记录请求详情
      const requestDetails: AIRequestDetails = {
        timestamp: new Date().toISOString(),
        batchId,
        tweets,
        aiConfig: {
          apiKey: '***隐藏***',
          provider: this.baseURL.includes('tu-zi.com') ? 'openai-badger' : 'openai',
          model: this.model,
          baseURL: this.baseURL,
        },
        systemPrompt,
        requestBody: {
          model: this.model,
          temperature: 0.3,
          max_tokens: 4000,
          messages: [
            { role: 'system', content: systemPrompt ? systemPrompt.substring(0, 200) + '...' : batchPrompt.substring(0, 200) + '...' },
            { role: 'user', content: `分析 ${tweets.length} 条推文:\n${tweets.slice(0, 2).map(t => `ID:${t.id} - ${t.content.substring(0, 50)}...`).join('\n')}${tweets.length > 2 ? `\n...还有${tweets.length - 2}条` : ''}` }
          ]
        },
      };

      console.log(`[AI API 批量] 发送批量请求 - 推文数量: ${tweets.length}`);
      console.log(`[AI API 批量] 请求详情:`, {
        模型: this.model,
        推文数量: tweets.length,
        批次ID: batchId,
        推文预览: tweets.slice(0, 3).map(t => ({
          ID: t.id,
          内容: t.content.substring(0, 100) + (t.content.length > 100 ? '...' : '')
        })),
        系统提示词长度: (systemPrompt || batchPrompt).length,
        请求体大小: JSON.stringify(requestBody).length
      });

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const processingTime = Date.now() - startTime;
      const responseData = await response.json();

      if (!response.ok) {
        console.error(`[AI API 批量] 请求失败 - 状态码: ${response.status}, 错误: ${JSON.stringify(responseData)}`);
        
        // 记录失败的响应详情
        const responseDetails: AIResponseDetails = {
          timestamp: new Date().toISOString(),
          batchId,
          responseStatus: response.status,
          responseData,
          processingTime,
          results: [],
        };

        // 保存失败记录到数据库（如果有batchId）
        if (batchId) {
          await this.saveProcessingDetails(batchId, requestDetails, responseDetails, 'error');
        }

        throw new Error(`批量AI分析失败: ${response.status} ${JSON.stringify(responseData)}`);
      }

      const content = responseData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('AI返回内容为空');
      }

      console.log(`[AI API 批量] 收到AI响应，开始解析批量结果`);
      console.log(`[AI API 批量] AI响应详情:`, {
        状态码: response.status,
        处理时间: processingTime + 'ms',
        响应大小: JSON.stringify(responseData).length,
        Token使用: responseData.usage?.total_tokens || '未知',
        AI返回内容长度: content?.length || 0,
        AI返回内容预览: content?.substring(0, 200) + (content && content.length > 200 ? '...' : '')
      });

      // 解析批量结果
      const batchResults = this.parseBatchAnalysisResult(content, tweets, topicTags, contentTypes);
      
      // 记录成功的响应详情
      const responseDetails: AIResponseDetails = {
        timestamp: new Date().toISOString(),
        batchId,
        responseStatus: response.status,
        responseData: {
          ...responseData,
          choices: [{
            ...responseData.choices[0],
            message: {
              ...responseData.choices[0].message,
              content: content.substring(0, 500) + (content.length > 500 ? '...' : '') // 截取前500字符
            }
          }]
        },
        processingTime,
        results: batchResults,
      };

      // 保存处理详情到数据库（如果有batchId）
      if (batchId) {
        await this.saveProcessingDetails(batchId, requestDetails, responseDetails, 'success');
      }
      
      // 更新进度统计
      const stats: ProcessingStats = {
        processed: tweets.length,
        succeeded: batchResults.filter(r => r.result !== null).length,
        failed: batchResults.filter(r => r.result === null).length,
        valueless: batchResults.filter(r => r.result?.isValueless).length,
      };

      console.log(`[AI API 批量] 批量处理完成 - 成功: ${stats.succeeded}, 失败: ${stats.failed}, 无价值: ${stats.valueless}`);
      onProgress?.(stats);

      return batchResults;

    } catch (error) {
      console.error(`[AI API 批量] ❌ 批量分析失败，降级为单条处理:`, error);
      console.error(`[AI API 批量] 失败原因:`, {
        错误类型: error instanceof Error ? error.constructor.name : typeof error,
        错误消息: error instanceof Error ? error.message : String(error),
        推文数量: tweets.length,
        批次ID: batchId,
      });
      
      // 记录错误详情
      if (batchId) {
        const errorDetails: AIResponseDetails = {
          timestamp: new Date().toISOString(),
          batchId,
          responseStatus: 0,
          responseData: { error: error instanceof Error ? error.message : '未知错误' },
          processingTime: Date.now() - startTime,
          results: [],
        };
        await this.saveProcessingDetails(batchId, undefined, errorDetails, 'fallback');
      }
      
      // 批量失败时降级为单条处理
      console.log(`[AI API 批量] ⬇️ 开始降级处理，将逐条处理 ${tweets.length} 条推文`);
      return this.analyzeTweetsBatchFallback(tweets, topicTags, contentTypes, systemPrompt, onProgress);
    }
  }

  /**
   * 保存处理详情到数据库
   */
  private async saveProcessingDetails(
    batchId: string, 
    requestDetails?: AIRequestDetails, 
    responseDetails?: AIResponseDetails,
    logType: 'success' | 'error' | 'fallback' = 'success'
  ): Promise<void> {
    try {
      const { db } = await import('~/server/db');
      
      // 获取当前记录
      const currentRecord = await db.aIProcessRecord.findUnique({
        where: { batchId },
        select: { 
          requestDetails: true, 
          responseDetails: true, 
          processingLogs: true 
        }
      });

      if (!currentRecord) return;

      // 解析现有数据
      const existingRequestDetails = currentRecord.requestDetails ? JSON.parse(currentRecord.requestDetails) : null;
      const existingResponseDetails = currentRecord.responseDetails ? JSON.parse(currentRecord.responseDetails) : [];
      const existingLogs = currentRecord.processingLogs ? JSON.parse(currentRecord.processingLogs) : [];

      // 准备更新数据
      const updateData: any = {};

      // 更新请求详情（总是更新，确保包含最新的推文数据）
      if (requestDetails) {
        if (!existingRequestDetails) {
          // 第一次保存
          updateData.requestDetails = JSON.stringify(requestDetails);
        } else {
          // 如果已有记录，但推文数据更详细，则更新
          const existing = existingRequestDetails;
          if (!existing.tweets || existing.tweets.length === 0) {
            updateData.requestDetails = JSON.stringify(requestDetails);
          }
        }
      }

      // 添加响应详情（可以有多个）
      if (responseDetails) {
        const updatedResponseDetails = Array.isArray(existingResponseDetails) 
          ? [...existingResponseDetails, responseDetails]
          : [responseDetails];
        updateData.responseDetails = JSON.stringify(updatedResponseDetails);
      }

      // 添加处理日志
      const newLog = {
        timestamp: new Date().toISOString(),
        level: logType === 'error' ? 'error' : 'info',
        message: logType === 'success' ? 'AI批量处理成功' : 
                logType === 'error' ? 'AI批量处理失败' : 
                'AI批量处理降级为单条模式',
        data: responseDetails ? {
          processingTime: responseDetails.processingTime,
          responseStatus: responseDetails.responseStatus,
          resultsCount: responseDetails.results.length
        } : undefined
      };

      updateData.processingLogs = JSON.stringify([...existingLogs, newLog]);

      // 更新数据库
      await db.aIProcessRecord.update({
        where: { batchId },
        data: updateData
      });

    } catch (error) {
      console.error(`[AI API] 保存处理详情失败:`, error);
    }
  }

  /**
   * 批量分析推文 - 兼容旧版本，保留降级处理
   */
  async analyzeTweetsBatch(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void
  ): Promise<Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }>> {
    // 优先使用批量优化处理
    return this.analyzeTweetsBatchOptimized(tweets, topicTags, contentTypes, systemPrompt, onProgress);
  }

  /**
   * 降级处理：逐条分析推文（公开方法供外部调用）
   */
  async analyzeTweetsBatchFallback(
    tweets: Array<{ id: string; content: string }>,
    topicTags: Array<{name: string, description?: string}>,
    contentTypes: Array<{name: string, description?: string}>,
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void
  ): Promise<Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }>> {
    console.log(`[AI API 降级] 使用单条处理模式分析 ${tweets.length} 条推文`);
    
    const results: Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }> = [];
    const stats: ProcessingStats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      valueless: 0,
    };

    for (const tweet of tweets) {
      try {
        console.log(`[AI API 降级] 开始分析推文 ${tweet.id}: ${tweet.content.substring(0, 100)}...`);
        const result = await this.analyzeTweet(tweet.content, topicTags, contentTypes, systemPrompt);
        console.log(`[AI API 降级] 推文 ${tweet.id} 分析完成 - 无价值: ${result.isValueless}, 主题标签: ${result.topicTags.length}, 内容类型: ${result.contentTypes.length}`);
        
        results.push({
          tweetId: tweet.id,
          result,
        });

        stats.succeeded++;
        if (result.isValueless) {
          stats.valueless++;
        }
      } catch (error) {
        console.error(`[AI API 降级] 分析推文 ${tweet.id} 失败:`, error);
        results.push({
          tweetId: tweet.id,
          result: null,
          error: error instanceof Error ? error.message : '未知错误',
        });
        stats.failed++;
      }

      stats.processed++;
      onProgress?.(stats);

      // 避免 API 限流，每次请求间隔一下
      await this.delay(100);
    }

    return results;
  }

  /**
   * 解析 AI 返回的分析结果
   */
  private parseAnalysisResult(content: string, validTopicTags: Array<{name: string, description?: string}>, validContentTypes: Array<{name: string, description?: string}>): TweetAnalysisResult {
    try {
      // 尝试解析 JSON 格式的返回
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 提取关键词
        const aiKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
        const filteredKeywords = aiKeywords.filter((keyword: string) => 
          keyword && keyword.trim().length > 0
        ).slice(0, 10); // 限制最多10个关键词
        
        // 过滤主题标签，只保留用户配置的有效标签
        const aiTopicTags = Array.isArray(parsed.topicTags || parsed.topic_tags) ? 
                          (parsed.topicTags || parsed.topic_tags) : [];
        const filteredTopicTags = aiTopicTags.filter((tag: string) => 
          validTopicTags.some((validTag) => 
            validTag.name.toLowerCase() === tag.toLowerCase()
          )
        );

        // 过滤内容类型，只保留用户配置的有效类型
        const aiContentTypes = Array.isArray(parsed.contentTypes || parsed.content_types) ? 
                              (parsed.contentTypes || parsed.content_types) : [];
        const filteredContentTypes = aiContentTypes.filter((type: string) => 
          validContentTypes.some((validType) => 
            validType.name.toLowerCase() === type.toLowerCase()
          )
        );

        // 基于内容类型判断是否有价值：没有命中任何内容类型则为无价值
        const isValueless = filteredContentTypes.length === 0;

        return {
          isValueless,
          keywords: filteredKeywords,
          topicTags: filteredTopicTags,
          contentTypes: filteredContentTypes,
        };
      }

      // 如果不是 JSON 格式，尝试解析文本格式
      
      // 提取关键词
      const keywordsMatch = content.match(/关键词[:：]\s*(.+?)(?:\n|$)/);
      const aiKeywords = keywordsMatch && keywordsMatch[1]
        ? keywordsMatch[1].split(/[,，、]/).map(k => k.trim()).filter(Boolean)
        : [];
      const keywords = aiKeywords.slice(0, 10); // 限制最多10个关键词

      // 提取主题标签并过滤
      const topicTagsMatch = content.match(/主题标签[:：]\s*(.+?)(?:\n|$)/);
      const aiTopicTags = topicTagsMatch && topicTagsMatch[1]
        ? topicTagsMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean)
        : [];
      const topicTags = aiTopicTags.filter((tag: string) => 
        validTopicTags.some((validTag) => 
          validTag.name.toLowerCase() === tag.toLowerCase()
        )
      );

      // 提取内容类型并过滤
      const contentTypesMatch = content.match(/内容类型[:：]\s*(.+?)(?:\n|$)/);
      const aiContentTypes = contentTypesMatch && contentTypesMatch[1]
        ? contentTypesMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean)
        : [];
      const contentTypes = aiContentTypes.filter((type: string) => 
        validContentTypes.some((validType) => 
          validType.name.toLowerCase() === type.toLowerCase()
        )
      );

      // 基于内容类型判断是否有价值：没有命中任何内容类型则为无价值
      const isValueless = contentTypes.length === 0;

      return {
        isValueless,
        keywords,
        topicTags,
        contentTypes,
      };
    } catch (error) {
      console.error('解析 AI 结果失败:', error);
      
      // 返回默认结果 - 没有内容类型则视为无价值
      return {
        isValueless: true, // 默认为无价值，因为没有命中任何内容类型
        keywords: [],
        topicTags: [],
        contentTypes: [],
      };
    }
  }

  /**
   * 获取默认的系统提示词
   */
  private getDefaultSystemPrompt(topicTags: Array<{name: string, description?: string}>, contentTypes: Array<{name: string, description?: string}>): string {
    const topicTagsText = topicTags.length > 0 
      ? topicTags.map(tag => tag.description ? `${tag.name}（${tag.description}）` : tag.name).join('、') 
      : '人工智能（AI、机器学习、深度学习等相关技术）、编程开发（软件工程、代码、框架等）、科技产品（硬件设备、软件产品等）、商业创新（投资融资、创业等）、互联网（社交媒体、平台等）、数据科学（大数据、分析等）、区块链（加密货币等）';

    const contentTypesText = contentTypes.length > 0
      ? contentTypes.map(type => type.description ? `${type.name}（${type.description}）` : type.name).join('、')
      : '教程（操作指南、学习材料）、产品介绍（新产品发布、功能介绍）、产品试用（使用体验、测评分享）、新闻报道（行业新闻、事件报道）、观点分析（个人观点、行业分析）、工具推荐（软件工具、资源推荐）';

    return `你是一个专业的推文内容分析助手。请分析推文的价值和内容，并按以下要求输出结果：

**分析规则：**
1. 提取关键词：
   - 从推文中提取3-8个最重要的关键词
   - 关键词应该是名词、技术术语、产品名称等实质性内容
   - 避免提取停用词、介词、助词等无意义词汇
   - 关键词应该有助于理解推文的核心内容

2. 匹配主题标签：
   当前关注的主题标签：${topicTagsText}
   如果推文内容与这些主题相关，请列出匹配的标签。

3. 判断内容类型：
   当前关注的内容类型：${contentTypesText}
   根据推文内容的性质，选择匹配的内容类型。

**重要：价值判断标准**
- 如果推文匹配到任何一种内容类型，则视为有价值（isValueless: false）
- 如果推文不匹配任何内容类型，则视为无价值（isValueless: true）
- 价值判断完全基于是否命中内容类型，而非推文内容的主观判断

**输出格式（JSON）：**
{
  "isValueless": false,
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "topicTags": ["匹配的主题标签"],
  "contentTypes": ["匹配的内容类型"]
}

请确保输出是有效的 JSON 格式。`;
  }

  /**
   * 获取批量分析的系统提示词
   */
  private getBatchAnalysisPrompt(topicTags: Array<{name: string, description?: string}>, contentTypes: Array<{name: string, description?: string}>, customPrompt?: string): string {
    if (customPrompt) {
      return customPrompt;
    }

    const topicTagsText = topicTags.length > 0 
      ? topicTags.map(tag => tag.description ? `${tag.name}（${tag.description}）` : tag.name).join('、') 
      : '人工智能（AI、机器学习、深度学习等相关技术）、编程开发（软件工程、代码、框架等）、科技产品（硬件设备、软件产品等）、商业创新（投资融资、创业等）、互联网（社交媒体、平台等）、数据科学（大数据、分析等）、区块链（加密货币等）';

    const contentTypesText = contentTypes.length > 0
      ? contentTypes.map(type => type.description ? `${type.name}（${type.description}）` : type.name).join('、')
      : '教程（操作指南、学习材料）、产品介绍（新产品发布、功能介绍）、产品试用（使用体验、测评分享）、新闻报道（行业新闻、事件报道）、观点分析（个人观点、行业分析）、工具推荐（软件工具、资源推荐）';

    return `你是一个专业的推文内容批量分析助手。请同时分析多条推文的价值和内容，并按以下要求输出结果：

**分析规则：**
1. 提取关键词：
   - 从推文中提取3-8个最重要的关键词
   - 关键词应该是名词、技术术语、产品名称等实质性内容
   - 避免提取停用词、介词、助词等无意义词汇
   - 关键词应该有助于理解推文的核心内容

2. 匹配主题标签：
   当前关注的主题标签：${topicTagsText}
   如果推文内容与这些主题相关，请列出匹配的标签。

3. 判断内容类型：
   当前关注的内容类型：${contentTypesText}
   根据推文内容的性质，选择匹配的内容类型。

**重要：价值判断标准**
- 如果推文匹配到任何一种内容类型，则视为有价值（isValueless: false）
- 如果推文不匹配任何内容类型，则视为无价值（isValueless: true）
- 价值判断完全基于是否命中内容类型，而非推文内容的主观判断

**重要提示：**
- 用户会提供多条推文，每条推文都有唯一的推文ID
- 请对每条推文进行独立分析
- 输出结果时必须包含对应的推文ID

**输出格式（JSON数组）：**
{
  "results": [
    {
      "tweetId": "推文ID",
      "isValueless": false,
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "topicTags": ["匹配的主题标签"],
      "contentTypes": ["匹配的内容类型"]
    }
  ]
}

请确保：
1. 输出是有效的 JSON 格式
2. 每条推文都有对应的分析结果
3. 推文ID与输入的推文ID完全一致
4. 每条推文都包含关键词、主题标签和内容类型
5. 价值判断严格基于是否命中内容类型`;
  }

  /**
   * 解析批量AI分析结果
   */
  private parseBatchAnalysisResult(
    content: string, 
    originalTweets: Array<{ id: string; content: string }>,
    validTopicTags: Array<{name: string, description?: string}>, 
    validContentTypes: Array<{name: string, description?: string}>
  ): Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }> {
    try {
      console.log(`[AI API 批量] 开始解析AI响应:`, content);

      // 尝试解析JSON格式的批量结果
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const aiResults = parsed.results || [];

        const results: Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }> = [];

        // 为每个原始推文创建结果映射
        for (const tweet of originalTweets) {
          const aiResult = aiResults.find((r: any) => r.tweetId === tweet.id);
          
          if (aiResult) {
            // 提取并过滤关键词
            const aiKeywords = Array.isArray(aiResult.keywords) ? aiResult.keywords : [];
            const filteredKeywords = aiKeywords.filter((keyword: string) => 
              keyword && keyword.trim().length > 0
            ).slice(0, 10); // 限制最多10个关键词
            
            // 过滤主题标签和内容类型
            const filteredTopicTags = (aiResult.topicTags || []).filter((tag: string) => 
              validTopicTags.some((validTag) => 
                validTag.name.toLowerCase() === tag.toLowerCase()
              )
            );

            const filteredContentTypes = (aiResult.contentTypes || []).filter((type: string) => 
              validContentTypes.some((validType) => 
                validType.name.toLowerCase() === type.toLowerCase()
              )
            );

            // 基于内容类型判断是否有价值：没有命中任何内容类型则为无价值
            const isValueless = filteredContentTypes.length === 0;

            results.push({
              tweetId: tweet.id,
              result: {
                isValueless,
                keywords: filteredKeywords,
                topicTags: filteredTopicTags,
                contentTypes: filteredContentTypes,
              }
            });
          } else {
            // AI没有返回对应推文的结果
            console.warn(`[AI API 批量] 推文 ${tweet.id} 没有对应的AI分析结果`);
            results.push({
              tweetId: tweet.id,
              result: null,
              error: '缺少AI分析结果'
            });
          }
        }

        console.log(`[AI API 批量] 成功解析 ${results.length} 条推文结果`);
        return results;
      }

      throw new Error('AI返回内容不是有效的JSON格式');

    } catch (error) {
      console.error(`[AI API 批量] 解析批量结果失败:`, error);
      
      // 解析失败时，为所有推文返回错误结果
      return originalTweets.map(tweet => ({
        tweetId: tweet.id,
        result: null,
        error: '解析AI结果失败'
      }));
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证 API 配置
   */
  async validateConfig(): Promise<boolean> {
    try {
      console.log(`[AI API] 验证配置 - 端点: ${this.baseURL}/models`);
      console.log(`[AI API] 验证配置 - 模型: ${this.model}`);
      
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      console.log(`[AI API] 配置验证响应 - 状态码: ${response.status}`);
      
      if (response.ok) {
        console.log(`[AI API] 配置验证成功`);
        return true;
      } else {
        const error = await response.text();
        console.log(`[AI API] 配置验证失败 - 错误内容:`, error);
        return false;
      }
    } catch (error) {
      console.error('[AI API] 验证 OpenAI 配置失败:', error);
      return false;
    }
  }
}