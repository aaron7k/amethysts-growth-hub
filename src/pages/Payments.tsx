
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Search, Filter, CheckCircle, DollarSign, Edit, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

type InstallmentStatus = 'pending' | 'paid' | 'overdue'
type PaymentMethod = 'crypto' | 'stripe' | 'bank_transfer' | 'paypal'

const paymentSchema = z.object({
  amount_usd: z.string().min(1, "El monto es requerido"),
  due_date: z.string().min(1, "La fecha de vencimiento es requerida"),
  status: z.enum(['pending', 'paid', 'overdue']),
  payment_method: z.enum(['crypto', 'stripe', 'bank_transfer', 'paypal']).optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional()
})

type PaymentFormData = z.infer<typeof paymentSchema>

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount_usd: "",
      due_date: "",
      status: "pending",
      payment_method: undefined,
      payment_date: "",
      notes: ""
    }
  })

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
        query = query.eq('status', statusFilter as InstallmentStatus)
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
    mutationFn: async ({ installmentId, paymentMethod }: { installmentId: string, paymentMethod: PaymentMethod }) => {
      const { error } = await supabase
        .from('installments')
        .update({
          status: 'paid' as InstallmentStatus,
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

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: PaymentFormData }) => {
      const updateData = {
        amount_usd: parseFloat(data.amount_usd),
        due_date: data.due_date,
        status: data.status,
        payment_method: data.payment_method,
        payment_date: data.payment_date || null,
        notes: data.notes,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('installments')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast({
        title: "Pago actualizado",
        description: "La información del pago ha sido actualizada exitosamente."
      })
      setIsEditDialogOpen(false)
      setEditingPayment(null)
      form.reset()
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el pago. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  })

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('installments')
        .delete()
        .eq('id', paymentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast({
        title: "Pago eliminado",
        description: "El pago ha sido eliminado exitosamente."
      })
      setIsDeleteDialogOpen(false)
      setPaymentToDelete(null)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  })

  const handleEditPayment = (installment: any) => {
    setEditingPayment(installment)
    form.reset({
      amount_usd: installment.amount_usd.toString(),
      due_date: installment.due_date,
      status: installment.status,
      payment_method: installment.payment_method,
      payment_date: installment.payment_date || "",
      notes: installment.notes || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleDeletePayment = (installment: any) => {
    setPaymentToDelete(installment)
    setIsDeleteDialogOpen(true)
  }

  const onSubmit = (data: PaymentFormData) => {
    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, data })
    }
  }

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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Gestión de Pagos
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Administra todas las cuotas y pagos del sistema
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pagos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {totals.pending}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pagos Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {totals.overdue}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pagos Completados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {totals.paid}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Monto Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-primary">
              ${totals.totalAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <CardTitle className="text-lg sm:text-xl">Lista de Cuotas</CardTitle>
          <CardDescription>
            {installments?.length || 0} cuota(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">Plan</TableHead>
                    <TableHead className="min-w-[80px]">Cuota</TableHead>
                    <TableHead className="min-w-[100px]">Monto</TableHead>
                    <TableHead className="min-w-[110px] hidden md:table-cell">Vencimiento</TableHead>
                    <TableHead className="min-w-[100px]">Estado</TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">Método de Pago</TableHead>
                    <TableHead className="min-w-[180px]">Acciones</TableHead>
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
                            <div className="font-medium text-sm sm:text-base">
                              {installment.subscriptions?.clients?.full_name}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground block sm:hidden lg:block">
                              {installment.subscriptions?.clients?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div>
                            <div className="font-medium text-sm">
                              {installment.subscriptions?.plans?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {installment.subscriptions?.plans?.plan_type}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          Cuota {installment.installment_number}
                        </TableCell>
                        <TableCell className="font-semibold text-primary text-sm sm:text-base">
                          ${installment.amount_usd}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {new Date(installment.due_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(installment.status || '')} text-xs`}>
                            {installment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {installment.payment_method || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 sm:gap-2">
                            {installment.status === 'pending' || installment.status === 'overdue' ? (
                              <Button
                                size="sm"
                                onClick={() => markAsPaidMutation.mutate({
                                  installmentId: installment.id,
                                  paymentMethod: 'stripe' as PaymentMethod
                                })}
                                disabled={markAsPaidMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-4"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Marcar Pagado</span>
                                <span className="sm:hidden">Pagado</span>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs sm:text-sm">
                                <span className="hidden sm:inline">Pagado el </span>
                                {installment.payment_date ? new Date(installment.payment_date).toLocaleDateString() : '-'}
                              </span>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditPayment(installment)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeletePayment(installment)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Pago</DialogTitle>
            <DialogDescription>
              Actualiza la información del pago aquí.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount_usd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="paid">Pagado</SelectItem>
                        <SelectItem value="overdue">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="bank_transfer">Transferencia</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Pago</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updatePaymentMutation.isPending}>
                  {updatePaymentMutation.isPending ? "Actualizando..." : "Actualizar Pago"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Pago</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletePaymentMutation.mutate(paymentToDelete?.id)}
              disabled={deletePaymentMutation.isPending}
            >
              {deletePaymentMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
