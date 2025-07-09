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
import { UserCheck, CheckCircle, Clock, ArrowRight, FileText, Filter, Users } from "lucide-react"
import { useUserProfile } from "@/hooks/useUserProfile"

const CHECKLIST_ITEMS = [
  { 
    key: 'document_sent', 
    label: 'Enviar Documento de Onboarding por Mail',
    description: 'Envío del documento oficial de onboarding'
  },
  { 
    key: 'academy_access_granted', 
    label: 'Acceso a Accelerator (ACADEMIA ACCELERATOR)',
    description: 'Otorgar acceso a la plataforma de academia'
  },
  { 
    key: 'contract_sent', 
    label: 'Envío de contrato estandarizado',
    description: 'Enviar contrato oficial del programa'
  },
  { 
    key: 'highlevel_subccount_created', 
    label: 'Creación de subcuenta de high-level',
    description: 'Configurar subcuenta en HighLevel'
  },
  { 
    key: 'discord_groups_created', 
    label: 'Creación automática de grupos privados de Discord',
    description: 'Crear grupos privados en Discord'
  },
  { 
    key: 'onboarding_meeting_scheduled', 
    label: 'Agendar reunión de Onboarding 1:1 con Martín explicando el proceso de la Etapa 1',
    description: 'Programar sesión inicial con Martín'
  }
]

