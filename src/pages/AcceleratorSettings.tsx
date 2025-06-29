
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
import { Settings, Plus, Edit, Trash2, GripVertical } from "lucide-react"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

interface StageTemplate {
  id: string
  stage_number: number
  item_order: number
  item_name: string
  item_description: string | null
  is_required: boolean
  is_active: boolean
}

const AcceleratorSettings = () => {
  const [selectedStage, setSelectedStage] = useState(1)
  const [editingItem, setEditingItem] = useState<StageTemplate | null>(null)
  const [newItemDialog, setNewItemDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  
  const [formData, setFormData] = useState({
    item_name: '',
    item_description: '',
    is_required: true
  })

  const queryClient = useQueryClient()

  // Obtener templates por etapa
  const { data: templates, isLoading } = useQuery({
    queryKey: ['stage-templates', selectedStage],
    queryFn: async () => {
      console.log('Fetching templates for stage:', selectedStage)
      const { data, error } = await supabase
        .from('accelerator_stage_templates')
        .select('*')
        .eq('stage_number', selectedStage)
        .eq('is_active', true)
        .order('item_order')
      
      if (error) {
        console.error('Error fetching templates:', error)
        throw error
      }
      console.log('Templates data:', data)
      return data as StageTemplate[]
    }
  })

  // Crear nuevo item
  const createItemMutation = useMutation({
    mutationFn: async (itemData: typeof formData) => {
      const maxOrder = templates?.length ? Math.max(...templates.map(t => t.item_order)) : 0
      
      const { error } = await supabase
        .from('accelerator_stage_templates')
        .insert({
          stage_number: selectedStage,
          item_order: maxOrder + 1,
          item_name: itemData.item_name,
          item_description: itemData.item_description || null,
          is_required: itemData.is_required
        })
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-templates'] })
      setNewItemDialog(false)
      setFormData({ item_name: '', item_description: '', is_required: true })
      toast({
        title: "Item creado",
        description: "El nuevo item del checklist se ha agregado correctamente"
      })
    }
  })

  // Actualizar item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, itemData }: { id: string, itemData: typeof formData }) => {
      const { error } = await supabase
        .from('accelerator_stage_templates')
        .update({
          item_name: itemData.item_name,
          item_description: itemData.item_description || null,
          is_required: itemData.is_required
        })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-templates'] })
      setEditDialog(false)
      setEditingItem(null)
      toast({
        title: "Item actualizado",
        description: "Los cambios se han guardado correctamente"
      })
    }
  })

  // Eliminar item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accelerator_stage_templates')
        .update({ is_active: false })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-templates'] })
      toast({
        title: "Item eliminado",
        description: "El item se ha desactivado correctamente"
      })
    }
  })

  const handleEdit = (item: StageTemplate) => {
    setEditingItem(item)
    setFormData({
      item_name: item.item_name,
      item_description: item.item_description || '',
      is_required: item.is_required
    })
    setEditDialog(true)
  }

  const stageNames = {
    1: 'Nicho & Oferta',
    2: 'Infraestructura', 
    3: 'Validación & Ventas',
    4: 'Post-Meta'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configuración de Checklist
        </h1>
        <p className="text-muted-foreground">
          Administra los items del checklist para cada etapa de la aceleradora
        </p>
      </div>

      {/* Selector de etapas */}
      <div className="mb-6">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((stage) => (
            <Button
              key={stage}
              variant={selectedStage === stage ? "default" : "outline"}
              onClick={() => setSelectedStage(stage)}
            >
              Etapa {stage}: {stageNames[stage as keyof typeof stageNames]}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Items de Etapa {selectedStage}: {stageNames[selectedStage as keyof typeof stageNames]}
            </CardTitle>
            <Dialog open={newItemDialog} onOpenChange={setNewItemDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Item del Checklist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="item_name">Nombre del Item *</Label>
                    <Input
                      id="item_name"
                      value={formData.item_name}
                      onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                      placeholder="Ej: Desarrollo de nicho"
                    />
                  </div>
                  <div>
                    <Label htmlFor="item_description">Descripción</Label>
                    <Textarea
                      id="item_description"
                      value={formData.item_description}
                      onChange={(e) => setFormData({...formData, item_description: e.target.value})}
                      placeholder="Descripción detallada del item..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_required"
                      checked={formData.is_required}
                      onCheckedChange={(checked) => setFormData({...formData, is_required: checked})}
                    />
                    <Label htmlFor="is_required">Item requerido</Label>
                  </div>
                  <Button 
                    onClick={() => createItemMutation.mutate(formData)}
                    disabled={!formData.item_name || createItemMutation.isPending}
                    className="w-full"
                  >
                    {createItemMutation.isPending ? 'Creando...' : 'Crear Item'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando items...</div>
          ) : templates?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay items configurados para esta etapa</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates?.map((template, index) => (
                <div key={template.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{template.item_name}</h4>
                      {!template.is_required && (
                        <Badge variant="outline" className="text-xs">
                          Opcional
                        </Badge>
                      )}
                    </div>
                    {template.item_description && (
                      <p className="text-sm text-muted-foreground">
                        {template.item_description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteItemMutation.mutate(template.id)}
                      disabled={deleteItemMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edición */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item del Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_item_name">Nombre del Item *</Label>
              <Input
                id="edit_item_name"
                value={formData.item_name}
                onChange={(e) => setFormData({...formData, item_name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit_item_description">Descripción</Label>
              <Textarea
                id="edit_item_description"
                value={formData.item_description}
                onChange={(e) => setFormData({...formData, item_description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData({...formData, is_required: checked})}
              />
              <Label htmlFor="edit_is_required">Item requerido</Label>
            </div>
            <Button 
              onClick={() => editingItem && updateItemMutation.mutate({ 
                id: editingItem.id, 
                itemData: formData 
              })}
              disabled={!formData.item_name || updateItemMutation.isPending}
              className="w-full"
            >
              {updateItemMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AcceleratorSettings
