# 写作辅助模块 API 文档

本文档描述了写作辅助模块的 API 接口，支持文章采集、内容平台管理、文章类型管理、内容结构管理和文章生成等功能。

## 核心特性

### 多选支持
- **内容平台**：每篇文章可以关联多个内容平台（如微信公众号、知乎、小红书等）
- **文章类型**：每篇文章可以属于多种类型（如教程、产品介绍、技术分享等）
- **筛选功能**：支持按多个平台和多个类型同时筛选文章

## API 路由

### 1. 采集文章管理 (`collectedArticles`)

#### `getAll` - 获取文章列表
```typescript
// 输入参数
{
  platformIds?: string[];      // 平台ID数组，支持多选筛选
  articleTypeIds?: string[];   // 类型ID数组，支持多选筛选
  startDate?: string;          // 开始日期
  endDate?: string;           // 结束日期
  author?: string;            // 作者名称筛选
  title?: string;             // 标题关键词筛选
  page?: number;              // 页码，默认 1
  pageSize?: number;          // 每页条数，默认 20，最大 100
}

// 返回结果
{
  articles: [
    {
      id: string;
      title: string;
      author: string;
      content: string;
      collectedAt: Date;
      platforms: [
        {
          id: string;
          platformId: string;
          platform: {
            id: string;
            name: string;
            platformId: string;
            description: string;
          }
        }
      ];
      articleTypes: [
        {
          id: string;
          typeId: string;
          articleType: {
            id: string;
            name: string;
            typeId: string;
            description: string;
          }
        }
      ];
    }
  ];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }
}
```

#### `create` - 创建文章
```typescript
// 输入参数
{
  title: string;                      // 文章标题，必填
  author: string;                     // 作者名称，必填
  content?: string;                   // 文章内容，可选
  platformIds: string[];              // 平台ID数组，至少选择一个
  articleTypeIds: string[];           // 类型ID数组，至少选择一个
}
```

#### `update` - 更新文章
```typescript
// 输入参数
{
  id: string;                         // 文章ID，必填
  title?: string;                     // 文章标题
  author?: string;                    // 作者名称
  content?: string;                   // 文章内容
  platformIds?: string[];             // 平台ID数组，会完全替换现有关联
  articleTypeIds?: string[];          // 类型ID数组，会完全替换现有关联
}
```

#### `delete` - 删除文章
```typescript
// 输入参数
{
  id: string;                         // 文章ID
}
```

### 2. 内容平台管理 (`contentPlatforms`)

#### `getAll` - 获取平台列表
```typescript
// 返回结果
[
  {
    id: string;
    name: string;                     // 平台名称
    platformId: string;               // 平台英文ID
    description?: string;             // 平台描述
    wordCount?: string;               // 字数要求描述
    isDefault: boolean;               // 是否为默认平台
    createdAt: Date;
    updatedAt: Date;
  }
]
```

#### `create` - 创建平台
```typescript
// 输入参数
{
  name: string;                       // 平台名称，必填
  platformId: string;                 // 平台英文ID，必填，只能包含字母、数字、下划线、短横线
  description?: string;               // 平台描述
  wordCount?: string;                 // 字数要求描述
  isDefault?: boolean;                // 是否设为默认，默认 false
}
```

#### `update` - 更新平台
```typescript
// 输入参数
{
  id: string;                         // 平台ID，必填
  name?: string;                      // 平台名称
  platformId?: string;                // 平台英文ID
  description?: string;               // 平台描述
  wordCount?: string;                 // 字数要求描述
  isDefault?: boolean;                // 是否为默认
}
```

#### `setDefault` - 设置默认平台
```typescript
// 输入参数
{
  id: string;                         // 平台ID
}
```

#### `initDefaults` - 初始化默认平台
创建系统默认平台（如果不存在默认平台的话）。

### 3. 文章类型管理 (`articleTypes`)

API 结构与内容平台管理类似：

#### `getAll`, `create`, `update`, `delete`, `setDefault`, `initDefaults`

参数结构类似，主要字段：
- `name`: 类型名称
- `typeId`: 类型英文ID
- `description`: 类型描述
- `isDefault`: 是否为默认类型

### 4. 内容结构管理 (`contentStructures`)

