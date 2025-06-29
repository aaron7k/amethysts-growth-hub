
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Search, Filter, CheckCircle, DollarSign } from "lucide-react"

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: installments, isLoading } = useQuery({
    queryKey: ['installments', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('installments')
        .select(`
          *,
          subscriptions(
            *,
            clients(full_name, email),
            plans(name, plan_type)
          )
        `)
        .order('due_date', { ascending: true })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error

      // Filter by client name if search term is provided
      let filteredData = data || []
      if (searchTerm) {
        filteredData = filteredData.filter(installment => 
          installment.subscriptions?.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          installment.subscriptions?.clients?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      return filteredData
    }
  })

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ installmentId, paymentMethod }: { installmentId: string, paymentMethod: string }) => {
      const { error } = await supabase
        .from('installments')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', installmentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast({
        title: "Pago registrado",
        description: "El pago ha sido marcado como completado exitosamente."
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  })

  const getStatusColor = (status: string) => {
    const colors = {
      'paid': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'overdue': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTotalsByStatus = () => {
    if (!installments) return { pending: 0, paid: 0, overdue: 0, totalAmount: 0 }
    
    return installments.reduce((acc, installment) => {
      acc[installment.status as keyof typeof acc]++
      if (installment.status === 'pending' || installment.status === 'overdue') {
        acc.totalAmount += Number(installment.amount_usd)
      }
      return acc
    }, { pending: 0, paid: 0, overdue: 0, totalAmount: 0 })
  }

  const totals = getTotalsByStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            Gestión de Pagos
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra todas las cuotas y pagos del sistema
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totals.pending}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totals.overdue}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Completados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totals.paid}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${totals.totalAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cuotas</CardTitle>
          <CardDescription>
            {installments?.length || 0} cuota(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cuota</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron cuotas
                    </TableCell>
                  </TableRow>
                ) : (
                  installments?.map((installment) => (
                    <TableRow key={installment.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {installment.subscriptions?.clients?.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {installment.subscriptions?.clients?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {installment.subscriptions?.plans?.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {installment.subscriptions?.plans?.plan_type}
                          </div>
                        </div>
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
                        <Badge className={getStatusColor(installment.status || '')}>
                          {installment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {installment.payment_method || '-'}
                      </TableCell>
                      <TableCell>
                        {installment.status === 'pending' || installment.status === 'overdue' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => markAsPaidMutation.mutate({
                                installmentId: installment.id,
                                paymentMethod: 'stripe'
                              })}
                              disabled={markAsPaidMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Marcar Pagado
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Pagado el {installment.payment_date ? new Date(installment.payment_date).toLocaleDateString() : '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
