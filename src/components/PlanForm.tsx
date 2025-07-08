
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const planSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  price_usd: z.number().min(0, "El precio debe ser mayor a 0"),
  duration_days: z.number().min(1, "La duración debe ser mayor a 0"),
  plan_type: z.enum(['core', 'renovation']),
  is_active: z.boolean()
});

export type PlanFormData = z.infer<typeof planSchema>;

interface PlanFormProps {
  onSubmit: (data: PlanFormData) => void;
  onCancel: () => void;
  defaultValues?: Partial<PlanFormData>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export const PlanForm: React.FC<PlanFormProps> = ({
  onSubmit,
  onCancel,
  defaultValues,
  isSubmitting = false,
  submitButtonText = "Crear Producto"
}) => {
  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      price_usd: defaultValues?.price_usd || 0,
      duration_days: defaultValues?.duration_days || 30,
      plan_type: defaultValues?.plan_type || "core",
      is_active: defaultValues?.is_active ?? true
    }
  });

  React.useEffect(() => {
    if (defaultValues) {
      form.reset({
        name: defaultValues.name || "",
        description: defaultValues.description || "",
        price_usd: defaultValues.price_usd || 0,
        duration_days: defaultValues.duration_days || 30,
        plan_type: defaultValues.plan_type || "core",
        is_active: defaultValues.is_active ?? true
      });
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Producto Core Básico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Descripción del producto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price_usd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio (USD)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (días)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="30"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="plan_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Producto</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de producto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="renovation">Renovación</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Producto Activo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Determina si el producto está disponible para nuevas suscripciones
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

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
};
