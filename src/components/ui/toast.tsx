import { createPortal } from 'react-dom'
import { X, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast, type Toast, type ToastVariant } from './use-toast'

const variantConfig: Record<
  ToastVariant,
  { icon: React.ElementType; iconClass: string; barClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-500',
    barClass: 'bg-green-500',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-500',
    barClass: 'bg-red-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    barClass: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    barClass: 'bg-amber-500',
  },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { icon: Icon, iconClass, barClass } = variantConfig[toast.variant]

  return (
    <div
      className={cn(
        'relative flex w-80 items-start gap-3 overflow-hidden rounded-xl bg-white p-4',
        'shadow-lg border border-slate-200',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Accent bar */}
      <div className={cn('absolute inset-y-0 start-0 w-1 rounded-s-xl', barClass)} />

      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconClass)} />

      <div className="flex-1 min-w-0 ps-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-slate-500">{toast.description}</p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>,
    document.body
  )
}
