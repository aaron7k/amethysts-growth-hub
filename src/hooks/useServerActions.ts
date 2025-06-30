
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useServerActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
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
};
