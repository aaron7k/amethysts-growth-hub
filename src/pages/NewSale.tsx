
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, ArrowRight, DollarSign, Calendar } from "lucide-react"

export default function NewSale() {
  const [step, setStep] = useState(1)
  const [clientData, setClientData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    drive_folder_url: ''
  })
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [installmentCount, setInstallmentCount] = useState(1)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [callLevelIncluded, setCallLevelIncluded] = useState(false)
  const [notes, setNotes] = useState('')
  const [firstPaymentMethod, setFirstPaymentMethod] = useState<'stripe' | 'crypto' | 'bank_transfer' | 'paypal'>('stripe')
  
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existingClients } = useQuery({
    queryKey: ['clients-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('full_name')
      
      if (error) throw error
      return data
    }
  })

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const selectedPlan = plans?.find(plan => plan.id === selectedPlanId)

  const createSaleMutation = useMutation({
    mutationFn: async () => {
      let clientId = selectedClientId
      let clientInfo = null

      // Step 1: Create client if new - Fix the UUID validation issue
      if (selectedClientId === "new-client" || !selectedClientId) {
        if (!clientData.full_name || !clientData.email) {
          throw new Error('Nombre completo y email son requeridos para crear un cliente nuevo')
        }
        
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
        clientInfo = newClient
      } else {
        // Get existing client info
        const { data: existingClient, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', selectedClientId)
          .single()

        if (clientError) throw clientError
        clientInfo = existingClient
      }

      if (!clientId || !selectedPlanId) {
        throw new Error('Cliente y plan son requeridos')
      }

      // Step 2: Create subscription with calculated end_date
      const totalCost = selectedPlan?.price_usd || 0
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (selectedPlan?.duration_days || 0))

      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          client_id: clientId,
          plan_id: selectedPlanId,
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0],
          total_cost_usd: totalCost,
          status: 'active',
          next_step: 'pending_onboarding',
          call_level_included: callLevelIncluded,
          notes: notes
        })
        .select()
        .single()

      if (subscriptionError) throw subscriptionError

      // Step 3: Create installments based on count
      const installments = []
      const installmentAmount = totalCost / installmentCount
      
      for (let i = 1; i <= installmentCount; i++) {
        let amount = installmentAmount
        
        // Apply business rules for installment amounts
        if (installmentCount === 2) {
          amount = i === 1 ? totalCost * 0.5 : totalCost * 0.5
        } else if (installmentCount === 3) {
          if (i === 1) amount = totalCost * 0.5
          else if (i === 2) amount = totalCost * 0.25
          else amount = totalCost * 0.25
        }

        const dueDate = new Date(startDate)
        dueDate.setDate(dueDate.getDate() + (i - 1) * 30) // 30 days apart

        installments.push({
          subscription_id: subscription.id,
          installment_number: i,
          amount_usd: amount,
          due_date: dueDate.toISOString().split('T')[0],
          status: i === 1 ? 'paid' : 'pending',
          payment_method: i === 1 ? firstPaymentMethod : null,
          payment_date: i === 1 ? startDate : null
        })
      }

      const { data: createdInstallments, error: installmentsError } = await supabase
        .from('installments')
        .insert(installments)
        .select()

      if (installmentsError) throw installmentsError

      // Step 4: Send onboarding webhook with all data
      const webhookData = {
        client: clientInfo,
        subscription: subscription,
        plan: selectedPlan,
        installments: createdInstallments,
        onboarding: {
          next_step: 'pending_onboarding',
          call_level_included: callLevelIncluded,
          notes: notes,
          created_at: new Date().toISOString()
        }
      }

      console.log('Sending onboarding webhook:', webhookData)

      try {
        const webhookResponse = await fetch('https://hooks.infragrowthai.com/webhook/client/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        })

        if (!webhookResponse.ok) {
          console.error('Webhook failed:', await webhookResponse.text())
          throw new Error('Failed to send onboarding webhook')
        }

        console.log('Onboarding webhook sent successfully')
      } catch (webhookError) {
        console.error('Error sending onboarding webhook:', webhookError)
        throw new Error('Failed to send onboarding webhook')
      }

      return { clientId, subscriptionId: subscription.id }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      
      toast({
        title: "¡Venta creada exitosamente!",
        description: "La nueva suscripción ha sido registrada y el webhook de onboarding ha sido enviado automáticamente."
      })
      
      navigate(`/clients/${data.clientId}`)
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear la venta",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      })
    }
  })

  const handleSubmit = () => {
    createSaleMutation.mutate()
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Paso 1: Seleccionar Cliente
              </CardTitle>
              <CardDescription>
                Elige un cliente existente o crea uno nuevo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="existing-client">Cliente Existente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-client">-- Crear nuevo cliente --</SelectItem>
                    {existingClients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId === "new-client" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium">Crear Nuevo Cliente</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Nombre Completo *</Label>
                      <Input
                        id="full_name"
                        value={clientData.full_name}
                        onChange={(e) => setClientData({...clientData, full_name: e.target.value})}
                        placeholder="Nombre completo del cliente"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={clientData.email}
                        onChange={(e) => setClientData({...clientData, email: e.target.value})}
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone_number">Teléfono</Label>
                      <Input
                        id="phone_number"
                        value={clientData.phone_number}
                        onChange={(e) => setClientData({...clientData, phone_number: e.target.value})}
                        placeholder="+1234567890"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="drive_folder_url">URL Carpeta Drive</Label>
                      <Input
                        id="drive_folder_url"
                        value={clientData.drive_folder_url}
                        onChange={(e) => setClientData({...clientData, drive_folder_url: e.target.value})}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Paso 2: Configuración de la Venta
              </CardTitle>
              <CardDescription>
                Define los detalles del plan y pagos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="plan">Plan *</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price_usd} ({plan.duration_days} días)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">Detalles del Plan Seleccionado</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Precio:</p>
                      <p className="font-semibold text-primary">${selectedPlan.price_usd}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duración:</p>
                      <p>{selectedPlan.duration_days} días</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo:</p>
                      <p>{selectedPlan.plan_type === 'core' ? 'Plan Principal' : 'Renovación'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="installments">Número de Cuotas *</Label>
                  <Select value={installmentCount.toString()} onValueChange={(value) => setInstallmentCount(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 pago (100%)</SelectItem>
                      <SelectItem value="2">2 pagos (50% / 50%)</SelectItem>
                      <SelectItem value="3">3 pagos (50% / 25% / 25%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="start_date">Fecha de Inicio *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment_method">Método del Primer Pago</Label>
                <Select value={firstPaymentMethod} onValueChange={(value) => setFirstPaymentMethod(value as 'stripe' | 'crypto' | 'bank_transfer' | 'paypal')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="crypto">Criptomonedas</SelectItem>
                    <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="call_level" 
                  checked={callLevelIncluded}
                  onCheckedChange={(checked) => setCallLevelIncluded(checked as boolean)}
                />
                <Label htmlFor="call_level">Incluye nivel de llamadas</Label>
              </div>

              <div>
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales sobre la venta..."
                  rows={3}
                />
              </div>

              {selectedPlan && (
                <div className="p-4 border rounded-lg bg-primary/5">
                  <h4 className="font-medium mb-2">Resumen de Pagos</h4>
                  <div className="space-y-2 text-sm">
                    {Array.from({ length: installmentCount }, (_, i) => {
                      let amount = selectedPlan.price_usd / installmentCount
                      if (installmentCount === 2) {
                        amount = selectedPlan.price_usd * 0.5
                      } else if (installmentCount === 3) {
                        if (i === 0) amount = selectedPlan.price_usd * 0.5
                        else amount = selectedPlan.price_usd * 0.25
                      }
                      
                      const dueDate = new Date(startDate)
                      dueDate.setDate(dueDate.getDate() + i * 30)
                      
                      return (
                        <div key={i} className="flex justify-between">
                          <span>Cuota {i + 1} ({dueDate.toLocaleDateString()}):</span>
                          <span className="font-semibold">${amount.toFixed(2)}</span>
                        </div>
                      )
                    })}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-primary">${selectedPlan.price_usd}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  const canProceedToStep2 = selectedClientId === "new-client" ? (clientData.full_name && clientData.email) : selectedClientId
  const canSubmit = canProceedToStep2 && selectedPlanId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
          <UserPlus className="h-8 w-8 text-primary" />
          Nueva Venta
        </h1>
        <p className="text-muted-foreground mt-2">
          Crea una nueva suscripción paso a paso
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
            step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            1
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
            step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
        </div>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          Anterior
        </Button>
        
        <div className="space-x-2">
          {step < 2 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={!canProceedToStep2}
              className="amethyst-gradient hover:opacity-90"
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit || createSaleMutation.isPending}
              className="amethyst-gradient hover:opacity-90"
            >
              {createSaleMutation.isPending ? 'Creando...' : 'Crear Venta'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
