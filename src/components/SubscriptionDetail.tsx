
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, DollarSign, User, Package, Phone, Mail, FileText } from "lucide-react";

interface SubscriptionDetailProps {
  subscription: any;
  onClose: () => void;
}

export const SubscriptionDetail = ({ subscription, onClose }: SubscriptionDetailProps) => {
  // Fetch installments for this subscription
  const { data: installments } = useQuery({
    queryKey: ['installments', subscription.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installments')
        .select('*')
        .eq('subscription_id', subscription.id)
        .order('installment_number');
      
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Activa", className: "bg-green-100 text-green-800" },
      inactive: { label: "Inactiva", className: "bg-gray-100 text-gray-800" },
      pending_payment: { label: "Pago Pendiente", className: "bg-yellow-100 text-yellow-800" },
      cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getInstallmentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
      paid: { label: "Pagado", className: "bg-green-100 text-green-800" },
      overdue: { label: "Vencido", className: "bg-red-100 text-red-800" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Suscripción #{subscription.id.slice(-8)}</h3>
          <p className="text-sm text-muted-foreground">
            Cliente: {subscription.clients.full_name}
          </p>
        </div>
        {getStatusBadge(subscription.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{subscription.clients.full_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                {subscription.clients.email}
              </div>
              {subscription.clients.phone_number && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {subscription.clients.phone_number}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Información del Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">{subscription.plans.name}</p>
              <p className="text-sm text-muted-foreground capitalize">
                Tipo: {subscription.plans.plan_type}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                ${subscription.plans.price_usd.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Suscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de Inicio</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <p>{format(new Date(subscription.start_date), 'dd/MM/yyyy', { locale: es })}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de Fin</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <p>{format(new Date(subscription.end_date), 'dd/MM/yyyy', { locale: es })}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Costo Total</p>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <p>${subscription.total_cost_usd.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {subscription.call_level_included && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <p className="text-sm">Nivel de llamadas incluido</p>
            </div>
          )}

          {subscription.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Notas</p>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5" />
                <p className="text-sm">{subscription.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installments */}
      {installments && installments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cuotas de Pago</CardTitle>
            <CardDescription>
              Historial de pagos y cuotas pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {installments.map((installment) => (
                <div key={installment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Cuota #{installment.installment_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence: {format(new Date(installment.due_date), 'dd/MM/yyyy', { locale: es })}
                    </p>
                    {installment.payment_date && (
                      <p className="text-sm text-muted-foreground">
                        Pagado: {format(new Date(installment.payment_date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${installment.amount_usd.toLocaleString()}</p>
                    {getInstallmentStatusBadge(installment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
