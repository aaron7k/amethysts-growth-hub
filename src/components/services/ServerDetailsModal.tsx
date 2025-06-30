
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

interface ServerDetailsModalProps {
  service: any;
}

export const ServerDetailsModal = ({ service }: ServerDetailsModalProps) => {
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
