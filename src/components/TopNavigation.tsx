
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, Search, LogOut, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { ThemeSwitch } from "@/components/ThemeSwitch"
import { GlobalSearch } from "@/components/GlobalSearch"
import { UserProfileModal } from "@/components/UserProfileModal"
import { AlertsPanel } from "@/components/AlertsPanel"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export function TopNavigation() {
  const { user, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);

  // Query for pending alerts count
  const { data: pendingAlertsCount = 0 } = useQuery({
    queryKey: ['pending-alerts-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (error) throw error
      return count || 0
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSearchFocus = () => {
    setSearchOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length >= 2) {
      setSearchOpen(true);
    } else {
      setSearchOpen(false);
    }
  };

  const handleSearchClose = (open: boolean) => {
    setSearchOpen(open);
    if (!open) {
      setSearchTerm("");
    }
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <>
      <header className="sticky top-0 z-50 h-14 sm:h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sm:px-6 shadow-card">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar clientes, pagos..." 
              className="pl-10 w-60 sm:w-80 bg-muted/50"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
            />
            <GlobalSearch 
              open={searchOpen} 
              onOpenChange={handleSearchClose}
              searchTerm={searchTerm}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile search button */}
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>
          
          {/* Theme Switch */}
          <ThemeSwitch />
          
          <Button variant="ghost" size="icon" className="relative" onClick={() => setAlertsPanelOpen(true)}>
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {pendingAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {pendingAlertsCount > 99 ? '99+' : pendingAlertsCount}
              </span>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="flex-col items-start">
                <div className="font-medium text-sm">{user?.user_metadata?.full_name || 'Usuario'}</div>
                <div className="text-xs text-muted-foreground truncate w-full">{user?.email}</div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile search modal */}
      <GlobalSearch 
        open={searchOpen && window.innerWidth < 640} 
        onOpenChange={handleSearchClose}
        searchTerm={searchTerm}
      />

      {/* User Profile Modal */}
      <UserProfileModal 
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />

      {/* Alerts Panel */}
      <AlertsPanel 
        open={alertsPanelOpen}
        onOpenChange={setAlertsPanelOpen}
      />
    </>
  )
}
