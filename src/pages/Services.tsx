
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Power, Trash2, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Services = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch provisioned services
  const { data: services, isLoading } = useQuery({
    queryKey: ['provisioned-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provisioned_services')
        .select(`
          *,
          subscription:subscriptions(
            client:clients(full_name)
          )
        `)
        .in('service_type', ['gohighlevel_account', 'infraestructure_server'])
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation for GHL pause
  const pauseGHLMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const response = await fetch('https://hooks.infragrowthai.com/webhook/client/pause-ghl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: serviceId }),
      });
      
      if (!response.ok) {
        throw new Error('Error al pausar la subcuenta');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subcuenta pausada",
        description: "La subcuenta de GoHighLevel ha sido pausada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['provisioned-services'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo pausar la subcuenta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Mutation for server actions
  const serverActionMutation = useMutation({
    mutationFn: async ({ serviceId, action }: { serviceId: string; action: 'apagar' | 'destruir' }) => {
      const response = await fetch('https://hooks.infragrowthai.com/webhook/client/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: serviceId, action }),
      });
      
      if (!response.ok) {
        throw new Error(`Error al ${action} el servidor`);
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Servidor ${variables.action === 'apagar' ? 'apagado' : 'destruido'}`,
        description: `El servidor ha sido ${variables.action === 'apagar' ? 'apagado' : 'destruido'} exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ['provisioned-services'] });
    },
    onError: (_, variables) => {
      toast({
        title: "Error",
        description: `No se pudo ${variables.action} el servidor. Inténtalo de nuevo.`,
        variant: "destructive",
      });
    },
  });

  const ghlServices = services?.filter(s => s.service_type === 'gohighlevel_account') || [];
  const serverServices = services?.filter(s => s.service_type === 'infraestructure_server') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando servicios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Servicios</h1>
      </div>

      <Tabs defaultValue="ghl" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ghl">Cuentas GHL</TabsTrigger>
          <TabsTrigger value="servers">Servidores</TabsTrigger>
        </TabsList>

        <TabsContent value="ghl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas GoHighLevel</CardTitle>
            </CardHeader>
            <CardContent>
              {ghlServices.length === 0 ? (
                <p className="text-muted-foreground">No hay cuentas GHL activas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nombre de Cuenta</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ghlServices.map((service) => {
                      const details = service.access_details as any;
                      return (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {service.subscription?.client?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>{details?.name || 'N/A'}</TableCell>
                          <TableCell>{details?.email || 'N/A'}</TableCell>
                          <TableCell>{details?.country || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {details?.url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(details.url, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Ir a Cuenta
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => pauseGHLMutation.mutate(details?.id)}
                                disabled={pauseGHLMutation.isPending}
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Pausar Subcuenta
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Servidores de Infraestructura</CardTitle>
            </CardHeader>
            <CardContent>
              {serverServices.length === 0 ? (
                <p className="text-muted-foreground">No hay servidores activos.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Zona</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serverServices.map((service) => {
                      const details = service.access_details as any;
                      return (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {service.subscription?.client?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>{details?.name || 'N/A'}</TableCell>
                          <TableCell>{details?.ip || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={details?.status === 'Activo' ? "default" : "secondary"}>
                              {details?.status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{details?.type_server || 'N/A'}</TableCell>
                          <TableCell>{details?.zone || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => serverActionMutation.mutate({ 
                                  serviceId: details?.id_server, 
                                  action: 'apagar' 
                                })}
                                disabled={serverActionMutation.isPending}
                              >
                                <Power className="h-4 w-4 mr-1" />
                                Apagar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => serverActionMutation.mutate({ 
                                  serviceId: details?.id_server, 
                                  action: 'destruir' 
                                })}
                                disabled={serverActionMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Destruir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Services;
