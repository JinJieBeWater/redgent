/* eslint-disable */
import { Injectable } from '@nestjs/common'

/**
 * 监控级别枚举
 */
export enum MonitoringLevel {
  /** 关闭监控 */
  OFF = 'off',
  /** 基础监控 - 只记录关键阶段的数据大小 */
  BASIC = 'basic',
  /** 详细监控 - 记录所有阶段的数据大小和变化 */
  DETAILED = 'detailed',
}

/**
 * 监控配置接口
 */
export interface MonitoringConfig {
  /** 监控级别 */
  level: MonitoringLevel
  /** 是否包含序列化大小计算 */
  includeSerializedSize: boolean
  /** 大数据集采样阈值 */
  samplingThreshold: number
  /** 计算超时时间（毫秒） */
  calculationTimeout: number
  /** 是否启用性能日志 */
  enablePerformanceLogging: boolean
}

/**
 * 配置验证错误类
 */
export class MonitoringConfigError extends Error {
  constructor(
    message: string,
    public readonly invalidValue?: any,
  ) {
    super(message)
    this.name = 'MonitoringConfigError'
  }
}

/**
 * 默认监控配置
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  level: MonitoringLevel.BASIC,
  includeSerializedSize: false,
  samplingThreshold: 1000,
  calculationTimeout: 100,
  enablePerformanceLogging: false,
}

/**
 * 监控配置服务
 * 提供监控配置管理功能，支持环境变量配置和运行时调整
 */
@Injectable()
export class MonitoringConfigService {
  private config: MonitoringConfig

  constructor() {
    this.config = this.loadConfiguration()
  }

  /**
   * 获取当前配置
   */
  getConfig(): MonitoringConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(partialConfig: Partial<MonitoringConfig>): void {
    const newConfig = { ...this.config, ...partialConfig }
    this.config = this.validateConfig(newConfig)
  }

  /**
   * 重新加载配置（从环境变量）
   */
  reloadConfig(): void {
    this.config = this.loadConfiguration()
  }

  /**
   * 检查是否应该进行监控
   */
  shouldMonitor(): boolean {
    return this.config.level !== MonitoringLevel.OFF
  }

  /**
   * 检查是否为详细监控模式
   */
  isDetailedMode(): boolean {
    return this.config.level === MonitoringLevel.DETAILED
  }

  /**
   * 检查是否应该包含序列化大小
   */
  shouldIncludeSerializedSize(): boolean {
    return this.config.includeSerializedSize && this.shouldMonitor()
  }

  /**
   * 获取配置的字符串表示（用于日志）
   */
  getConfigSummary(): string {
    const config = this.getConfig()
    return `MonitoringConfig{level=${config.level}, includeSerializedSize=${config.includeSerializedSize}, samplingThreshold=${config.samplingThreshold}, timeout=${config.calculationTimeout}ms, performanceLogging=${config.enablePerformanceLogging}}`
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_MONITORING_CONFIG }
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfiguration(): MonitoringConfig {
    try {
      const envConfig = this.getConfigFromEnvironment()
      const mergedConfig = { ...DEFAULT_MONITORING_CONFIG, ...envConfig }
      return this.validateConfig(mergedConfig)
    } catch (error) {
      console.warn(
        'Failed to load monitoring configuration, using defaults:',
        error,
      )
      return { ...DEFAULT_MONITORING_CONFIG }
    }
  }

  /**
   * 从环境变量读取配置
   */
  private getConfigFromEnvironment(): Partial<MonitoringConfig> {
    const config: Partial<MonitoringConfig> = {}

    // 监控级别
    const levelEnv = process.env.DATA_MONITORING_LEVEL?.toLowerCase()
    if (levelEnv) {
      if (
        Object.values(MonitoringLevel).includes(levelEnv as MonitoringLevel)
      ) {
        config.level = levelEnv as MonitoringLevel
      } else {
        console.warn(`Invalid monitoring level: ${levelEnv}, using default`)
      }
    }

    // 是否包含序列化大小
    const includeSerializedEnv = process.env.DATA_MONITORING_INCLUDE_SERIALIZED
    if (includeSerializedEnv !== undefined) {
      config.includeSerializedSize =
        includeSerializedEnv.toLowerCase() === 'true'
    }

    // 采样阈值
    const samplingThresholdEnv = process.env.DATA_MONITORING_SAMPLING_THRESHOLD
    if (samplingThresholdEnv) {
      const threshold = parseInt(samplingThresholdEnv, 10)
      if (!isNaN(threshold) && threshold > 0) {
        config.samplingThreshold = threshold
      } else {
        console.warn(
          `Invalid sampling threshold: ${samplingThresholdEnv}, using default`,
        )
      }
    }

    // 计算超时时间
    const timeoutEnv = process.env.DATA_MONITORING_TIMEOUT
    if (timeoutEnv) {
      const timeout = parseInt(timeoutEnv, 10)
      if (!isNaN(timeout) && timeout > 0) {
        config.calculationTimeout = timeout
      } else {
        console.warn(
          `Invalid calculation timeout: ${timeoutEnv}, using default`,
        )
      }
    }

    // 性能日志
    const performanceLoggingEnv =
      process.env.DATA_MONITORING_PERFORMANCE_LOGGING
    if (performanceLoggingEnv !== undefined) {
      config.enablePerformanceLogging =
        performanceLoggingEnv.toLowerCase() === 'true'
    }

    return config
  }

  /**
   * 验证配置的有效性
   */
  private validateConfig(config: MonitoringConfig): MonitoringConfig {
    const validatedConfig = { ...config }

    // 验证监控级别
    if (!Object.values(MonitoringLevel).includes(config.level)) {
      console.warn(
        `Invalid monitoring level: ${config.level}, falling back to basic`,
      )
      validatedConfig.level = MonitoringLevel.BASIC
    }

    // 验证采样阈值
    if (
      !Number.isInteger(config.samplingThreshold) ||
      config.samplingThreshold <= 0
    ) {
      console.warn(
        `Invalid sampling threshold: ${config.samplingThreshold}, using default`,
      )
      validatedConfig.samplingThreshold =
        DEFAULT_MONITORING_CONFIG.samplingThreshold
    }

    // 验证计算超时时间
    if (
      !Number.isInteger(config.calculationTimeout) ||
      config.calculationTimeout <= 0
    ) {
      console.warn(
        `Invalid calculation timeout: ${config.calculationTimeout}, using default`,
      )
      validatedConfig.calculationTimeout =
        DEFAULT_MONITORING_CONFIG.calculationTimeout
    }

    // 验证布尔值
    if (typeof config.includeSerializedSize !== 'boolean') {
      console.warn(`Invalid includeSerializedSize value, using default`)
      validatedConfig.includeSerializedSize =
        DEFAULT_MONITORING_CONFIG.includeSerializedSize
    }

    if (typeof config.enablePerformanceLogging !== 'boolean') {
      console.warn(`Invalid enablePerformanceLogging value, using default`)
      validatedConfig.enablePerformanceLogging =
        DEFAULT_MONITORING_CONFIG.enablePerformanceLogging
    }

    return validatedConfig
  }
}
