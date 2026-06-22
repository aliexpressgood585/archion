import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/lib/i18n-context'
import { routeTree } from './routeTree.gen'
import '@/index.css'

const hashHistory = createHashHistory()
const router = createRouter({ routeTree, history: hashHistory })
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">שגיאה בלתי צפויה</h1>
          <p className="text-slate-500 text-sm mb-6">{(this.state.error as Error).message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            טען מחדש
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
)
