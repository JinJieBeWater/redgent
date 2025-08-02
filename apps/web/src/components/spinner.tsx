import type { ComponentProps } from 'react'
import { Loader2 } from 'lucide-react'

export function Spinner({ ...props }: ComponentProps<'svg'>) {
  return <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" {...props} />
}
