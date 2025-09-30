# NLP技术升级方案

## 🎯 当前实现的局限性

### 分词问题
- **现状**: 简单的标点符号分割
- **问题**: 无法正确处理中文词汇边界
- **例子**: "机器学习算法" → ["机器学习算法"] ❌ 应该是 ["机器学习", "算法"] ✅

### 词性标注问题
- **现状**: 基于规则的简单模式匹配
- **问题**: 准确率低，无法处理复杂语法结构
- **例子**: "发现了问题" 中的"发现"应该是动词，但可能被错误分类

### 语义理解问题
- **现状**: 仅基于关键词匹配
- **问题**: 无法理解上下文语义、同义词、近义词
- **例子**: "研究显示"和"数据表明"语义相似但无法被识别

## 🚀 推荐的技术升级路径

### 1. 中文分词库选择

#### 方案A: jieba (推荐用于快速升级)
```bash
npm install nodejieba
```

**优点**:
- 轻量级，易于集成
- 支持自定义词典
- 性能较好
- 社区活跃

**代码示例**:
```javascript
const jieba = require('nodejieba');

// 精确模式分词
const words = jieba.cut('机器学习算法优化', false);
// 结果: ["机器学习", "算法", "优化"]

// 词性标注
const tagged = jieba.tag('今天天气很好');
// 结果: [["今天", "t"], ["天气", "n"], ["很", "d"], ["好", "a"]]
```

#### 方案B: pkuseg (高精度选择)
```bash
npm install @node-rs/jieba  # 或使用Rust绑定版本
```

**优点**:
- 准确率更高
- 支持不同领域模型
- 词性标注更精确

### 2. 语义向量化技术

#### 方案A: 本地词向量模型
```javascript
// 使用预训练的中文词向量
const word2vec = require('word2vec');

// 加载预训练模型 (如Tencent AI Lab的词向量)
const model = word2vec.loadModel('tencent-ailab-embedding-zh-d200-v0.2.0');

// 计算词语相似度
const similarity = model.similarity('机器学习', '人工智能');
// 结果: 0.75 (相似度评分)

// 获取相关词汇
const similar = model.mostSimilar('深度学习', 10);
// 结果: ["神经网络", "机器学习", "卷积", ...]
```

#### 方案B: Sentence-BERT (句子级语义)
```javascript
// 调用Python的sentence-transformers
const { spawn } = require('child_process');

async function getSentenceEmbedding(text) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['-c', `
import sentence_transformers
model = sentence_transformers.SentenceTransformer('distiluse-base-multilingual-cased')
embedding = model.encode(['${text}'])
print(embedding.tolist())
    `]);

    let result = '';
    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.on('close', () => {
      resolve(JSON.parse(result)[0]);
    });
  });
}
```

### 3. 完整的NLP Pipeline设计

#### 阶段1: 基础分词升级 (立即可实施)
```typescript
// src/server/services/nlp-processor.ts
import jieba from 'nodejieba';

export class NLPProcessor {
  private customDict: Set<string>;

  constructor() {
    // 加载自定义词典（推特相关术语）
    this.customDict = new Set([
      '机器学习', '深度学习', '人工智能', '数据科学',
      '区块链', '元宇宙', 'Web3', '加密货币'
    ]);

    // 添加自定义词典到jieba
    this.customDict.forEach(word => {
      jieba.insertWord(word);
    });
  }

  // 智能分词
  tokenize(text: string): Array<{word: string, pos: string}> {
    // 预处理：清理URLs、mentions等
    const cleanText = this.preprocess(text);

    // jieba分词 + 词性标注
    const tokens = jieba.tag(cleanText);

    return tokens.map(([word, pos]) => ({
      word: word.trim(),
      pos: this.normalizePOS(pos)
    })).filter(token => token.word.length > 0);
  }

  private normalizePOS(pos: string): string {
    // 简化词性标签
    const posMap: Record<string, string> = {
      'n': 'noun',      // 名词
      'v': 'verb',      // 动词
      'a': 'adjective', // 形容词
      'd': 'adverb',    // 副词
      'r': 'pronoun',   // 代词
      'p': 'preposition', // 介词
      'c': 'conjunction', // 连词
      'u': 'auxiliary',   // 助词
      'o': 'onomatopoeia', // 拟声词
      'i': 'interjection', // 感叹词
      'm': 'numeral',     // 数词
      'q': 'classifier',  // 量词
    };

    return posMap[pos[0]] || 'other';
  }
}
```

#### 阶段2: 语义向量化 (中期目标)
```typescript
// src/server/services/embedding-service.ts
export class EmbeddingService {
  private wordVectors: Map<string, number[]>;

  async initialize() {
    // 加载预训练词向量或调用在线API
    // 可选择：OpenAI Embeddings、Google Universal Sentence Encoder
  }

  // 文档向量化
  async getDocumentEmbedding(tokens: string[]): Promise<number[]> {
    const vectors = await Promise.all(
      tokens.map(token => this.getWordVector(token))
    );

    // 简单平均 (可升级为TF-IDF加权)
    return this.averageVectors(vectors);
  }

  // 计算文档相似度
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
    const norm1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
    const norm2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
    return dotProduct / (norm1 * norm2);
  }
}
```

