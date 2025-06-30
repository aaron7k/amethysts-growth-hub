
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const subscriptionSchema = z.object({
  client_id: z.string().min(1, "Cliente es requerido"),
  plan_id: z.string().min(1, "Plan es requerido"),
  start_date: z.date({
    required_error: "Fecha de inicio es requerida",
  }),
  total_cost_usd: z.number().min(0, "El costo debe ser mayor a 0"),
  status: z.enum(["active", "inactive", "pending_payment", "cancelled"]),
  next_step: z.enum(["in_service", "needs_contact", "pending_onboarding", "pending_renewal", "overdue_payment"]).optional(),
  call_level_included: z.boolean(),
  notes: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface SubscriptionFormProps {
  subscription?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SubscriptionForm = ({ subscription, onSuccess, onCancel }: SubscriptionFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      client_id: subscription?.client_id || "",
      plan_id: subscription?.plan_id || "",
      start_date: subscription?.start_date ? new Date(subscription.start_date) : new Date(),
      total_cost_usd: subscription?.total_cost_usd || 0,
      status: subscription?.status || "active",
      next_step: subscription?.next_step || "pending_onboarding",
      call_level_included: subscription?.call_level_included || false,
      notes: subscription?.notes || "",
    },
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, email')
        .eq('status', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch plans
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, price_usd, plan_type')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Watch for plan changes to update total cost
  const selectedPlanId = form.watch('plan_id');
  useEffect(() => {
    if (selectedPlanId && plans) {
      const selectedPlan = plans.find(plan => plan.id === selectedPlanId);
      if (selectedPlan) {
        form.setValue('total_cost_usd', selectedPlan.price_usd);
      }
    }
  }, [selectedPlanId, plans, form]);

  const createMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      const { error } = await supabase
        .from('subscriptions')
        .insert([{
          ...data,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Suscripción creada",
        description: "La suscripción ha sido creada exitosamente.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la suscripción.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          ...data,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
        })
        .eq('id', subscription.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Suscripción actualizada",
        description: "La suscripción ha sido actualizada exitosamente.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la suscripción.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: SubscriptionFormData) => {
    setIsSubmitting(true);
    try {
      if (subscription) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plan_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price_usd} ({plan.plan_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Inicio</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: require('date-fns/locale/es') })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="total_cost_usd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo Total (USD)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="inactive">Inactiva</SelectItem>
                    <SelectItem value="pending_payment">Pago Pendiente</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="next_step"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Siguiente Paso</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar siguiente paso" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="in_service">En Servicio</SelectItem>
                    <SelectItem value="needs_contact">Necesita Contacto</SelectItem>
                    <SelectItem value="pending_onboarding">Onboarding Pendiente</SelectItem>
                    <SelectItem value="pending_renewal">Renovación Pendiente</SelectItem>
                    <SelectItem value="overdue_payment">Pago Vencido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="call_level_included"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Nivel de llamadas incluido</FormLabel>
                <div className="text-sm text-muted-foreground">
                  ¿Incluye soporte por llamadas?
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre la suscripción..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : subscription ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
