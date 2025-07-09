import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { Copy, Plus, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { ShortcutFormModal } from "./ShortcutFormModal"
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

export function QuickAccessShortcuts() {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)

  const { data: shortcuts, refetch } = useQuery({
    queryKey: ['quick-access-shortcuts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_access_shortcuts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data as Shortcut[]
    }
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Accesos Directos
          </CardTitle>
          <CardDescription>
            Enlaces rápidos a herramientas y formularios importantes
          </CardDescription>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <h4 className="font-medium text-sm truncate">
                      {shortcut.name}
                    </h4>
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
      </CardContent>

      <ShortcutFormModal 
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={() => {
          refetch()
          setShowForm(false)
        }}
      />
    </Card>
  )
}