import { Test, TestingModule } from '@nestjs/testing'
import {
  MonitoringConfigService,
  MonitoringLevel,
  DEFAULT_MONITORING_CONFIG,
  MonitoringConfigError
} from './monitoring-config.service'

describe('MonitoringConfigService', () => {
  let service: MonitoringConfigService
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    // 保存原始环境变量
    originalEnv = { ...process.env }

    // 清理环境变量
    delete process.env.DATA_MONITORING_LEVEL
    delete process.env.DATA_MONITORING_INCLUDE_SERIALIZED
    delete process.env.DATA_MONITORING_SAMPLING_THRESHOLD
    delete process.env.DATA_MONITORING_TIMEOUT
    delete process.env.DATA_MONITORING_PERFORMANCE_LOGGING

    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringConfigService]
    }).compile()

    service = module.get<MonitoringConfigService>(MonitoringConfigService)
  })

  afterEach(() => {
    // 恢复原始环境变量
    Object.keys(process.env).forEach(key => {
      if (!originalEnv.hasOwnProperty(key)) {
        delete process.env[key]
      }
    })
    Object.assign(process.env, originalEnv)
  })

  describe('默认配置', () => {
    it('应该使用默认配置', () => {
      const config = service.getConfig()
      expect(config).toEqual(DEFAULT_MONITORING_CONFIG)
    })

    it('应该正确识别默认监控状态', () => {
      expect(service.shouldMonitor()).toBe(true) // 默认是 BASIC 级别
      expect(service.isDetailedMode()).toBe(false)
      expect(service.shouldIncludeSerializedSize()).toBe(false)
    })
  })

  describe('环境变量配置', () => {
    it('应该从环境变量读取监控级别', async () => {
      process.env.DATA_MONITORING_LEVEL = 'detailed'

      // 重新创建服务实例以加载新的环境变量
      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()
      expect(config.level).toBe(MonitoringLevel.DETAILED)
    })

    it('应该从环境变量读取序列化大小选项', async () => {
      process.env.DATA_MONITORING_INCLUDE_SERIALIZED = 'true'

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()
      expect(config.includeSerializedSize).toBe(true)
    })

    it('应该从环境变量读取采样阈值', async () => {
      process.env.DATA_MONITORING_SAMPLING_THRESHOLD = '2000'

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()
      expect(config.samplingThreshold).toBe(2000)
    })

    it('应该从环境变量读取计算超时时间', async () => {
      process.env.DATA_MONITORING_TIMEOUT = '200'

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()
      expect(config.calculationTimeout).toBe(200)
    })

    it('应该从环境变量读取性能日志选项', async () => {
      process.env.DATA_MONITORING_PERFORMANCE_LOGGING = 'true'

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()
      expect(config.enablePerformanceLogging).toBe(true)
    })
  })

  describe('配置验证', () => {
    it('应该处理无效的监控级别', async () => {
      process.env.DATA_MONITORING_LEVEL = 'invalid'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()

      expect(config.level).toBe(MonitoringLevel.BASIC)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid monitoring level')
      )

      consoleSpy.mockRestore()
    })

    it('应该处理无效的采样阈值', async () => {
      process.env.DATA_MONITORING_SAMPLING_THRESHOLD = 'invalid'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()

      expect(config.samplingThreshold).toBe(DEFAULT_MONITORING_CONFIG.samplingThreshold)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid sampling threshold')
      )

      consoleSpy.mockRestore()
    })

    it('应该处理负数采样阈值', async () => {
      process.env.DATA_MONITORING_SAMPLING_THRESHOLD = '-100'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()

      expect(config.samplingThreshold).toBe(DEFAULT_MONITORING_CONFIG.samplingThreshold)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid sampling threshold')
      )

      consoleSpy.mockRestore()
    })

    it('应该处理无效的超时时间', async () => {
      process.env.DATA_MONITORING_TIMEOUT = 'invalid'
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const module: TestingModule = await Test.createTestingModule({
        providers: [MonitoringConfigService]
      }).compile()

      const newService = module.get<MonitoringConfigService>(MonitoringConfigService)
      const config = newService.getConfig()

      expect(config.calculationTimeout).toBe(DEFAULT_MONITORING_CONFIG.calculationTimeout)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid calculation timeout')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('配置更新', () => {
    it('应该能够更新部分配置', () => {
      service.updateConfig({
        level: MonitoringLevel.DETAILED,
        samplingThreshold: 2000
      })

      const config = service.getConfig()
      expect(config.level).toBe(MonitoringLevel.DETAILED)
      expect(config.samplingThreshold).toBe(2000)
      expect(config.includeSerializedSize).toBe(DEFAULT_MONITORING_CONFIG.includeSerializedSize)
    })

    it('应该验证更新的配置', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      service.updateConfig({
        level: 'invalid' as any,
        samplingThreshold: -100
      })

      const config = service.getConfig()
      expect(config.level).toBe(MonitoringLevel.BASIC)
      expect(config.samplingThreshold).toBe(DEFAULT_MONITORING_CONFIG.samplingThreshold)

      consoleSpy.mockRestore()
    })
  })

  describe('监控状态检查', () => {
    it('shouldMonitor() 在 OFF 级别时应该返回 false', () => {
      service.updateConfig({ level: MonitoringLevel.OFF })
      expect(service.shouldMonitor()).toBe(false)
    })

    it('shouldMonitor() 在 BASIC 级别时应该返回 true', () => {
      service.updateConfig({ level: MonitoringLevel.BASIC })
      expect(service.shouldMonitor()).toBe(true)
    })

    it('shouldMonitor() 在 DETAILED 级别时应该返回 true', () => {
      service.updateConfig({ level: MonitoringLevel.DETAILED })
      expect(service.shouldMonitor()).toBe(true)
    })

    it('isDetailedMode() 只在 DETAILED 级别时返回 true', () => {
      service.updateConfig({ level: MonitoringLevel.OFF })
      expect(service.isDetailedMode()).toBe(false)

      service.updateConfig({ level: MonitoringLevel.BASIC })
      expect(service.isDetailedMode()).toBe(false)

      service.updateConfig({ level: MonitoringLevel.DETAILED })
      expect(service.isDetailedMode()).toBe(true)
    })

    it('shouldIncludeSerializedSize() 应该考虑监控状态和配置', () => {
      // 监控关闭时，即使配置了序列化大小也应该返回 false
      service.updateConfig({
        level: MonitoringLevel.OFF,
        includeSerializedSize: true
      })
      expect(service.shouldIncludeSerializedSize()).toBe(false)

      // 监控开启但未配置序列化大小时应该返回 false
      service.updateConfig({
        level: MonitoringLevel.BASIC,
        includeSerializedSize: false
      })
      expect(service.shouldIncludeSerializedSize()).toBe(false)

      // 监控开启且配置了序列化大小时应该返回 true
      service.updateConfig({
        level: MonitoringLevel.BASIC,
        includeSerializedSize: true
      })
      expect(service.shouldIncludeSerializedSize()).toBe(true)
    })
  })

  describe('配置重载', () => {
    it('应该能够重新加载环境变量配置', () => {
      // 初始配置
      expect(service.getConfig().level).toBe(MonitoringLevel.BASIC)

      // 修改环境变量
      process.env.DATA_MONITORING_LEVEL = 'detailed'

      // 重新加载配置
      service.reloadConfig()

      expect(service.getConfig().level).toBe(MonitoringLevel.DETAILED)
    })
  })

  describe('配置摘要', () => {
    it('应该返回配置的字符串表示', () => {
      const summary = service.getConfigSummary()

      expect(summary).toContain('MonitoringConfig{')
      expect(summary).toContain('level=basic')
      expect(summary).toContain('includeSerializedSize=false')
      expect(summary).toContain('samplingThreshold=1000')
      expect(summary).toContain('timeout=100ms')
      expect(summary).toContain('performanceLogging=false')
    })
  })

  describe('重置配置', () => {
    it('应该能够重置为默认配置', () => {
      // 修改配置
      service.updateConfig({
        level: MonitoringLevel.DETAILED,
        includeSerializedSize: true,
        samplingThreshold: 2000
      })

      // 重置配置
      service.resetToDefaults()

      expect(service.getConfig()).toEqual(DEFAULT_MONITORING_CONFIG)
    })
  })

  describe('错误处理', () => {
    it('应该在配置加载失败时使用默认配置', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      // 设置一个会导致解析错误的环境变量
      process.env.DATA_MONITORING_LEVEL = 'invalid'
      process.env.DATA_MONITORING_SAMPLING_THRESHOLD = 'not-a-number'

      service.reloadConfig()
      const config = service.getConfig()

      // 应该使用默认值而不是无效值
      expect(config.level).toBe(MonitoringLevel.BASIC)
      expect(config.samplingThreshold).toBe(DEFAULT_MONITORING_CONFIG.samplingThreshold)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})