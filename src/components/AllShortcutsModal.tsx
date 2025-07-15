import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { Copy, ExternalLink, Edit2, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { ShortcutFormModal } from "./ShortcutFormModal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as LucideIcons from "lucide-react"

interface Shortcut {
  id: string
  name: string
  url: string
  icon: string
  description?: string
  display_order: number
  is_active: boolean
}

interface AllShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AllShortcutsModal({ open, onOpenChange }: AllShortcutsModalProps) {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shortcutToDelete, setShortcutToDelete] = useState<Shortcut | null>(null)

  const { data: shortcuts, refetch } = useQuery({
    queryKey: ['all-quick-access-shortcuts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_access_shortcuts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data as Shortcut[]
    },
    enabled: open
  })

  const copyToClipboard = async (url: string, name: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "¡Copiado!",
        description: `URL de "${name}" copiada al portapapeles`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive",
      })
    }
  }

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName as keyof typeof LucideIcons]
    return Icon ? Icon : LucideIcons.Link
  }

  const handleEdit = (shortcut: Shortcut) => {
    setEditingShortcut(shortcut)
    setShowForm(true)
  }

  const handleDelete = (shortcut: Shortcut) => {
    setShortcutToDelete(shortcut)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!shortcutToDelete) return

    try {
      const { error } = await supabase
        .from('quick_access_shortcuts')
        .delete()
        .eq('id', shortcutToDelete.id)

      if (error) throw error

      toast({
        title: "¡Eliminado!",
        description: `Acceso directo "${shortcutToDelete.name}" eliminado correctamente`,
      })

      refetch()
    } catch (error) {
      console.error('Error deleting shortcut:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el acceso directo",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setShortcutToDelete(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Todos los Accesos Directos
              </DialogTitle>
              <Button 
                onClick={() => setShowForm(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {shortcuts?.map((shortcut) => {
              const IconComponent = getIcon(shortcut.icon)
              return (
                <div 
                  key={shortcut.id}
                  className="group relative p-4 border rounded-lg hover:shadow-md transition-all duration-200 bg-muted/30 hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm truncate">
                          {shortcut.name}
                        </h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(shortcut)}
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(shortcut)}
                            className="h-6 w-6 p-0 hover:bg-red-100 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {shortcut.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {shortcut.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          asChild
                          size="sm"
                          variant="default"
                          className="text-xs h-7"
                        >
                          <a 
                            href={shortcut.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Abrir
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(shortcut.url, shortcut.name)}
                          className="text-xs h-7 gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {shortcuts?.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No hay accesos directos configurados</p>
                <Button 
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar el primero
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ShortcutFormModal 
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) {
            setEditingShortcut(null)
          }
        }}
        onSuccess={() => {
          refetch()
          setShowForm(false)
          setEditingShortcut(null)
        }}
        editingShortcut={editingShortcut}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar acceso directo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el acceso directo "{shortcutToDelete?.name}". 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}