import { useState } from "react"
import { Home, Users, CreditCard, Plus, UserCheck, Settings, Zap, FileText } from "lucide-react"
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
  { title: "Suscripciones", url: "/subscriptions", icon: FileText },
  { title: "Pagos", url: "/payments", icon: CreditCard },
  { title: "Planes", url: "/plans", icon: Settings },
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

  const getNavCls = (path: string) => {
    const active = isActive(path)
    return active 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground"
  }

  return (
    <Sidebar 
      className="border-r border-border bg-card" 
      collapsible="icon"
      variant={isMobile ? "floating" : "sidebar"}
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm">IG</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate">Infragrowth AI</h2>
              <p className="text-xs text-muted-foreground truncate">Infrastructure</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-2 mb-2">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={collapsed ? item.title : undefined}
                    className={getNavCls(item.url)}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 w-full"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="font-medium text-base truncate">
                          {item.title}
                        </span>
                      )}
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