export default function Onboarding() {
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending') // 'pending', 'completed', 'all'
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: userProfile } = useUserProfile()

  // Fetch accelerator onboarding checklists
  const { data: checklists, isLoading } = useQuery({
    queryKey: ['accelerator-onboarding-checklists', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('accelerator_onboarding_checklist')
        .select(`
          *,
          clients(full_name, email, phone_number),
          subscriptions(
            id,
            start_date,
            end_date,
            status,
            plans(name, plan_type)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter === 'pending') {
        query = query.eq('is_completed', false)
      } else if (statusFilter === 'completed') {
        query = query.eq('is_completed', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })

  // Update checklist item
  const updateChecklistMutation = useMutation({
    mutationFn: async (data: {
      id: string
      field: string
      value: boolean
      completedBy?: string
    }) => {
      const updateData: any = {
        [data.field]: data.value,
        updated_at: new Date().toISOString()
      }

      if (data.value && data.completedBy) {
        updateData[`${data.field}_at`] = new Date().toISOString()
        updateData[`${data.field}_by`] = data.completedBy
      } else if (!data.value) {
        updateData[`${data.field}_at`] = null
        updateData[`${data.field}_by`] = null
      }

      const { error } = await supabase
        .from('accelerator_onboarding_checklist')
        .update(updateData)
        .eq('id', data.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accelerator-onboarding-checklists'] })
    }
  })

  // Complete entire checklist
  const completeChecklistMutation = useMutation({
    mutationFn: async (data: { id: string, notes?: string }) => {
      const { error } = await supabase
        .from('accelerator_onboarding_checklist')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accelerator-onboarding-checklists'] })
      toast({
        title: "Onboarding completado",
        description: "El onboarding del cliente ha sido marcado como completado."
      })
      setSelectedChecklistId('')
      setNotes('')
    }
  })

  const selectedChecklist = checklists?.find(c => c.id === selectedChecklistId)

  const handleItemToggle = (field: string, value: boolean) => {
    if (!selectedChecklist) return
    
    updateChecklistMutation.mutate({
      id: selectedChecklist.id,
      field,
      value,
      completedBy: userProfile?.full_name || userProfile?.email || 'Usuario'
    })
  }

  const isAllItemsCompleted = (checklist: any) => {
    return CHECKLIST_ITEMS.every(item => checklist[item.key])
  }

  const getCompletedCount = (checklist: any) => {
    return CHECKLIST_ITEMS.filter(item => checklist[item.key]).length
  }

  const handleCompleteOnboarding = () => {
    if (!selectedChecklist) return
    
    if (!isAllItemsCompleted(selectedChecklist)) {
      toast({
        title: "Tareas pendientes",
        description: "Debes completar todas las tareas antes de finalizar el onboarding.",
        variant: "destructive"
      })
      return
    }

    completeChecklistMutation.mutate({
      id: selectedChecklist.id,
      notes
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-primary" />
            Onboarding Accelerator
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión del checklist de onboarding para alumnos del programa Accelerator
          </p>
        </div>
        
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklists List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Alumnos Accelerator
            </CardTitle>
            <CardDescription>
              {checklists?.length || 0} alumno(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : checklists?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No hay alumnos con el filtro seleccionado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checklists?.map((checklist) => (
                  <div 
                    key={checklist.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedChecklistId === checklist.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedChecklistId(checklist.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{checklist.clients?.full_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {checklist.clients?.email}
                        </p>
                      </div>
                      <Badge 
                        variant={checklist.is_completed ? "default" : "secondary"}
                        className={checklist.is_completed ? "bg-green-100 text-green-800" : ""}
                      >
                        {checklist.is_completed ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{checklist.subscriptions?.plans?.name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-muted-foreground">
                          Inicio: {new Date(checklist.subscriptions?.start_date || '').toLocaleDateString()}
                        </p>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {getCompletedCount(checklist)}/{CHECKLIST_ITEMS.length}
                        </span>
                      </div>
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
              {selectedChecklist ? 
                `${selectedChecklist.clients?.full_name} - ${getCompletedCount(selectedChecklist)}/${CHECKLIST_ITEMS.length} completadas` : 
                'Selecciona un alumno para ver su checklist'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedChecklist ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4" />
                <p>Selecciona un alumno de la lista para gestionar su onboarding</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Client Info */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-2">{selectedChecklist.clients?.full_name}</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <p><strong>Email:</strong> {selectedChecklist.clients?.email}</p>
                    {selectedChecklist.clients?.phone_number && (
                      <p><strong>Teléfono:</strong> {selectedChecklist.clients?.phone_number}</p>
                    )}
                    <p><strong>Plan:</strong> {selectedChecklist.subscriptions?.plans?.name}</p>
                    <p><strong>Fecha de inicio:</strong> {new Date(selectedChecklist.subscriptions?.start_date || '').toLocaleDateString()}</p>
                    {selectedChecklist.is_completed && (
                      <p><strong>Completado:</strong> {new Date(selectedChecklist.completed_at || '').toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Tareas del Onboarding</h4>
                  {CHECKLIST_ITEMS.map((item) => {
                    const isCompleted = selectedChecklist[item.key]
                    const completedAt = selectedChecklist[`${item.key}_at`]
                    const completedBy = selectedChecklist[`${item.key}_by`]
                    
                    return (
                      <div key={item.key} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={item.key}
                            checked={isCompleted || false}
                            onCheckedChange={(checked) => handleItemToggle(item.key, checked as boolean)}
                            disabled={selectedChecklist.is_completed}
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={item.key} 
                              className={`text-sm font-medium cursor-pointer block ${
                                isCompleted ? 'text-green-600' : 'text-foreground'
                              }`}
                            >
                              {item.label}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </p>
                            {isCompleted && completedAt && (
                              <div className="mt-2 text-xs text-green-600">
                                ✓ Completado el {new Date(completedAt).toLocaleDateString()}
                                {completedBy && ` por ${completedBy}`}
                              </div>
                            )}
                          </div>
                          {isCompleted && (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Notes */}
                {!selectedChecklist.is_completed && (
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
                )}

                {/* Show existing notes if completed */}
                {selectedChecklist.is_completed && selectedChecklist.notes && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Notas del Onboarding
                    </label>
                    <div className="p-3 bg-muted/30 rounded text-sm">
                      {selectedChecklist.notes}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!selectedChecklist.is_completed && (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleCompleteOnboarding}
                      disabled={completeChecklistMutation.isPending || !isAllItemsCompleted(selectedChecklist)}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finalizar Onboarding
                    </Button>
                  </div>
                )}

                {/* Completed badge */}
                {selectedChecklist.is_completed && (
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-green-800 font-medium">Onboarding Completado</p>
                    <p className="text-green-600 text-sm">
                      Finalizado el {new Date(selectedChecklist.completed_at || '').toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Progress Indicator */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progreso</span>
                    <span>
                      {getCompletedCount(selectedChecklist)} / {CHECKLIST_ITEMS.length}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(getCompletedCount(selectedChecklist) / CHECKLIST_ITEMS.length) * 100}%`
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
