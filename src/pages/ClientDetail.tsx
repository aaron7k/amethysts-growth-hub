import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, User, Mail, Phone, ExternalLink, Calendar, DollarSign, CreditCard, Edit, Trash2, RefreshCw } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const subscriptionSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending_payment', 'cancelled']),
  next_step: z.enum(['pending_onboarding', 'in_service', 'needs_contact', 'overdue_payment', 'pending_renewal']),
  total_cost_usd: z.string().min(1, "El costo total es requerido"),
  notes: z.string().optional()
})

const changePlanSchema = z.object({
  plan_id: z.string().min(1, "El plan es requerido"),
  total_cost_usd: z.string().min(1, "El costo total es requerido"),
  start_date: z.string().min(1, "La fecha de inicio es requerida"),
  notes: z.string().optional()
})

type SubscriptionFormData = z.infer<typeof subscriptionSchema>
type ChangePlanFormData = z.infer<typeof changePlanSchema>

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const [editingSubscription, setEditingSubscription] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<any>(null)
  const [subscriptionToChangePlan, setSubscriptionToChangePlan] = useState<any>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      status: 'active',
      next_step: 'in_service',
      total_cost_usd: "",
      notes: ""
    }
  })

  const changePlanForm = useForm<ChangePlanFormData>({
    resolver: zodResolver(changePlanSchema),
    defaultValues: {
      plan_id: "",
      total_cost_usd: "",
      start_date: "",
      notes: ""
    }
  })
  
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

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data
    }
  })

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: SubscriptionFormData }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: data.status,
          next_step: data.next_step,
          total_cost_usd: parseFloat(data.total_cost_usd),
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      toast({
        title: "Suscripción actualizada",
        description: "La suscripción ha sido actualizada exitosamente."
      })
      setIsEditDialogOpen(false)
      setEditingSubscription(null)
      form.reset()
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la suscripción. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  })

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      toast({
        title: "Suscripción eliminada",
        description: "La suscripción ha sido eliminada exitosamente."
      })
      setIsDeleteDialogOpen(false)
      setSubscriptionToDelete(null)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la suscripción. Verifica que no tenga cuotas activas.",
        variant: "destructive"
      })
    }
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ subscriptionId, data }: { subscriptionId: string, data: ChangePlanFormData }) => {
      const selectedPlan = plans?.find(p => p.id === data.plan_id)
      if (!selectedPlan) throw new Error("Plan no encontrado")

      const startDate = new Date(data.start_date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days)

      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: data.plan_id,
          total_cost_usd: parseFloat(data.total_cost_usd),
          start_date: data.start_date,
          end_date: endDate.toISOString().split('T')[0],
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      toast({
        title: "Plan cambiado",
        description: "El plan de la suscripción ha sido cambiado exitosamente."
      })
      setIsChangePlanDialogOpen(false)
      setSubscriptionToChangePlan(null)
      changePlanForm.reset()
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cambiar el plan. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  })

  const handleEditSubscription = (subscription: any) => {
    setEditingSubscription(subscription)
    form.reset({
      status: subscription.status,
      next_step: subscription.next_step,
      total_cost_usd: subscription.total_cost_usd.toString(),
      notes: subscription.notes || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteSubscription = (subscription: any) => {
    setSubscriptionToDelete(subscription)
    setIsDeleteDialogOpen(true)
  }

  const handleChangePlan = (subscription: any) => {
    setSubscriptionToChangePlan(subscription)
    changePlanForm.reset({
      plan_id: subscription.plan_id,
      total_cost_usd: subscription.total_cost_usd.toString(),
      start_date: subscription.start_date,
      notes: subscription.notes || ""
    })
    setIsChangePlanDialogOpen(true)
  }

  const onSubmit = (data: SubscriptionFormData) => {
    if (editingSubscription) {
      updateSubscriptionMutation.mutate({ id: editingSubscription.id, data })
    }
  }

  const onChangePlanSubmit = (data: ChangePlanFormData) => {
    if (subscriptionToChangePlan) {
      changePlanMutation.mutate({ subscriptionId: subscriptionToChangePlan.id, data })
    }
  }

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
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(subscription.status || '')}>
                          {subscription.status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleChangePlan(subscription)}
                          title="Cambiar Plan"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditSubscription(subscription)}
                          title="Editar"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteSubscription(subscription)}
                          className="text-red-600 hover:text-red-700"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Suscripción</DialogTitle>
            <DialogDescription>
              Actualiza la información de la suscripción aquí.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="pending_payment">Pago Pendiente</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="next_step"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próximo Paso</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el próximo paso" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending_onboarding">Onboarding Pendiente</SelectItem>
                        <SelectItem value="in_service">En Servicio</SelectItem>
                        <SelectItem value="needs_contact">Necesita Contacto</SelectItem>
                        <SelectItem value="overdue_payment">Pago Atrasado</SelectItem>
                        <SelectItem value="pending_renewal">Renovación Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_cost_usd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Total (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" />
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
                <Button type="submit" disabled={updateSubscriptionMutation.isPending}>
                  {updateSubscriptionMutation.isPending ? "Actualizando..." : "Actualizar Suscripción"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={isChangePlanDialogOpen} onOpenChange={setIsChangePlanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar Plan</DialogTitle>
            <DialogDescription>
              Cambia el plan de la suscripción seleccionada.
            </DialogDescription>
          </DialogHeader>
          <Form {...changePlanForm}>
            <form onSubmit={changePlanForm.handleSubmit(onChangePlanSubmit)} className="space-y-4">
              <FormField
                control={changePlanForm.control}
                name="plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuevo Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans?.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - ${plan.price_usd}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePlanForm.control}
                name="total_cost_usd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Total (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePlanForm.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Fecha de Inicio</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePlanForm.control}
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
                <Button type="submit" disabled={changePlanMutation.isPending}>
                  {changePlanMutation.isPending ? "Cambiando..." : "Cambiar Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Subscription Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Suscripción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar la suscripción de "{subscriptionToDelete?.plans?.name}"? 
              Esta acción no se puede deshacer y eliminará toda la información asociada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteSubscriptionMutation.mutate(subscriptionToDelete?.id)}
              disabled={deleteSubscriptionMutation.isPending}
            >
              {deleteSubscriptionMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
