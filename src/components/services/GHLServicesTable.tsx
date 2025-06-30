
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GHLActionButtons } from "./GHLActionButtons";

interface GHLServicesTableProps {
  services: any[];
}

export const GHLServicesTable = ({ services }: GHLServicesTableProps) => {
  if (services.length === 0) {
    return <p className="text-muted-foreground">No hay cuentas GHL.</p>;
  }

  return (
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
        {services.map((service) => {
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
                <GHLActionButtons service={service} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
