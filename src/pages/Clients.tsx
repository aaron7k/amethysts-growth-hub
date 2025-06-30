import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Search, Users, UserPlus, ExternalLink, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useIsMobile } from "@/hooks/use-mobile"

const clientSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  phone_number: z.string().optional(),
  drive_folder_url: z.string().url("URL inválida").optional().or(z.literal("")),
  client_type: z.enum(['client', 'student', 'accelerator_member']),
  status: z.boolean()
})

type ClientFormData = z.infer<typeof clientSchema>

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [editingClient, setEditingClient] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<any>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      drive_folder_url: "",
      client_type: "client",
      status: false
    }
  })
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', searchTerm, clientTypeFilter, statusFilter, sortOrder],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select(`
          *,
          subscriptions(
            id,
            status,
            plans(name, plan_type)
          )
        `)
        .order('updated_at', { ascending: sortOrder === 'asc' })

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      if (clientTypeFilter !== 'all') {
        query = query.eq('client_type', clientTypeFilter)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter === 'active')
      }

      const { data, error } = await query
      if (error) throw error
      
      return data?.map(client => ({
        ...client,
        activeSubscriptions: client.subscriptions?.filter(sub => sub.status === 'active').length || 0,
        totalSubscriptions: client.subscriptions?.length || 0
      }))
    }
  })

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: ClientFormData }) => {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast({
        title: "Cliente actualizado",
        description: "La información del cliente ha sido actualizada exitosamente."
      })
      setIsEditDialogOpen(false)
      setEditingClient(null)
      form.reset()
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  })

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente."
      })
      setIsDeleteDialogOpen(false)
      setClientToDelete(null)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente. Verifica que no tenga suscripciones activas.",
        variant: "destructive"
      })
    }
  })

  const handleEditClient = (client: any) => {
    setEditingClient(client)
    form.reset({
      full_name: client.full_name,
      email: client.email,
      phone_number: client.phone_number || "",
      drive_folder_url: client.drive_folder_url || "",
      client_type: client.client_type || "client",
      status: client.status || false
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteClient = (client: any) => {
    setClientToDelete(client)
    setIsDeleteDialogOpen(true)
  }

  const onSubmit = (data: ClientFormData) => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data })
    }
  }

  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const getClientTypeLabel = (type: string) => {
    const labels = {
      'client': 'Cliente',
      'student': 'Alumno',
      'accelerator_member': 'Miembro Aceleradora'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getClientTypeBadgeColor = (type: string) => {
    const colors = {
      'client': 'bg-blue-100 text-blue-800',
      'student': 'bg-green-100 text-green-800',
      'accelerator_member': 'bg-purple-100 text-purple-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4 p-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary flex-shrink-0" />
            <span className="truncate">Gestión de Clientes</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Administra la información y historial de todos tus clientes
          </p>
        </div>
        <Link to="/new-sale" className="flex-shrink-0">
          <Button className="amethyst-gradient hover:opacity-90 transition-opacity w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Buscar y Filtrar</CardTitle>
          <CardDescription className="text-sm">
            Encuentra clientes por nombre, email, tipo o estado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
                <SelectItem value="student">Alumnos</SelectItem>
                <SelectItem value="accelerator_member">Miembro Aceleradora</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Solo activos</SelectItem>
                <SelectItem value="inactive">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lista de Clientes</CardTitle>
          <CardDescription className="text-sm">
            {clients?.length || 0} clientes encontrados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] min-w-[200px]">Cliente</TableHead>
                    {!isMobile && (
                      <TableHead className="w-[120px] min-w-[120px]">Tipo</TableHead>
                    )}
                    <TableHead className="w-[100px] min-w-[100px]">Estado</TableHead>
                    {!isMobile && (
                      <TableHead className="w-[80px] min-w-[80px]">Subs.</TableHead>
                    )}
                    <TableHead className="w-[200px] min-w-[200px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 3 : 5} className="text-center py-8 text-muted-foreground">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients?.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/50">
                        <TableCell className="max-w-0">
                          <div className="space-y-1">
                            <div className="font-medium text-sm truncate pr-2">
                              {client.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate pr-2">
                              {client.email}
                            </div>
                            {isMobile && (
                              <Badge className={`text-xs ${getClientTypeBadgeColor(client.client_type || 'client')}`}>
                                {getClientTypeLabel(client.client_type || 'client')}
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Cliente desde {new Date(client.created_at || '').toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            <Badge className={`text-xs ${getClientTypeBadgeColor(client.client_type || 'client')}`}>
                              {getClientTypeLabel(client.client_type || 'client')}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge 
                            variant={client.status ? "default" : "secondary"}
                            className={`text-xs ${client.status ? "bg-green-100 text-green-800" : ""}`}
                          >
                            {client.status ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {isMobile && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {client.activeSubscriptions} / {client.totalSubscriptions} subs
                            </div>
                          )}
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            <div className="text-xs">
                              <div className="font-medium">
                                {client.activeSubscriptions} activas
                              </div>
                              <div className="text-muted-foreground">
                                {client.totalSubscriptions} total
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Link to={`/clients/${client.id}`} className="w-full">
                              <Button variant="outline" size="sm" className="w-full text-xs">
                                Ver Detalle
                              </Button>
                            </Link>
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditClient(client)}
                                className="flex-1"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteClient(client)}
                                className="text-red-600 hover:text-red-700 flex-1"
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

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Actualiza la información del cliente aquí.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="student">Alumno</SelectItem>
                        <SelectItem value="accelerator_member">Miembro Aceleradora</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Estado del Cliente
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Activa o desactiva el estado del cliente
                      </div>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="drive_folder_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Carpeta Drive</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateClientMutation.isPending} className="w-full">
                  {updateClientMutation.isPending ? "Actualizando..." : "Actualizar Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Client Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar al cliente "{clientToDelete?.full_name}"? 
              Esta acción no se puede deshacer y eliminará toda la información del cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteClientMutation.mutate(clientToDelete?.id)}
              disabled={deleteClientMutation.isPending}
              className="w-full sm:w-auto"
            >
              {deleteClientMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
