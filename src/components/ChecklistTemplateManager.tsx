
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings, Plus, Edit, Trash2, ArrowLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"

interface ChecklistTemplate {
  id: string
  stage_number: number
  item_name: string
  item_description: string | null
  item_order: number
  is_required: boolean
  is_active: boolean
}

const ChecklistTemplateManager = ({ onBack }: { onBack?: () => void }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null)
  const [formData, setFormData] = useState({
    stage_number: 1,
    item_name: '',
    item_description: '',
    item_order: 1,
    is_required: true,
    is_active: true
  })
  const queryClient = useQueryClient()

  // Obtener todos los templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      console.log('Fetching checklist templates...')
      const { data, error } = await supabase
        .from('accelerator_stage_templates')
        .select('*')
        .order('stage_number', { ascending: true })
        .order('item_order', { ascending: true })
      
      if (error) {
        console.error('Error fetching templates:', error)
        throw error
      }
      console.log('Templates fetched:', data)
      return data as ChecklistTemplate[]
    }
  })

  // Mutación para crear/actualizar template
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: typeof formData) => {
      console.log('Saving template:', templateData)
      
      if (editingTemplate) {
        // Actualizar
        const { error } = await supabase
          .from('accelerator_stage_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
        
        if (error) throw error
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('accelerator_stage_templates')
          .insert(templateData)
        
        if (error) throw error
      }
      console.log('Template saved successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] })
      toast({
        title: editingTemplate ? "Template actualizado" : "Template creado",
        description: "Los cambios se han guardado correctamente"
      })
      handleCloseDialog()
    },
    onError: (error) => {
      console.error('Failed to save template:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar el template",
        variant: "destructive"
      })
    }
  })

  // Mutación para eliminar template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      console.log('Deleting template:', templateId)
      const { error } = await supabase
        .from('accelerator_stage_templates')
        .delete()
        .eq('id', templateId)
      
      if (error) throw error
      console.log('Template deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] })
      toast({
        title: "Template eliminado",
        description: "El elemento se ha eliminado correctamente"
      })
    },
    onError: (error) => {
      console.error('Failed to delete template:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el template",
        variant: "destructive"
      })
    }
  })

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTemplate(null)
    setFormData({
      stage_number: 1,
      item_name: '',
      item_description: '',
      item_order: 1,
      is_required: true,
      is_active: true
    })
  }

  const handleEditTemplate = (template: ChecklistTemplate) => {
    setEditingTemplate(template)
    setFormData({
      stage_number: template.stage_number,
      item_name: template.item_name,
      item_description: template.item_description || '',
      item_order: template.item_order,
      is_required: template.is_required,
      is_active: template.is_active
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveTemplateMutation.mutate(formData)
  }

  const groupedTemplates = templates?.reduce((acc, template) => {
    if (!acc[template.stage_number]) {
      acc[template.stage_number] = []
    }
    acc[template.stage_number].push(template)
    return acc
  }, {} as Record<number, ChecklistTemplate[]>)

  const stageNames = {
    1: 'Nicho & Oferta',
    2: 'Infraestructura',
    3: 'Validación & Ventas',
    4: 'Post-Meta'
  }

  if (isLoading) {
    return <div className="p-6">Cargando configuración...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Configuración de Checklists
            </h1>
            <p className="text-muted-foreground">
              Gestiona los elementos del checklist para cada etapa
            </p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Elemento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Elemento' : 'Nuevo Elemento'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stage_number">Etapa</Label>
                  <select
                    id="stage_number"
                    value={formData.stage_number}
                    onChange={(e) => setFormData({...formData, stage_number: Number(e.target.value)})}
                    className="w-full p-2 border rounded"
                  >
                    <option value={1}>Etapa 1 - Nicho & Oferta</option>
                    <option value={2}>Etapa 2 - Infraestructura</option>
                    <option value={3}>Etapa 3 - Validación & Ventas</option>
                    <option value={4}>Etapa 4 - Post-Meta</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="item_order">Orden</Label>
                  <Input
                    id="item_order"
                    type="number"
                    value={formData.item_order}
                    onChange={(e) => setFormData({...formData, item_order: Number(e.target.value)})}
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="item_name">Nombre del Elemento</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="item_description">Descripción</Label>
                <Textarea
                  id="item_description"
                  value={formData.item_description}
                  onChange={(e) => setFormData({...formData, item_description: e.target.value})}
                  placeholder="Descripción opcional del elemento"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData({...formData, is_required: checked})}
                  />
                  <Label htmlFor="is_required">Requerido</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Activo</Label>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={saveTemplateMutation.isPending}
                  className="flex-1"
                >
                  {saveTemplateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseDialog}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedTemplates || {}).map(([stageNumber, stageTemplates]) => (
          <Card key={stageNumber}>
            <CardHeader>
              <CardTitle>
                Etapa {stageNumber} - {stageNames[Number(stageNumber) as keyof typeof stageNames]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stageTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.item_name}</span>
                        <Badge variant="outline" className="text-xs">
                          #{template.item_order}
                        </Badge>
                        {template.is_required && (
                          <Badge variant="outline" className="text-xs">Requerido</Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                        )}
                      </div>
                      {template.item_description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.item_description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                        disabled={deleteTemplateMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default ChecklistTemplateManager
