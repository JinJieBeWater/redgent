# 数据大小监控设计文档

## 概述

数据大小监控功能将集成到现有的分析任务执行流程中，通过在关键数据处理节点添加大小计算和报告机制，为开发者提供详细的数据流转信息。该功能设计为可配置、高性能且不影响现有业务逻辑的监控解决方案。

## 架构

### 核心组件

1. **DataSizeCalculator** - 数据大小计算工具类
2. **DataSizeMonitor** - 监控服务，集成到 AnalysisTaskExecutionService
3. **TaskProgress 类型扩展** - 扩展现有 Progress 接口的 data 字段
4. **MonitoringConfig** - 监控配置接口

### 集成策略

监控功能将通过扩展现有的 TaskProgress 类型来实现，具体在以下节点添加数据大小信息：

- **FETCH_COMPLETE** - 在现有的 `{ count: links.length }` 基础上添加数据大小
- **FILTER_COMPLETE** - 在现有的 `{ originalCount, uniqueCount }` 基础上添加过滤前后的数据大小对比
- **SELECT_COMPLETE** - 在现有的 `{ originalCount, uniqueCount }` 基础上添加筛选后的数据大小
- **FETCH_CONTENT_COMPLETE** - 添加完整内容数据的大小信息
- **ANALYZE_COMPLETE** - 添加AI分析结果的数据大小信息

### 实现原理

利用现有的 RxJS Observable 流机制，在每个 `subscriber.next()` 调用中扩展 `data` 字段来包含数据大小信息，无需修改基础架构。

## 组件和接口

### 1. DataSizeCalculator 工具类

```typescript
export class DataSizeCalculator {
  /**
   * 计算对象的内存大小（字节）
   */
  static calculateObjectSize(obj: any): number

  /**
   * 计算JSON序列化后的大小
   */
  static calculateSerializedSize(obj: any): number

  /**
   * 格式化字节大小为可读格式
   */
  static formatBytes(bytes: number): string

  /**
   * 计算数组中对象的统计信息
   */
  static calculateArrayStats<T>(array: T[]): DataSizeStats
}
```

### 2. 监控配置接口

```typescript
export interface MonitoringConfig {
  /** 监控级别：'off' | 'basic' | 'detailed' */
  level: 'off' | 'basic' | 'detailed'
  /** 是否包含序列化大小 */
  includeSerializedSize: boolean
  /** 大数据集采样阈值 */
  samplingThreshold: number
}

export interface DataSizeInfo {
  /** 对象数量 */
  count: number
  /** 内存大小（字节） */
  memorySize: number
  /** 序列化大小（字节） */
  serializedSize?: number
  /** 格式化的大小字符串 */
  formattedSize: string
  /** 平均单个对象大小 */
  averageItemSize: number
}

export interface DataSizeStats extends DataSizeInfo {
  /** 数据类型描述 */
  dataType: string
  /** 计算时间戳 */
  timestamp: number
  /** 是否为采样计算 */
  isSampled: boolean
}
```

### 3. TaskProgress 类型扩展

```typescript
// 扩展现有的 Progress 接口的 data 字段
export interface FetchCompleteProgressWithSize extends FetchCompleteProgress {
  data: {
    count: number
    dataSizeInfo: DataSizeStats
  }
}

export interface FilterCompleteProgressWithSize extends FilterCompleteProgress {
  data: {
    originalCount: number
    uniqueCount: number
    dataSizeInfo: {
      beforeFilter: DataSizeStats
      afterFilter: DataSizeStats
    }
  }
}

export interface SelectCompleteProgressWithSize extends SelectCompleteProgress {
  data: {
    originalCount: number
    uniqueCount: number
    dataSizeInfo: DataSizeStats
  }
}

export interface FetchContentCompleteProgressWithSize extends FetchContentCompleteProgress {
  data: {
    dataSizeInfo: DataSizeStats
  }
}

export interface AnalyzeCompleteProgressWithSize extends AnalyzeCompleteProgress {
  data: {
    dataSizeInfo: DataSizeStats
  }
}
```

### 4. DataSizeMonitor 服务类

```typescript
@Injectable()
export class DataSizeMonitor {
  constructor(private config: MonitoringConfig) {}

  /**
   * 监控数据并返回大小信息
   */
  monitorData<T>(data: T[], dataType: string): DataSizeStats | null

  /**
   * 创建带有数据大小信息的进度报告
   */
  createProgressWithSize<P extends BaseProgress>(
    progress: P,
    data: any[],
    dataType: string
  ): P & { dataSizeInfo?: DataSizeStats }

  /**
   * 检查是否应该进行监控
   */
  shouldMonitor(): boolean
}
```

