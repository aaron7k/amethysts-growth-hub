
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { User, Save } from "lucide-react"

interface UserProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  role: string | null
  super_admin: boolean
  is_approved: boolean | null
  is_active: boolean | null
  created_at: string | null
}

export function UserProfileModal({ open, onOpenChange }: UserProfileModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data as UserProfile | null
    },
    enabled: !!user?.id && open
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      if (!user?.id) throw new Error('No user ID')

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
        })
        .eq('id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente."
      })
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] })
      onOpenChange(false)
    },
    onError: (error) => {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Intenta de nuevo.",
        variant: "destructive"
      })
    }
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || ''
      })
    } else if (user) {
      setFormData({
        full_name: user.user_metadata?.full_name || '',
        phone: ''
      })
    }
  }, [profile, user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const userInitials = formData.full_name
    ? formData.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil de Usuario
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Ingresa tu nombre completo"
                disabled={isLoading || updateProfileMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Ingresa tu número de teléfono"
                disabled={isLoading || updateProfileMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email no se puede modificar
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={updateProfileMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || updateProfileMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
