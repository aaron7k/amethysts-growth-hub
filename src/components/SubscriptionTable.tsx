
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Trash2, Search } from "lucide-react";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";

interface Subscription {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  next_step: string;
  total_cost_usd: number;
  call_level_included: boolean;
  clients: {
    full_name: string;
    email: string;
    phone_number: string;
  };
  plans: {
    name: string;
    plan_type: string;
    price_usd: number;
  };
}

interface SubscriptionTableProps {
  subscriptions: Subscription[];
  onEdit: (subscription: Subscription) => void;
  onView: (subscription: Subscription) => void;
  onDelete: (subscription: Subscription) => void;
}

export const SubscriptionTable = ({
  subscriptions,
  onEdit,
  onView,
  onDelete
}: SubscriptionTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = 
      subscription.clients.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.plans.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.clients.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || subscription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  const getNextStepBadge = (nextStep: string) => {
    const stepConfig = {
      in_service: { label: "En Servicio", className: "bg-blue-100 text-blue-800" },
      needs_contact: { label: "Necesita Contacto", className: "bg-orange-100 text-orange-800" },
      pending_onboarding: { label: "Onboarding Pendiente", className: "bg-purple-100 text-purple-800" },
      pending_renewal: { label: "Renovación Pendiente", className: "bg-indigo-100 text-indigo-800" },
      overdue_payment: { label: "Pago Vencido", className: "bg-red-100 text-red-800" }
    };
    
    const config = stepConfig[nextStep as keyof typeof stepConfig] || { label: nextStep, className: "bg-gray-100 text-gray-800" };
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatSafeDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    const date = new Date(dateString);
    if (!isValid(date)) return "Fecha inválida";
    
    try {
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return "Error en fecha";
    }
  };

  const formatSafeCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "N/A";
    }
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por cliente, producto o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="inactive">Inactiva</SelectItem>
            <SelectItem value="pending_payment">Pago Pendiente</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Cliente</TableHead>
                <TableHead className="min-w-[120px]">Producto</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="min-w-[130px] hidden sm:table-cell">Siguiente Paso</TableHead>
                <TableHead className="min-w-[100px] hidden md:table-cell">Fecha Inicio</TableHead>
                <TableHead className="min-w-[100px] hidden md:table-cell">Fecha Fin</TableHead>
                <TableHead className="min-w-[100px] hidden lg:table-cell">Costo Total</TableHead>
                <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron suscripciones
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm sm:text-base">{subscription.clients.full_name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{subscription.clients.email}</div>
                        {/* Show hidden info on mobile */}
                        <div className="mt-1 space-y-1 sm:hidden">
                          {subscription.next_step && (
                            <div className="text-xs">
                              Paso: {getNextStepBadge(subscription.next_step)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {formatSafeDate(subscription.start_date)} - {formatSafeDate(subscription.end_date)}
                          </div>
                          <div className="text-xs font-medium md:hidden lg:hidden">
                            {formatSafeCurrency(subscription.total_cost_usd)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm sm:text-base">{subscription.plans.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground capitalize">{subscription.plans.plan_type}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(subscription.status)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {subscription.next_step && getNextStepBadge(subscription.next_step)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatSafeDate(subscription.start_date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatSafeDate(subscription.end_date)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatSafeCurrency(subscription.total_cost_usd)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(subscription)}
                          className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(subscription)}
                          className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(subscription)}
                          className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
