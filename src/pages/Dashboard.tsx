
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/integrations/supabase/client"
import { Users, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, UserPlus } from "lucide-react"
import { Link } from "react-router-dom"

export default function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Get current month stats
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const [
        { count: totalClients },
        { count: newClientsThisMonth },
        { count: activeSubscriptions },
        { count: overduePayments },
        { data: recentSubscriptions }
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true })
          .gte('created_at', firstDayOfMonth.toISOString()),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase.from('installments').select('*', { count: 'exact', head: true })
          .eq('status', 'overdue'),
        supabase.from('subscriptions')
          .select(`
            *,
            clients(full_name, email),
            plans(name, price_usd)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      return {
        totalClients: totalClients || 0,
        newClientsThisMonth: newClientsThisMonth || 0,
        activeSubscriptions: activeSubscriptions || 0,
        overduePayments: overduePayments || 0,
        recentSubscriptions: recentSubscriptions || []
      }
    }
  })

  const { data: pendingTasks } = useQuery({
    queryKey: ['pending-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select(`
          *,
          clients(full_name, email),
          plans(name)
        `)
        .neq('next_step', 'in_service')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10)

      return data || []
    }
  })

  const getNextStepLabel = (step: string) => {
    const labels = {
      'pending_onboarding': 'Pendiente Onboarding',
      'needs_contact': 'Necesita Contacto',
      'pending_renewal': 'Renovación Pendiente',
      'overdue_payment': 'Pago Atrasado'
    }
    return labels[step as keyof typeof labels] || step
  }

  const getNextStepColor = (step: string) => {
    const colors = {
      'pending_onboarding': 'bg-blue-100 text-blue-800',
      'needs_contact': 'bg-yellow-100 text-yellow-800',
      'pending_renewal': 'bg-purple-100 text-purple-800',
      'overdue_payment': 'bg-red-100 text-red-800'
    }
    return colors[step as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Resumen general del sistema InfraGrowth CRM
          </p>
        </div>
        <Link to="/new-sale">
          <Button className="amethyst-gradient hover:opacity-90 transition-opacity">
            <UserPlus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.totalClients}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nuevos Este Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.newClientsThisMonth}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suscripciones Activas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.activeSubscriptions}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Atrasados
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.overduePayments}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Tareas Pendientes
            </CardTitle>
            <CardDescription>
              Acciones requeridas en suscripciones activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  ¡Excelente! No hay tareas pendientes.
                </p>
              ) : (
                pendingTasks?.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {task.clients?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.plans?.name}
                      </p>
                    </div>
                    <Badge className={`text-xs ${getNextStepColor(task.next_step || '')}`}>
                      {getNextStepLabel(task.next_step || '')}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            {pendingTasks && pendingTasks.length > 0 && (
              <>
                <Separator className="my-4" />
                <Link to="/onboarding">
                  <Button variant="outline" className="w-full">
                    Ver Todas las Tareas
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Ventas Recientes
            </CardTitle>
            <CardDescription>
              Últimas suscripciones creadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.recentSubscriptions?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay ventas recientes.
                </p>
              ) : (
                metrics?.recentSubscriptions?.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {sale.clients?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.plans?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-primary">
                        ${sale.total_cost_usd}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
            {metrics?.recentSubscriptions && metrics.recentSubscriptions.length > 0 && (
              <>
                <Separator className="my-4" />
                <Link to="/clients">
                  <Button variant="outline" className="w-full">
                    Ver Todos los Clientes
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
