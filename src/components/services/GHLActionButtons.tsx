
import { Button } from "@/components/ui/button";
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
import { Power, ExternalLink } from "lucide-react";
import { useGHLActions } from "@/hooks/useGHLActions";
import { GHLDetailsModal } from "./GHLDetailsModal";

interface GHLActionButtonsProps {
  service: any;
}

export const GHLActionButtons = ({ service }: GHLActionButtonsProps) => {
  const ghlActionMutation = useGHLActions();
  const details = service.access_details as any;
  const isGHLActive = service.is_active === true;

  return (
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
  );
};