## 数据模型

### 监控数据结构

数据大小监控信息将直接嵌入到现有的 TaskProgress 对象中，不需要额外的会话管理或复杂的数据结构。每个阶段的数据大小信息都通过扩展相应的 Progress 接口的 `data` 字段来传递。

```typescript
// 数据大小统计的核心结构
export interface DataSizeStats {
  /** 数据类型描述 */
  dataType: string
  /** 对象数量 */
  count: number
  /** 内存大小（字节） */
  memorySize: number
  /** 序列化大小（字节） */
  serializedSize?: number
  /** 格式化的大小字符串 */
  formattedSize: string
  /** 平均单个对象大小 */
  averageItemSize: number
  /** 计算时间戳 */
  timestamp: number
  /** 是否为采样计算 */
  isSampled: boolean
}
```

## 错误处理

### 错误类型定义

```typescript
export class DataSizeCalculationError extends Error {
  constructor(
    message: string,
    public readonly dataType: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'DataSizeCalculationError'
  }
}
```

### 错误处理策略

1. **计算失败时的降级处理**
   - 记录错误日志但不中断主流程
   - 返回基础统计信息（如对象数量）
   - 设置错误标记以便后续分析

2. **性能异常处理**
   - 设置计算超时机制（默认100ms）
   - 超时时自动切换到采样模式
   - 记录性能警告日志

3. **内存不足处理**
   - 检测可用内存状态
   - 自动启用采样计算
   - 提供内存使用警告

## 测试策略

### 单元测试

1. **DataSizeCalculator 测试**
   ```typescript
   describe('DataSizeCalculator', () => {
     it('should calculate object size correctly')
     it('should handle circular references')
     it('should format bytes properly')
     it('should calculate array statistics')
   })
   ```

2. **DataSizeMonitor 测试**
   ```typescript
   describe('DataSizeMonitor', () => {
     it('should respect monitoring configuration')
     it('should handle large datasets with sampling')
     it('should integrate with TaskProgress correctly')
   })
   ```

### 集成测试

1. **端到端监控测试**
   - 模拟完整的任务执行流程
   - 验证各阶段数据大小记录的准确性
   - 测试不同监控级别的行为差异

2. **性能测试**
   - 测试监控功能对任务执行时间的影响
   - 验证大数据集处理的性能表现
   - 测试内存使用情况

### 测试数据

```typescript
// 测试用的模拟数据
export const mockRedditLinks: RedditLinkInfoUntrusted[] = [
  {
    id: 'test1',
    title: 'Test Post 1',
    author: 'testuser1',
    author_fullname: 't2_testuser1',
    created_utc: 1640995200,
    subreddit: 'testsubreddit',
    subreddit_name_prefixed: 'r/testsubreddit',
    subreddit_subscribers: 10000,
    url: 'https://example.com/test1',
    is_video: false,
    over_18: false,
    permalink: '/r/testsubreddit/comments/test1/',
    score: 100,
    num_comments: 25,
    upvote_ratio: 0.95,
    num_crossposts: 0,
    thumbnail: 'default',
    archived: false,
    locked: false
  },
  // ... 更多测试数据
]

export const mockAnalysisResult = {
  summary: 'Test analysis summary',
  insights: ['Insight 1', 'Insight 2'],
  recommendations: ['Recommendation 1']
}
```

## 实现细节

### 大小计算算法

1. **内存大小计算**
   - 使用递归遍历对象属性
   - 处理循环引用问题
   - 考虑JavaScript对象的内存开销

2. **序列化大小计算**
   - 使用JSON.stringify计算字符串长度
   - 支持自定义序列化函数
   - 处理不可序列化的对象

3. **采样策略**
   - 当数据量超过阈值时启用采样
   - 使用随机采样或系统采样
   - 根据采样结果推算总体大小

### 性能优化

1. **延迟计算**
   - 只在需要时进行大小计算
   - 缓存计算结果避免重复计算

2. **异步处理**
   - 大数据集计算使用Worker线程
   - 避免阻塞主线程执行

3. **内存管理**
   - 及时释放临时计算对象
   - 监控内存使用情况

### 配置管理

```typescript
// 默认配置
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  level: 'basic',
  includeSerializedSize: false,
  samplingThreshold: 1000
}

// 环境变量配置
export const getMonitoringConfigFromEnv = (): MonitoringConfig => {
  return {
    level: (process.env.DATA_MONITORING_LEVEL as any) || 'basic',
    includeSerializedSize: process.env.INCLUDE_SERIALIZED_SIZE === 'true',
    samplingThreshold: parseInt(process.env.SAMPLING_THRESHOLD || '1000')
  }
}
```