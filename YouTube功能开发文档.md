# YouTube Channel 监控功能开发文档

## 功能概述
实现YouTube频道视频批量采集功能，支持输入多个Channel Username，自动爬取频道下的视频数据（标题、描述、ID）并存储到数据库。

## 核心特性
- 批量输入Channel Username
- 智能增量爬取（连续3个重复视频停止）
- 按时间倒序展示视频数据
- 简洁的任务管理界面

## 技术架构

### 1. 数据库设计

```sql
-- YouTube任务表
CREATE TABLE youtube_tasks (
  id TEXT PRIMARY KEY,
  usernames TEXT[], -- JSON数组格式存储多个用户名
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  total_videos INTEGER DEFAULT 0,
  new_videos INTEGER DEFAULT 0,
  error_message TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- YouTube视频表
CREATE TABLE youtube_videos (
  id TEXT PRIMARY KEY,
  video_id TEXT UNIQUE NOT NULL,
  channel_username TEXT NOT NULL,
  channel_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  view_count INTEGER,
  like_count INTEGER,
  publish_date TIMESTAMP,
  crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  task_id TEXT, -- 关联到爬取任务
  FOREIGN KEY (task_id) REFERENCES youtube_tasks(id)
);

-- 创建索引
CREATE INDEX idx_youtube_videos_channel_username ON youtube_videos(channel_username);
CREATE INDEX idx_youtube_videos_publish_date ON youtube_videos(publish_date DESC);
CREATE INDEX idx_youtube_videos_video_id ON youtube_videos(video_id);
```

### 2. 爬取逻辑流程

#### 单Channel爬取逻辑
```
1. 验证Username → 获取Channel ID
2. 访问Channel页面 → 解析基本信息
3. 按发布时间倒序获取视频列表
4. 智能遍历：
   - 检查video_id是否已存在数据库
   - 连续3个已存在 → 停止该Channel
   - 新视频 → 打开详情页爬取完整数据
5. 保存到数据库
```

#### 批量任务处理流程
```
1. 解析输入的多个Username
2. 创建任务记录到youtube_tasks表
3. 串行处理每个Channel（避免并发冲突）
4. 统计结果：总视频数、新发现数量
5. 更新任务状态为completed
```

#### 停止条件判断
```typescript
let consecutiveDuplicates = 0;

for (const video of channelVideos) {
  const exists = await checkVideoExists(video.id);

  if (exists) {
    consecutiveDuplicates++;
    if (consecutiveDuplicates >= 3) {
      console.log(`连续3个重复，停止爬取Channel: ${username}`);
      break;
    }
  } else {
    consecutiveDuplicates = 0; // 重置计数器
    await crawlVideoDetails(video);
  }
}
```

### 3. 用户界面设计

#### 3.1 任务管理页面 (`/youtube/channel-monitor`)
- **批量输入区域**：
  - 多行文本框，支持换行分割Username
  - 示例：`@username1\n@username2\n@username3`
  - 开始任务按钮

- **任务列表**：
  - 任务ID、创建时间、状态、处理进度
  - 支持查看任务详情
  - 无取消/重试功能（简化版）

#### 3.2 视频数据页面 (`/youtube/videos`)
- **数据展示**：
  - 按publish_date倒序排列
  - 分页显示（20条/页）
  - 显示：缩略图、标题、频道、发布时间、观看数

- **无额外功能**：
  - 不支持搜索筛选
  - 不支持数据导出
  - 不支持批量操作

### 4. API接口设计

```typescript
// 创建YouTube爬取任务
POST /api/youtube/tasks
{
  usernames: string[] // Channel用户名数组
}

// 获取任务列表
GET /api/youtube/tasks
Response: {
  tasks: YouTubeTask[]
}

// 获取任务详情
GET /api/youtube/tasks/[id]
Response: {
  task: YouTubeTask,
  videos: YouTubeVideo[]
}

// 获取视频列表
GET /api/youtube/videos?page=1&limit=20
Response: {
  videos: YouTubeVideo[],
  total: number,
  hasMore: boolean
}
```

## 技术实现要点

### 1. 爬虫选择器
```typescript
class YouTubeSelector {
  // 获取频道视频列表
  async getChannelVideos(channelUrl: string): Promise<VideoInfo[]>

  // 爬取单个视频详情
  async crawlVideoDetails(videoUrl: string): Promise<VideoDetails>

  // 等待页面元素加载
  async waitForVideoList(): Promise<void>
}
```

### 2. 数据存储服务
```typescript
class YouTubeDataService {
  async createTask(usernames: string[]): Promise<string>
  async updateTaskStatus(taskId: string, status: string): Promise<void>
  async saveVideo(videoData: VideoData, taskId: string): Promise<void>
  async checkVideoExists(videoId: string): Promise<boolean>
  async getVideos(page: number, limit: number): Promise<PaginatedVideos>
}
```

### 3. 错误处理
- 网络超时：重试3次
- 频道不存在：跳过并记录错误
- 视频页面异常：跳过单个视频继续处理
- 任务中断：保存已处理的数据

## 开发优先级

### Phase 1: 基础功能
1. 数据库结构迁移
2. 基础爬虫逻辑实现
3. 任务管理页面UI

### Phase 2: 完善功能
1. 视频数据页面
2. 错误处理机制
3. 任务状态监控

### Phase 3: 优化功能
1. 爬取性能优化
2. 界面交互改进
3. 日志记录完善

## 注意事项

1. **避免被反爬**：
   - 请求间隔控制
   - 用户代理模拟
   - 适当的延迟设置

2. **数据完整性**：
   - video_id唯一性约束
   - 任务状态一致性
   - 错误数据回滚

3. **性能考虑**：
   - 分页查询大量视频
   - 数据库索引优化
   - 内存使用控制

4. **用户体验**：
   - 任务进度实时更新
   - 清晰的错误提示
   - 合理的加载状态