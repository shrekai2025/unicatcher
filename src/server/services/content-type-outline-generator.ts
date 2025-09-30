import type { OutlineTemplate, OutlineSection } from './outline-templates';
import { OUTLINE_TEMPLATES } from './outline-templates';
import type { TweetType } from './tweet-analysis';
import { WritingAssistantConfigLoader } from '~/server/core/ai/writing-assistant-config-loader';
import { AIServiceFactory } from '~/server/core/ai/ai-factory';

export interface ArticleGenerationTask {
  id: string;
  topic: string;
  platformId: string;
  username?: string;
  contentType?: string;
  referenceArticleIds?: string;
  useContentStructure?: boolean;
  contentStructureId?: string;
  additionalRequirements?: string;
  platform: {
    name: string;
    wordCount?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions?: string[];
}

export class ContentTypeOutlineGenerator {

  async generateOutline(task: ArticleGenerationTask): Promise<string> {
    const contentType = task.contentType as TweetType;
    const template = OUTLINE_TEMPLATES[contentType];

    if (!template) {
      return await this.generateGenericOutline(task);
    }

    const prompt = this.buildTypeSpecificPrompt(task, template);
    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    return await aiService.generateText(prompt);
  }

  private buildTypeSpecificPrompt(task: ArticleGenerationTask, template: OutlineTemplate): string {
    let prompt = `请为"${template.contentType}"类型的内容生成详细大纲：

主题：${task.topic}
平台：${task.platform.name}
${task.platform.wordCount ? `字数要求：${task.platform.wordCount}` : ''}

内容类型特征：
- 类别：${template.category}
- 语调：${template.tone}
- 核心要素：${template.keyElements.join('、')}`;

    if (template.avoidElements) {
      prompt += `\n- 避免元素：${template.avoidElements.join('、')}`;
    }

    prompt += `\n\n请按照以下结构框架生成大纲：\n`;

    template.structure.forEach((section, index) => {
      prompt += `\n${index + 1}. ${section.name}${section.optional ? '（可选）' : ''}
目的：${section.purpose}
${section.suggestedLength ? `建议长度：${section.suggestedLength}` : ''}
关键要点：${section.keyPoints.join('、')}`;
    });

    // 添加个性化风格指导
    if (task.username && task.contentType) {
      prompt += `\n\n【个性化风格指导】`;
      prompt += `\n请结合用户"${task.username}"的"${task.contentType}"类型写作风格特征，确保大纲体现以下风格要求：`;
      prompt += `\n- 保持该用户习惯的开头、展开和结尾模式`;
      prompt += `\n- 融入该用户的语调特征和表达习惯`;
      prompt += `\n- 体现该用户在此类型内容中的独特视角`;
    }

    // 添加参考文章内容
    if ((task as any).referenceArticlesContent && (task as any).referenceArticlesContent.length > 0) {
      prompt += `\n\n【参考文章】`;
      prompt += `\n请参考以下文章的结构和表达方式（但不要照搬内容）：`;
      (task as any).referenceArticlesContent.forEach((ref: any) => {
        const shortContent = ref.content.length > 200 ? ref.content.substring(0, 200) + '...' : ref.content;
        prompt += `\n\n参考文章${ref.index}：${ref.title}`;
        prompt += `\n内容片段：${shortContent}`;
      });
    }

    // 添加内容结构指导
    if ((task as any).contentStructureInfo) {
      prompt += `\n\n【内容结构指导】`;
      prompt += `\n请参考以下结构模板（占决策比重30%，可根据主题灵活调整）：`;
      prompt += `\n结构标题：${(task as any).contentStructureInfo.title}`;
      prompt += `\n结构内容：${(task as any).contentStructureInfo.content}`;
    }

    // 添加附加要求
    if (task.additionalRequirements) {
      prompt += `\n\n【附加要求】`;
      prompt += `\n${task.additionalRequirements}`;
    }

    prompt += `\n\n【生成要求】
1. 严格按照${template.contentType}类型的特点组织内容
2. 确保大纲逻辑清晰、层次分明
3. 每个部分都要有具体的内容要点（3-5个要点）
4. 保持${template.tone}的语调特征
5. 不要生成具体的正文内容，只生成结构化的大纲
6. 大纲要具体到可以直接指导写作，避免空泛的描述

请直接输出结构化的大纲内容：`;

    return prompt;
  }

