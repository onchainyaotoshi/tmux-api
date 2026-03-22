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
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function Sidebar() {
  const isLoggedIn = auth.isAuthenticated()
  const user = isLoggedIn ? auth.getUser() : null

  return (
    <ShadcnSidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-mono text-lg text-primary">
          <TerminalSquare className="h-5 w-5" />
          foreman
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        {isLoggedIn && (
          <SidebarGroup>
            <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/sessions">
                      <MonitorPlay className="h-4 w-4" />
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
                    <BookOpen className="h-4 w-4" />
                    Knowledge Base
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/docs" target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4" />
                    API Docs
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <p className="mb-2 truncate text-xs text-muted-foreground">{user.email}</p>
        )}
        {isLoggedIn ? (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => auth.login()}>
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </SidebarFooter>
    </ShadcnSidebar>
  )
}
