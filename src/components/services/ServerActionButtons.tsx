
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
import { Power, Trash2 } from "lucide-react";
import { useServerActions } from "@/hooks/useServerActions";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ServerDetailsModal } from "./ServerDetailsModal";

interface ServerActionButtonsProps {
  service: any;
}

export const ServerActionButtons = ({ service }: ServerActionButtonsProps) => {
  const serverActionMutation = useServerActions();
  const { data: userProfile } = useUserProfile();
  const details = service.access_details as any;
  const isServerActive = service.is_active === true;
  const isSuperAdmin = userProfile?.super_admin === true;

  return (
    <div className="flex gap-2 flex-wrap">
      <ServerDetailsModal service={service} />
      {isSuperAdmin && (
        isServerActive ? (
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
        )
      )}
      {isSuperAdmin && (
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
      )}
    </div>
  );
};
