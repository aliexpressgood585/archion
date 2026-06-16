import { cn, getInitials } from '@/lib/utils'
import { useState } from 'react'

const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-16 w-16 text-xl',
} as const

export interface AvatarProps {
  src?: string | null
  name?: string
  size?: keyof typeof sizes
  className?: string
}

export function Avatar({ src, name = '', size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name || '?')

  const baseClasses = cn(
    'inline-flex shrink-0 items-center justify-center rounded-full',
    'font-semibold select-none overflow-hidden',
    sizes[size],
    className
  )

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn(baseClasses, 'object-cover')}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <span className={cn(baseClasses, 'bg-blue-100 text-blue-700')}>
      {initials}
    </span>
  )
}
