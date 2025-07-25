import { Link } from '@tanstack/react-router'
import { Activity, Plus } from 'lucide-react'

import { ModeToggle } from './mode-toggle'
import { Button } from './ui/button'

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-2">
      {/* 新对话 */}
      <nav>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          asChild
        >
          <Link to="/" aria-label="首页">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </nav>
      {/* 中间显示激活任务数量 */}
      <nav>
        <Button variant="ghost" asChild>
          <Link to="/" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>4 个激活任务</span>
          </Link>
        </Button>
      </nav>
      <ModeToggle />
    </header>
  )
}
