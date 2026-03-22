import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BookOpen, FileText, Github, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const navItems = [
  { to: '/about-tmux', label: 'About Tmux', icon: BookOpen },
]

function SidebarNav({ onNavigate }) {
  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      'hover:bg-accent hover:text-accent-foreground',
      isActive
        ? 'border-l-2 border-primary bg-accent/50 text-foreground font-medium'
        : 'border-l-2 border-transparent text-muted-foreground'
    )

  return (
    <div className="flex h-full flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-lg font-semibold text-foreground">tmux-api</span>
      </div>
      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={onNavigate}>
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'border-l-2 border-transparent text-muted-foreground'
          )}
        >
          <FileText className="size-4 shrink-0" />
          <span>API Docs</span>
          <span className="ml-auto text-xs text-muted-foreground">↗</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <a
          href="https://github.com/onchainyaotoshi/tmux-api"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'text-muted-foreground'
          )}
        >
          <Github className="size-4 shrink-0" />
          <span>GitHub</span>
          <span className="ml-auto text-xs text-muted-foreground">↗</span>
        </a>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-border bg-background px-4">
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <span className="ml-2 text-sm font-semibold">tmux-api</span>
        </div>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar-background border-sidebar-border">
          <SidebarNav onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return <SidebarNav />
}
