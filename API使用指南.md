# UniCatcher API 使用指南

本文档提供 UniCatcher 外部 REST API 的快速使用指南。

## 🔑 认证

所有 API 请求都需要包含 API Key：

```bash
# 方式1：使用 X-API-Key 头部
curl -H "X-API-Key: unicatcher-api-key-demo" \
     https://your-domain.com/api/external/tasks

# 方式2：使用 Authorization 头部
curl -H "Authorization: Bearer unicatcher-api-key-demo" \
     https://your-domain.com/api/external/tasks
```

## 📋 快速开始

### 1. 创建爬取任务

```bash
curl -X POST https://your-domain.com/api/external/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: unicatcher-api-key-demo" \
  -d '{
    "listId": "123456789",
    "maxTweets": 50
  }'
```

**响应示例：**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "taskId": "clxxx123456789",
    "listId": "123456789",
    "maxTweets": 50,
    "status": "created"
  }
}
```

### 2. 查询任务状态

```bash
curl -H "X-API-Key: unicatcher-api-key-demo" \
     https://your-domain.com/api/external/tasks/clxxx123456789
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "clxxx123456789",
    "type": "twitter_list",
    "listId": "123456789",
    "status": "completed",
    "tweetCount": 45,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "completedAt": "2024-01-01T10:05:00.000Z"
  }
}
```

### 3. 获取爬取数据

```bash
# 获取 JSON 格式数据
curl -H "X-API-Key: unicatcher-api-key-demo" \
     "https://your-domain.com/api/external/data/clxxx123456789?page=1&limit=20"

# 下载 CSV 格式数据
curl -H "X-API-Key: unicatcher-api-key-demo" \
     "https://your-domain.com/api/external/data/clxxx123456789?format=csv" \
     -o tweets.csv
```

## 🔄 完整工作流程

### JavaScript 示例

```javascript
// 1. 创建任务
async function createTask(listId, maxTweets = 20) {
  const response = await fetch('/api/external/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'unicatcher-api-key-demo'
    },
    body: JSON.stringify({
      listId: listId,
      maxTweets: maxTweets
    })
  });
  
  const result = await response.json();
  return result.data.taskId;
}

// 2. 轮询任务状态
async function waitForTask(taskId) {
  while (true) {
    const response = await fetch(`/api/external/tasks/${taskId}`, {
      headers: {
        'X-API-Key': 'unicatcher-api-key-demo'
      }
    });
    
    const result = await response.json();
    const status = result.data.status;
    
    if (status === 'completed') {
      console.log(`任务完成！采集了 ${result.data.tweetCount} 条推文`);
      break;
    } else if (status === 'failed') {
      console.log('任务失败');
      break;
    }
    
    console.log(`任务状态: ${status}`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
  }
}

// 3. 获取数据
async function getTweets(taskId) {
  const response = await fetch(`/api/external/data/${taskId}`, {
    headers: {
      'X-API-Key': 'unicatcher-api-key-demo'
    }
  });
  
  const result = await response.json();
  return result.data.tweets;
}

// 使用示例
async function main() {
  try {
    const taskId = await createTask('123456789', 50);
    console.log(`任务已创建: ${taskId}`);
    
    await waitForTask(taskId);
    
    const tweets = await getTweets(taskId);
    console.log(`获取到 ${tweets.length} 条推文`);
    
    tweets.forEach(tweet => {
      console.log(`${tweet.userNickname}: ${tweet.content}`);
    });
  } catch (error) {
    console.error('错误:', error);
  }
}

main();
```

### Python 示例

```python
import requests
import time
import json

API_KEY = 'unicatcher-api-key-demo'
BASE_URL = 'https://your-domain.com/api/external'

def create_task(list_id, max_tweets=20):
    """创建爬取任务"""
    url = f'{BASE_URL}/tasks'
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
    }
    data = {
        'listId': list_id,
        'maxTweets': max_tweets
    }
    
    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    if result['success']:
        return result['data']['taskId']
    else:
        raise Exception(f"创建任务失败: {result}")

def get_task_status(task_id):
    """获取任务状态"""
    url = f'{BASE_URL}/tasks/{task_id}'
    headers = {'X-API-Key': API_KEY}
    
    response = requests.get(url, headers=headers)
    result = response.json()
    
    return result['data']

def wait_for_task(task_id):
    """等待任务完成"""
    while True:
        task = get_task_status(task_id)
        status = task['status']
        
        if status == 'completed':
            print(f"任务完成！采集了 {task['tweetCount']} 条推文")
            break
        elif status == 'failed':
            print("任务失败")
            break
        
        print(f"任务状态: {status}")
        time.sleep(5)

def get_tweets(task_id, page=1, limit=100):
    """获取推文数据"""
    url = f'{BASE_URL}/data/{task_id}'
    headers = {'X-API-Key': API_KEY}
    params = {'page': page, 'limit': limit}
    
    response = requests.get(url, headers=headers, params=params)
    result = response.json()
    
    return result['data']['tweets']

def download_csv(task_id, filename='tweets.csv'):
    """下载CSV格式数据"""
    url = f'{BASE_URL}/data/{task_id}'
    headers = {'X-API-Key': API_KEY}
    params = {'format': 'csv'}
    
    response = requests.get(url, headers=headers, params=params)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(response.text)
    
    print(f"数据已保存到 {filename}")

# 使用示例
def main():
    try:
        # 创建任务
        task_id = create_task('123456789', 50)
        print(f"任务已创建: {task_id}")
        
        # 等待完成
        wait_for_task(task_id)
        
        # 获取数据
        tweets = get_tweets(task_id)
        print(f"获取到 {len(tweets)} 条推文")
        
        for tweet in tweets[:5]:  # 显示前5条
            print(f"{tweet['userNickname']}: {tweet['content'][:100]}...")
        
        # 下载CSV
        download_csv(task_id)
        
    except Exception as e:
        print(f"错误: {e}")

if __name__ == '__main__':
    main()
```

## 📊 响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 具体数据
  }
}
```

### 错误响应
```json
{
  "error": "错误信息",
  "details": {
    // 详细错误信息（可选）
  }
}
```

## 🔗 API 端点总览

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/external/tasks` | 创建爬取任务 |
| GET | `/api/external/tasks` | 获取任务列表 |
| GET | `/api/external/tasks/{id}` | 获取任务详情 |
| GET | `/api/external/data/{id}` | 获取任务数据 |

## ⚠️ 注意事项

1. **API Key**: 当前使用演示密钥，生产环境请更换为安全密钥
2. **限制**: 单个任务最多可采集100条推文
3. **超时**: 任务最长执行时间为5分钟
4. **频率**: 建议每个List ID间隔至少1分钟再次爬取

## 📞 支持

如有问题，请访问：
- API文档：`/api-docs`
- 管理后台：`/dashboard`
- 项目地址：GitHub Repository

---

**UniCatcher v1.0.0** | 更新时间：2024年 