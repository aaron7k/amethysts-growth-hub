
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlanForm, PlanFormData } from '@/components/PlanForm';

const Plans = () => {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Fetch plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: PlanFormData) => {
      const insertData = {
        name: planData.name,
        description: planData.description || null,
        price_usd: planData.price_usd,
        duration_days: planData.duration_days,
        plan_type: planData.plan_type,
        is_active: planData.is_active
      };
      
      const { data, error } = await supabase
        .from('plans')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsCreateDialogOpen(false);
      toast.success('Producto creado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear el producto: ' + error.message);
    }
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, ...planData }: PlanFormData & { id: string }) => {
      const updateData = {
        name: planData.name,
        description: planData.description || null,
        price_usd: planData.price_usd,
        duration_days: planData.duration_days,
        plan_type: planData.plan_type,
        is_active: planData.is_active
      };
      
      const { data, error } = await supabase
        .from('plans')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsEditDialogOpen(false);
      setEditingPlan(null);
      toast.success('Producto actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar el producto: ' + error.message);
    }
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Producto eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar el producto: ' + error.message);
    }
  });

  const handleCreateSubmit = (data: PlanFormData) => {
    createPlanMutation.mutate(data);
  };

  const handleEditSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ ...data, id: editingPlan.id });
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      deletePlanMutation.mutate(id);
    }
  };

  const handleCreateCancel = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setEditingPlan(null);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando productos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground">Administra los productos disponibles para tus clientes</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Producto</DialogTitle>
            </DialogHeader>
            <PlanForm
              onSubmit={handleCreateSubmit}
              onCancel={handleCreateCancel}
              isSubmitting={createPlanMutation.isPending}
              submitButtonText="Crear Producto"
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      {plan.description && (
                        <div className="text-sm text-muted-foreground max-w-xs">
                          <div className="whitespace-pre-wrap break-words line-clamp-3">
                            {plan.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.plan_type === 'core' ? 'default' : 'outline'}>
                      {plan.plan_type === 'core' ? 'Core' : 'Renovación'}
                    </Badge>
                  </TableCell>
                  <TableCell>${plan.price_usd}</TableCell>
                  <TableCell>{plan.duration_days} días</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          <PlanForm
            onSubmit={handleEditSubmit}
            onCancel={handleEditCancel}
            defaultValues={editingPlan ? {
              name: editingPlan.name,
              description: editingPlan.description || "",
              price_usd: editingPlan.price_usd,
              duration_days: editingPlan.duration_days,
              plan_type: editingPlan.plan_type,
              is_active: editingPlan.is_active
            } : undefined}
            isSubmitting={updatePlanMutation.isPending}
            submitButtonText="Actualizar Producto"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Plans;
