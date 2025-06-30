
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Power, Trash2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
        .in('service_type', ['gohighlevel_account', 'infraestructure_server']);
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation for GHL actions
  const ghlActionMutation = useMutation({
    mutationFn: async ({ serviceId, action }: { serviceId: string; action: 'encender' | 'apagar' }) => {
      const response = await fetch('https://hooks.infragrowthai.com/webhook/client/pause-ghl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: serviceId, action }),
      });
      
      if (!response.ok) {
        throw new Error(`Error al ${action} la subcuenta`);
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      const actionText = variables.action === 'encender' ? 'encendida' : 'apagada';
      toast({
        title: `Subcuenta ${actionText}`,
        description: `La subcuenta de GoHighLevel ha sido ${actionText} exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ['provisioned-services'] });
    },
    onError: (_, variables) => {
      toast({
        title: "Error",
        description: `No se pudo ${variables.action} la subcuenta. Inténtalo de nuevo.`,
        variant: "destructive",
      });
    },
  });

  // Mutation for server actions
  const serverActionMutation = useMutation({
    mutationFn: async ({ serviceId, action }: { serviceId: string; action: 'apagar' | 'destruir' | 'encender' }) => {
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
      const actionText = variables.action === 'apagar' ? 'apagado' : 
                        variables.action === 'encender' ? 'encendido' : 'destruido';
      toast({
        title: `Servidor ${actionText}`,
        description: `El servidor ha sido ${actionText} exitosamente.`,
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

  const GHLDetailsModal = ({ service }: { service: any }) => {
    const details = service.access_details as any;
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Info className="h-4 w-4 mr-1" />
            Más detalles
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Cuenta GHL</DialogTitle>
            <DialogDescription>
              Información completa de la cuenta de GoHighLevel
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><strong>ID:</strong> {details?.id || 'N/A'}</div>
            <div><strong>Company ID:</strong> {details?.companyId || 'N/A'}</div>
            <div><strong>Nombre:</strong> {details?.firstName || 'N/A'}</div>
            <div><strong>Apellido:</strong> {details?.lastName || 'N/A'}</div>
            <div><strong>Email:</strong> {details?.email || 'N/A'}</div>
            <div><strong>Teléfono:</strong> {details?.phone || 'N/A'}</div>
            <div><strong>País:</strong> {details?.country || 'N/A'}</div>
            <div><strong>Idioma:</strong> {details?.locale || 'N/A'}</div>
            <div><strong>Zona Horaria:</strong> {details?.timezone || 'N/A'}</div>
            <div><strong>Empresa:</strong> {details?.business?.name || 'N/A'}</div>
            <div><strong>País de la Empresa:</strong> {details?.business?.country || 'N/A'}</div>
            <div><strong>Zona Horaria Empresa:</strong> {details?.business?.timezone || 'N/A'}</div>
            <div><strong>Invitación Automática App:</strong> {details?.automaticMobileAppInvite ? 'Sí' : 'No'}</div>
          </div>
          {details?.url && (
            <div className="mt-4">
              <Button onClick={() => window.open(details.url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Ir a la Cuenta
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  const ServerDetailsModal = ({ service }: { service: any }) => {
    const details = service.access_details as any;
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Info className="h-4 w-4 mr-1" />
            Más detalles
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalles del Servidor</DialogTitle>
            <DialogDescription>
              Información completa del servidor de infraestructura
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            <div><strong>ID:</strong> {details?.Id || 'N/A'}</div>
            <div><strong>ID Servidor:</strong> {details?.id_server || 'N/A'}</div>
            <div><strong>Nombre:</strong> {details?.name || 'N/A'}</div>
            <div><strong>IP:</strong> {details?.ip || 'N/A'}</div>
            <div><strong>Email:</strong> {details?.mail || 'N/A'}</div>
            <div><strong>Zona:</strong> {details?.zone || 'N/A'}</div>
            <div><strong>Imagen:</strong> {details?.image || 'N/A'}</div>
            <div><strong>Estado:</strong> {details?.status || 'N/A'}</div>
            <div><strong>Tipo de Servidor:</strong> {details?.type_server || 'N/A'}</div>
            <div><strong>Creado:</strong> {details?.createdAt || 'N/A'}</div>
            <div><strong>Actualizado:</strong> {details?.updatedAt || 'N/A'}</div>
            <div><strong>Clave Secreta:</strong> {details?.secret_key ? '••••••••••••••••' : 'N/A'}</div>
            <div><strong>Contraseña Root:</strong> {details?.root_password ? '••••••••••••••••' : 'N/A'}</div>
            <div><strong>Token Easypanel:</strong> {details?.easypanel_token ? '••••••••••••••••' : 'N/A'}</div>
          </div>
          {(details?.url_n8n_temporal || details?.url_nocodb_temporal || details?.url_qdrant_temporal || details?.url_flowise_temporal) && (
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold">URLs de Servicios:</h4>
              <div className="grid grid-cols-1 gap-2">
                {details?.url_n8n_temporal && (
                  <Button variant="outline" onClick={() => window.open(details.url_n8n_temporal, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    N8N
                  </Button>
                )}
                {details?.url_nocodb_temporal && (
                  <Button variant="outline" onClick={() => window.open(details.url_nocodb_temporal, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    NocoDB
                  </Button>
                )}
                {details?.url_qdrant_temporal && (
                  <Button variant="outline" onClick={() => window.open(details.url_qdrant_temporal, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Qdrant
                  </Button>
                )}
                {details?.url_flowise_temporal && (
                  <Button variant="outline" onClick={() => window.open(details.url_flowise_temporal, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Flowise
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

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
                <p className="text-muted-foreground">No hay cuentas GHL.</p>
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
                      const isGHLActive = service.is_active === true;
                      
                      return (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {service.subscription?.client?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>{details?.name || 'N/A'}</TableCell>
                          <TableCell>{details?.email || 'N/A'}</TableCell>
                          <TableCell>{details?.country || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={isGHLActive ? "default" : "secondary"}>
                              {isGHLActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              <GHLDetailsModal service={service} />
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
                              {isGHLActive ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={ghlActionMutation.isPending}
                                    >
                                      <Power className="h-4 w-4 mr-1" />
                                      Apagar
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Apagar subcuenta?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción apagará la subcuenta de GoHighLevel para {service.subscription?.client?.full_name}. 
                                        ¿Estás seguro de que deseas continuar?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => ghlActionMutation.mutate({ 
                                          serviceId: details?.id, 
                                          action: 'apagar' 
                                        })}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Apagar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={ghlActionMutation.isPending}
                                    >
                                      <Power className="h-4 w-4 mr-1" />
                                      Encender
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Encender subcuenta?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción encenderá la subcuenta de GoHighLevel para {service.subscription?.client?.full_name}. 
                                        ¿Continuar?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => ghlActionMutation.mutate({ 
                                          serviceId: details?.id, 
                                          action: 'encender' 
                                        })}
                                      >
                                        Encender
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
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
                <p className="text-muted-foreground">No hay servidores.</p>
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
                      const isServerActive = service.is_active === true;
                      
                      return (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {service.subscription?.client?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>{details?.name || 'N/A'}</TableCell>
                          <TableCell>{details?.ip || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={isServerActive ? "default" : "secondary"}>
                              {isServerActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>{details?.type_server || 'N/A'}</TableCell>
                          <TableCell>{details?.zone || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              <ServerDetailsModal service={service} />
                              {isServerActive ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={serverActionMutation.isPending}
                                    >
                                      <Power className="h-4 w-4 mr-1" />
                                      Apagar
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Apagar servidor?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción apagará el servidor {details?.name} para {service.subscription?.client?.full_name}. 
                                        El servidor se puede volver a encender posteriormente. ¿Continuar?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => serverActionMutation.mutate({ 
                                          serviceId: details?.id_server, 
                                          action: 'apagar' 
                                        })}
                                      >
                                        Apagar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={serverActionMutation.isPending}
                                    >
                                      <Power className="h-4 w-4 mr-1" />
                                      Encender
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Encender servidor?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción encenderá el servidor {details?.name} para {service.subscription?.client?.full_name}. 
                                        ¿Continuar?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => serverActionMutation.mutate({ 
                                          serviceId: details?.id_server, 
                                          action: 'encender' 
                                        })}
                                      >
                                        Encender
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={serverActionMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Destruir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Destruir servidor?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <strong>¡ADVERTENCIA!</strong> Esta acción destruirá permanentemente el servidor {details?.name} 
                                      para {service.subscription?.client?.full_name}. Todos los datos se perderán y no se podrá recuperar. 
                                      Esta acción es <strong>irreversible</strong>.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => serverActionMutation.mutate({ 
                                        serviceId: details?.id_server, 
                                        action: 'destruir' 
                                      })}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Destruir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
