import type { ComponentProps } from 'react'
import { AlertCircle } from 'lucide-react'

// 错误显示组件
export const ErrorMessage = ({
  error,
  ...props
}: ComponentProps<'div'> & {
  error?: {
    message?: string
  } | null
}) => (
  <div className="mt-2.5 flex items-center gap-2" {...props}>
    <AlertCircle className="h-4 w-4" />
    <p>加载失败: {error?.message}</p>
  </div>
)
