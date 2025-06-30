
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ServerActionButtons } from "./ServerActionButtons";

interface ServerServicesTableProps {
  services: any[];
}

export const ServerServicesTable = ({ services }: ServerServicesTableProps) => {
  if (services.length === 0) {
    return <p className="text-muted-foreground">No hay servidores.</p>;
  }

  return (
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
        {services.map((service) => {
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
                <ServerActionButtons service={service} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
