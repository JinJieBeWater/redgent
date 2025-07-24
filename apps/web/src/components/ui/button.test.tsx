import { describe, expect, it } from 'vitest'

import { render, screen } from '@/lib/test-utils'

import { Button } from './button'

describe('Button', () => {
  it('应该渲染基本按钮', () => {
    render(<Button>点击我</Button>)
    const button = screen.getByRole('button', { name: '点击我' })
    expect(button).toBeInTheDocument()
  })

  it('应该应用默认变体样式', () => {
    render(<Button>默认按钮</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button.className).toContain('bg-primary')
  })

  it('应该应用不同的变体', () => {
    const { rerender } = render(<Button variant="destructive">删除</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('bg-destructive')

    rerender(<Button variant="outline">轮廓</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('border')
  })

  it('应该应用不同的尺寸', () => {
    const { rerender } = render(<Button size="sm">小按钮</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('h-8')

    rerender(<Button size="lg">大按钮</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('h-10')
  })

  it('应该支持自定义类名', () => {
    render(<Button className="custom-class">自定义</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })

  it('应该处理禁用状态', () => {
    render(<Button disabled>禁用按钮</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.className).toContain('disabled:opacity-50')
  })

  it('应该支持 asChild 属性渲染为其他元素', () => {
    render(
      <Button asChild>
        <a href="/test">链接按钮</a>
      </Button>,
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test')
    expect(link).toHaveAttribute('data-slot', 'button')
  })

  it('应该传递其他 props', () => {
    render(
      <Button type="submit" id="test-button">
        提交
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('id', 'test-button')
  })
})
