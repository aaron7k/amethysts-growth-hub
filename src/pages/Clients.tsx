
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/integrations/supabase/client"
import { Search, Users, UserPlus, ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("")
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', searchTerm],
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
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
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
          <CardTitle className="text-lg">Buscar Clientes</CardTitle>
          <CardDescription>
            Encuentra clientes por nombre o email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                  <TableHead>Suscripciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Carpeta Drive</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                        <Link to={`/clients/${client.id}`}>
                          <Button variant="outline" size="sm">
                            Ver Detalle
                          </Button>
                        </Link>
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
