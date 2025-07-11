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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Search, Filter, CheckCircle, DollarSign, Edit, Trash2, Plus, Calendar, FileText, Check, ChevronsUpDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"

type InstallmentStatus = 'pending' | 'paid' | 'overdue'
type PaymentMethod = 'crypto' | 'stripe' | 'bank_transfer' | 'paypal' | 'bbva' | 'dolar_app' | 'payoneer' | 'cash' | 'binance' | 'mercado_pago'

const paymentSchema = z.object({
  subscription_id: z.string().min(1, "La suscripción es requerida"),
  installment_number: z.string().min(1, "El número de cuota es requerido"),
  amount_usd: z.string().min(1, "El monto es requerido"),
  due_date: z.string().min(1, "La fecha de vencimiento es requerida"),
  status: z.enum(['pending', 'paid', 'overdue']),
  payment_method: z.enum(['crypto', 'stripe', 'bank_transfer', 'paypal', 'bbva', 'dolar_app', 'payoneer', 'cash', 'binance', 'mercado_pago']).optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional()
})

type PaymentFormData = z.infer<typeof paymentSchema>

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("payments")
  const [openSubscriptionCombobox, setOpenSubscriptionCombobox] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      subscription_id: "",
      installment_number: "",
      amount_usd: "",
      due_date: "",
      status: "pending",
      payment_method: undefined,
      payment_date: "",
      notes: ""
    }
  })

  // Fetch subscriptions for the create form
  const { data: subscriptions } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          start_date,
          total_cost_usd,
          clients(full_name, email),
          plans(name, duration_days, price_usd)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
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
            plans(name, plan_type, price_usd)
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

  // Fetch tracking data for the seguimientos tab
  const { data: trackingData, isLoading: isLoadingTracking } = useQuery({
    queryKey: ['tracking-data', monthFilter],
    queryFn: async () => {
      let query = supabase
        .from('subscriptions')
        .select(`
          id,
          start_date,
          end_date,
          total_cost_usd,
          clients(full_name, email),
          plans(name, plan_type),
          installments(
            id,
            installment_number,
            amount_usd,
            due_date,
            payment_date,
            status
          )
        `)
        .eq('status', 'active')
        .order('start_date', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      // Process data to create tracking information
      const processedData = data?.map(subscription => {
        const installments = subscription.installments || []
        const paidAmount = installments
          .filter(inst => inst.status === 'paid')
          .reduce((sum, inst) => sum + Number(inst.amount_usd), 0)
        
        const remainingAmount = subscription.total_cost_usd - paidAmount
        
        return {
          ...subscription,
          paidAmount,
          remainingAmount,
          latestInstallment: installments.length > 0 ? installments[installments.length - 1] : null
        }
      }) || []

      // Filter by current month if needed
      if (monthFilter === 'current') {
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        
        return processedData.filter(item => {
          if (!item.latestInstallment?.due_date) return false
          const dueDate = new Date(item.latestInstallment.due_date)
          return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear
        })
      }

      return processedData
    }
  })

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const insertData = {
        subscription_id: data.subscription_id,
        installment_number: parseInt(data.installment_number),
        amount_usd: parseFloat(data.amount_usd),
        due_date: data.due_date,
        status: data.status,
        payment_method: data.payment_method,
        payment_date: data.payment_date || null,
        notes: data.notes
      }

      const { error } = await supabase
        .from('installments')
        .insert(insertData)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      toast({
        title: "Pago creado",
        description: "El pago ha sido creado exitosamente."
      })
      setIsCreateDialogOpen(false)
      form.reset()
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el pago. Inténtalo de nuevo.",
        variant: "destructive"
      })
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
        subscription_id: data.subscription_id,
        installment_number: parseInt(data.installment_number),
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

  const handleCreatePayment = () => {
    form.reset()
    setIsCreateDialogOpen(true)
  }

  const handleEditPayment = (installment: any) => {
    setEditingPayment(installment)
    form.reset({
      subscription_id: installment.subscription_id,
      installment_number: installment.installment_number.toString(),
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
    } else {
      createPaymentMutation.mutate(data)
    }
  }

  // Calculate due date based on subscription start date and plan duration
  const calculateDueDate = (subscriptionId: string, installmentNumber: number) => {
    if (!subscriptions) return ""
    
    const subscription = subscriptions.find(sub => sub.id === subscriptionId)
    if (!subscription) return ""
    
    const startDate = new Date(subscription.start_date)
    const durationDays = subscription.plans?.duration_days || 30
    
    // Calculate due date: start date + (installment number * 30 days) - assumes monthly installments
    const daysToAdd = (installmentNumber - 1) * 30 // Assuming monthly payments
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + daysToAdd)
    
    return dueDate.toISOString().split('T')[0]
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'paid': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'overdue': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      'crypto': 'Crypto',
      'stripe': 'Stripe',
      'bank_transfer': 'Transferencia',
      'paypal': 'PayPal',
      'bbva': 'BBVA',
      'dolar_app': 'Dólar App',
      'payoneer': 'Payoneer',
      'cash': 'Efectivo',
      'binance': 'Binance',
      'mercado_pago': 'Mercado Pago'
    }
    return labels[method as keyof typeof labels] || method
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
        {activeTab === "payments" && (
          <Button onClick={handleCreatePayment} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar Pago
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Seguimientos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-l-4 border-l-yellow-500 shadow-card">
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

            <Card className="border-l-4 border-l-red-500 shadow-card">
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

            <Card className="border-l-4 border-l-green-500 shadow-card">
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

            <Card className="border-l-4 border-l-primary col-span-2 lg:col-span-1 shadow-card">
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
                        <TableHead className="min-w-[180px]">Cliente</TableHead>
                        <TableHead className="min-w-[80px]">Cuota</TableHead>
                        <TableHead className="min-w-[100px]">Monto</TableHead>
                        <TableHead className="min-w-[100px]">Estado</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">Vencimiento</TableHead>
                        <TableHead className="min-w-[120px] hidden lg:table-cell">Método</TableHead>
                        <TableHead className="min-w-[140px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installments?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No se encontraron cuotas
                          </TableCell>
                        </TableRow>
                      ) : (
                        installments?.map((installment) => (
                          <TableRow key={installment.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">
                                  {installment.subscriptions?.clients?.full_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {installment.subscriptions?.clients?.email}
                                </div>
                                {/* Mobile info */}
                                <div className="mt-1 md:hidden space-y-1">
                                  <div className="text-xs">
                                    <span className="font-medium">{installment.subscriptions?.plans?.name}</span>
                                    <span className="text-muted-foreground"> • {installment.subscriptions?.plans?.plan_type}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Vence: {new Date(installment.due_date).toLocaleDateString()}
                                  </div>
                                  {installment.payment_method && (
                                    <div className="text-xs text-muted-foreground lg:hidden">
                                      {getPaymentMethodLabel(installment.payment_method)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              Cuota {installment.installment_number}
                            </TableCell>
                            <TableCell className="font-semibold text-primary text-sm">
                              ${installment.amount_usd}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(installment.status || '')} text-xs`}>
                                {installment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {new Date(installment.due_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {installment.payment_method ? getPaymentMethodLabel(installment.payment_method) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                {installment.status === 'pending' || installment.status === 'overdue' ? (
                                  <Button
                                    size="sm"
                                    onClick={() => markAsPaidMutation.mutate({
                                      installmentId: installment.id,
                                      paymentMethod: 'stripe' as PaymentMethod
                                    })}
                                    disabled={markAsPaidMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-xs px-2 h-8"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Marcar Pagado</span>
                                    <span className="sm:hidden">Pagado</span>
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    <span className="hidden sm:inline">Pagado </span>
                                    {installment.payment_date ? new Date(installment.payment_date).toLocaleDateString() : '-'}
                                  </span>
                                )}
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEditPayment(installment)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeletePayment(installment)}
                                    className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
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
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          {/* Tracking Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Filtros de Seguimiento
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
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    <SelectItem value="current">Mes Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Seguimiento de Pagos</CardTitle>
              <CardDescription>
                {trackingData?.length || 0} cliente(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {isLoadingTracking ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Cliente</TableHead>
                        <TableHead className="min-w-[120px] hidden sm:table-cell">Producto</TableHead>
                        <TableHead className="min-w-[100px] hidden md:table-cell">Fecha</TableHead>
                        <TableHead className="min-w-[80px] hidden lg:table-cell">Cuota</TableHead>
                        <TableHead className="min-w-[120px]">Total/Restante</TableHead>
                        <TableHead className="min-w-[120px]">Progreso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackingData?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No se encontraron registros
                          </TableCell>
                        </TableRow>
                      ) : (
                        trackingData?.map((item) => {
                          const completionPercentage = ((item.total_cost_usd - item.remainingAmount) / item.total_cost_usd * 100).toFixed(1)
                          return (
                            <TableRow key={item.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div>
                                  <div className="font-medium text-sm">
                                    {item.clients?.full_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.clients?.email}
                                  </div>
                                  {/* Mobile info */}
                                  <div className="mt-1 sm:hidden space-y-1">
                                    <div className="text-xs">
                                      <span className="font-medium">{item.plans?.name}</span>
                                      <span className="text-muted-foreground"> • {item.plans?.plan_type}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground md:hidden">
                                      {item.latestInstallment?.due_date ? formatDate(item.latestInstallment.due_date) : formatDate(item.start_date)}
                                    </div>
                                    <div className="text-xs text-muted-foreground lg:hidden">
                                      {item.latestInstallment ? `Cuota ${item.latestInstallment.installment_number}` : 'Sin cuotas'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <div>
                                  <div className="font-medium text-sm">
                                    {item.plans?.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground capitalize">
                                    {item.plans?.plan_type}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm">
                                {item.latestInstallment?.due_date ? formatDate(item.latestInstallment.due_date) : formatDate(item.start_date)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-sm">
                                {item.latestInstallment ? `Cuota ${item.latestInstallment.installment_number}` : 'Sin cuotas'}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-semibold text-sm">
                                    ${item.total_cost_usd.toLocaleString()}
                                  </div>
                                  <div className={`font-semibold text-xs ${item.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    Restante: ${item.remainingAmount.toLocaleString()}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full" 
                                        style={{width: `${completionPercentage}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                  <div className="text-xs font-medium text-center">{completionPercentage}%</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Payment Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setEditingPayment(null)
          form.reset()
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto pointer-events-auto">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Editar Pago' : 'Registrar Pago'}</DialogTitle>
            <DialogDescription>
              {editingPayment ? 'Actualiza la información del pago aquí.' : 'Crea una nueva cuota de pago aquí.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subscription_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suscripción</FormLabel>
                    <Popover open={openSubscriptionCombobox} onOpenChange={setOpenSubscriptionCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openSubscriptionCombobox}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? subscriptions?.find((subscription) => subscription.id === field.value)
                                ? `${subscriptions.find((subscription) => subscription.id === field.value)?.clients?.full_name} - ${subscriptions.find((subscription) => subscription.id === field.value)?.plans?.name}`
                                : "Selecciona una suscripción"
                              : "Selecciona una suscripción"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 z-50">
                        <Command>
                          <CommandInput placeholder="Buscar suscripción..." />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty>No se encontraron suscripciones.</CommandEmpty>
                            <CommandGroup>
                              {subscriptions?.map((subscription) => (
                                <CommandItem
                                  key={subscription.id}
                                  value={`${subscription.clients?.full_name} ${subscription.clients?.email} ${subscription.plans?.name}`}
                                  onSelect={() => {
                                    field.onChange(subscription.id)
                                    setOpenSubscriptionCombobox(false)
                                    // Auto-calculate due date when subscription changes
                                    const installmentNumber = parseInt(form.getValues('installment_number')) || 1
                                    const dueDate = calculateDueDate(subscription.id, installmentNumber)
                                    if (dueDate) {
                                      form.setValue('due_date', dueDate)
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      subscription.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{subscription.clients?.full_name}</span>
                                    <span className="text-sm text-muted-foreground">{subscription.clients?.email}</span>
                                    <span className="text-sm">{subscription.plans?.name} - ${subscription.total_cost_usd?.toLocaleString()}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="installment_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Cuota</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" onChange={(e) => {
                          field.onChange(e)
                          // Auto-calculate due date when installment number changes
                          const subscriptionId = form.getValues('subscription_id')
                          if (subscriptionId) {
                            const dueDate = calculateDueDate(subscriptionId, parseInt(e.target.value) || 1)
                            if (dueDate) {
                              form.setValue('due_date', dueDate)
                            }
                          }
                        }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      Se calcula automáticamente según la duración del producto
                    </div>
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
                        <SelectItem value="bbva">BBVA</SelectItem>
                        <SelectItem value="dolar_app">Dólar App</SelectItem>
                        <SelectItem value="payoneer">Payoneer</SelectItem>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="binance">Binance</SelectItem>
                        <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
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
                <Button type="submit" disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}>
                  {createPaymentMutation.isPending || updatePaymentMutation.isPending ? 
                    (editingPayment ? "Actualizando..." : "Creando...") : 
                    (editingPayment ? "Actualizar Pago" : "Crear Pago")
                  }
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
