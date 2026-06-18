import { useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { BottomNav } from './bottom-nav'
import { Toaster } from '@/components/ui/toast'

export interface AppLayoutProps {
  title?: string
}

export function AppLayout({ title }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar — fixed left, hidden on mobile */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <div className="relative z-10">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <Topbar
          title={title}
          onMenuToggle={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Page content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto',
            // Extra bottom padding on mobile for the bottom nav
            'pb-20 md:pb-0',
            'px-4 py-6 lg:px-8'
          )}
        >
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
