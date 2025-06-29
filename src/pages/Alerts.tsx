
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, Clock, CheckCircle, XCircle, Zap, TrendingUp } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const Alerts = () => {
  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          clients (full_name, phone_number),
          subscriptions (start_date, end_date),
          installments (amount_usd, due_date, installment_number)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  const sendAlert = async (alertId: string, alertType: string) => {
    try {
      // Determinar qué función usar según el tipo de alerta
      const functionName = (alertType === 'stage_change' || alertType === 'stage_overdue') 
        ? 'send-stage-change-alert' 
        : 'send-alert'
      
      const { error } = await supabase.functions.invoke(functionName, {
        body: { alertId }
      })
      
      if (error) throw error
      
      const webhookType = (alertType === 'stage_change' || alertType === 'stage_overdue') 
        ? 'cambio-etapa' 
        : 'alerts'
      
      toast({
        title: "Alerta enviada",
        description: `La alerta se ha enviado correctamente al webhook de ${webhookType}`
      })
      
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la alerta",
        variant: "destructive"
      })
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'payment_overdue':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'renewal_upcoming':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'service_expired':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'new_sale':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'stage_change':
        return <TrendingUp className="h-5 w-5 text-blue-500" />
      case 'stage_overdue':
        return <Zap className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5" />
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
      case 'stage_change':
        return 'Cambio de Etapa'
      case 'stage_overdue':
        return 'Etapa Atrasada'
      default:
        return type
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'sent':
        return <Badge variant="default">Enviada</Badge>
      case 'failed':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (isLoading) {
    return <div className="p-6">Cargando alertas...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Alertas</h1>
        <p className="text-muted-foreground">
          Monitor y gestiona todas las alertas automáticas del sistema (envío a n8n webhook)
        </p>
      </div>

      <div className="grid gap-4">
        {alerts?.map((alert) => (
          <Card key={alert.id} className="w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getAlertIcon(alert.alert_type)}
                  <CardTitle className="text-lg">{alert.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(alert.status)}
                  <Badge variant="outline">{getAlertTypeLabel(alert.alert_type)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {alert.message}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Cliente</p>
                  <p className="text-muted-foreground">
                    {alert.clients?.full_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Canal</p>
                  <p className="text-muted-foreground">{alert.slack_channel}</p>
                </div>
                <div>
                  <p className="font-medium">Creado</p>
                  <p className="text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Enviado</p>
                  <p className="text-muted-foreground">
                    {alert.sent_at ? new Date(alert.sent_at).toLocaleDateString('es-ES') : 'No enviado'}
                  </p>
                </div>
              </div>

              {alert.metadata && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Información adicional:</p>
                  <pre className="text-xs text-muted-foreground">
                    {JSON.stringify(alert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {alert.status === 'pending' && (
                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={() => sendAlert(alert.id, alert.alert_type)}
                    size="sm"
                  >
                    Enviar a n8n
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {alerts?.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay alertas para mostrar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Alerts
