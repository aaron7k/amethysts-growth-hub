import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { UserCheck, CheckCircle, Clock, ArrowRight, FileText } from "lucide-react"

const ONBOARDING_STEPS = [
  { id: 'contract_sent', label: 'Contrato Enviado' },
  { id: 'onboarding_doc_sent', label: 'Documento de Onboarding Enviado' },
  { id: 'academy_access_granted', label: 'Acceso a Academia/Accelerator Concedido' },
  { id: 'high_level_account_created', label: 'Cuenta de High Level Creada' },
  { id: 'discord_access_granted', label: 'Acceso a Canales de Discord Concedido' }
]

type NextStep = 'in_service' | 'needs_contact' | 'pending_onboarding' | 'pending_renewal' | 'overdue_payment'

export default function Onboarding() {
  const [selectedSubscription, setSelectedSubscription] = useState<string>('')
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['onboarding-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          clients(full_name, email),
          plans(name, plan_type)
        `)
        .in('next_step', ['pending_onboarding', 'needs_contact'])
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  const updateOnboardingMutation = useMutation({
    mutationFn: async (data: { subscriptionId: string, nextStep: NextStep, notes?: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          next_step: data.nextStep,
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.subscriptionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] })
      toast({
        title: "Onboarding actualizado",
        description: "El estado del onboarding ha sido actualizado exitosamente."
      })
      setSelectedSubscription('')
      setCompletedSteps({})
      setNotes('')
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el onboarding. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  })

  const markAsCompleted = (subscriptionId: string) => {
    const allStepsCompleted = ONBOARDING_STEPS.every(step => completedSteps[step.id])
    
    if (!allStepsCompleted) {
      toast({
        title: "Pasos incompletos",
        description: "Debes completar todos los pasos antes de finalizar el onboarding.",
        variant: "destructive"
      })
      return
    }

    updateOnboardingMutation.mutate({
      subscriptionId,
      nextStep: 'in_service' as NextStep,
      notes: notes
    })
  }

  const markAsNeedsContact = (subscriptionId: string) => {
    updateOnboardingMutation.mutate({
      subscriptionId,
      nextStep: 'needs_contact' as NextStep,
      notes: notes
    })
  }

  const selectedSub = subscriptions?.find(sub => sub.id === selectedSubscription)

  const getStepColor = (step: string) => {
    return completedSteps[step] ? 'text-green-600' : 'text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-primary" />
          Gestión de Onboarding
        </h1>
        <p className="text-muted-foreground mt-2">
          Administra el proceso de onboarding de nuevos clientes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Clientes Pendientes de Onboarding
            </CardTitle>
            <CardDescription>
              {subscriptions?.length || 0} cliente(s) requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : subscriptions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>¡Excelente! No hay clientes pendientes de onboarding.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions?.map((subscription) => (
                  <div 
                    key={subscription.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSubscription === subscription.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedSubscription(subscription.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{subscription.clients?.full_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {subscription.clients?.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {subscription.next_step === 'pending_onboarding' ? 'Pendiente' : 'Necesita Contacto'}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{subscription.plans?.name}</p>
                      <p className="text-muted-foreground">
                        Inicio: {new Date(subscription.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Checklist de Onboarding
            </CardTitle>
            <CardDescription>
              {selectedSub ? `Procesando: ${selectedSub.clients?.full_name}` : 'Selecciona un cliente para comenzar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedSub ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4" />
                <p>Selecciona un cliente de la lista para gestionar su onboarding</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Client Info */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-2">{selectedSub.clients?.full_name}</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <p><strong>Email:</strong> {selectedSub.clients?.email}</p>
                    <p><strong>Plan:</strong> {selectedSub.plans?.name}</p>
                    <p><strong>Fecha de inicio:</strong> {new Date(selectedSub.start_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Pasos del Onboarding</h4>
                  {ONBOARDING_STEPS.map((step) => (
                    <div key={step.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={step.id}
                        checked={completedSteps[step.id] || false}
                        onCheckedChange={(checked) => 
                          setCompletedSteps(prev => ({
                            ...prev,
                            [step.id]: checked as boolean
                          }))
                        }
                      />
                      <label 
                        htmlFor={step.id} 
                        className={`text-sm font-medium cursor-pointer ${getStepColor(step.id)}`}
                      >
                        {step.label}
                      </label>
                      {completedSteps[step.id] && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notas del Onboarding
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agrega notas sobre el proceso de onboarding..."
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => markAsCompleted(selectedSub.id)}
                    disabled={updateOnboardingMutation.isPending}
                    className="amethyst-gradient hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completar Onboarding
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => markAsNeedsContact(selectedSub.id)}
                    disabled={updateOnboardingMutation.isPending}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Marcar como "Necesita Contacto"
                  </Button>
                </div>

                {/* Progress Indicator */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progreso</span>
                    <span>
                      {Object.values(completedSteps).filter(Boolean).length} / {ONBOARDING_STEPS.length}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(Object.values(completedSteps).filter(Boolean).length / ONBOARDING_STEPS.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
