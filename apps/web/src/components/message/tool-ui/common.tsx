import type { ComponentProps } from 'react'
import { Spinner } from '@web/components/spinner'
import { AlertCircle } from 'lucide-react'

/** loading 状态的消息组件 */
export const LoadingMessage = ({
  message = '加载中',
  ...props
}: ComponentProps<'div'> & {
  message?: string
}) => (
  <div className="mt-2.5 flex items-center gap-2" {...props}>
    <Spinner />
    <p>{message}</p>
  </div>
)

/**
 * 错误显示组件
 * @param error 错误信息
 * @param props 额外的属性
 * @returns 错误消息组件
 */
export const ErrorMessage = ({
  error,
  ...props
}: ComponentProps<'div'> & {
  error?: {
    message?: string
  } | null
}) => (
  <div className="mt-2.5 flex items-center gap-2" {...props}>
    <AlertCircle className="h-4 w-4 shrink-0" />
    <p>加载失败: {error?.message}</p>
  </div>
)
