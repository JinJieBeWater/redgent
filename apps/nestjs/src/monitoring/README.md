# 监控模块 (Monitoring Module)

数据大小监控模块提供了可配置的数据大小计算和监控功能，支持环境变量配置和运行时调整。

## 功能特性

- 🎛️ **可配置监控级别**：OFF、BASIC、DETAILED 三个级别
- 🌍 **环境变量支持**：支持通过环境变量进行配置
- ⚡ **运行时调整**：支持动态更新监控配置
- 🛡️ **配置验证**：自动验证配置有效性并提供降级策略
- 📊 **性能优化**：支持大数据集采样计算
- 🧪 **完整测试**：22个测试用例，覆盖所有功能场景

## 快速开始

### 1. 导入模块

```typescript
import { Module } from '@nestjs/common'
import { MonitoringModule } from '../monitoring'

@Module({
  imports: [MonitoringModule],
  // ...
})
export class YourModule {}
```

### 2. 注入服务

```typescript
import { Injectable } from '@nestjs/common'
import { MonitoringConfigService } from '../monitoring'

@Injectable()
export class YourService {
  constructor(
    private readonly monitoringConfig: MonitoringConfigService
  ) {}

  async processData(data: any[]) {
    if (this.monitoringConfig.shouldMonitor()) {
      console.log('开始监控数据大小...')
      
      if (this.monitoringConfig.isDetailedMode()) {
        // 详细监控逻辑
      } else {
        // 基础监控逻辑
      }
    }
  }
}
```

## 配置选项

### 监控级别

```typescript
enum MonitoringLevel {
  OFF = 'off',        // 关闭监控
  BASIC = 'basic',    // 基础监控
  DETAILED = 'detailed' // 详细监控
}
```

### 配置接口

```typescript
interface MonitoringConfig {
  level: MonitoringLevel              // 监控级别
  includeSerializedSize: boolean      // 是否包含序列化大小计算
  samplingThreshold: number           // 大数据集采样阈值
  calculationTimeout: number          // 计算超时时间（毫秒）
  enablePerformanceLogging: boolean   // 是否启用性能日志
}
```

### 默认配置

```typescript
const DEFAULT_MONITORING_CONFIG = {
  level: MonitoringLevel.BASIC,
  includeSerializedSize: false,
  samplingThreshold: 1000,
  calculationTimeout: 100,
  enablePerformanceLogging: false
}
```

## 环境变量配置

可以通过以下环境变量来配置监控行为：

```bash
# 监控级别 (off | basic | detailed)
DATA_MONITORING_LEVEL=basic

# 是否包含序列化大小计算 (true | false)
DATA_MONITORING_INCLUDE_SERIALIZED=false

# 采样阈值（数字）
DATA_MONITORING_SAMPLING_THRESHOLD=1000

# 计算超时时间（毫秒）
DATA_MONITORING_TIMEOUT=100

# 性能日志 (true | false)
DATA_MONITORING_PERFORMANCE_LOGGING=false
```

## API 参考

### MonitoringConfigService

#### 基础方法

```typescript
// 获取当前配置
getConfig(): MonitoringConfig

// 更新配置
updateConfig(partialConfig: Partial<MonitoringConfig>): void

// 重新加载环境变量配置
reloadConfig(): void

// 重置为默认配置
resetToDefaults(): void
```

#### 状态检查方法

```typescript
// 检查是否应该进行监控
shouldMonitor(): boolean

// 检查是否为详细监控模式
isDetailedMode(): boolean

// 检查是否应该包含序列化大小
shouldIncludeSerializedSize(): boolean
```

#### 工具方法

```typescript
// 获取配置摘要（用于日志）
getConfigSummary(): string
```

## 使用示例

### 基础使用

```typescript
@Injectable()
export class DataProcessingService {
  constructor(private readonly monitoringConfig: MonitoringConfigService) {}

  async processLargeDataset(data: any[]) {
    // 检查是否需要监控
    if (!this.monitoringConfig.shouldMonitor()) {
      return this.processWithoutMonitoring(data)
    }

    // 根据配置决定监控策略
    const config = this.monitoringConfig.getConfig()
    
    if (data.length > config.samplingThreshold) {
      console.log('数据量较大，使用采样监控')
    }

    if (this.monitoringConfig.shouldIncludeSerializedSize()) {
      console.log('计算序列化大小...')
    }
  }
}
```

### 动态配置调整

```typescript
// 性能优化场景
monitoringConfig.updateConfig({
  level: MonitoringLevel.BASIC,
  includeSerializedSize: false,
  samplingThreshold: 500
})

// 详细分析场景
monitoringConfig.updateConfig({
  level: MonitoringLevel.DETAILED,
  includeSerializedSize: true,
  enablePerformanceLogging: true
})

// 关闭监控
monitoringConfig.updateConfig({
  level: MonitoringLevel.OFF
})
```

### 环境变量重载

```typescript
// 在运行时重新加载环境变量配置
monitoringConfig.reloadConfig()
console.log('新配置:', monitoringConfig.getConfigSummary())
```

## 错误处理

监控配置服务具有完善的错误处理机制：

1. **无效配置自动降级**：无效的配置值会自动使用默认值
2. **详细警告日志**：所有配置问题都会记录警告日志
3. **不中断业务流程**：配置错误不会影响主要业务逻辑

```typescript
// 无效配置会自动降级
monitoringConfig.updateConfig({
  level: 'invalid' as any,  // 会降级为 BASIC
  samplingThreshold: -100   // 会使用默认值 1000
})
```

## 测试

运行监控模块的测试：

```bash
# 运行所有监控相关测试
npm test -- --testPathPattern=monitoring

# 运行特定测试文件
npm test -- monitoring-config.service.spec.ts
```

## 架构设计

监控模块采用了以下设计原则：

- **单一职责**：专注于监控配置管理
- **依赖注入**：通过 NestJS 的 DI 系统提供服务
- **模块化**：独立的模块，可被其他模块导入使用
- **可测试性**：完整的单元测试覆盖
- **可扩展性**：易于添加新的监控功能

## 与其他模块的集成

监控模块设计为通用基础设施，可以被以下模块使用：

- `analysis-task` - 分析任务执行监控
- `analysis-report` - 报告生成监控  
- `reddit` - Reddit 数据获取监控
- 其他需要数据大小监控的模块

## 性能考虑

- **延迟计算**：只在需要时进行监控计算
- **采样策略**：大数据集自动使用采样计算
- **超时控制**：防止监控计算阻塞主流程
- **内存管理**：及时释放临时计算对象