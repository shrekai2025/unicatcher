import type { TweetType } from './tweet-analysis';

export interface OutlineTemplate {
  contentType: string;
  category: string;
  structure: OutlineSection[];
  tone: string;
  keyElements: string[];
  avoidElements?: string[];
}

export interface OutlineSection {
  name: string;
  purpose: string;
  suggestedLength?: string;
  keyPoints: string[];
  optional?: boolean;
}

// 内容类型大纲模板配置
export const OUTLINE_TEMPLATES: Record<TweetType, OutlineTemplate> = {
  // 内容导向类
  '新闻/事件': {
    contentType: '新闻/事件',
    category: '内容导向类',
    tone: 'objective',
    keyElements: ['时效性', '准确性', '客观性'],
    structure: [
      {
        name: '核心事件',
        purpose: '简明扼要地描述发生了什么',
        suggestedLength: '1-2句',
        keyPoints: ['时间要素', '关键当事人', '核心事实']
      },
      {
        name: '背景信息',
        purpose: '提供必要的上下文信息',
        keyPoints: ['相关背景', '影响范围', '重要性说明']
      },
      {
        name: '后续发展',
        purpose: '说明可能的影响或后续动态',
        keyPoints: ['潜在影响', '关注要点'],
        optional: true
      }
    ]
  },

  '研究/数据': {
    contentType: '研究/数据',
    category: '内容导向类',
    tone: 'analytical',
    keyElements: ['数据准确', '分析客观', '结论可信'],
    structure: [
      {
        name: '研究背景',
        purpose: '介绍研究的背景和重要性',
        keyPoints: ['研究问题', '数据来源', '研究意义']
      },
      {
        name: '核心发现',
        purpose: '展示关键数据和研究结果',
        keyPoints: ['关键数据', '统计结果', '趋势变化']
      },
      {
        name: '深度分析',
        purpose: '解读数据背后的原因和意义',
        keyPoints: ['原因分析', '影响评估', '对比参照']
      },
      {
        name: '结论启示',
        purpose: '总结研究结论和实际应用',
        keyPoints: ['核心结论', '实际意义', '未来预测'],
        optional: true
      }
    ]
  },

  '科普': {
    contentType: '科普',
    category: '内容导向类',
    tone: 'educational',
    keyElements: ['通俗易懂', '逻辑清晰', '生动有趣'],
    structure: [
      {
        name: '引入问题',
        purpose: '引出要科普的概念或现象',
        keyPoints: ['日常场景', '引发好奇', '提出问题']
      },
      {
        name: '核心解释',
        purpose: '用通俗语言解释核心概念',
        keyPoints: ['基本原理', '简单类比', '关键机制']
      },
      {
        name: '实例验证',
        purpose: '通过具体例子加深理解',
        keyPoints: ['生活实例', '应用场景', '验证说明']
      },
      {
        name: '总结延伸',
        purpose: '总结要点并引发进一步思考',
        keyPoints: ['关键总结', '延伸思考'],
        optional: true
      }
    ]
  },

  '教程/技巧': {
    contentType: '教程/技巧',
    category: '内容导向类',
    tone: 'instructional',
    keyElements: ['步骤清晰', '实用性强', '易于操作'],
    structure: [
      {
        name: '问题场景',
        purpose: '描述要解决的问题或需求',
        keyPoints: ['具体场景', '痛点描述', '解决必要性']
      },
      {
        name: '解决方案',
        purpose: '提供具体的操作步骤或方法',
        keyPoints: ['步骤分解', '关键要点', '注意事项']
      },
      {
        name: '效果展示',
        purpose: '说明预期效果和验证方法',
        keyPoints: ['预期结果', '成功标志', '常见问题']
      },
      {
        name: '进阶提升',
        purpose: '提供更深入的技巧或相关建议',
        keyPoints: ['进阶技巧', '相关工具', '延伸学习'],
        optional: true
      }
    ]
  },

  '产品使用记录与介绍': {
    contentType: '产品使用记录与介绍',
    category: '内容导向类',
    tone: 'experiential',
    keyElements: ['真实体验', '客观评价', '实用信息'],
    avoidElements: ['过度宣传', '主观偏见', '信息缺失'],
    structure: [
      {
        name: '产品概览',
        purpose: '简要介绍产品的基本信息',
        keyPoints: ['产品名称/类型', '核心功能', '使用场景', '获取方式']
      },
      {
        name: '使用体验',
        purpose: '记录实际使用过程和感受',
        keyPoints: ['操作流程', '界面/交互体验', '功能表现', '实际效果']
      },
      {
        name: '优缺点评价',
        purpose: '客观分析产品的优势和不足',
        keyPoints: ['突出优点', '存在问题', '与同类对比', '适用人群']
      },
      {
        name: '使用建议',
        purpose: '给出使用技巧和注意事项',
        keyPoints: ['使用技巧', '配置建议', '注意事项', '后续更新'],
        optional: true
      }
    ]
  },

  // 观点表达类
  '时事评论': {
    contentType: '时事评论',
    category: '观点表达类',
    tone: 'opinionated',
    keyElements: ['观点鲜明', '逻辑严密', '有理有据'],
    structure: [
      {
        name: '事件概述',
        purpose: '简要介绍评论的事件或现象',
        keyPoints: ['关键事实', '争议焦点', '社会关注度']
      },
      {
        name: '个人观点',
        purpose: '明确表达自己的立场和看法',
        keyPoints: ['核心观点', '判断依据', '价值立场']
      },
      {
        name: '论证分析',
        purpose: '用逻辑和事实支撑观点',
        keyPoints: ['逻辑推理', '事实支撑', '反面论证']
      },
      {
        name: '总结呼吁',
        purpose: '总结观点并提出建议或呼吁',
        keyPoints: ['观点总结', '行动建议', '未来展望'],
        optional: true
      }
    ]
  },

  '洞见/观点/观察': {
    contentType: '洞见/观点/观察',
    category: '观点表达类',
    tone: 'reflective',
    keyElements: ['深度思考', '独特视角', '启发性'],
    structure: [
      {
        name: '现象观察',
        purpose: '描述观察到的现象或趋势',
        keyPoints: ['具体现象', '观察细节', '普遍性']
      },
      {
        name: '深层洞察',
        purpose: '提出独特的见解和思考',
        keyPoints: ['本质分析', '内在逻辑', '深层原因']
      },
      {
        name: '启发思考',
        purpose: '引发读者进一步的思考',
        keyPoints: ['思考方向', '相关联想', '价值意义']
      },
      {
        name: '观点延伸',
        purpose: '将洞察扩展到更广阔的层面',
        keyPoints: ['普遍规律', '类比思考', '未来趋势'],
        optional: true
      }
    ]
  },

  '价值观表达': {
    contentType: '价值观表达',
    category: '观点表达类',
    tone: 'philosophical',
    keyElements: ['理念明确', '价值坚持', '人生智慧'],
    structure: [
      {
        name: '价值触发',
        purpose: '描述引发价值观思考的事件或情境',
        keyPoints: ['触发事件', '内心感受', '价值冲突']
      },
      {
        name: '理念阐述',
        purpose: '明确表达自己的价值观和人生理念',
        keyPoints: ['核心理念', '价值标准', '人生原则']
      },
      {
        name: '意义诠释',
        purpose: '解释这种价值观的意义和重要性',
        keyPoints: ['价值意义', '人生指导', '选择标准']
      },
      {
        name: '行动体现',
        purpose: '说明如何在实际生活中践行这种价值观',
        keyPoints: ['具体行动', '生活体现', '坚持方式'],
        optional: true
      }
    ]
  },

  // 生活情感类
  '日常生活': {
    contentType: '日常生活',
    category: '生活情感类',
    tone: 'casual',
    keyElements: ['真实自然', '生活化', '轻松愉快'],
    avoidElements: ['说教', '复杂论证', '专业术语'],
    structure: [
      {
        name: '生活场景',
        purpose: '描述具体的生活情境或经历',
        keyPoints: ['时间地点', '具体活动', '人物互动']
      },
      {
        name: '感受分享',
        purpose: '表达个人的感受和体验',
        keyPoints: ['直接感受', '情绪状态', '有趣细节']
      },
      {
        name: '简单总结',
        purpose: '轻松结尾，可能引发共鸣',
        keyPoints: ['简单感慨', '生活感悟', '轻松调侃'],
        optional: true
      }
    ]
  },

  '心情表达': {
    contentType: '心情表达',
    category: '生活情感类',
    tone: 'emotional',
    keyElements: ['情感真挚', '表达直接', '引发共鸣'],
    structure: [
      {
        name: '情绪状态',
        purpose: '直接表达当前的心情或情感',
        keyPoints: ['情绪词汇', '强度表达', '情感色彩']
      },
      {
        name: '原因背景',
        purpose: '说明产生这种情绪的原因',
        keyPoints: ['触发事件', '具体情境', '个人经历']
      },
      {
        name: '情感共鸣',
        purpose: '寻求理解或引发读者共鸣',
        keyPoints: ['通用经历', '情感连接', '互动邀请'],
        optional: true
      }
    ]
  },

  '个人经历/成长': {
    contentType: '个人经历/成长',
    category: '生活情感类',
    tone: 'reflective',
    keyElements: ['真实经历', '成长感悟', '人生启示'],
    structure: [
      {
        name: '经历描述',
        purpose: '详细描述具体的个人经历',
        keyPoints: ['事件经过', '关键转折', '当时感受']
      },
      {
        name: '成长感悟',
        purpose: '分享从经历中获得的感悟和成长',
        keyPoints: ['重要领悟', '思维变化', '能力提升']
      },
      {
        name: '价值启示',
        purpose: '总结经历带来的人生启示',
        keyPoints: ['人生道理', '价值发现', '未来指导']
      },
      {
        name: '经验分享',
        purpose: '为他人提供可借鉴的经验',
        keyPoints: ['实用建议', '避坑指南', '成长路径'],
        optional: true
      }
    ]
  },

  // 互动传播类
  '资源分享': {
    contentType: '资源分享',
    category: '互动传播类',
    tone: 'sharing',
    keyElements: ['实用价值', '使用体验', '推荐理由'],
    structure: [
      {
        name: '资源介绍',
        purpose: '简要介绍要分享的资源',
        keyPoints: ['资源类型', '基本信息', '获取方式']
      },
      {
        name: '使用体验',
        purpose: '分享个人使用感受和效果',
        keyPoints: ['使用场景', '实际效果', '优缺点评价']
      },
      {
        name: '推荐建议',
        purpose: '给出使用建议和推荐理由',
        keyPoints: ['适用人群', '使用技巧', '推荐指数']
      },
      {
        name: '延伸推荐',
        purpose: '推荐相关的其他优质资源',
        keyPoints: ['类似资源', '配套工具', '进阶选择'],
        optional: true
      }
    ]
  },

  '互动话题': {
    contentType: '互动话题',
    category: '互动传播类',
    tone: 'interactive',
    keyElements: ['话题性强', '引发讨论', '互动友好'],
    structure: [
      {
        name: '话题引入',
        purpose: '提出有趣或有争议的话题',
        keyPoints: ['话题背景', '引发点', '关注度']
      },
      {
        name: '观点展示',
        purpose: '展示不同的观点或选择',
        keyPoints: ['多元观点', '利弊分析', '选择困境']
      },
      {
        name: '互动邀请',
        purpose: '明确邀请读者参与讨论',
        keyPoints: ['问题抛出', '投票选择', '经验征集']
      },
      {
        name: '讨论引导',
        purpose: '引导讨论向更深层次发展',
        keyPoints: ['深度问题', '思考角度', '价值探讨'],
        optional: true
      }
    ]
  },

  '搞笑': {
    contentType: '搞笑',
    category: '互动传播类',
    tone: 'humorous',
    keyElements: ['幽默感', '轻松有趣', '引发笑点'],
    avoidElements: ['严肃说教', '复杂逻辑', '沉重话题'],
    structure: [
      {
        name: '设置铺垫',
        purpose: '营造幽默的情境或背景',
        keyPoints: ['场景设定', '人物关系', '预期营造']
      },
      {
        name: '笑点爆发',
        purpose: '制造反转或幽默的高潮',
        keyPoints: ['意外反转', '夸张表现', '对比效果']
      },
      {
        name: '余韵延续',
        purpose: '延续幽默效果或引发互动',
        keyPoints: ['幽默总结', '互动邀请', '后续调侃'],
        optional: true
      }
    ]
  },

  '推广/促销': {
    contentType: '推广/促销',
    category: '互动传播类',
    tone: 'promotional',
    keyElements: ['价值主张', '优惠信息', '行动召唤'],
    avoidElements: ['过度推销', '虚假宣传', '信息不透明'],
    structure: [
      {
        name: '吸引开场',
        purpose: '用吸引人的方式引出产品/服务/活动',
        keyPoints: ['痛点切入', '利益点突出', '引发兴趣']
      },
      {
        name: '核心价值',
        purpose: '展示产品/服务的核心价值和优势',
        keyPoints: ['功能特点', '使用场景', '用户收益', '差异化优势']
      },
      {
        name: '优惠信息',
        purpose: '清晰呈现促销活动和优惠详情',
        keyPoints: ['优惠内容', '限时信息', '购买条件', '数量限制']
      },
      {
        name: '行动召唤',
        purpose: '引导用户采取具体行动',
        keyPoints: ['明确指令', '紧迫感营造', '购买链接/方式', '咨询渠道']
      }
    ]
  }
};