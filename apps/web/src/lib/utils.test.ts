import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('utils', () => {
  describe('cn function', () => {
    it('应该合并类名', () => {
      const result = cn('bg-red-500', 'text-white')
      expect(result).toContain('bg-red-500')
      expect(result).toContain('text-white')
    })

    it('应该处理条件性类名', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
    })

    it('应该处理 Tailwind 冲突类名', () => {
      const result = cn('px-4', 'px-6')
      // twMerge 应该保留最后一个冲突的类
      expect(result).toContain('px-6')
      expect(result).not.toContain('px-4')
    })

    it('应该过滤掉假值', () => {
      const result = cn('valid-class', false, null, undefined, '')
      expect(result).toBe('valid-class')
    })

    it('应该处理数组输入', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })
  })
})
