
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const PendingApproval = () => {
  const { user, signOut, retryApproval } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryApproval = async () => {
    setIsRetrying(true);
    const { error } = await retryApproval();
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo reenviar la solicitud de aprobación",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Solicitud reenviada",
        description: "Se ha reenviado tu solicitud de aprobación al administrador",
      });
    }
    setIsRetrying(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[500px]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-orange-600">Cuenta Pendiente de Aprobación</CardTitle>
          <CardDescription>
            Tu cuenta está esperando la aprobación del administrador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Hola {user?.user_metadata?.full_name || user?.email}</strong>
              <br />
              Tu cuenta ha sido creada exitosamente, pero necesita ser aprobada por un administrador 
              antes de que puedas acceder al sistema. Hemos enviado una notificación y te contactaremos 
              una vez que tu cuenta sea activada.
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿No has recibido respuesta? Puedes reenviar tu solicitud de aprobación.
            </p>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleRetryApproval}
                disabled={isRetrying}
                variant="outline"
                className="w-full"
              >
                {isRetrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isRetrying && <RefreshCw className="mr-2 h-4 w-4" />}
                Intentar de nuevo
              </Button>
              
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full"
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