#### 阶段3: 高级语义分析 (长期目标)
```typescript
// src/server/services/semantic-analyzer.ts
export class SemanticAnalyzer {
  private nlp: NLPProcessor;
  private embeddings: EmbeddingService;

  // 主题建模
  async extractTopics(tweets: string[]): Promise<Array<{
    topic: string;
    keywords: string[];
    probability: number;
  }>> {
    // 使用LDA或BERT-Topic进行主题提取
  }

  // 情感分析
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    aspects: Array<{aspect: string, sentiment: string}>;
  }> {
    // 基于预训练模型的情感分析
  }

  // 文本聚类
  async clusterTweets(tweets: Array<{id: string, content: string}>): Promise<Array<{
    clusterId: number;
    tweets: string[];
    centroid: string;
    keywords: string[];
  }>> {
    // 基于embedding的K-means聚类
  }
}
```

## 📊 需要向量化的数据

### 1. 词汇级别向量化
- **目标**: 捕获词汇语义相似性
- **数据**: 分词后的单词
- **用途**: 同义词识别、语义相似度计算
- **存储**: `word_embeddings` 表

```sql
CREATE TABLE word_embeddings (
  word TEXT PRIMARY KEY,
  embedding BLOB, -- 存储为二进制的浮点数组
  dimension INTEGER DEFAULT 300,
  model_version TEXT DEFAULT 'word2vec-300d',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 句子级别向量化
- **目标**: 捕获句子整体语义
- **数据**: 完整的推文内容
- **用途**: 推文相似性分析、聚类、检索
- **存储**: 在`writing_analysis_tweet`表中添加字段

```sql
ALTER TABLE writing_analysis_tweet
ADD COLUMN content_embedding BLOB;
ADD COLUMN embedding_model TEXT DEFAULT 'sentence-bert';
ADD COLUMN embedding_dimension INTEGER DEFAULT 768;
```

### 3. 用户级别向量化
- **目标**: 用户写作风格的整体表征
- **数据**: 用户所有推文的聚合特征
- **用途**: 用户相似性分析、个性化推荐
- **存储**: 在`user_style_profile`表中添加字段

```sql
ALTER TABLE user_style_profile
ADD COLUMN style_embedding BLOB;
ADD COLUMN topic_distribution BLOB; -- 主题分布向量
ADD COLUMN sentiment_profile BLOB;  -- 情感倾向向量
```

### 4. 类型级别向量化
- **目标**: 推文类型的语义表征
- **数据**: 每种推文类型的典型内容
- **用途**: 自动类型分类、类型相似性分析
- **存储**: `tweet_type_config`表扩展

```sql
ALTER TABLE tweet_type_config
ADD COLUMN type_embedding BLOB;
ADD COLUMN example_embeddings BLOB; -- 典型例句的向量
```

## 🎯 实施优先级建议

### Phase 1 (立即实施) - 基础NLP升级
- [x] 引入jieba分词库
- [x] 改进词性标注
- [x] 优化预处理pipeline
- **预期效果**: 分词准确率从60%提升到85%

### Phase 2 (1-2个月) - 语义向量化
- [ ] 集成预训练词向量
- [ ] 实现句子级向量化
- [ ] 建立向量相似度搜索
- **预期效果**: 支持语义相似推文检索

### Phase 3 (3-6个月) - 高级语义分析
- [ ] 主题建模
- [ ] 细粒度情感分析
- [ ] 智能聚类和推荐
- **预期效果**: 接近商业级NLP系统的分析能力

## 💰 成本考虑

### 计算成本
- **本地模型**: 一次性下载成本，持续计算资源
- **API调用**: 按使用量付费 (OpenAI: $0.0004/1K tokens)
- **混合方案**: 基础处理本地化，高级分析使用API

### 存储成本
- **词向量**: ~2GB (100万词 x 300维 x 4字节)
- **句子向量**: ~30MB (10万条推文 x 768维 x 4字节)
- **用户向量**: ~1MB (1千用户 x 1000维 x 4字节)

### 开发成本
- **jieba集成**: 1-2天
- **向量化系统**: 1-2周
- **完整语义分析**: 1-2个月

## 📈 性能优化建议

1. **向量索引**: 使用Faiss或Annoy进行高效向量检索
2. **批量处理**: 向量化计算批量进行，减少API调用
3. **缓存策略**: 常用词汇和句子向量缓存
4. **增量更新**: 只对新内容进行向量化计算

这个升级方案将大幅提升写作分析的准确性和智能化水平，特别是在语义理解和相似性分析方面。