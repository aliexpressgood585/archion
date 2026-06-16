import { createFileRoute, useNavigate, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'

function AuthenticatedLayout() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate({ to: '/auth/login' })
      return
    }
    if (profile && !profile.organization_id) {
      navigate({ to: '/onboarding' })
    }
  }, [session, profile, loading, navigate])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return null

  // New user with no org → render the onboarding page without the sidebar
  if (profile && !profile.organization_id) {
    return <Outlet />
  }

  return <AppLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})
