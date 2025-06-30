
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, ExternalLink } from "lucide-react";

interface GHLDetailsModalProps {
  service: any;
}

export const GHLDetailsModal = ({ service }: GHLDetailsModalProps) => {
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
