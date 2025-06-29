
import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/integrations/supabase/client"
import { ArrowLeft, User, Mail, Phone, ExternalLink, Calendar, DollarSign, CreditCard } from "lucide-react"

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  
  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          subscriptions(
            *,
            plans(name, plan_type, price_usd, duration_days),
            installments(
              *
            )
          )
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })

  const getStatusColor = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'pending_payment': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      'paid': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'overdue': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Cliente no encontrado</h2>
        <Link to="/clients">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Clientes
          </Button>
        </Link>
      </div>
    )
  }

  const allInstallments = client.subscriptions?.flatMap(sub => 
    sub.installments?.map(inst => ({
      ...inst,
      subscription: sub,
      plan: sub.plans
    })) || []
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            {client.full_name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Cliente desde {new Date(client.created_at || '').toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Information */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{client.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{client.phone_number || 'No registrado'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Carpeta Drive</p>
                {client.drive_folder_url ? (
                  <a 
                    href={client.drive_folder_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Ver carpeta <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="font-medium text-muted-foreground">No configurada</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Historial de Suscripciones
            </CardTitle>
            <CardDescription>
              {client.subscriptions?.length || 0} suscripción(es) registrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {client.subscriptions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay suscripciones registradas para este cliente</p>
                <Link to="/new-sale" className="mt-4 inline-block">
                  <Button>Crear Primera Venta</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {client.subscriptions?.map((subscription) => (
                  <div key={subscription.id} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{subscription.plans?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {subscription.plans?.plan_type === 'core' ? 'Plan Principal' : 'Renovación'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(subscription.status || '')}>
                        {subscription.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Inicio</p>
                        <p className="font-medium">
                          {new Date(subscription.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fin</p>
                        <p className="font-medium">
                          {new Date(subscription.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Costo Total</p>
                        <p className="font-medium text-primary">
                          ${subscription.total_cost_usd}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cuotas</p>
                        <p className="font-medium">
                          {subscription.installments?.length || 0} cuota(s)
                        </p>
                      </div>
                    </div>

                    {subscription.next_step && subscription.next_step !== 'in_service' && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Próximo paso:</strong> {subscription.next_step}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {allInstallments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Historial de Pagos
            </CardTitle>
            <CardDescription>
              Todas las cuotas y pagos del cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Pago</TableHead>
                  <TableHead>Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allInstallments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell className="font-medium">
                      {installment.plan?.name}
                    </TableCell>
                    <TableCell>
                      Cuota {installment.installment_number}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      ${installment.amount_usd}
                    </TableCell>
                    <TableCell>
                      {new Date(installment.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(installment.status || '')}>
                        {installment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {installment.payment_date 
                        ? new Date(installment.payment_date).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {installment.payment_method || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
