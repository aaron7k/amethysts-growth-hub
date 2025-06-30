
import { useState } from "react"
import { Home, Users, CreditCard, Plus, UserCheck, Settings, Zap } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useIsMobile } from "@/hooks/use-mobile"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Pagos", url: "/payments", icon: CreditCard },
  { title: "Nueva Venta", url: "/new-sale", icon: Plus },
  { title: "Onboarding", url: "/onboarding", icon: UserCheck },
  { title: "Aceleradora", url: "/accelerator", icon: Zap },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const isMobile = useIsMobile()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(path)
  }

  const getNavCls = (path: string) => 
    isActive(path) 
      ? "bg-primary text-primary-foreground font-medium amethyst-glow" 
      : "hover:bg-accent hover:text-accent-foreground transition-colors"

  return (
    <Sidebar 
      className={`${collapsed ? "w-24" : "w-64"} border-r border-border bg-card mr-8`} 
      collapsible="icon"
      variant={isMobile ? "floating" : "sidebar"}
    >
      <SidebarHeader className="border-b border-border p-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm">IG</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold">InfraGrowth</h2>
              <p className="text-xs text-muted-foreground">CRM Sistema</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-6 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-3 mb-3">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={`h-12 ${collapsed ? "justify-center px-2" : "px-4"}`}>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center ${collapsed ? "justify-center" : "gap-4"} py-3 rounded-lg transition-all duration-200 ${getNavCls(item.url)}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
