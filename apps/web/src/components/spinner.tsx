import type { ComponentProps } from 'react'
import { Loader2 } from 'lucide-react'

export function Spinner({ ...props }: ComponentProps<'svg'>) {
  return <Loader2 className="h-4 w-4 animate-spin" {...props} />
}
