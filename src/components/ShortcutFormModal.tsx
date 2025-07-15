import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  url: z.string().url("Debe ser una URL válida"),
  icon: z.string().min(1, "Selecciona un ícono"),
  description: z.string().optional(),
})

const iconOptions = [
  { value: "external-link", label: "Enlace externo" },
  { value: "user-plus", label: "Agregar usuario" },
  { value: "server", label: "Servidor" },
  { value: "clipboard-list", label: "Lista de verificación" },
  { value: "calendar-check", label: "Calendario con check" },
  { value: "calendar-check-2", label: "Calendario con doble check" },
  { value: "settings", label: "Configuración" },
  { value: "database", label: "Base de datos" },
  { value: "monitor", label: "Monitor" },
  { value: "file-text", label: "Archivo de texto" },
  { value: "globe", label: "Globo" },
  { value: "mail", label: "Correo" },
  { value: "phone", label: "Teléfono" },
  { value: "chart-bar", label: "Gráfico de barras" },
  { value: "users", label: "Usuarios" },
  { value: "briefcase", label: "Maletín" },
  { value: "tools", label: "Herramientas" },
  { value: "link", label: "Enlace" },
]

interface Shortcut {
  id: string
  name: string
  url: string
  icon: string
  description?: string
  display_order: number
  is_active: boolean
}

interface ShortcutFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingShortcut?: Shortcut | null
}

export function ShortcutFormModal({ open, onOpenChange, onSuccess, editingShortcut }: ShortcutFormModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editingShortcut?.name || "",
      url: editingShortcut?.url || "",
      icon: editingShortcut?.icon || "external-link",
      description: editingShortcut?.description || "",
    },
  })

  // Reset form when editingShortcut changes
  useState(() => {
    if (editingShortcut) {
      form.reset({
        name: editingShortcut.name,
        url: editingShortcut.url,
        icon: editingShortcut.icon,
        description: editingShortcut.description || "",
      })
    } else {
      form.reset({
        name: "",
        url: "",
        icon: "external-link",
        description: "",
      })
    }
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      if (editingShortcut) {
        // Update existing shortcut
        const { error } = await supabase
          .from('quick_access_shortcuts')
          .update({
            name: values.name,
            url: values.url,
            icon: values.icon,
            description: values.description || null,
          })
          .eq('id', editingShortcut.id)

        if (error) throw error

        toast({
          title: "¡Actualizado!",
          description: "Acceso directo actualizado correctamente",
        })
      } else {
        // Create new shortcut
        const { data: existingShortcuts } = await supabase
          .from('quick_access_shortcuts')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1)

        const nextOrder = existingShortcuts?.[0]?.display_order ? existingShortcuts[0].display_order + 1 : 1

        const { error } = await supabase
          .from('quick_access_shortcuts')
          .insert({
            name: values.name,
            url: values.url,
            icon: values.icon,
            description: values.description || null,
            display_order: nextOrder,
          })

        if (error) throw error

        toast({
          title: "¡Éxito!",
          description: "Acceso directo creado correctamente",
        })
      }

      form.reset()
      onSuccess()
    } catch (error) {
      console.error('Error saving shortcut:', error)
      toast({
        title: "Error",
        description: editingShortcut ? "No se pudo actualizar el acceso directo" : "No se pudo crear el acceso directo",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingShortcut ? "Editar Acceso Directo" : "Nuevo Acceso Directo"}</DialogTitle>
          <DialogDescription>
            {editingShortcut ? "Modifica los detalles del acceso directo" : "Agrega un nuevo enlace de acceso rápido al dashboard"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Go High Level" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícono</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un ícono" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Breve descripción del enlace"
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingShortcut ? "Actualizar" : "Crear Acceso Directo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}