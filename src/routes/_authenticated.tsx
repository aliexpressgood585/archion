import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'

function AuthenticatedLayout() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/auth/login' })
    }
  }, [session, loading, navigate])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) return null

  return <AppLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})
