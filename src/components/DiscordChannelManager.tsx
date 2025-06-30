
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, MessageSquare, Plus } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"

interface DiscordChannelManagerProps {
  subscriptionId: string
  clientName: string
}

interface ProvisionedService {
  id: string
  service_type: string
  access_details: any
  provisioned_at: string
  is_active: boolean
  subscription_id: string
}

const DiscordChannelManager = ({ subscriptionId, clientName }: DiscordChannelManagerProps) => {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  // Obtener servicios de Discord provisionados para esta suscripción específica
  const { data: discordServices, isLoading, error } = useQuery({
    queryKey: ['provisioned-services', subscriptionId, 'discord'],
    queryFn: async () => {
      console.log('=== DISCORD CHANNEL FETCH DEBUG ===')
      console.log('Fetching Discord services for subscription:', subscriptionId)
      console.log('Subscription ID type:', typeof subscriptionId)
      
      // Primero verificar si hay algún servicio para esta suscripción
      const { data: allServices, error: allError } = await supabase
        .from('provisioned_services')
        .select('*')
        .eq('subscription_id', subscriptionId)
      
      console.log('All services for this subscription:', allServices)
      console.log('All services error:', allError)
      
      // Ahora buscar específicamente canales de Discord
      const { data, error } = await supabase
        .from('provisioned_services')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('service_type', 'discord_channel')
        .order('provisioned_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching Discord services:', error)
        throw error
      }
      
      console.log('Discord services found:', data)
      console.log('Discord services count:', data?.length || 0)
      console.log('=== END DEBUG ===')
      
      return data as ProvisionedService[]
    },
    enabled: open
  })

  // Crear canal de Discord
  const createChannelMutation = useMutation({
    mutationFn: async () => {
      console.log('Creating Discord channel for subscription:', subscriptionId)
      
      // Llamar al webhook para crear el canal
      const response = await fetch('https://hooks.infragrowthai.com/webhook/client/discord_channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscription_id: subscriptionId,
          client_name: clientName
        })
      })
      
      if (!response.ok) {
        throw new Error('Error al crear el canal de Discord')
      }
      
      const result = await response.json()
      console.log('Discord channel created:', result)
      
      // Crear registro en la base de datos
      const { error } = await supabase
        .from('provisioned_services')
        .insert({
          subscription_id: subscriptionId,
          service_type: 'discord_channel',
          access_details: result,
          is_active: true
        })
      
      if (error) {
        console.error('Error saving service to database:', error)
        throw error
      }
      
      console.log('Discord channel service saved to database')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provisioned-services'] })
      toast({
        title: "Canal creado",
        description: "El canal de Discord se ha creado correctamente"
      })
    },
    onError: (error) => {
      console.error('Failed to create Discord channel:', error)
      toast({
        title: "Error",
        description: "No se pudo crear el canal de Discord",
        variant: "destructive"
      })
    }
  })

  // Eliminar canal de Discord
  const deleteChannelMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      console.log('Deleting Discord channel with ID:', serviceId)
      
      // Llamar al webhook para eliminar el canal
      const response = await fetch('https://hooks.infragrowthai.com/webhook/client/discord_channel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: serviceId })
      })
      
      if (!response.ok) {
        throw new Error('Error al eliminar el canal de Discord')
      }
      
      // Marcar el servicio como inactivo en la base de datos
      const { error } = await supabase
        .from('provisioned_services')
        .update({ is_active: false })
        .eq('id', serviceId)
      
      if (error) {
        console.error('Error updating service status:', error)
        throw error
      }
      
      console.log('Discord channel deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provisioned-services'] })
      toast({
        title: "Canal eliminado",
        description: "El canal de Discord se ha eliminado correctamente"
      })
    },
    onError: (error) => {
      console.error('Failed to delete Discord channel:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el canal de Discord",
        variant: "destructive"
      })
    }
  })

  const activeChannels = discordServices?.filter(service => service.is_active) || []
  const hasActiveChannel = activeChannels.length > 0

  console.log('Active channels for render:', activeChannels)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="mr-2 h-4 w-4" />
          Discord
          {activeChannels.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeChannels.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Canal de Discord - {clientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Estado del canal
            </p>
            {!hasActiveChannel && (
              <Button
                onClick={() => createChannelMutation.mutate()}
                disabled={createChannelMutation.isPending}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                {createChannelMutation.isPending ? 'Creando...' : 'Crear Canal'}
              </Button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">Error: {error.message}</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : !hasActiveChannel ? (
            <div className="text-center p-4">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay canal de Discord activo</p>
              <p className="text-xs text-muted-foreground mt-2">
                Haz clic en "Crear Canal" para crear uno nuevo
              </p>
            </div>
          ) : (
            activeChannels.map((service) => (
              <Card key={service.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Canal Activo</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Creado: {new Date(service.provisioned_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      Activo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar Canal
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente el canal de Discord. 
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteChannelMutation.mutate(service.id)}
                            disabled={deleteChannelMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteChannelMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>  
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DiscordChannelManager
