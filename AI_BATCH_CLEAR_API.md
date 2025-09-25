# AI批处理清除API文档

## 概述

新增的AI批处理清除API提供了专门的清除功能，用于快速清理所有AI批处理任务和状态。与现有的`reset` API相比，这个`clear` API更专注于清除操作，提供更简洁的接口。

## API端点

### POST `/api/external/ai-batch/clear`

强制清除所有AI批处理任务和状态。

#### 请求

**Headers:**
```
x-api-key: unicatcher-api-key-demo
Content-Type: application/json
```

**Body:** 
```json
{}
```
*注：该接口不需要任何参数，会自动清除所有相关状态*

#### 响应

**成功响应 (200):**
```json
{
  "success": true,
  "message": "所有AI批处理任务已成功清除",
  "data": {
    "clearTime": "2025-09-22T11:48:00.000Z",
    "beforeClear": {
      "hasGlobalTask": true,
      "currentBatchId": "batch_1758539874517_hyqk4w",
      "activeProcessesCount": 1,
      "processingRecordsCount": 1
    },
    "afterClear": {
      "hasGlobalTask": false,
      "currentBatchId": null,
      "activeProcessesCount": 0,
      "processingRecordsCount": 0
    },
    "clearedTasks": {
      "processingRecords": 1,
      "activeProcesses": 1,
      "databaseUpdates": 1
    }
  }
}
```

**错误响应 (401):**
```json
{
  "error": "Unauthorized: Invalid API Key"
}
```

**错误响应 (500):**
```json
{
  "success": false,
  "error": "清除操作失败",
  "details": "具体错误信息",
  "timestamp": "2025-09-22T11:48:00.000Z"
}
```

### GET `/api/external/ai-batch/clear`

获取清除操作的预览信息，显示当前有哪些任务会被清除，但不执行实际清除操作。

#### 请求

**Headers:**
```
x-api-key: unicatcher-api-key-demo
```

#### 响应

**成功响应 (200):**
```json
{
  "success": true,
  "message": "发现 1 个任务待清除",
  "data": {
    "needsClear": true,
    "currentStatus": {
      "hasGlobalTask": true,
      "currentBatchId": "batch_1758539874517_hyqk4w",
      "globalMessage": "AI批处理任务正在运行中"
    },
    "activeProcesses": {
      "count": 1,
      "batchIds": ["batch_1758539874517_hyqk4w"]
    },
    "processingRecords": {
      "count": 1,
      "tasks": [
        {
          "batchId": "batch_1758539874517_hyqk4w",
          "startedAt": "2025-09-22T11:17:54.000Z",
          "progress": "10/710",
          "aiProvider": "openai-badger",
          "aiModel": "gpt-4o",
          "duration": "1800秒"
        }
      ]
    },
    "estimation": {
      "tasksToCancel": 1,
      "memoryToReset": 1,
      "globalStateToReset": true
    },
    "timestamp": "2025-09-22T11:48:00.000Z"
  }
}
```

## 使用示例

### 1. 检查待清除任务

```bash
curl -X GET "https://your-domain.com/api/external/ai-batch/clear" \
  -H "x-api-key: unicatcher-api-key-demo"
```

### 2. 执行清除操作

```bash
curl -X POST "https://your-domain.com/api/external/ai-batch/clear" \
  -H "x-api-key: unicatcher-api-key-demo" \
  -H "Content-Type: application/json" \
  -d "{}"
```

### 3. JavaScript/TypeScript 示例

```typescript
// 检查待清除任务
async function checkClearPreview() {
  const response = await fetch('/api/external/ai-batch/clear', {
    headers: {
      'x-api-key': 'unicatcher-api-key-demo'
    }
  });
  
  const result = await response.json();
  console.log('待清除任务:', result.data);
  return result;
}

// 执行清除操作
async function clearAllTasks() {
  const response = await fetch('/api/external/ai-batch/clear', {
    method: 'POST',
    headers: {
      'x-api-key': 'unicatcher-api-key-demo',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('清除成功:', result.data);
  } else {
    console.error('清除失败:', result.error);
  }
  return result;
}
```

## 功能特点

### 🧹 **全面清除**
- 重置ProcessManager内存状态
- 取消数据库中所有processing状态的任务
- 清除全局任务锁定状态

### 📊 **详细反馈**
- 提供清除前后的状态对比
- 显示具体清除了多少任务
- 包含详细的时间戳信息

### 🔍 **预览功能**
- GET请求可以预览将要清除的任务
- 不执行实际操作，安全查看当前状态
- 提供详细的任务信息和运行时间

### 🛡️ **安全性**
- 需要API Key认证
- 详细的错误处理和日志记录
- 操作结果验证

## 与reset API的区别

| 功能 | clear API | reset API |
|------|-----------|-----------|
| **目标** | 专门的清除操作 | 智能重置和状态修复 |
| **操作模式** | 强制清除所有任务 | 支持强制和温和模式 |
| **参数** | 无需参数，简单易用 | 需要`force`参数控制 |
| **预览** | 提供GET预览功能 | 无预览功能 |
| **用途** | 快速清理所有任务 | 修复状态不一致问题 |

## 使用建议

1. **使用前预览**: 建议先使用GET请求查看将要清除的任务
2. **确认操作**: 清除操作不可撤销，请确认后再执行
3. **监控日志**: 操作会产生详细日志，便于问题追踪
4. **定期清理**: 可以定期使用此API清理卡住的任务

## 注意事项

⚠️ **重要提醒**:
- 此操作会取消所有正在运行的AI批处理任务
- 被取消的任务无法恢复，需要重新启动
- 建议在确认任务确实卡住或异常时使用
- 操作完成后可以正常启动新的AI批处理任务
