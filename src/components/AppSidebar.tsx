
import { useState, useEffect } from "react"
import { Home, Users, CreditCard, Plus, UserCheck, Settings, Zap, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

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
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(path)
  }

  return (
    <div className={`fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col z-40 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
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
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="p-2">
          <button
            onClick={() => setCollapsed(false)}
            className="w-full h-10 flex items-center justify-center hover:bg-accent rounded-md transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 p-2 overflow-y-auto">
        {!collapsed && (
          <div className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-2 mb-2">
            Principal
          </div>
        )}
        
        <nav className="space-y-1">
          {mainItems.map((item) => {
            const active = isActive(item.url)
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={`
                  flex items-center rounded-lg transition-all duration-200
                  ${collapsed 
                    ? 'h-10 w-10 p-0 justify-center mx-auto' 
                    : 'h-10 gap-3 px-3 py-2'
                  }
                  ${active
                    ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                    : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground'
                  }
                `}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className={`flex-shrink-0 ${collapsed ? 'h-5 w-5' : 'h-5 w-5'}`} />
                {!collapsed && (
                  <span className="font-medium text-sm truncate">
                    {item.title}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
