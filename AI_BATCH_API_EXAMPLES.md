# AI批处理API使用指南

## 概述

AI批处理功能已调整为**单批次处理模式**，具有以下特点：

- ✅ **全局唯一处理**：整个系统同时只能运行一个AI批处理任务
- ✅ **单批次模式**：每次API调用只处理一个批次，不再自动执行多个批次
- ✅ **状态检查**：如果有任务正在运行，新请求会返回"处理中"状态
- ✅ **继续处理**：支持手动触发处理下一批次

## API接口

### 1. 启动AI批处理

**接口地址**：`POST /api/external/ai-batch/start`

**认证方式**：
```bash
# 使用 x-api-key 头部
curl -H "x-api-key: unicatcher-api-key-demo"

# 或使用 Authorization 头部
curl -H "Authorization: Bearer unicatcher-api-key-demo"
```

**请求示例**：

```bash
curl -X POST http://localhost:3000/api/external/ai-batch/start \
  -H "Content-Type: application/json" \
  -H "x-api-key: unicatcher-api-key-demo" \
  -d '{
    "usernames": ["elonmusk", "sundarpichai"],
    "publishedAfter": "2024-01-01T00:00:00Z",
    "isExtracted": "all",
    "batchSize": 20,
    "batchProcessingMode": "optimized",
    "systemPrompt": "你是专业的推文分析师，请分析推文的技术价值和商业价值。",
    "aiConfig": {
      "apiKey": "sk-your-openai-api-key",
      "provider": "openai",
      "model": "gpt-4o",
      "baseURL": "https://api.openai.com/v1"
    }
  }'
```

**请求参数说明**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `usernames` | string[] | 否 | 筛选特定用户的推文（注意：不支持单独的listIds） |
| `publishedAfter` | string | 否 | 筛选发布时间在此之后的推文（ISO 8601格式） |
| `isExtracted` | enum | 否 | 筛选条件：`"all"`、`"true"`、`"false"`，默认`"all"` |
| `batchSize` | number | 否 | 每批处理的推文数量，范围1-100，默认10 |
| `batchProcessingMode` | enum | 否 | 处理模式：`"optimized"`（批量）或`"traditional"`（逐条），默认`"optimized"` |
| `systemPrompt` | string | 否 | 自定义系统提示词 |
| `aiConfig.apiKey` | string | 是 | OpenAI API Key |
| `aiConfig.provider` | enum | 否 | AI提供商：`"openai"`或`"openai-badger"`，默认`"openai"` |
| `aiConfig.model` | string | 否 | AI模型，默认`"gpt-4o"` |
| `aiConfig.baseURL` | string | 否 | 自定义API基础URL |

**成功响应**：
```json
{
  "success": true,
  "message": "AI批处理任务启动成功",
  "data": {
    "batchId": "batch_1703123456789_abc123",
    "status": "processing",
    "totalTweets": 150,
    "batchSize": 20,
    "estimatedBatches": 8,
    "mode": "optimized",
    "startedAt": "2024-01-01T10:00:00Z"
  }
}
```

**任务已在运行的响应**（状态码409）：
```json
{
  "success": false,
  "error": "AI批处理任务正在运行中",
  "data": {
    "status": "processing",
    "currentBatchId": "batch_1703123456789_xyz456",
    "message": "AI批处理任务正在进行中: batch_1703123456789_xyz456"
  }
}
```

### 2. 查询处理状态

**接口地址**：`GET /api/external/ai-batch/status/{batchId}`

**请求示例**：
```bash
curl -X GET http://localhost:3000/api/external/ai-batch/status/batch_1703123456789_abc123 \
  -H "x-api-key: unicatcher-api-key-demo"
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "batchId": "batch_1703123456789_abc123",
    "status": "completed",
    "progress": {
      "total": 20,
      "processed": 20,
      "succeeded": 18,
      "failed": 2,
      "percentage": 100
    },
    "error": null,
    "isActive": false,
    "message": "处理完成"
  }
}
```

**状态说明**：
- `processing`：正在处理中
- `completed`：处理完成
- `failed`：处理失败
- `cancelled`：任务已取消

### 3. 继续处理下一批次

**接口地址**：`POST /api/external/ai-batch/continue`

**请求示例**：
```bash
curl -X POST http://localhost:3000/api/external/ai-batch/continue \
  -H "Content-Type: application/json" \
  -H "x-api-key: unicatcher-api-key-demo" \
  -d '{
    "previousBatchId": "batch_1703123456789_abc123",
    "usernames": ["elonmusk", "sundarpichai"],
    "publishedAfter": "2024-01-01T00:00:00Z",
    "isExtracted": "all",
    "batchSize": 20,
    "batchProcessingMode": "optimized",
    "aiConfig": {
      "apiKey": "sk-your-openai-api-key",
      "provider": "openai",
      "model": "gpt-4o"
    }
  }'
```

**注意**：继续处理接口使用与启动接口相同的参数，但会自动排除已处理的推文。

**成功响应**：
```json
{
  "success": true,
  "message": "继续处理任务启动成功",
  "data": {
    "batchId": "batch_1703123456789_def456",
    "previousBatchId": "batch_1703123456789_abc123",
    "status": "processing",
    "remainingTweets": 130,
    "batchSize": 20,
    "estimatedBatches": 7,
    "mode": "optimized",
    "startedAt": "2024-01-01T10:05:00Z"
  }
}
```

**没有更多数据的响应**（状态码404）：
```json
{
  "success": false,
  "error": "没有更多符合条件的推文需要处理",
  "data": {
    "remainingTweets": 0,
    "message": "所有符合条件的推文已处理完成"
  }
}
```

### 4. 查询全局状态

