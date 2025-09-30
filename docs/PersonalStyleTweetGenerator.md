# 个人风格推文生成器 - 技术方案

## 系统目标

**核心功能**：输入指定主题/信息 + Username → 生成该用户风格的推文

**输入格式**：
- **必填**：`username` - 指定风格模仿对象
- **必填**：`topic` - 推文主题
- **必填**：`tweet_types` - 推文类型（可多选）
- **可选**：`industry_knowledge` - 行业专业知识支撑
- **可选**：`content_detail` - 详细内容信息

**推文类型体系**（优化版）：
```
内容导向类:
- 新闻/事件: 时效性强，客观报道
- 研究/数据: 数据支撑，理性分析
- 科普: 知识传播，通俗易懂
- 教程/技巧: 实用指导，步骤清晰

观点表达类:
- 时事评论: 针对热点的深度分析
- 洞见/观点/观察: 个人独特视角
- 价值观表达: 理念态度的体现

生活情感类:
- 日常生活: 生活片段，轻松自然
- 心情表达: 情绪输出，感性色彩
- 个人经历/成长: 经验分享，反思总结

互动传播类:
- 资源分享: 推荐好物，价值传递
- 互动话题: 引发讨论，社区参与
- 搞笑: 幽默娱乐，轻松氛围
- 创意作品: 原创内容，展示才华

商业功能类:
- 品牌宣传: 商业推广，形象塑造
- 带货种草: 产品推荐，购买引导

公共事务类:
- 声明/公告: 正式信息，严肃态度
- 呼吁/倡议: 号召行动，社会责任
- 致敬打call: 支持赞美，情感共鸣
- 社区活动: 组织参与，集体行为
```

**输入示例**：
```json
{
  "username": "elonmusk",
  "topic": "人工智能发展",
  "tweet_types": ["研究/数据", "洞见/观点/观察"],
  "industry_knowledge": "大模型训练需要大量算力，成本高昂，但推理成本在快速下降。目前GPT-4级别模型推理成本约为每千token $0.03。",
  "content_detail": "最近看到Claude 3.5和GPT-4o在编程任务上表现很好"
}
```

**输出**：完全模仿指定用户写作风格的1-3条推文

---

## 一、风格学习引擎

### 1.1 用户风格建模

**风格特征提取**：
```
用户风格 = {
  语言特征: {
    词汇偏好: ["产品", "用户", "体验", "思考"],
    句式习惯: "平均句长15字，多用短句",
    语气特点: "温和、思辨性、少用感叹号"
  },

  推文类型风格差异: {
    "研究/数据": {
      开头: "数据显示", "根据研究", "最新报告",
      语气: "客观理性",
      结构: "数据引用 + 分析解读 + 趋势判断",
      词汇: "增长", "下降", "趋势", "指标"
    },
    "洞见/观点/观察": {
      开头: "我发现", "有个观察", "想到一个问题",
      语气: "思辨探讨",
      结构: "现象描述 + 深层分析 + 开放讨论",
      词汇: "本质", "背后", "其实", "可能"
    },
    "日常生活": {
      开头: "今天", "刚刚", "早上",
      语气: "轻松自然",
      结构: "场景描述 + 感受分享",
      词汇: "有趣", "开心", "累", "不错"
    }
  },

  表达习惯: {
    开头偏好: ["最近发现", "今天想到", "分享一个"],
    结尾偏好: ["你怎么看？", "继续观察", "..."],
    修辞手法: ["比喻使用频率12%", "反问句8%"]
  }
}
```

### 1.2 推文类型自动识别与标注

**历史推文类型分析**：
对用户所有历史推文进行自动类型标注，建立类型-风格映射。

**多标签分类策略**：
```
推文: "刚看到一个研究，说AI编程工具能提升40%效率，确实感觉最近用Claude写代码快了很多"

自动标注:
- 主要类型: "研究/数据" (权重0.6)
- 次要类型: "个人经历/成长" (权重0.4)

提取风格特征:
- 开头方式: "刚看到" (个人化引入数据)
- 数据表达: "40%效率" (具体数字)
- 验证方式: "确实感觉" (主观验证)
- 结构: 数据引用 + 个人验证
```

**类型组合风格学习**：
- 单一类型：纯净风格提取
- 组合类型：融合风格建模
- 记录常见组合模式，如"数据+个人经历"

---

## 二、推文生成流程

### 2.1 输入处理与内容增强

```
输入处理流程:
基础主题 → 行业知识融合 → 内容详细化 → 风格化生成
```

