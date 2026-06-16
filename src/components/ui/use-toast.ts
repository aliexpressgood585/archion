import { useState, useCallback, useEffect, useRef } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

type ToastInput = Omit<Toast, 'id'>

// Global state for toasts — allows `toast()` to be called outside React
let globalAddToast: ((t: ToastInput) => void) | null = null

export function toast(input: ToastInput) {
  if (globalAddToast) {
    globalAddToast(input)
  } else {
    // Queue until hook mounts
    pendingToasts.push(input)
  }
}

// Convenience wrappers
toast.success = (title: string, description?: string) =>
  toast({ variant: 'success', title, description })
toast.error = (title: string, description?: string) =>
  toast({ variant: 'error', title, description })
toast.info = (title: string, description?: string) =>
  toast({ variant: 'info', title, description })
toast.warning = (title: string, description?: string) =>
  toast({ variant: 'warning', title, description })

const pendingToasts: ToastInput[] = []

const DISMISS_DELAY = 4000

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const addToast = useCallback(
    (input: ToastInput) => {
      const id = Math.random().toString(36).slice(2)
      const newToast: Toast = { ...input, id }
      setToasts((prev) => [...prev, newToast])

      const timer = setTimeout(() => {
        dismiss(id)
      }, DISMISS_DELAY)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  useEffect(() => {
    globalAddToast = addToast

    // Flush any queued toasts
    if (pendingToasts.length > 0) {
      pendingToasts.splice(0).forEach(addToast)
    }

    return () => {
      globalAddToast = null
    }
  }, [addToast])

  // Cleanup timers on unmount
  useEffect(() => {
    const timerMap = timers.current
    return () => {
      timerMap.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  return { toasts, dismiss }
}
