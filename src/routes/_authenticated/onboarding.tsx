import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/integrations/supabase/client'
import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.organization_id) {
      navigate({ to: '/dashboard' })
    }
  }, [profile, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim() || !user) return

    setSaving(true)
    setError(null)

    const slug = `org-${Math.random().toString(36).slice(2, 9)}`

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName.trim(), slug, owner_id: user.id, settings: {} })
      .select()
      .single()

    if (orgError || !org) {
      setError('שגיאה ביצירת הארגון. נסה שוב.')
      setSaving(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ organization_id: org.id })
      .eq('id', user.id)

    if (profileError) {
      setError('שגיאה בעדכון הפרופיל. נסה שוב.')
      setSaving(false)
      return
    }

    // Full reload so auth context re-fetches profile with the new org
    window.location.href = '/'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Archion</h1>
          <p className="text-slate-400 mt-1 text-sm">פלטפורמת ניהול למשרדי אדריכלות</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-2 text-center">ברוך הבא!</h2>
          <p className="text-slate-400 text-sm text-center mb-6">
            צור את המשרד שלך כדי להתחיל לעבוד
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">שם המשרד</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="משרד אדריכלים כהן ושות׳"
                autoFocus
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving || !orgName.trim()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition mt-2"
            >
              {saving ? 'יוצר...' : 'צור משרד והתחל'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
