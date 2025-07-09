
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { SubscriptionDetail } from "@/components/SubscriptionDetail";
import { SubscriptionTable } from "@/components/SubscriptionTable";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Subscriptions = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscriptions with related data
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          clients(full_name, email, phone_number),
          plans(name, plan_type, price_usd)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Delete subscription mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: "Suscripción eliminada",
        description: "La suscripción ha sido eliminada exitosamente.",
      });
      setShowDeleteDialog(false);
      setSelectedSubscription(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la suscripción.",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (subscription: any) => {
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleView = (subscription: any) => {
    setSelectedSubscription(subscription);
    setShowDetail(true);
  };

  const handleDelete = (subscription: any) => {
    setSelectedSubscription(subscription);
    setShowDeleteDialog(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSubscription(null);
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      pending_payment: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Suscripciones</h1>
          <p className="text-muted-foreground">
            Gestiona todas las suscripciones de tus clientes
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Suscripción
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions?.filter(s => s.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions?.filter(s => s.status === 'pending_payment').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions?.filter(s => s.status === 'cancelled').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Suscripciones</CardTitle>
          <CardDescription>
            Administra y visualiza todas las suscripciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionTable
            subscriptions={subscriptions || []}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? 'Editar Suscripción' : 'Nueva Suscripción'}
            </DialogTitle>
          </DialogHeader>
          <SubscriptionForm
            subscription={editingSubscription}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingSubscription(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Suscripción</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <SubscriptionDetail
              subscription={selectedSubscription}
              onClose={() => setShowDetail(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la suscripción
              y todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSubscription && deleteMutation.mutate(selectedSubscription.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Subscriptions;
