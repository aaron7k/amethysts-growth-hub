
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, MessageSquare } from "lucide-react"
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
}

const DiscordChannelManager = ({ subscriptionId, clientName }: DiscordChannelManagerProps) => {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  // Obtener servicios de Discord provisionados para esta suscripción específica
  const { data: discordServices, isLoading } = useQuery({
    queryKey: ['provisioned-services', subscriptionId, 'discord'],
    queryFn: async () => {
      console.log('Fetching Discord services for subscription:', subscriptionId)
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
      console.log('Discord services fetched for subscription', subscriptionId, ':', data)
      return data as ProvisionedService[]
    },
    enabled: open
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Canales de Discord - {clientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">Cargando canales...</p>
            </div>
          ) : activeChannels.length === 0 ? (
            <div className="text-center p-4">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay canales de Discord activos</p>
            </div>
          ) : (
            activeChannels.map((service) => (
              <Card key={service.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Canal de Discord</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Creado: {new Date(service.provisioned_at).toLocaleDateString('es-ES')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {service.id}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      Activo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {service.access_details && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Detalles de acceso:</h4>
                      <div className="bg-muted p-3 rounded-md">
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(service.access_details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
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