  private async generateGenericOutline(task: ArticleGenerationTask): Promise<string> {
    // 通用大纲生成逻辑（后备方案）
    const prompt = `请为以下主题生成详细的内容大纲：

主题：${task.topic}
平台：${task.platform.name}
${task.platform.wordCount ? `字数要求：${task.platform.wordCount}` : ''}

请生成包含以下要素的大纲：
1. 核心观点/主线
2. 分段结构（3-5个要点）
3. 每段的核心内容和表达重点
4. 开头结尾的策略

返回结构化的大纲，不要生成正文内容。`;

    const config = await WritingAssistantConfigLoader.getAnalysisConfig();
    const aiService = AIServiceFactory.createService({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    return await aiService.generateText(prompt);
  }
}

export class OutlineValidator {

  validateOutline(outline: string, contentType: TweetType): ValidationResult {
    const template = OUTLINE_TEMPLATES[contentType];
    if (!template) {
      return { isValid: true, warnings: [] };
    }

    const warnings: string[] = [];

    // 检查是否包含必要的结构元素
    const requiredSections = template.structure.filter(s => !s.optional);
    requiredSections.forEach(section => {
      if (!this.containsSection(outline, section)) {
        warnings.push(`缺少必要部分：${section.name}`);
      }
    });

    // 检查是否包含应避免的元素
    if (template.avoidElements) {
      template.avoidElements.forEach(element => {
        if (outline.toLowerCase().includes(element.toLowerCase())) {
          warnings.push(`包含应避免的元素：${element}`);
        }
      });
    }

    // 检查语调一致性
    if (!this.checkToneConsistency(outline, template.tone)) {
      warnings.push(`语调与${contentType}类型不匹配`);
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions: this.generateSuggestions(warnings, template)
    };
  }

  private containsSection(outline: string, section: OutlineSection): boolean {
    // 检查大纲是否包含指定部分的逻辑
    const sectionKeywords = [section.name, ...section.keyPoints];
    return sectionKeywords.some(keyword =>
      outline.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private checkToneConsistency(outline: string, expectedTone: string): boolean {
    // 检查语调一致性的简单逻辑
    const toneIndicators: Record<string, string[]> = {
      'casual': ['轻松', '随意', '日常', '简单'],
      'educational': ['解释', '学习', '了解', '原理'],
      'humorous': ['有趣', '好玩', '幽默', '搞笑'],
      'objective': ['客观', '事实', '数据', '研究'],
      'analytical': ['分析', '研究', '数据', '结论'],
      'opinionated': ['观点', '认为', '应该', '评论'],
      'reflective': ['思考', '观察', '洞察', '感悟'],
      'philosophical': ['价值', '理念', '原则', '意义'],
      'emotional': ['感受', '情绪', '心情', '情感'],
      'instructional': ['步骤', '方法', '技巧', '教程'],
      'sharing': ['分享', '推荐', '体验', '使用'],
      'interactive': ['讨论', '大家', '投票', '话题']
    };

    const indicators = toneIndicators[expectedTone] || [];
    return indicators.some(indicator =>
      outline.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private generateSuggestions(warnings: string[], template: OutlineTemplate): string[] {
    const suggestions: string[] = [];

    warnings.forEach(warning => {
      if (warning.includes('缺少必要部分')) {
        suggestions.push(`请确保包含${template.contentType}类型的所有必要结构部分`);
      }
      if (warning.includes('包含应避免的元素')) {
        suggestions.push(`请移除不符合${template.contentType}类型特征的内容`);
      }
      if (warning.includes('语调不匹配')) {
        suggestions.push(`请调整语调，使其更符合${template.tone}的特征`);
      }
    });

    return suggestions;
  }
}