import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { ThemeProvider } from '@/components/theme-provider'

import Header from '../components/Header'

export const Route = createRootRoute({
  component: () => (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Header />

        <Outlet />
        <TanStackRouterDevtools />
      </ThemeProvider>
    </>
  ),
})