**类型导向的内容增强策略**：
```
场景1: 研究/数据类型
输入: topic="区块链" + types=["研究/数据"] + industry_knowledge="DeFi TVL突破1000亿美元"
处理: 数据客观呈现 + 趋势分析 + 理性解读
输出风格: "最新数据显示，DeFi锁仓总价值突破1000亿美元。这个里程碑意味着..."

场景2: 个人经历+数据复合类型
输入: topic="AI编程" + types=["个人经历/成长", "研究/数据"] + content="用Claude写爬虫"
处理: 个人体验 + 行业数据验证 + 经验总结
输出风格: "最近用Claude写了个爬虫，效率确实高。想到看过的研究说AI编程工具能提升40%效率..."

场景3: 日常生活类型
输入: topic="咖啡" + types=["日常生活"]
处理: 生活化场景 + 轻松语调 + 感受分享
输出风格: "今天尝了个新咖啡豆，酸度刚好。突然想到好咖啡和好产品一样..."

场景4: 时事评论类型
输入: topic="AI监管" + types=["时事评论"] + industry_knowledge="欧盟AI法案细节"
处理: 事件背景 + 深度分析 + 观点表达
输出风格: "欧盟AI法案的通过标志着监管进入新阶段。从条款细节看，这种分级监管思路..."
```

**智能内容扩展**：
- **行业洞察注入**：将专业知识转化为用户语言风格的表达
- **数据点提取**：从行业知识中提取关键数据、趋势、案例
- **观点角度生成**：结合用户历史观点偏好，形成独特视角

### 2.2 风格迁移生成

**两阶段生成**：

**阶段1：类型驱动的内容规划**
```prompt
基于用户@{username}的历史推文风格，为主题"{topic}"生成指定类型的推文内容：

基础信息：
- 主题：{topic}
- 指定类型：{tweet_types} (可多选)
- 行业知识：{industry_knowledge} (如果提供)
- 详细内容：{content_detail} (如果提供)

用户在不同类型下的风格特征：
{type_specific_style_features}

例如：
- "研究/数据"类型：开头偏好"数据显示/根据研究"，结构为"数据+分析+趋势"
- "个人经历/成长"类型：开头偏好"最近/今天"，结构为"场景+感受+思考"
- "洞见/观点/观察"类型：开头偏好"发现/观察到"，结构为"现象+分析+讨论"

多类型融合规则：
- 如果选择多个类型，需要找到用户历史上类似的类型组合模式
- 主要类型决定整体结构，次要类型影响表达细节

任务要求：
1. 严格按照指定推文类型的特征来规划内容
2. 融合行业知识时保持类型特征的一致性
3. 多类型时要自然融合，不能生硬拼接
4. 生成1-3条推文的详细大纲

输出格式：
{
  "tweet_outlines": [
    {
      "primary_type": "研究/数据",
      "secondary_types": ["洞见/观点/观察"],
      "structure": "数据引用 + 个人解读 + 开放讨论",
      "key_point": "AI成本下降将推动普及",
      "opening_style": "最新数据显示",
      "content_elements": ["$0.03成本数据", "个人使用体验", "趋势判断"]
    }
  ]
}
```

**阶段2：风格化表达与专业度平衡**
```prompt
将以下内容用@{username}的风格重写，确保专业准确性与个人风格的平衡：

内容大纲：{content_outline}
行业知识背景：{industry_knowledge}

风格要求：
- 平均句长：{avg_sentence_length}字
- 语气特点：{tone_features}
- 专业术语使用度：{technical_term_usage_level}
- 数据引用方式：{data_citation_style}
- 必用词汇：{signature_words}
- 标点习惯：{punctuation_style}

专业度控制：
- 如果用户历史推文较少使用专业术语，需要通俗化表达
- 如果用户喜欢引用数据，保持数据点但用其习惯的表述方式
- 保持用户对该领域的一贯观点倾向

模仿示例（相似主题）：
{similar_historical_tweets}
```

---

## 三、核心技术实现

### 3.1 风格特征量化

**词汇层面**：
- 高频词TF-IDF提取个人标志词
- 词性分布计算（名词比、动词比等）
- 专业术语vs日常词汇比例

**句式层面**：
- 句长分布直方图
- 句型占比（陈述句65%，疑问句20%等）
- 标点符号使用密度和位置偏好

**修辞层面**：
- 比喻、反问等手法使用频率
- 语气词使用模式
- 开头结尾句式模板提取

### 3.2 主题相似度匹配

**语义匹配**：
```
输入主题 → Embedding向量 → 与历史主题库匹配 → 找到最相似的Top3主题 → 提取对应风格模板
```

**主题聚类**：
- 对用户所有推文进行主题聚类
- 每个聚类提取专门的风格模板
- 生成时根据输入主题选择最匹配的聚类风格

### 3.3 生成质量保证

**多轮优化**：
1. 初始生成 → 风格相似度评分 → 低分重新生成
2. 长度控制：确保符合推文字数限制
3. 语法检查：确保生成文本通顺自然
4. 风格一致性：与用户历史推文进行相似度检查

**评价指标**：
- 词汇相似度：生成推文与历史推文的词汇重叠度
- 句式相似度：句长、句型分布匹配度
- 语气相似度：标点、语气词使用匹配度
- 综合风格分：加权计算上述指标

---

## 四、数据库设计优化

