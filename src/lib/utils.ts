import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date, locale = 'he-IL') {
  // Date-only strings (YYYY-MM-DD) parse as UTC midnight which shifts the day in UTC+2.
  // Appending T12:00:00 forces local-noon parsing so the displayed date is always correct.
  const d = typeof date === 'string' && !date.includes('T')
    ? new Date(date + 'T12:00:00')
    : new Date(date)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
