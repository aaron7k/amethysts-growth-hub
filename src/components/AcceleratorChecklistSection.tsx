
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Circle, FileText, Settings } from "lucide-react"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

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

interface AcceleratorChecklistSectionProps {
  subscriptionId: string
  stageNumber: number
  stageName: string
  isCurrentStage: boolean
}

export const AcceleratorChecklistSection = ({ 
  subscriptionId, 
  stageNumber, 
  stageName,
  isCurrentStage 
}: AcceleratorChecklistSectionProps) => {
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()

  // Obtener checklist de la etapa
  const { data: checklist, isLoading } = useQuery({
    queryKey: ['stage-checklist', subscriptionId, stageNumber],
    queryFn: async () => {
      console.log('Fetching checklist for stage:', stageNumber, 'subscription:', subscriptionId)
      const { data, error } = await supabase.rpc('get_stage_checklist_progress', {
        p_subscription_id: subscriptionId,
        p_stage_number: stageNumber
      })
      
      if (error) {
        console.error('Error fetching checklist:', error)
        throw error
      }
      console.log('Checklist data:', data)
      return data as ChecklistItem[]
    }
  })

  // Mutation para actualizar checklist
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ templateId, isCompleted, notes }: { 
      templateId: string, 
      isCompleted: boolean, 
      notes?: string 
    }) => {
      console.log('Updating checklist item:', templateId, isCompleted, notes)
      
      const updateData: any = {
        is_completed: isCompleted,
        notes: notes || null
      }
      
      if (isCompleted) {
        updateData.completed_at = new Date().toISOString()
        updateData.completed_by = 'current_user' // TODO: obtener usuario actual
      } else {
        updateData.completed_at = null
        updateData.completed_by = null
      }

      const { error } = await supabase
        .from('accelerator_checklist_progress')
        .update(updateData)
        .eq('subscription_id', subscriptionId)
        .eq('template_id', templateId)
      
      if (error) {
        console.error('Error updating checklist:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-checklist', subscriptionId, stageNumber] })
      toast({
        title: "Checklist actualizado",
        description: "El progreso se ha guardado correctamente"
      })
    },
    onError: (error) => {
      console.error('Failed to update checklist:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el checklist",
        variant: "destructive"
      })
    }
  })

  const handleCheckboxChange = (templateId: string, isCompleted: boolean) => {
    const notes = notesByItem[templateId] || ''
    updateChecklistMutation.mutate({ templateId, isCompleted, notes })
  }

  const handleNotesChange = (templateId: string, notes: string) => {
    setNotesByItem(prev => ({ ...prev, [templateId]: notes }))
  }

  const handleSaveNotes = (templateId: string) => {
    const item = checklist?.find(c => c.template_id === templateId)
    if (item) {
      const notes = notesByItem[templateId] || ''
      updateChecklistMutation.mutate({ 
        templateId, 
        isCompleted: item.is_completed, 
        notes 
      })
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando checklist...</div>
  }

  if (!checklist || checklist.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No hay items de checklist configurados para esta etapa
      </div>
    )
  }

  const completedItems = checklist.filter(item => item.is_completed).length
  const totalItems = checklist.length
  const completionPercentage = Math.round((completedItems / totalItems) * 100)

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Checklist - {stageName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
              {completedItems}/{totalItems} ({completionPercentage}%)
            </Badge>
            {completionPercentage === 100 && (
              <Badge className="bg-green-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                Completado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {checklist.map((item) => (
            <div key={item.template_id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange(item.template_id, checked as boolean)
                  }
                  disabled={!isCurrentStage || updateChecklistMutation.isPending}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.item_name}
                    </h4>
                    {!item.is_required && (
                      <Badge variant="outline" className="text-xs">
                        Opcional
                      </Badge>
                    )}
                  </div>
                  
                  {item.item_description && (
                    <p className="text-sm text-muted-foreground">
                      {item.item_description}
                    </p>
                  )}
                  
                  {item.completed_at && (
                    <p className="text-xs text-green-600">
                      Completado el {new Date(item.completed_at).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="ml-8 space-y-2">
                <Textarea
                  placeholder="Notas adicionales (opcional)..."
                  value={notesByItem[item.template_id] || item.notes || ''}
                  onChange={(e) => handleNotesChange(item.template_id, e.target.value)}
                  disabled={!isCurrentStage}
                  rows={2}
                />
                {notesByItem[item.template_id] !== (item.notes || '') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveNotes(item.template_id)}
                    disabled={updateChecklistMutation.isPending}
                  >
                    Guardar Notas
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
