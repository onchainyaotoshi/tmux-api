import { NavLink } from 'react-router-dom'
import { TerminalSquare, MonitorPlay, BookOpen, FileText, LogOut, LogIn } from 'lucide-react'
import { auth } from '../lib/auth.js'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

export default function Sidebar() {
  const isLoggedIn = auth.isAuthenticated()
  const user = isLoggedIn ? auth.getUser() : null

  return (
    <ShadcnSidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-mono text-lg text-sidebar-primary">
          <TerminalSquare />
          foreman
        </div>
      </SidebarHeader>
      <SidebarContent>
        {isLoggedIn && (
          <SidebarGroup>
            <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/sessions">
                      <MonitorPlay />
                      Sessions
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/knowledge-base">
                    <BookOpen />
                    Knowledge Base
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/docs" target="_blank" rel="noopener noreferrer">
                    <FileText />
                    API Docs
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        )}
        {isLoggedIn ? (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.logout()}>
            <LogOut data-icon="inline-start" />
            Logout
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.login()}>
            <LogIn data-icon="inline-start" />
            Login
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </ShadcnSidebar>
  )
}
