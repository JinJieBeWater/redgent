import { DataSizeCalculator, DataSizeCalculationError } from './data-size-calculator'

describe('DataSizeCalculator', () => {
  describe('calculateObjectSize', () => {
    it('应该正确计算基础类型的大小', () => {
      expect(DataSizeCalculator.calculateObjectSize(null)).toBe(0)
      expect(DataSizeCalculator.calculateObjectSize(undefined)).toBe(0)
      expect(DataSizeCalculator.calculateObjectSize(true)).toBe(4)
      expect(DataSizeCalculator.calculateObjectSize(42)).toBe(8)
      expect(DataSizeCalculator.calculateObjectSize('hello')).toBe(10) // 5 个字符 * 2 字节
    })

    it('应该正确计算数组的大小', () => {
      const arr = [1, 2, 3]
      const size = DataSizeCalculator.calculateObjectSize(arr)
      expect(size).toBeGreaterThan(24) // 数组开销 + 元素
    })

    it('应该正确计算对象的大小', () => {
      const obj = { name: 'test', age: 25 }
      const size = DataSizeCalculator.calculateObjectSize(obj)
      expect(size).toBeGreaterThan(24) // 对象开销 + 属性
    })

    it('应该正确处理循环引用', () => {
      const obj: any = { name: 'test' }
      obj.self = obj
      
      expect(() => DataSizeCalculator.calculateObjectSize(obj)).not.toThrow()
      const size = DataSizeCalculator.calculateObjectSize(obj)
      expect(size).toBeGreaterThan(0)
    })

    it('应该正确计算 Date 对象的大小', () => {
      const date = new Date()
      const size = DataSizeCalculator.calculateObjectSize(date)
      expect(size).toBe(24)
    })

    it('应该正确计算 RegExp 对象的大小', () => {
      const regex = /test/g
      const size = DataSizeCalculator.calculateObjectSize(regex)
      expect(size).toBeGreaterThan(48)
    })

    it('应该正确计算函数的大小', () => {
      const func = function test() { return 'hello' }
      const size = DataSizeCalculator.calculateObjectSize(func)
      expect(size).toBeGreaterThan(0)
    })
  })

  describe('calculateSerializedSize', () => {
    it('应该正确计算 JSON 序列化后的大小', () => {
      const obj = { name: 'test', age: 25 }
      const size = DataSizeCalculator.calculateSerializedSize(obj)
      expect(size).toBeGreaterThan(0)
    })

    it('应该对不可序列化的对象抛出错误', () => {
      const obj = { func: () => {} }
      expect(() => DataSizeCalculator.calculateSerializedSize(obj))
        .toThrow(DataSizeCalculationError)
    })
  })

  describe('formatBytes', () => {
    it('应该正确格式化字节大小', () => {
      expect(DataSizeCalculator.formatBytes(0)).toBe('0 Bytes')
      expect(DataSizeCalculator.formatBytes(1024)).toBe('1 KB')
      expect(DataSizeCalculator.formatBytes(1048576)).toBe('1 MB')
      expect(DataSizeCalculator.formatBytes(1073741824)).toBe('1 GB')
      expect(DataSizeCalculator.formatBytes(1500)).toBe('1.46 KB')
    })
  })

  describe('calculateArrayStats', () => {
    it('应该正确计算空数组的统计信息', () => {
      const stats = DataSizeCalculator.calculateArrayStats([], 'empty')
      
      expect(stats.count).toBe(0)
      expect(stats.memorySize).toBe(0)
      expect(stats.formattedSize).toBe('0 Bytes')
      expect(stats.averageItemSize).toBe(0)
      expect(stats.dataType).toBe('empty')
      expect(stats.isSampled).toBe(false)
      expect(stats.timestamp).toBeGreaterThan(0)
    })

    it('应该正确计算小数组的统计信息', () => {
      const data = [
        { id: 1, name: 'test1' },
        { id: 2, name: 'test2' },
        { id: 3, name: 'test3' }
      ]
      
      const stats = DataSizeCalculator.calculateArrayStats(data, 'test-objects')
      
      expect(stats.count).toBe(3)
      expect(stats.memorySize).toBeGreaterThan(0)
      expect(stats.formattedSize).toContain('Bytes')
      expect(stats.averageItemSize).toBeGreaterThan(0)
      expect(stats.dataType).toBe('test-objects')
      expect(stats.isSampled).toBe(false)
    })

    it('应该对大数组使用采样计算', () => {
      const largeArray = Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        name: `test${i}`,
        data: 'some data here'
      }))
      
      const stats = DataSizeCalculator.calculateArrayStats(largeArray, 'large-objects')
      
      expect(stats.count).toBe(2000)
      expect(stats.memorySize).toBeGreaterThan(0)
      expect(stats.isSampled).toBe(true)
      expect(stats.averageItemSize).toBeGreaterThan(0)
    })

    it('应该在请求时包含序列化大小', () => {
      const data = [{ id: 1, name: 'test' }]
      const stats = DataSizeCalculator.calculateArrayStats(data, 'test', true)
      
      expect(stats.serializedSize).toBeDefined()
      expect(stats.serializedSize).toBeGreaterThan(0)
    })

    it('默认情况下不应该包含序列化大小', () => {
      const data = [{ id: 1, name: 'test' }]
      const stats = DataSizeCalculator.calculateArrayStats(data, 'test')
      
      expect(stats.serializedSize).toBeUndefined()
    })
  })

  describe('calculateObjectStats', () => {
    it('应该正确计算单个对象的统计信息', () => {
      const obj = { id: 1, name: 'test', active: true }
      const stats = DataSizeCalculator.calculateObjectStats(obj, 'single-object')
      
      expect(stats.count).toBe(1)
      expect(stats.memorySize).toBeGreaterThan(0)
      expect(stats.averageItemSize).toBe(stats.memorySize)
      expect(stats.dataType).toBe('single-object')
      expect(stats.isSampled).toBe(false)
    })

    it('应该在请求时包含序列化大小', () => {
      const obj = { id: 1, name: 'test' }
      const stats = DataSizeCalculator.calculateObjectStats(obj, 'test', true)
      
      expect(stats.serializedSize).toBeDefined()
      expect(stats.serializedSize).toBeGreaterThan(0)
    })
  })

  describe('safeCalculateStats', () => {
    it('应该为有效数据返回统计信息', () => {
      const data = [{ id: 1, name: 'test' }]
      const stats = DataSizeCalculator.safeCalculateStats(data, 'safe-test')
      
      expect(stats).not.toBeNull()
      expect(stats!.count).toBe(1)
      expect(stats!.dataType).toBe('safe-test')
    })

    it('应该为有问题的数据返回降级统计信息', () => {
      // 创建一个可能导致计算问题的对象
      const problematicData = [{ circular: null as any }]
      problematicData[0].circular = problematicData[0]
      
      const stats = DataSizeCalculator.safeCalculateStats(problematicData, 'problematic')
      
      expect(stats).not.toBeNull()
      expect(stats!.count).toBe(1)
      expect(stats!.dataType).toBe('problematic')
    })

    it('应该正确处理单个对象', () => {
      const obj = { id: 1, name: 'test' }
      const stats = DataSizeCalculator.safeCalculateStats(obj, 'single')
      
      expect(stats).not.toBeNull()
      expect(stats!.count).toBe(1)
      expect(stats!.dataType).toBe('single')
    })
  })

  describe('DataSizeCalculationError', () => {
    it('应该创建具有正确属性的错误对象', () => {
      const originalError = new Error('Original error')
      const error = new DataSizeCalculationError('Test error', 'test-type', originalError)
      
      expect(error.name).toBe('DataSizeCalculationError')
      expect(error.message).toBe('Test error')
      expect(error.dataType).toBe('test-type')
      expect(error.originalError).toBe(originalError)
    })
  })
})