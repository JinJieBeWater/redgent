import type { AppRouter } from '@core/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { createTRPCClient, httpLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import superjson from 'superjson'

import { Spinner } from './components/spinner'
// Import the generated route tree
import { routeTree } from './routeTree.gen'

export const queryClient = new QueryClient()

// @ts-ignore
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      httpLink({
        url: '/api/trpc',
        transformer: superjson,
      }),
    ],
  }),
  queryClient,
})

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    context: {
      trpc,
      queryClient,
    },
    defaultPendingComponent: () => (
      <div className={`p-2 text-2xl`}>
        <Spinner />
      </div>
    ),
    Wrap: function WrapComponent({ children }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    },
  })

  return router
}

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
