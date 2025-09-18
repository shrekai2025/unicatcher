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
  topicTags: string[]; // 命中的主题标签
  contentTypes: string[]; // 内容类型（教程、产品介绍等）
}

export interface ProcessingStats {
  processed: number;
  succeeded: number;
  failed: number;
  valueless: number; // 被判定为无价值的推文数
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
    topicTags: string[],
    contentTypes: string[],
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
   * 批量分析推文
   */
  async analyzeTweetsBatch(
    tweets: Array<{ id: string; content: string }>,
    topicTags: string[],
    contentTypes: string[],
    systemPrompt?: string,
    onProgress?: (stats: ProcessingStats) => void
  ): Promise<Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }>> {
    const results: Array<{ tweetId: string; result: TweetAnalysisResult | null; error?: string }> = [];
    const stats: ProcessingStats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      valueless: 0,
    };

    for (const tweet of tweets) {
      try {
        console.log(`[AI API] 开始分析推文 ${tweet.id}: ${tweet.content.substring(0, 100)}...`);
        const result = await this.analyzeTweet(tweet.content, topicTags, contentTypes, systemPrompt);
        console.log(`[AI API] 推文 ${tweet.id} 分析完成 - 无价值: ${result.isValueless}, 主题标签: ${result.topicTags.length}, 内容类型: ${result.contentTypes.length}`);
        
        results.push({
          tweetId: tweet.id,
          result,
        });

        stats.succeeded++;
        if (result.isValueless) {
          stats.valueless++;
        }
      } catch (error) {
        console.error(`[AI API] 分析推文 ${tweet.id} 失败:`, error);
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
  private parseAnalysisResult(content: string, validTopicTags: string[], validContentTypes: string[]): TweetAnalysisResult {
    try {
      // 尝试解析 JSON 格式的返回
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // 过滤主题标签，只保留用户配置的有效标签
        const aiTopicTags = Array.isArray(parsed.topicTags || parsed.topic_tags) ? 
                          (parsed.topicTags || parsed.topic_tags) : [];
        const filteredTopicTags = aiTopicTags.filter((tag: string) => 
          validTopicTags.some((validTag: string) => 
            validTag.toLowerCase() === tag.toLowerCase()
          )
        );

        // 过滤内容类型，只保留用户配置的有效类型
        const aiContentTypes = Array.isArray(parsed.contentTypes || parsed.content_types) ? 
                              (parsed.contentTypes || parsed.content_types) : [];
        const filteredContentTypes = aiContentTypes.filter((type: string) => 
          validContentTypes.some((validType: string) => 
            validType.toLowerCase() === type.toLowerCase()
          )
        );

        return {
          isValueless: Boolean(parsed.isValueless || parsed.is_valueless),
          topicTags: filteredTopicTags,
          contentTypes: filteredContentTypes,
        };
      }

      // 如果不是 JSON 格式，尝试解析文本格式
      const isValueless = /无价值|无信息价值|打招呼|日常生活/.test(content);

      // 提取主题标签并过滤
      const topicTagsMatch = content.match(/主题标签[:：]\s*(.+?)(?:\n|$)/);
      const aiTopicTags = topicTagsMatch && topicTagsMatch[1]
        ? topicTagsMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean)
        : [];
      const topicTags = aiTopicTags.filter((tag: string) => 
        validTopicTags.some((validTag: string) => 
          validTag.toLowerCase() === tag.toLowerCase()
        )
      );

      // 提取内容类型并过滤
      const contentTypesMatch = content.match(/内容类型[:：]\s*(.+?)(?:\n|$)/);
      const aiContentTypes = contentTypesMatch && contentTypesMatch[1]
        ? contentTypesMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean)
        : [];
      const contentTypes = aiContentTypes.filter((type: string) => 
        validContentTypes.some((validType: string) => 
          validType.toLowerCase() === type.toLowerCase()
        )
      );

      return {
        isValueless,
        topicTags,
        contentTypes,
      };
    } catch (error) {
      console.error('解析 AI 结果失败:', error);
      
      // 返回默认结果
      return {
        isValueless: false,
        topicTags: [],
        contentTypes: [],
      };
    }
  }

  /**
   * 获取默认的系统提示词
   */
  private getDefaultSystemPrompt(topicTags: string[], contentTypes: string[]): string {
    const topicTagsText = topicTags.length > 0 
      ? topicTags.join('、') 
      : '科技产品、人工智能、编程开发、商业创新';

    const contentTypesText = contentTypes.length > 0
      ? contentTypes.join('、')
      : '教程、产品介绍、产品试用、新闻报道、观点分析、工具推荐';

    return `你是一个专业的推文内容分析助手。请分析推文的价值和内容，并按以下要求输出结果：

**分析规则：**
1. 剔除无信息价值的推文：
   - 纯粹的打招呼、问候
   - 个人日常生活分享（如吃饭、睡觉、心情等）
   - 无实质内容的互动（如单纯的表情、"赞"等）

2. 匹配主题标签：
   当前关注的主题标签：${topicTagsText}
   如果推文内容与这些主题相关，请列出匹配的标签。

3. 判断内容类型：
   当前关注的内容类型：${contentTypesText}
   根据推文内容的性质，选择匹配的内容类型。

**输出格式（JSON）：**
{
  "isValueless": false,
  "topicTags": ["匹配的主题标签"],
  "contentTypes": ["匹配的内容类型"]
}

请确保输出是有效的 JSON 格式。`;
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