/**
 * 数据大小计算工具类
 * 提供对象大小计算、格式化和统计功能
 */

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

export class DataSizeCalculationError extends Error {
  constructor(
    message: string,
    public readonly dataType: string,
    public readonly originalError?: Error,
  ) {
    super(message)
    this.name = 'DataSizeCalculationError'
  }
}

export class DataSizeCalculator {
  private static readonly SAMPLING_THRESHOLD = 1000

  /**
   * 计算对象的内存大小（字节）
   * 处理循环引用和复杂对象结构
   */
  static calculateObjectSize(obj: any, visited = new WeakSet()): number {
    if (obj === null || obj === undefined) {
      return 0
    }

    // 处理循环引用
    if (typeof obj === 'object' && visited.has(obj)) {
      return 0
    }

    let size = 0

    switch (typeof obj) {
      case 'boolean':
        size = 4
        break
      case 'number':
        size = 8
        break
      case 'string':
        size = obj.length * 2 // UTF-16 encoding
        break
      case 'object':
        if (visited.has(obj)) {
          return 0
        }
        visited.add(obj)

        if (Array.isArray(obj)) {
          size = 24 // Array overhead
          for (const item of obj) {
            size += this.calculateObjectSize(item, visited)
          }
        } else if (obj instanceof Date) {
          size = 24
        } else if (obj instanceof RegExp) {
          size = 48 + obj.source.length * 2
        } else {
          size = 24 // Object overhead
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              size += key.length * 2 // Key size
              size += this.calculateObjectSize(obj[key], visited)
            }
          }
        }
        break
      case 'function':
        size = obj.toString().length * 2
        break
      default:
        size = 0
    }

    return size
  }

  /**
   * 计算JSON序列化后的大小
   */
  static calculateSerializedSize(obj: any): number {
    try {
      const jsonString = JSON.stringify(obj, (_, value) => {
        if (typeof value === 'function') {
          throw new Error('Cannot serialize functions')
        }
        return value
      })
      return new Blob([jsonString]).size
    } catch (error) {
      throw new DataSizeCalculationError(
        'Failed to calculate serialized size',
        typeof obj,
        error as Error,
      )
    }
  }

  /**
   * 格式化字节大小为可读格式
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 计算数组中对象的统计信息
   */
  static calculateArrayStats<T>(
    array: T[],
    dataType: string = 'unknown',
    includeSerializedSize: boolean = false,
  ): DataSizeStats {
    const startTime = Date.now()
    const count = array.length

    if (count === 0) {
      return {
        dataType,
        count: 0,
        memorySize: 0,
        serializedSize: includeSerializedSize ? 0 : undefined,
        formattedSize: '0 Bytes',
        averageItemSize: 0,
        timestamp: startTime,
        isSampled: false,
      }
    }

    let isSampled = false
    let sampleArray = array

    // 如果数据量过大，使用采样计算
    if (count > this.SAMPLING_THRESHOLD) {
      isSampled = true
      const sampleSize = Math.min(100, Math.max(10, Math.floor(count * 0.1)))
      sampleArray = this.getSampleArray(array, sampleSize)
    }

    try {
      // 计算内存大小
      let totalMemorySize = 0
      for (const item of sampleArray) {
        totalMemorySize += this.calculateObjectSize(item)
      }

      // 如果是采样计算，推算总体大小
      const memorySize = isSampled
        ? Math.round((totalMemorySize / sampleArray.length) * count)
        : totalMemorySize

      // 计算序列化大小（如果需要）
      let serializedSize: number | undefined
      if (includeSerializedSize) {
        if (isSampled) {
          // 采样计算序列化大小
          const sampleSerializedSize = this.calculateSerializedSize(sampleArray)
          serializedSize = Math.round(
            (sampleSerializedSize / sampleArray.length) * count,
          )
        } else {
          serializedSize = this.calculateSerializedSize(array)
        }
      }

      const averageItemSize = Math.round(memorySize / count)

      return {
        dataType,
        count,
        memorySize,
        serializedSize,
        formattedSize: this.formatBytes(memorySize),
        averageItemSize,
        timestamp: startTime,
        isSampled,
      }
    } catch (error) {
      throw new DataSizeCalculationError(
        `Failed to calculate array stats for ${dataType}`,
        dataType,
        error as Error,
      )
    }
  }

  /**
   * 获取数组的随机采样
   */
  private static getSampleArray<T>(array: T[], sampleSize: number): T[] {
    const sample: T[] = []
    const step = Math.floor(array.length / sampleSize)

    for (let i = 0; i < array.length && sample.length < sampleSize; i += step) {
      sample.push(array[i])
    }

    return sample
  }

  /**
   * 计算单个对象的统计信息
   */
  static calculateObjectStats(
    obj: any,
    dataType: string = 'object',
    includeSerializedSize: boolean = false,
  ): DataSizeStats {
    const startTime = Date.now()

    try {
      const memorySize = this.calculateObjectSize(obj)
      const serializedSize = includeSerializedSize
        ? this.calculateSerializedSize(obj)
        : undefined

      return {
        dataType,
        count: 1,
        memorySize,
        serializedSize,
        formattedSize: this.formatBytes(memorySize),
        averageItemSize: memorySize,
        timestamp: startTime,
        isSampled: false,
      }
    } catch (error) {
      throw new DataSizeCalculationError(
        `Failed to calculate object stats for ${dataType}`,
        dataType,
        error as Error,
      )
    }
  }

  /**
   * 安全的数据大小计算，包含超时和错误处理
   */
  static safeCalculateStats<T>(
    data: T[] | T,
    dataType: string = 'unknown',
    includeSerializedSize: boolean = false,
  ): DataSizeStats | null {
    try {
      return Array.isArray(data)
        ? this.calculateArrayStats(data, dataType, includeSerializedSize)
        : this.calculateObjectStats(data, dataType, includeSerializedSize)
    } catch (error) {
      console.warn(`Data size calculation failed for ${dataType}:`, error)

      // 返回基础统计信息作为降级处理
      const count = Array.isArray(data) ? data.length : 1
      return {
        dataType,
        count,
        memorySize: 0,
        serializedSize: includeSerializedSize ? 0 : undefined,
        formattedSize: 'Unknown',
        averageItemSize: 0,
        timestamp: Date.now(),
        isSampled: false,
      }
    }
  }
}
