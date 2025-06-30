
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProvisionedServices } from "@/hooks/useProvisionedServices";
import { GHLServicesTable } from "@/components/services/GHLServicesTable";
import { ServerServicesTable } from "@/components/services/ServerServicesTable";

const Services = () => {
  const { data: services, isLoading } = useProvisionedServices();

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
              <GHLServicesTable services={ghlServices} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Servidores de Infraestructura</CardTitle>
            </CardHeader>
            <CardContent>
              <ServerServicesTable services={serverServices} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Services;
