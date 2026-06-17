import { createFileRoute, useNavigate, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'

const AUTH_KEY = 'archion_auth_enabled'
export const isAuthBypassed = () => localStorage.getItem(AUTH_KEY) !== 'true'
export const toggleAuthBypass = () => {
  const current = localStorage.getItem(AUTH_KEY) === 'true'
  localStorage.setItem(AUTH_KEY, String(!current))
  window.location.reload()
}

function AuthenticatedLayout() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const bypassed = isAuthBypassed()

  useEffect(() => {
    if (bypassed) return
    if (loading) return
    if (!session) {
      navigate({ to: '/auth/login' })
      return
    }
    if (profile && !profile.organization_id) {
      navigate({ to: '/onboarding' })
    }
  }, [session, profile, loading, navigate, bypassed])

  if (!bypassed) {
    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <Spinner size="lg" />
        </div>
      )
    }
    if (!session) return null
    if (profile && !profile.organization_id) {
      return <Outlet />
    }
  }

  return <AppLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})