**接口地址**：`GET /api/external/ai-batch/start`

**请求示例**：
```bash
curl -X GET http://localhost:3000/api/external/ai-batch/start \
  -H "x-api-key: unicatcher-api-key-demo"
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "hasActiveTask": true,
    "currentBatchId": "batch_1703123456789_abc123",
    "status": {
      "batchId": "batch_1703123456789_abc123",
      "status": "processing",
      "progress": {
        "total": 20,
        "processed": 15,
        "succeeded": 13,
        "failed": 2,
        "percentage": 75
      }
    },
    "message": "AI批处理任务正在进行中: batch_1703123456789_abc123"
  }
}
```

## 使用流程示例

### 完整的批量处理流程

```bash
#!/bin/bash

API_KEY="unicatcher-api-key-demo"
BASE_URL="http://localhost:3000/api/external/ai-batch"

# 1. 检查当前状态
echo "检查当前状态..."
curl -s -X GET "$BASE_URL/start" -H "x-api-key: $API_KEY"

# 2. 启动第一批处理
echo "启动第一批处理..."
RESPONSE=$(curl -s -X POST "$BASE_URL/start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "usernames": ["elonmusk"],
    "batchSize": 10,
    "batchProcessingMode": "optimized",
    "aiConfig": {
      "apiKey": "sk-your-openai-api-key",
      "provider": "openai",
      "model": "gpt-4o-mini"
    }
  }')

BATCH_ID=$(echo $RESPONSE | jq -r '.data.batchId')
echo "批次ID: $BATCH_ID"

# 3. 等待处理完成
while true; do
  echo "检查处理状态..."
  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/status/$BATCH_ID" -H "x-api-key: $API_KEY")
  STATUS=$(echo $STATUS_RESPONSE | jq -r '.data.status')
  PERCENTAGE=$(echo $STATUS_RESPONSE | jq -r '.data.progress.percentage')
  
  echo "状态: $STATUS, 进度: $PERCENTAGE%"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  
  sleep 5
done

# 4. 如果需要，继续处理下一批
if [ "$STATUS" = "completed" ]; then
  echo "第一批处理完成，启动下一批..."
  curl -s -X POST "$BASE_URL/continue" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d '{
      "previousBatchId": "'$BATCH_ID'",
      "usernames": ["elonmusk"],
      "batchSize": 10,
      "batchProcessingMode": "optimized",
      "aiConfig": {
        "apiKey": "sk-your-openai-api-key",
        "provider": "openai",
        "model": "gpt-4o-mini"
      }
    }'
fi
```

## 错误处理

### 常见错误码

| 状态码 | 错误类型 | 处理方式 |
|--------|----------|----------|
| 401 | 认证失败 | 检查API Key是否正确 |
| 400 | 参数错误 | 检查请求参数格式和类型 |
| 404 | 资源不存在 | 检查batchId是否正确，或没有更多数据需要处理 |
| 409 | 任务冲突 | 等待当前任务完成或查询状态 |
| 500 | 服务器错误 | 稍后重试或联系技术支持 |

### 错误响应示例

```json
{
  "success": false,
  "error": "Validation Error",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["aiConfig", "apiKey"],
      "message": "Expected string, received number"
    }
  ]
}
```

## 最佳实践

### 1. 批次大小选择
- **小批次（5-10条）**：适合测试和调试，响应速度快
- **中等批次（10-20条）**：平衡处理速度和稳定性，推荐日常使用
- **大批次（20-50条）**：适合大量数据处理，但可能更容易失败

### 2. 处理模式选择
- **优化模式（optimized）**：一次API调用处理整个批次，速度快但对AI模型要求高
- **传统模式（traditional）**：逐条调用API，稳定但速度慢

### 3. 错误重试策略
```javascript
async function processWithRetry(config, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/external/ai-batch/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'unicatcher-api-key-demo'
        },
        body: JSON.stringify(config)
      });
      
      if (response.status === 409) {
        // 任务正在运行，等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

### 4. 状态轮询
```javascript
async function waitForCompletion(batchId, timeout = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const response = await fetch(`/api/external/ai-batch/status/${batchId}`, {
      headers: { 'x-api-key': 'unicatcher-api-key-demo' }
    });
    
    const data = await response.json();
    const status = data.data.status;
    
    if (status === 'completed' || status === 'failed') {
      return data.data;
    }
    
    // 等待5秒后继续检查
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('处理超时');
}
```

## 注意事项

1. **全局唯一性**：系统同时只能运行一个AI批处理任务
2. **单批次处理**：每次调用只处理一个批次，需要手动调用继续处理
3. **API配额**：注意OpenAI API的调用限制和费用
4. **数据一致性**：处理过程中避免修改相关的推文数据
5. **网络稳定性**：确保网络连接稳定，避免处理中断

## 内部接口（tRPC）

内部前端可以使用相同功能的tRPC接口：

```typescript
// 启动处理
const result = await api.tweetProcessing.startAIBatchProcess.mutate({
  filterConfig: { usernames: ['elonmusk'] },
  batchSize: 10,
  aiConfig: { apiKey: 'sk-...', provider: 'openai', model: 'gpt-4o' }
});

// 继续处理
const continueResult = await api.tweetProcessing.continueAIBatchProcess.mutate({
  previousBatchId: 'batch_123',
  filterConfig: { usernames: ['elonmusk'] },
  batchSize: 10,
  aiConfig: { apiKey: 'sk-...', provider: 'openai', model: 'gpt-4o' }
});

// 查询状态
const status = await api.tweetProcessing.getBatchProcessStatus.query({
  batchId: 'batch_123'
});
```

内外接口功能完全一致，参数格式也保持统一。
