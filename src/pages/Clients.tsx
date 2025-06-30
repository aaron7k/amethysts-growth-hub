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

const clientSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  phone_number: z.string().optional(),
  drive_folder_url: z.string().url("URL inválida").optional().or(z.literal("")),
  client_type: z.enum(['client', 'student', 'accelerator_member'])
})

type ClientFormData = z.infer<typeof clientSchema>

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("all")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [editingClient, setEditingClient] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<any>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      drive_folder_url: "",
      client_type: "client"
    }
  })
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', searchTerm, clientTypeFilter, sortOrder],
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
      client_type: client.client_type || "client"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Gestión de Clientes
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra la información y historial de todos tus clientes
          </p>
        </div>
        <Link to="/new-sale">
          <Button className="amethyst-gradient hover:opacity-90 transition-opacity">
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscar y Filtrar Clientes</CardTitle>
          <CardDescription>
            Encuentra clientes por nombre, email o tipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
                <SelectItem value="student">Alumnos</SelectItem>
                <SelectItem value="accelerator_member">Miembros Aceleradora</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {clients?.length || 0} clientes encontrados
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
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Suscripciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Carpeta Drive</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSortToggle}
                      className="flex items-center gap-1 hover:bg-transparent p-0"
                    >
                      Última Actualización
                      {sortOrder === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  clients?.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{client.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Cliente desde {new Date(client.created_at || '').toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone_number || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getClientTypeBadgeColor(client.client_type || 'client')}>
                          {getClientTypeLabel(client.client_type || 'client')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">
                            {client.activeSubscriptions} activas
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {client.totalSubscriptions} total
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={client.activeSubscriptions > 0 ? "default" : "secondary"}
                          className={client.activeSubscriptions > 0 ? "bg-green-100 text-green-800" : ""}
                        >
                          {client.activeSubscriptions > 0 ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.drive_folder_url ? (
                          <a 
                            href={client.drive_folder_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver carpeta
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.updated_at ? new Date(client.updated_at).toLocaleDateString() : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link to={`/clients/${client.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Detalle
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditClient(client)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteClient(client)}
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
          )}
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? "Actualizando..." : "Actualizar Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Client Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar al cliente "{clientToDelete?.full_name}"? 
              Esta acción no se puede deshacer y eliminará toda la información del cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteClientMutation.mutate(clientToDelete?.id)}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
