
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Bell, Clock, AlertTriangle, CheckCircle, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AlertsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Alert {
  id: string
  alert_type: string
  title: string
  message: string
  status: string
  created_at: string
  client_id?: string
  subscription_id?: string
  installment_id?: string
  clients?: {
    full_name: string
    email: string
  }
}

export function AlertsPanel({ open, onOpenChange }: AlertsPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          clients (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as Alert[]
    },
    enabled: open
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'read' })
        .eq('id', alertId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast({
        title: "Alerta marcada como leída",
        description: "La alerta ha sido marcada como leída."
      })
    },
    onError: (error) => {
      console.error('Error marking alert as read:', error)
      toast({
        title: "Error",
        description: "No se pudo marcar la alerta como leída.",
        variant: "destructive"
      })
    }
  })

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'payment_overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'renewal_upcoming':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'service_expired':
        return <X className="h-4 w-4 text-red-500" />
      case 'new_sale':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'payment_overdue':
        return 'Pago Retrasado'
      case 'renewal_upcoming':
        return 'Renovación Próxima'
      case 'service_expired':
        return 'Servicio Finalizado'
      case 'new_sale':
        return 'Nueva Venta'
      default:
        return type
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'sent':
        return <Badge variant="default">Enviado</Badge>
      case 'read':
        return <Badge variant="outline">Leído</Badge>
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const pendingAlerts = alerts?.filter(alert => alert.status === 'pending') || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas ({pendingAlerts.length} pendientes)
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Cargando alertas...
              </div>
            )}

            {!isLoading && (!alerts || alerts.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No tienes alertas en este momento.
              </div>
            )}

            {alerts?.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg space-y-2 ${
                  alert.status === 'pending' ? 'bg-muted/30 border-primary/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getAlertTypeLabel(alert.alert_type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(alert.status)}
                    {alert.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(alert.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        Marcar como leído
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm">{alert.message}</p>

                {alert.clients && (
                  <div className="text-xs text-muted-foreground">
                    Cliente: {alert.clients.full_name} ({alert.clients.email})
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {format(new Date(alert.created_at), "dd 'de' MMMM 'a las' HH:mm", { locale: es })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
