import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  TerminalSquare,
  MonitorPlay,
  BookOpen,
  FileText,
  LogOut,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/use-sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

function SidebarNav({ collapsed, onNavigate, onToggle }) {
  const isLoggedIn = auth.isAuthenticated()
  const user = isLoggedIn ? auth.getUser() : null

  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      'hover:bg-accent/50 hover:text-accent-foreground',
      isActive && 'border-l-[3px] border-primary text-primary bg-accent/30',
      !isActive && 'border-l-[3px] border-transparent text-sidebar-foreground',
      collapsed && 'justify-center px-2'
    )

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-sidebar-border bg-sidebar-background',
          !collapsed && 'w-56',
          collapsed && 'w-16'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-2 p-4', collapsed && 'justify-center p-3')}>
          <TerminalSquare className="size-5 shrink-0 text-primary" />
          {!collapsed && (
            <span className="font-mono text-lg text-primary">
              foreman<span className="animate-blink">█</span>
            </span>
          )}
        </div>
        <Separator className="bg-sidebar-border" />

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {isLoggedIn && (
            <>
              {!collapsed && (
                <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60">
                  # dashboard
                </p>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink to="/sessions" className={linkClass} onClick={onNavigate}>
                    <MonitorPlay className="size-4 shrink-0" />
                    {!collapsed && <span>&gt; Sessions</span>}
                  </NavLink>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">Sessions</TooltipContent>}
              </Tooltip>
            </>
          )}

          {!collapsed && (
            <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60">
              # resources
            </p>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/knowledge-base" className={linkClass} onClick={onNavigate}>
                <BookOpen className="size-4 shrink-0" />
                {!collapsed && <span>&gt; About Tmux</span>}
              </NavLink>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">About Tmux</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent/50 hover:text-accent-foreground',
                  'border-l-[3px] border-transparent text-sidebar-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <FileText className="size-4 shrink-0" />
                {!collapsed && <span>API Docs ↗</span>}
              </a>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">API Docs</TooltipContent>}
          </Tooltip>
        </nav>

        {/* Auth area */}
        <div className="border-t border-sidebar-border p-3">
          {user && !collapsed && (
            <p className="mb-2 truncate font-mono text-xs text-sidebar-foreground">
              <span className="text-primary">user@foreman</span> ~$
            </p>
          )}
          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-sidebar-foreground hover:text-primary',
                collapsed && 'px-2'
              )}
              onClick={() => auth.logout()}
            >
              <LogOut className="size-4 shrink-0" />
              {!collapsed && <span>logout</span>}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-sidebar-foreground hover:text-primary',
                collapsed && 'px-2'
              )}
              onClick={() => auth.login()}
            >
              <LogIn className="size-4 shrink-0" />
              {!collapsed && <span>login</span>}
            </Button>
          )}
        </div>

        {/* Collapse toggle (desktop only, passed via prop) */}
        {onToggle && (
          <div className="border-t border-sidebar-border p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className={cn('w-full text-sidebar-foreground hover:text-primary', collapsed && 'px-2')}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  const { collapsed, toggle } = useSidebar()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <div className="fixed inset-x-0 top-0 z-50 flex h-12 items-center border-b border-sidebar-border bg-sidebar-background px-3">
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <span className="ml-2 font-mono text-sm text-primary">
            foreman<span className="animate-blink">█</span>
          </span>
        </div>
        <SheetContent side="left" className="w-56 p-0 bg-sidebar-background border-sidebar-border">
          <SidebarNav collapsed={false} onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={cn(
        'fixed inset-y-0 left-0 z-50 transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <SidebarNav collapsed={collapsed} onToggle={toggle} />
    </div>
  )
}