#### `getAll` - 获取结构列表
```typescript
// 返回结果
[
  {
    id: string;
    title: string;                    // 结构标题
    content: string;                  // 结构内容
    platformId: string;               // 关联平台ID
    typeId: string;                   // 关联类型ID
    platform: {
      id: string;
      name: string;
      // ...其他平台字段
    };
    articleType: {
      id: string;
      name: string;
      // ...其他类型字段
    };
    createdAt: Date;
    updatedAt: Date;
  }
]
```

#### `create` - 创建结构
```typescript
// 输入参数
{
  title: string;                      // 结构标题，必填
  content: string;                    // 结构内容，必填
  platformId: string;                 // 关联平台ID，必填
  typeId: string;                     // 关联类型ID，必填
}
```

### 5. 文章生成 (`articleGeneration`)

#### `create` - 创建生成任务
```typescript
// 输入参数
{
  topic: string;                      // 内容主题，必填
  platformId: string;                 // 目标平台ID，必填
  referenceArticleIds?: string[];     // 参考文章ID数组
  additionalRequirements?: string;    // 附加要求
  useContentStructure?: boolean;      // 是否使用内容结构
  contentStructureId?: string;        // 内容结构ID
}

// 返回结果
{
  id: string;
  topic: string;
  platformId: string;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 使用示例

### 前端组件调用示例

```typescript
// 获取文章列表，筛选多个平台和类型
const { data: articlesData } = api.collectedArticles.getAll.useQuery({
  platformIds: ["platform1", "platform2"],  // 多选平台
  articleTypeIds: ["type1", "type2"],       // 多选类型
  title: "搜索关键词",
  page: 1,
  pageSize: 20
});

// 创建文章，关联多个平台和类型
const createArticle = api.collectedArticles.create.useMutation({
  onSuccess: () => {
    // 刷新列表
    refetch();
  }
});

// 提交表单
const handleSubmit = (formData: FormData) => {
  const platformIds = formData.getAll('platforms') as string[];
  const articleTypeIds = formData.getAll('articleTypes') as string[];

  createArticle.mutate({
    title: "文章标题",
    author: "作者名称",
    content: "文章内容",
    platformIds,      // 多选平台
    articleTypeIds,   // 多选类型
  });
};
```

### 多选筛选界面实现

```typescript
// 平台多选筛选
<div>
  <label>平台筛选</label>
  <div className="checkbox-group">
    <label>
      <input
        type="checkbox"
        checked={filters.platformIds.length === 0}
        onChange={(e) => {
          if (e.target.checked) {
            setFilters({...filters, platformIds: []});
          }
        }}
      />
      全部
    </label>
    {platforms?.map((platform) => (
      <label key={platform.id}>
        <input
          type="checkbox"
          checked={filters.platformIds.includes(platform.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setFilters({
                ...filters,
                platformIds: [...filters.platformIds, platform.id]
              });
            } else {
              setFilters({
                ...filters,
                platformIds: filters.platformIds.filter(id => id !== platform.id)
              });
            }
          }}
        />
        {platform.name}
      </label>
    ))}
  </div>
</div>
```

## 数据库模型说明

### 多对多关系实现

系统使用中间表实现多对多关系：

1. **CollectedArticlePlatform** - 文章与平台的关联表
   - `articleId`: 文章ID
   - `platformId`: 平台ID
   - 唯一约束：`[articleId, platformId]`

2. **CollectedArticleType** - 文章与类型的关联表
   - `articleId`: 文章ID
   - `typeId`: 类型ID
   - 唯一约束：`[articleId, typeId]`

### 数据库查询优化

- 所有关联表都有适当的索引
- 筛选查询使用 Prisma 的 `some` 操作符进行高效查询
- 分页查询同时返回总数统计

## 错误处理

所有 API 接口都包含适当的验证：

- **输入验证**：使用 Zod schema 进行参数验证
- **业务逻辑验证**：如至少选择一个平台/类型
- **数据库约束**：防止重复数据和无效关联
- **错误消息**：提供中文错误提示

## 性能考虑

1. **分页查询**：默认每页 20 条，最大 100 条
2. **索引优化**：关键字段和关联表都有索引
3. **选择性加载**：使用 Prisma 的 `include` 只加载需要的关联数据
4. **查询优化**：批量查询文章数和分页数据

## 更新日志

### v1.1 - 多选功能支持
- ✅ 添加文章多平台、多类型支持
- ✅ 筛选界面支持多选复选框
- ✅ API 完全支持数组参数筛选
- ✅ 数据库模型优化，添加必要索引
- ✅ 前端组件适配多选逻辑