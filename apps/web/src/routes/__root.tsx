import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Header from '@/components/app-header'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRoute({
  component: () => (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className="flex min-h-screen flex-col">
          {/* 固定在顶部的 Header */}
          <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 z-50 w-full backdrop-blur">
            <Header />
          </div>

          {/* 主要内容区域，增加顶部间距以避免被固定的 Header 遮挡 */}
          <main className="flex-1 pt-12">
            <Outlet />
          </main>
        </div>
        <Toaster position="top-center" />
        <TanStackRouterDevtools />
      </ThemeProvider>
    </>
  ),
})
