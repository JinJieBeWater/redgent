import type { AppRouter } from '@core/shared'
import type { QueryClient } from '@tanstack/react-query'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '@web/components/app-header'
import { Toaster } from '@web/components/ui/sonner'

export interface RouterAppContext {
  // @ts-ignore
  trpc: TRPCOptionsProxy<AppRouter>
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
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
    </>
  )
}