### 4.1 用户风格档案表
```sql
CREATE TABLE UserStyleProfile (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,

  -- 词汇特征
  signature_words TEXT, -- JSON: 标志性词汇
  vocab_diversity REAL, -- 词汇丰富度
  word_complexity REAL, -- 词汇复杂度

  -- 句式特征
  avg_sentence_length REAL,
  sentence_type_dist TEXT, -- JSON: 句型分布
  punctuation_pattern TEXT, -- JSON: 标点使用模式

  -- 专业度与行业知识处理
  technical_term_usage REAL, -- 专业术语使用频率 (0-1)
  data_citation_style TEXT, -- JSON: 数据引用习惯
  professional_topic_style TEXT, -- JSON: 专业话题处理方式
  industry_knowledge_level TEXT, -- 行业知识深度: basic/intermediate/expert

  -- 推文类型风格特征
  tweet_type_styles TEXT, -- JSON: 各推文类型下的风格特征
  type_combination_patterns TEXT, -- JSON: 常见类型组合模式

  -- 主题模式（保留兼容）
  topic_style_templates TEXT, -- JSON: 各主题下的风格模板

  -- 生成配置
  generation_config TEXT, -- JSON: 生成参数配置

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 推文类型配置表
```sql
CREATE TABLE TweetTypeConfig (
  id TEXT PRIMARY KEY,
  type_name TEXT UNIQUE, -- 推文类型名称
  type_category TEXT, -- 所属大类：内容导向类/观点表达类/生活情感类等
  description TEXT, -- 类型描述
  typical_structure TEXT, -- 典型结构模式
  common_openings TEXT, -- JSON: 常见开头方式
  tone_characteristics TEXT, -- 语气特征
  is_active BOOLEAN DEFAULT true,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 风格模板表（增强版）
```sql
CREATE TABLE StyleTemplate (
  id TEXT PRIMARY KEY,
  username TEXT,
  tweet_types TEXT, -- JSON: 关联的推文类型组合
  topic_cluster TEXT, -- 主题聚类标识（可选）
  template_type TEXT, -- opening/body/closing/full
  pattern TEXT, -- 模式模板
  frequency REAL, -- 使用频率
  examples TEXT, -- JSON: 示例推文
  type_weight_distribution TEXT, -- JSON: 多类型时的权重分配

  FOREIGN KEY (username) REFERENCES UserStyleProfile(username)
);
```

### 4.4 推文类型标注表
```sql
CREATE TABLE TweetTypeAnnotation (
  id TEXT PRIMARY KEY,
  tweet_id TEXT, -- 关联到WritingAnalysisTweet
  username TEXT,
  tweet_types TEXT, -- JSON: 推文类型及权重 {"研究/数据": 0.7, "个人经历": 0.3}
  confidence_score REAL, -- 标注置信度
  annotation_method TEXT, -- auto/manual/hybrid
  annotated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tweet_id) REFERENCES WritingAnalysisTweet(id)
);
```

---

## 五、API接口设计

### 5.1 风格学习接口
```
POST /api/style-learning/analyze
{
  "username": "target_user",
  "force_update": false
}
```

### 5.2 推文生成接口
```
POST /api/style-generation/generate
{
  "username": "target_user",
  "topic": "人工智能发展",
  "tweet_types": ["研究/数据", "洞见/观点/观察"],
  "industry_knowledge": "大模型训练成本高，但推理成本在快速下降。GPT-4级别模型推理成本约$0.03/千token。",
  "content_detail": "最近用Claude 3.5写代码效果很好",
  "options": {
    "tweet_count": 2,
    "creativity_level": 0.7,
    "include_hashtags": true,
    "professional_level": "auto", // auto/high/medium/low
    "max_length": 280,
    "type_weight_distribution": {
      "研究/数据": 0.7,
      "洞见/观点/观察": 0.3
    }
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "generated_tweets": [
      {
        "content": "最近试了Claude 3.5写代码，确实比之前的模型好用很多。AI编程工具的进步速度让人惊叹，感觉我们正在见证一个转折点 🤔",
        "style_confidence": 0.89,
        "industry_knowledge_used": ["AI模型进步", "编程效率提升"],
        "matched_historical_pattern": "个人体验 + 行业观察"
      },
      {
        "content": "大模型推理成本下降到$0.03/千token这个价格点，意味着什么？意味着AI工具即将真正普及。技术的商业化临界点往往就在成本曲线的拐点处",
        "style_confidence": 0.92,
        "industry_knowledge_used": ["成本数据", "商业化分析"],
        "matched_historical_pattern": "数据引用 + 商业洞察"
      }
    ],
    "generation_context": {
      "user_style_match": 0.91,
      "industry_knowledge_integration": 0.87,
      "similar_topics_found": ["AI工具使用", "技术成本分析"]
    }
  }
}
```

### 5.3 风格报告接口
```
GET /api/style-learning/profile?username=target_user
// 返回用户完整风格档案
```

---

## 六、实现优先级

**Phase 1: 基础生成能力**
1. 简单主题输入 → 基础风格生成
2. 核心风格特征提取（词汇、句式）
3. 基本的风格迁移Prompt设计

**Phase 2: 风格精细化**
1. 主题相关风格差异建模
2. 多轮生成优化机制
3. 生成质量评价体系

**Phase 3: 高级功能**
1. 大量信息智能摘要
2. 多推文串联生成
3. 个性化参数调优界面

这个方案专注于你的核心需求：给定用户+主题，生成该用户风格的推文。