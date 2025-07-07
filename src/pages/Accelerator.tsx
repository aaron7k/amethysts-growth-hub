import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, CheckCircle, AlertTriangle, Target, Users, Settings, Play, CalendarPlus } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"
import StageChecklist from "@/components/StageChecklist"
import ChecklistTemplateManager from "@/components/ChecklistTemplateManager"
import DiscordChannelManager from "@/components/DiscordChannelManager"

interface AcceleratorProgram {
  id: string
  subscription_id: string
  program_start_date: string
  program_end_date: string
  current_stage: number
  goal_reached: boolean
  goal_reached_date: string | null
  status: string
  subscriptions: {
    client_id: string
    clients: {
      full_name: string
      phone_number: string | null
      email: string
    }
    plans: {
      name: string
    }
  }
}

interface AcceleratorStage {
  id: string
  subscription_id: string
  stage_number: number
  stage_name: string
  start_date: string
  end_date: string
  status: string
  completed_at: string | null
  notes: string | null
  is_activated: boolean
}

const Accelerator = () => {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null)
  const [newProgramOpen, setNewProgramOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [activateStagesOpen, setActivateStagesOpen] = useState(false)
  const [selectedProgramForActivation, setSelectedProgramForActivation] = useState<AcceleratorProgram | null>(null)
  const queryClient = useQueryClient()

  // Obtener programas de aceleradora
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['accelerator-programs'],
    queryFn: async () => {
      console.log('Fetching accelerator programs...')
      const { data, error } = await supabase
        .from('accelerator_programs')
        .select(`
          *,
          subscriptions!inner (
            client_id,
            clients!inner (
              full_name,
              phone_number,
              email
            ),
            plans!inner (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching accelerator programs:', error)
        throw error
      }
      console.log('Accelerator programs fetched:', data)
      return data as AcceleratorProgram[]
    }
  })

  // Obtener suscripciones activas con planes de aceleradora que no estén en programas activos
  const { data: availableSubscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['available-subscriptions'],
    queryFn: async () => {
      console.log('Fetching available subscriptions...')
      
      // Primero obtener todas las suscripciones activas con planes de aceleradora
      const { data: allSubscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          clients!inner (
            id,
            full_name
          ),
          plans!inner (
            id,
            name,
            plan_type
          )
        `)
        .eq('status', 'active')
        .eq('plans.name', 'Accelerator Program')
      
      if (subsError) {
        console.error('Error fetching subscriptions:', subsError)
        throw subsError
      }
      
      // Luego obtener las suscripciones que ya están en programas activos
      const { data: existingPrograms, error: programsError } = await supabase
        .from('accelerator_programs')
        .select('subscription_id')
        .eq('status', 'active')
      
      if (programsError) {
        console.error('Error fetching existing programs:', programsError)
        throw programsError
      }
      
      // Filtrar las suscripciones que no están en programas activos
      const usedSubscriptionIds = existingPrograms?.map(p => p.subscription_id) || []
      const availableSubs = allSubscriptions?.filter(sub => 
        !usedSubscriptionIds.includes(sub.id)
      ) || []
      
      console.log('Available subscriptions:', availableSubs)
      console.log('Used subscription IDs:', usedSubscriptionIds)
      
      return availableSubs
    }
  })

  // Obtener etapas del programa seleccionado
  const { data: stages } = useQuery({
    queryKey: ['accelerator-stages', selectedProgram],
    queryFn: async () => {
      if (!selectedProgram) return []
      
      console.log('Fetching stages for program:', selectedProgram)
      const { data, error } = await supabase
        .from('accelerator_stages')
        .select('*')
        .eq('subscription_id', selectedProgram)
        .order('stage_number')
      
      if (error) {
        console.error('Error fetching accelerator stages:', error)
        throw error
      }
      console.log('Stages fetched:', data)
      return data as AcceleratorStage[]
    },
    enabled: !!selectedProgram
  })

  // Obtener etapas para el modal de activación
  const { data: activationStages } = useQuery({
    queryKey: ['activation-stages', selectedProgramForActivation?.subscription_id],
    queryFn: async () => {
      if (!selectedProgramForActivation) return []
      
      const { data, error } = await supabase
        .from('accelerator_stages')
        .select('*')
        .eq('subscription_id', selectedProgramForActivation.subscription_id)
        .order('stage_number')
      
      if (error) {
        console.error('Error fetching activation stages:', error)
        throw error
      }
      return data as AcceleratorStage[]
    },
    enabled: !!selectedProgramForActivation
  })

  // Crear nuevo programa
  const createProgramMutation = useMutation({
    mutationFn: async ({ subscriptionId, startDate }: { subscriptionId: string, startDate: string }) => {
      console.log('Creating program for subscription:', subscriptionId, 'start date:', startDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 120)
      
      const { error } = await supabase
        .from('accelerator_programs')
        .insert({
          subscription_id: subscriptionId,
          program_start_date: startDate,
          program_end_date: endDate.toISOString().split('T')[0]
        })
      
      if (error) {
        console.error('Error creating program:', error)
        throw error
      }
      console.log('Program created successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accelerator-programs'] })
      queryClient.invalidateQueries({ queryKey: ['available-subscriptions'] })
      setNewProgramOpen(false)
      setSelectedSubscription("")
      setStartDate("")
      toast({
        title: "Programa creado",
        description: "El programa de aceleradora se ha creado exitosamente"
      })
    },
    onError: (error) => {
      console.error('Failed to create program:', error)
      toast({
        title: "Error",
        description: "No se pudo crear el programa",
        variant: "destructive"
      })
    }
  })

  // Completar etapa
  const completeStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from('accelerator_stages')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', stageId)
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['accelerator-stages'] })
      toast({
        title: "Etapa completada",
        description: "La etapa se ha marcado como completada"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la etapa",
        variant: "destructive"
      })
    }
  }

  // Marcar meta alcanzada
  const markGoalReached = async (programId: string) => {
    try {
      const { error } = await supabase
        .from('accelerator_programs')
        .update({ 
          goal_reached: true,
          goal_reached_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', programId)
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['accelerator-programs'] })
      toast({
        title: "¡Meta alcanzada!",
        description: "Se ha registrado que el cliente alcanzó su meta"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la meta",
        variant: "destructive"
      })
    }
  }

  // Extender plazo de etapa (prórroga)
  const extendStageDeadline = async (stageId: string, stageName: string) => {
    try {
      const { error } = await supabase.rpc('extend_stage_deadline', {
        p_stage_id: stageId,
        p_days: 7
      })
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['accelerator-stages'] })
      toast({
        title: "Prórroga otorgada",
        description: `Se han agregado 7 días adicionales a la etapa "${stageName}"`
      })
    } catch (error) {
      console.error('Error extending stage deadline:', error)
      toast({
        title: "Error",
        description: "No se pudo otorgar la prórroga",
        variant: "destructive"
      })
    }
  }

  // Activar/Desactivar etapa
  const toggleStageActivation = async (stageId: string, stageNumber: number, activate: boolean, clientId: string) => {
    try {
      // Actualizar en base de datos
      const { error } = await supabase
        .from('accelerator_stages')
        .update({ is_activated: activate })
        .eq('id', stageId)
      
      if (error) throw error

      // Actualizar current_stage del programa siempre (activar o desactivar)
      if (selectedProgramForActivation) {
        // Obtener todas las etapas del programa para calcular la etapa actual
        const { data: allStages, error: stagesError } = await supabase
          .from('accelerator_stages')
          .select('stage_number, is_activated')
          .eq('subscription_id', selectedProgramForActivation.subscription_id)
          .order('stage_number')
        
        if (stagesError) throw stagesError

        // Incluir la etapa que acabamos de cambiar
        const updatedStages = allStages?.map(stage => 
          stage.stage_number === stageNumber 
            ? { ...stage, is_activated: activate }
            : stage
        ) || []

        // Encontrar la etapa activada más alta
        const highestActivatedStage = updatedStages
          .filter(stage => stage.is_activated)
          .reduce((max, stage) => Math.max(max, stage.stage_number), 0)

        // Actualizar current_stage del programa (mínimo 1 si no hay etapas activadas)
        const newCurrentStage = Math.max(1, highestActivatedStage)
        const { error: programError } = await supabase
          .from('accelerator_programs')
          .update({ current_stage: newCurrentStage })
          .eq('id', selectedProgramForActivation.id)
        
        if (programError) throw programError
      }

      // Obtener información completa de la etapa para el webhook
      const stageInfo = activationStages?.find(stage => stage.stage_number === stageNumber)
      
      // Obtener canal de Discord del usuario
      let discordChannel = '#aceleradora' // Default
      try {
        const { data: discordService } = await supabase
          .from('provisioned_services')
          .select('access_details')
          .eq('subscription_id', selectedProgramForActivation?.subscription_id)
          .eq('service_type', 'discord_channel')
          .eq('is_active', true)
          .single()
        
        if (discordService?.access_details && typeof discordService.access_details === 'object') {
          const accessDetails = discordService.access_details as any
          if (accessDetails.channel_category) {
            discordChannel = `<#${accessDetails.channel_category}>`
          }
        }
      } catch (error) {
        console.log('Could not fetch Discord channel, using default:', error)
      }
      
      // Enviar webhook con información completa
      await fetch('https://hooks.infragrowthai.com/webhook/activate-phase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_id: `manual-activation-${Date.now()}`,
          client_id: selectedProgramForActivation?.subscriptions.client_id,
          subscription_id: selectedProgramForActivation?.subscription_id,
          stage_number: stageNumber,
          stage_name: stageInfo?.stage_name || `Etapa ${stageNumber}`,
          start_date: stageInfo?.start_date,
          end_date: stageInfo?.end_date,
          program_day: selectedProgramForActivation?.program_start_date ? 
            Math.floor((new Date().getTime() - new Date(selectedProgramForActivation.program_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 : null,
          discord_channel: discordChannel,
          timestamp: new Date().toISOString(),
          // Mantener compatibilidad con formato anterior
          phase: stageNumber,
          user_id: clientId,
          activate: activate
        })
      })
      
      queryClient.invalidateQueries({ queryKey: ['accelerator-programs'] })
      queryClient.invalidateQueries({ queryKey: ['accelerator-stages'] })
      queryClient.invalidateQueries({ queryKey: ['activation-stages', selectedProgramForActivation?.subscription_id] })
      toast({
        title: activate ? "Etapa activada" : "Etapa desactivada",
        description: `La etapa ${stageNumber} se ha ${activate ? 'activado' : 'desactivado'} correctamente`
      })
    } catch (error) {
      console.error('Error toggling stage activation:', error)
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la etapa",
        variant: "destructive"
      })
    }
  }

  const openActivateStagesModal = (program: AcceleratorProgram) => {
    setSelectedProgramForActivation(program)
    setActivateStagesOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500'
      case 'in_progress': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'overdue': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'in_progress': return 'En Progreso'
      case 'completed': return 'Completada'
      case 'overdue': return 'Atrasada'
      default: return status
    }
  }

  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()
    
    if (now < start) return 0
    if (now > end) return 100
    
    const total = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    return Math.round((elapsed / total) * 100)
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getCurrentStageInfo = (stages: AcceleratorStage[], currentStage: number) => {
    return stages?.find(stage => stage.stage_number === currentStage)
  }

  const getStageNames = () => [
    { number: 1, name: "Nicho & Oferta", description: "Definición del nicho y oferta principal" },
    { number: 2, name: "Infraestructura", description: "Configuración técnica y operativa" },
    { number: 3, name: "Validación & Ventas", description: "Validación del mercado y primeras ventas" },
    { number: 4, name: "Post-Meta", description: "Escalamiento y optimización" }
  ]

  if (showTemplateManager) {
    return <ChecklistTemplateManager />
  }

  if (programsLoading) {
    return <div className="p-6">Cargando programas...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Programa Aceleradora</h1>
          <p className="text-muted-foreground">
            Gestión y seguimiento de clientes en el programa de 120 días
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTemplateManager(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurar Checklists
          </Button>
          
          <Dialog open={newProgramOpen} onOpenChange={setNewProgramOpen}>
            <DialogTrigger asChild>
              <Button>
                <Users className="mr-2 h-4 w-4" />
                Nuevo Programa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Programa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subscription">Cliente</Label>
                  {subscriptionsLoading ? (
                    <div className="text-sm text-muted-foreground">Cargando clientes...</div>
                  ) : availableSubscriptions && availableSubscriptions.length > 0 ? (
                    <Select value={selectedSubscription} onValueChange={setSelectedSubscription}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubscriptions.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.clients?.full_name} - {sub.plans?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No hay clientes con planes de Accelerator Program disponibles
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="start-date">Fecha de Inicio</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => createProgramMutation.mutate({ 
                    subscriptionId: selectedSubscription, 
                    startDate 
                  })}
                  disabled={!selectedSubscription || !startDate || createProgramMutation.isPending}
                  className="w-full"
                >
                  {createProgramMutation.isPending ? 'Creando...' : 'Crear Programa'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {programs?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay programas de aceleradora activos</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {programs?.map((program) => (
          <Card key={program.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {program.subscriptions.clients.full_name}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    {program.subscriptions.plans.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {program.goal_reached && (
                    <Badge className="bg-green-500">
                      <Target className="mr-1 h-3 w-3" />
                      Meta Alcanzada
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Etapa {program.current_stage}/4
                  </Badge>
                  <Badge variant={program.status === 'active' ? 'default' : 'secondary'}>
                    {program.status === 'active' ? 'Activo' : program.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Inicio</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(program.program_start_date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Días Restantes</p>
                    <p className="text-sm text-muted-foreground">
                      {getDaysRemaining(program.program_end_date)} días
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">
                    Etapa Actual: {program.current_stage}
                  </Badge>
                  {stages && (
                    <Badge variant="outline">
                      {getCurrentStageInfo(stages, program.current_stage)?.stage_name || `Etapa ${program.current_stage}`}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Progreso General</p>
                    <p className="text-sm text-muted-foreground">
                      {calculateProgress(program.program_start_date, program.program_end_date)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Progress 
                  value={calculateProgress(program.program_start_date, program.program_end_date)} 
                  className="h-2"
                />
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-4">Timeline de las 4 Etapas</h3>
                
                {/* Timeline visual de las 4 etapas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {getStageNames().map((stageInfo, index) => {
                    const stageData = stages?.find(s => s.stage_number === stageInfo.number)
                    const isCurrentStage = program.current_stage === stageInfo.number
                    const isCompleted = stageData?.status === 'completed'
                    const isOverdue = stageData?.status === 'overdue'
                    
                    return (
                      <Card key={stageInfo.number} className={`relative ${
                        isCurrentStage ? 'border-primary bg-primary/5' : ''
                      } ${isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''} ${
                        isOverdue ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              isCurrentStage ? 'bg-primary text-primary-foreground' :
                              isCompleted ? 'bg-green-500 text-white' :
                              isOverdue ? 'bg-red-500 text-white' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {stageInfo.number}
                            </div>
                            {isCurrentStage && (
                              <Badge className="text-xs bg-primary">Actual</Badge>
                            )}
                          </div>
                          
                          <h4 className="font-semibold text-sm mb-1">{stageInfo.name}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{stageInfo.description}</p>
                          
                          {stageData && (
                            <div className="space-y-1">
                              <p className="text-xs">
                                <strong>Inicio:</strong> {new Date(stageData.start_date).toLocaleDateString('es-ES')}
                              </p>
                              <p className="text-xs">
                                <strong>Fin:</strong> {new Date(stageData.end_date).toLocaleDateString('es-ES')}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {getStatusLabel(stageData.status)}
                                </Badge>
                                {(stageData.status === 'in_progress' || stageData.status === 'overdue') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => extendStageDeadline(stageData.id, stageData.stage_name)}
                                  >
                                    <CalendarPlus className="h-3 w-3 mr-1" />
                                    +7d
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Detalle Completo</h3>
                <div className="flex gap-2">
                  <DiscordChannelManager 
                    subscriptionId={program.subscription_id}
                    clientName={program.subscriptions.clients.full_name}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActivateStagesModal(program)}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Activar Etapas
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProgram(
                      selectedProgram === program.subscription_id ? null : program.subscription_id
                    )}
                  >
                    {selectedProgram === program.subscription_id ? 'Ocultar' : 'Ver'} Detalle
                  </Button>
                  {!program.goal_reached && (
                    <Button
                      size="sm"
                      onClick={() => markGoalReached(program.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Target className="mr-1 h-3 w-3" />
                      Marcar Meta
                    </Button>
                  )}
                </div>
              </div>

              {selectedProgram === program.subscription_id && stages && (
                <div className="space-y-6 border-t pt-4">
                  {stages.map((stage, index) => (
                    <div key={stage.id} className="space-y-4">
                      <div className="relative">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium ${getStatusColor(stage.status)}`}>
                            {stage.stage_number}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{stage.stage_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(stage.start_date).toLocaleDateString('es-ES')} - {new Date(stage.end_date).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {getStatusLabel(stage.status)}
                                </Badge>
                                
                                {stage.status === 'in_progress' && (
                                  <Button
                                    size="sm"
                                    onClick={() => completeStage(stage.id)}
                                  >
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Completar
                                  </Button>
                                )}
                                
                                {(stage.status === 'in_progress' || stage.status === 'overdue') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => extendStageDeadline(stage.id, stage.stage_name)}
                                  >
                                    <CalendarPlus className="mr-1 h-3 w-3" />
                                    Pedir Prórroga
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <Progress 
                                value={calculateProgress(stage.start_date, stage.end_date)} 
                                className="h-2"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {calculateProgress(stage.start_date, stage.end_date)}% completado
                              </p>
                            </div>
                            
                            {stage.notes && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                {stage.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {index < stages.length - 1 && (
                          <div className="absolute left-4 top-8 w-px h-12 bg-border"></div>
                        )}
                      </div>
                      
                      {/* Checklist para la etapa */}
                      <div className="ml-12">
                        <StageChecklist
                          subscriptionId={program.subscription_id}
                          stageNumber={stage.stage_number}
                          stageName={stage.stage_name}
                          isCurrentStage={program.current_stage === stage.stage_number}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal para activar etapas */}
      <Dialog open={activateStagesOpen} onOpenChange={setActivateStagesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Activar Etapas - {selectedProgramForActivation?.subscriptions.clients.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 p-4">
            <TooltipProvider>
              {activationStages?.map((stage) => (
                <Tooltip key={stage.id}>
                  <TooltipTrigger asChild>
                     <Button
                       variant={stage.is_activated ? "default" : "outline"}
                       className={`h-24 flex flex-col items-center justify-center p-2 ${
                         stage.is_activated ? 'opacity-75' : ''
                       }`}
                       onClick={() => 
                         toggleStageActivation(
                           stage.id, 
                           stage.stage_number, 
                           !stage.is_activated,
                           selectedProgramForActivation?.subscriptions.client_id || ''
                         )
                       }
                     >
                       <span className="font-bold text-base">Etapa {stage.stage_number}</span>
                       <span className="text-xs text-center leading-tight">{stage.stage_name}</span>
                       {stage.is_activated && (
                         <Badge variant="secondary" className="mt-1 text-xs">
                           Activada
                         </Badge>
                       )}
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {stage.is_activated 
                        ? `Desactivar la ${stage.stage_name}` 
                        : `Activar la ${stage.stage_name}`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Accelerator
