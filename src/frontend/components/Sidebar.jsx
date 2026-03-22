import { NavLink } from 'react-router-dom'
import { TerminalSquare, MonitorPlay, BookOpen, FileText, LogOut, LogIn } from 'lucide-react'
import { auth } from '../lib/auth.js'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const isLoggedIn = auth.isAuthenticated()
  const user = isLoggedIn ? auth.getUser() : null

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 p-4 font-mono text-lg">
        <TerminalSquare className="size-5" />
        foreman
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {isLoggedIn && (
          <>
            <p className="px-3 pt-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Dashboard
            </p>
            <NavLink
              to="/sessions"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground'
                )
              }
            >
              <MonitorPlay className="size-4" />
              Sessions
            </NavLink>
          </>
        )}
        <p className="px-3 pt-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Resources
        </p>
        <NavLink
          to="/knowledge-base"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
              isActive && 'bg-accent text-accent-foreground'
            )
          }
        >
          <BookOpen className="size-4" />
          Knowledge Base
        </NavLink>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <FileText className="size-4" />
          API Docs
        </a>
      </nav>
      <div className="border-t p-4">
        {user && (
          <p className="mb-2 truncate text-xs text-muted-foreground">{user.email}</p>
        )}
        {isLoggedIn ? (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.logout()}>
            <LogOut className="size-4" />
            Logout
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.login()}>
            <LogIn className="size-4" />
            Login
          </Button>
        )}
      </div>
    </aside>
  )
}
