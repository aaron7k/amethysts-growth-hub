
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, Circle, FileText, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface StageChecklistProps {
  subscriptionId: string
  stageNumber: number
  stageName: string
  isCurrentStage: boolean
}

interface ChecklistItem {
  template_id: string
  item_name: string
  item_description: string
  is_required: boolean
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  item_order: number
}

const StageChecklist = ({ subscriptionId, stageNumber, stageName, isCurrentStage }: StageChecklistProps) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>("")
  const [pendingItems, setPendingItems] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  // Obtener el progreso del checklist para esta etapa
  const { data: checklistItems, isLoading } = useQuery({
    queryKey: ['stage-checklist', subscriptionId, stageNumber],
    queryFn: async () => {
      console.log('Fetching checklist for stage:', stageNumber, 'subscription:', subscriptionId)
      const { data, error } = await supabase
        .rpc('get_stage_checklist_progress', {
          p_subscription_id: subscriptionId,
          p_stage_number: stageNumber
        })
      
      if (error) {
        console.error('Error fetching checklist:', error)
        throw error
      }
      console.log('Checklist items:', data)
      return data as ChecklistItem[]
    }
  })

  // Mutación para actualizar el progreso de un item
  const updateProgressMutation = useMutation({
    mutationFn: async ({ templateId, isCompleted, notes }: { templateId: string, isCompleted: boolean, notes?: string }) => {
      console.log('Updating progress for template:', templateId, 'completed:', isCompleted)
      
      if (isCompleted) {
        // Insertar o actualizar el progreso como completado
        const { error } = await supabase
          .from('accelerator_checklist_progress')
          .upsert({
            subscription_id: subscriptionId,
            template_id: templateId,
            stage_number: stageNumber,
            is_completed: true,
            completed_at: new Date().toISOString(),
            completed_by: 'current_user',
            notes: notes || null,
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.error('Error updating progress:', error)
          throw error
        }
      } else {
        // Para desmarcar: eliminar el registro o marcarlo como no completado
        const { error } = await supabase
          .from('accelerator_checklist_progress')
          .delete()
          .eq('subscription_id', subscriptionId)
          .eq('template_id', templateId)
          .eq('stage_number', stageNumber)
        
        if (error) {
          console.error('Error removing progress:', error)
          throw error
        }
      }
      
      console.log('Progress updated successfully')
    },
    onSuccess: (_, variables) => {
      // Remover del estado de pendientes
      setPendingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(variables.templateId)
        return newSet
      })
      
      // Invalidar y refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['stage-checklist', subscriptionId, stageNumber] })
      toast({
        title: "Progreso actualizado",
        description: "El elemento del checklist se ha actualizado correctamente"
      })
      
      // Limpiar el estado del modal solo si es el item que se está guardando
      if (selectedItem === variables.templateId) {
        setSelectedItem(null)
        setNotes("")
      }
    },
    onError: (error, variables) => {
      console.error('Failed to update progress:', error)
      
      // Remover del estado de pendientes
      setPendingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(variables.templateId)
        return newSet
      })
      
      toast({
        title: "Error",
        description: "No se pudo actualizar el progreso",
        variant: "destructive"
      })
    }
  })

  const handleItemToggle = (item: ChecklistItem, checked: boolean | string) => {
    console.log('Checkbox clicked:', item.item_name, 'checked:', checked)
    
    const isChecked = checked === true
    
    // Si ya hay un item siendo procesado, mostrar advertencia
    if (selectedItem && selectedItem !== item.template_id) {
      toast({
        title: "Completar elemento actual",
        description: "Por favor completa el elemento actual antes de seleccionar otro",
        variant: "destructive"
      })
      return
    }
    
    if (isChecked && !item.is_completed) {
      // Marcar como completado - mostrar modal para notas
      setSelectedItem(item.template_id)
      setNotes(item.notes || "")
      setPendingItems(prev => new Set(prev).add(item.template_id))
    } else if (!isChecked && item.is_completed) {
      // Desmarcar - actualizar directamente
      setPendingItems(prev => new Set(prev).add(item.template_id))
      updateProgressMutation.mutate({
        templateId: item.template_id,
        isCompleted: false
      })
    }
  }

  const handleCompleteWithNotes = () => {
    if (selectedItem) {
      updateProgressMutation.mutate({
        templateId: selectedItem,
        isCompleted: true,
        notes: notes
      })
    }
  }

  const handleCancelNotes = () => {
    if (selectedItem) {
      setPendingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedItem)
        return newSet
      })
    }
    setSelectedItem(null)
    setNotes("")
  }

  const completedCount = checklistItems?.filter(item => item.is_completed).length || 0
  const totalCount = checklistItems?.length || 0
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Cargando checklist...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${isCurrentStage ? 'border-primary bg-primary/5' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {stageName} - Checklist
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
              {completedCount}/{totalCount} ({progressPercentage}%)
            </Badge>
            {isCurrentStage && (
              <Badge className="bg-primary text-primary-foreground">Etapa Actual</Badge>
            )}
          </div>  
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Advertencia sobre selección múltiple */}
        {selectedItem && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Solo puedes completar un elemento a la vez. 
              Completa el elemento actual antes de seleccionar otro.
            </AlertDescription>
          </Alert>
        )}

        {!checklistItems || checklistItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No hay elementos configurados para esta etapa
          </div>
        ) : (
          <div className="space-y-3">
            {checklistItems.map((item) => {
              const isPending = pendingItems.has(item.template_id)
              const isBeingEdited = selectedItem === item.template_id
              
              return (
                <div key={item.template_id} className={`flex items-start gap-3 p-3 border rounded-lg ${
                  isPending ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : ''
                } ${isBeingEdited ? 'bg-primary/5 border-primary/20' : ''}`}>
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={(checked) => handleItemToggle(item, checked)}
                    className="mt-1"
                    disabled={updateProgressMutation.isPending || (selectedItem !== null && selectedItem !== item.template_id)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.item_name}
                        {isPending && !isBeingEdited && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Guardando...)</span>
                        )}
                        {isBeingEdited && (
                          <span className="ml-2 text-xs text-primary">(Agregando notas...)</span>
                        )}
                      </h4>
                      {item.is_required && (
                        <Badge variant="outline" className="text-xs">Requerido</Badge>
                      )}
                      {item.is_completed && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    
                    {item.item_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.item_description}
                      </p>
                    )}
                    
                    {item.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <strong>Notas:</strong> {item.notes}
                      </div>
                    )}
                    
                    {item.completed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completado: {new Date(item.completed_at).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal para agregar notas al completar */}
        {selectedItem && (
          <div className="mt-4 p-4 border rounded-lg bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <Label htmlFor="completion-notes" className="text-sm font-medium">
                Agregar notas para: {checklistItems?.find(item => item.template_id === selectedItem)?.item_name}
              </Label>
            </div>
            <Textarea
              id="completion-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribir notas sobre la completación de este elemento... (opcional)"
              className="mt-2"
            />
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleCompleteWithNotes}
                disabled={updateProgressMutation.isPending}
                size="sm"
              >
                {updateProgressMutation.isPending ? 'Guardando...' : 'Marcar como Completado'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelNotes}
                size="sm"
                disabled={updateProgressMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StageChecklist
