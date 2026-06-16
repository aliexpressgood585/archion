import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
} as const

export interface SpinnerProps {
  size?: keyof typeof sizes
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-blue-600', sizes[size], className)}
      aria-label="Loading"
    />
  )
}
