# 设计文档

## 概述

`selectMostRelevantLinks`函数将使用AI能力来理解用户提示词的真实意图，并基于语义相关性和内容质量对Reddit链接进行智能筛选。该函数将结合自然语言理解和多维度评分机制，确保返回最符合用户需求的高质量内容。

## 架构

### 核心流程
1. **意图解析阶段**：使用AI模型分析用户提示词，提取关键意图和关注点
2. **相关性评分阶段**：为每个链接计算与用户意图的匹配度
3. **质量评分阶段**：基于Reddit指标计算内容质量分数
4. **综合排序阶段**：结合相关性和质量分数进行最终排序
5. **结果筛选阶段**：选择top-N个最佳链接返回

### 评分算法设计
```
最终分数 = (相关性分数 × 0.7) + (质量分数 × 0.3)
```

## 组件和接口

### 1. 意图分析器 (IntentAnalyzer)
```typescript
interface IntentAnalysis {
  keywords: string[]        // 提取的关键概念
  domain: string           // 识别的领域（如"前端开发"）
  intent: string           // 用户意图描述
  focusAreas: string[]     // 关注的具体方面
}
```

### 2. 相关性评分器 (RelevanceScorer)
```typescript
interface RelevanceScore {
  semanticMatch: number    // 语义匹配度 (0-1)
  titleMatch: number       // 标题匹配度 (0-1)
  contentMatch: number     // 内容匹配度 (0-1)
  overall: number          // 综合相关性分数 (0-1)
}
```

### 3. 质量评分器 (QualityScorer)
```typescript
interface QualityScore {
  engagement: number       // 参与度分数 (0-1)
  recency: number         // 时效性分数 (0-1)
  contentDepth: number    // 内容深度分数 (0-1)
  overall: number         // 综合质量分数 (0-1)
}
```

### 4. 链接评分结果
```typescript
interface ScoredLink {
  link: RedditLinkInfoUntrusted
  relevanceScore: RelevanceScore
  qualityScore: QualityScore
  finalScore: number
}
```

## 数据模型

### 评分权重配置
```typescript
const SCORING_WEIGHTS = {
  relevance: 0.7,           // 相关性权重
  quality: 0.3,            // 质量权重
  
  // 相关性子权重
  semanticMatch: 0.5,      // 语义匹配
  titleMatch: 0.3,         // 标题匹配
  contentMatch: 0.2,       // 内容匹配
  
  // 质量子权重
  engagement: 0.5,         // 参与度
  recency: 0.3,           // 时效性
  contentDepth: 0.2       // 内容深度
}
```

### 筛选参数
```typescript
const SELECTION_CONFIG = {
  maxResults: 10,          // 最大返回数量（与MAX_LINKS_PER_TASK保持一致）
  minRelevanceScore: 0.3,  // 最低相关性阈值
  aiModelTimeout: 10000,   // AI调用超时时间
  inputThreshold: 10       // 触发筛选的输入数量阈值
}
```

### 数据规模说明
- **输入规模**：通常10-50个链接（当超过10个时触发筛选）
- **输出规模**：最多10个链接（与系统的MAX_LINKS_PER_TASK一致）
- **处理场景**：测试显示输入15个链接，输出5个链接的典型场景

## 错误处理

### 1. AI服务异常处理
- 当AI模型调用失败时，回退到基于关键词的简单匹配
- 设置合理的超时时间，避免长时间等待
- 记录错误日志，便于问题排查

### 2. 数据异常处理
- 当输入链接数组为空时，直接返回空数组
- 当链接数据缺失关键字段时，使用默认值或跳过该链接
- 当所有链接相关性都很低时，返回质量最高的几个链接

### 3. 性能保护
- 基于实际数据规模（10-50个链接），无需复杂的批处理机制
- 设置合理的AI调用超时时间
- 对于小规模数据，可以一次性处理所有链接

## 测试策略

### 1. 单元测试
- 测试各个评分组件的独立功能
- 测试边界条件和异常情况
- 验证评分算法的数学正确性

### 2. 集成测试
- 测试完整的筛选流程
- 验证AI模型集成的正确性
- 测试不同类型用户提示词的处理效果

### 3. 性能测试
- 测试大量链接输入时的处理性能
- 验证AI调用的响应时间
- 测试内存使用情况

### 4. 场景测试
```typescript
// 测试用例示例
const testCases = [
  {
    prompt: "帮我监控关于前端开发的 Reddit 帖子",
    expectedDomain: "前端开发",
    expectedKeywords: ["前端", "开发", "JavaScript", "React", "Vue"]
  },
  {
    prompt: "关注人工智能和机器学习的最新讨论",
    expectedDomain: "人工智能",
    expectedKeywords: ["AI", "机器学习", "深度学习", "神经网络"]
  }
]
```