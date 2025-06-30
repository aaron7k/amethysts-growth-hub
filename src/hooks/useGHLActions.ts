
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useGHLActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
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
};
