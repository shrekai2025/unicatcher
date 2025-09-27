# AI评论生成API文档

## 接口概述

独立评论生成API允许外部项目传入推文信息生成AI评论，无需将数据存储到unicatcher数据库中。

**接口地址**: `POST /api/external/generate-comments-standalone`

**认证方式**: API Key（通过Header传递）

---

## 请求参数

### Headers
```
Content-Type: application/json
x-api-key: your-api-key-here
```

### Body参数

#### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `content` | string | 推文内容 |
| `aiConfig` | object | AI服务配置（见下方说明） |

#### AI Config 配置

| 参数 | 类型 | 说明 |
|------|------|------|
| `aiConfig.provider` | string | AI供应商：`openai` \| `openai-badger` \| `zhipu` \| `anthropic` |
| `aiConfig.model` | string | 模型名称，如：`gpt-4o`、`glm-4.5-flash` |
| `aiConfig.apiKey` | string | API密钥 |
| `aiConfig.baseURL` | string | 可选，自定义API地址 |

#### 可选参数 - 推文元数据

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tweetId` | string | - | 推文ID（不会存储到数据库） |
| `tweetUrl` | string | - | 推文链接 |
| `authorUsername` | string | - | 作者用户名 |
| `authorNickname` | string | - | 作者昵称 |

#### 可选参数 - 生成配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `commentCount` | number | `3` | 生成评论数量（1-7） |
| `commentLength` | string | `'medium'` | 评论长度：`short` \| `medium` \| `long` |
| `language` | string | `'zh-CN'` | 语言：`zh-CN` \| `en-US` |
| `userInfo` | string | `''` | 用户补充信息 |
| `systemPrompt` | string | `''` | 自定义系统提示词（覆盖默认配置） |
| `type` | string | `''` | **评论类型，用于拼接到系统提示词中的`{{type}}`占位符** |

#### 可选参数 - 参考数据

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `referenceTweetCategoryId` | string | - | 参考推文的分类ID |
| `referenceCount` | number | `5` | 参考推文数量（0-20） |

---

## 系统提示词占位符

在系统提示词模板中可以使用以下占位符（使用`{{变量名}}`格式）：

### 必需占位符
- `{{langPrompt}}` - 语言指令
- `{{commentCount}}` - 评论数量
- `{{tweetContent}}` - 推文内容
- `{{lengthPrompt}}` - 长度要求
- `{{language}}` - 语言名称

### 可选占位符
- `{{userInfo}}` - 用户补充信息
- `{{type}}` - 评论类型（通过API传入的`type`参数）
- `{{existingComments}}` - 现有评论列表
- `{{referenceData}}` - 参考推文数据
- `{{authorUsername}}` - 推文作者用户名
- `{{authorNickname}}` - 推文作者昵称

---

## 响应格式

### 成功响应 (200)

```json
{
  "success": true,
  "message": "评论生成成功",
  "data": {
    "tweetId": "1234567890",
    "tweetUrl": "https://twitter.com/user/status/1234567890",
    "authorUsername": "example_user",
    "authorNickname": "Example User",
    "comments": [
      {
        "content": "这是第一条生成的评论",
        "reasoning": "基于推文内容，采用提问型策略"
      },
      {
        "content": "这是第二条生成的评论",
        "reasoning": "补充相关信息和个人经验"
      }
    ],
    "basedOnExistingComments": false,
    "existingCommentsCount": 0,
    "aiProvider": "openai",
    "aiModel": "gpt-4o",
    "language": "zh-CN",
    "generatedAt": "2025-09-27T10:30:00.000Z"
  }
}
```

### 错误响应

#### 401 - 未授权
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

#### 400 - 请求参数错误
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing or invalid content"
  }
}
```

#### 500 - 生成失败
```json
{
  "success": false,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "评论生成服务失败"
  }
}
```

---

## 请求示例

### 基础请求

```bash
curl -X POST https://your-domain.com/api/external/generate-comments-standalone \
  -H "Content-Type: application/json" \
  -H "x-api-key: unicatcher-api-key-demo" \
  -d '{
    "content": "今天学习了AI提示词工程，收获很大！",
    "commentCount": 3,
    "commentLength": "medium",
    "language": "zh-CN",
    "aiConfig": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "sk-your-openai-key"
    }
  }'
```

### 带类型参数的请求

```bash
curl -X POST https://your-domain.com/api/external/generate-comments-standalone \
  -H "Content-Type: application/json" \
  -H "x-api-key: unicatcher-api-key-demo" \
  -d '{
    "content": "刚刚发布了新产品，期待大家反馈",
    "commentCount": 3,
    "language": "zh-CN",
    "type": "产品反馈型",
    "userInfo": "需要生成积极正面的评论",
    "aiConfig": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "sk-your-openai-key"
    }
  }'
```

### 带完整元数据的请求

```bash
curl -X POST https://your-domain.com/api/external/generate-comments-standalone \
  -H "Content-Type: application/json" \
  -H "x-api-key: unicatcher-api-key-demo" \
  -d '{
    "content": "分享一个很有用的编程技巧",
    "tweetId": "1234567890",
    "tweetUrl": "https://twitter.com/user/status/1234567890",
    "authorUsername": "tech_guru",
    "authorNickname": "技术大牛",
    "commentCount": 5,
    "commentLength": "long",
    "language": "zh-CN",
    "type": "技术讨论",
    "userInfo": "以专业开发者的角度评论",
    "referenceTweetCategoryId": "tech-tips",
    "referenceCount": 3,
    "aiConfig": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "sk-your-openai-key"
    }
  }'
```

---

## 使用场景

### 场景1: 基于评论类型生成不同风格的评论

在系统提示词中使用`{{type}}`占位符：

```
你是一个专业的社交媒体评论助手。

**评论类型**: {{type}}

根据以上类型要求，为以下推文生成评论：
{{tweetContent}}

生成 {{commentCount}} 条评论，每条评论长度：{{lengthPrompt}}
{{langPrompt}}
```

然后在API请求中传入不同的`type`值：
- `"营销推广型"` - 生成有利于产品宣传的评论
- `"技术讨论型"` - 生成专业技术讨论的评论
- `"友好互动型"` - 生成轻松友好的互动评论
- `"建设性批评型"` - 生成有建设性的批评建议

### 场景2: 结合用户信息和类型

```json
{
  "content": "我们的新功能上线了！",
  "type": "产品测试反馈",
  "userInfo": "作为早期用户，提供详细的使用体验和改进建议",
  "commentCount": 3,
  "language": "zh-CN",
  "aiConfig": { ... }
}
```

---

## 注意事项

1. **API Key安全**: 不要在客户端代码中暴露API Key
2. **提示词配置**: 建议在`/ai-settings`页面预先配置好系统提示词模板
3. **参数优先级**: `systemPrompt`参数会覆盖配置页面的默认提示词
4. **type参数**:
   - `type`参数是可选的，如果不传或传空字符串，`{{type}}`占位符会被替换为空字符串
   - 建议在系统提示词中添加引导语，例如："评论类型：{{type}}"
   - 这样即使`type`为空，提示词结构也不会混乱
5. **速率限制**: 建议控制请求频率，避免超出AI服务商的速率限制

---

## 相关链接

- [AI设置页面](/ai-settings) - 配置系统提示词模板和AI供应商密钥
- [AI批处理API文档](./AI_BATCH_API_EXAMPLES.md) - 批量处理推文的AI分析