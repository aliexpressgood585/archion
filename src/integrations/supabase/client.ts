import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://maggovnwssfqdbaqandv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ2dvdm53c3NmcWRiYXFhbmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Mzc3ODUsImV4cCI6MjA5NzIxMzc4NX0.rjeFRpYJj66o0VrSN4xJGdSviz_BYmmJLjtBDxYi85o'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
