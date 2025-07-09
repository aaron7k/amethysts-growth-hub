import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users } from "lucide-react"
import StageChecklist from "@/components/StageChecklist"

interface StageChecklistPageProps {
  subscriptionId?: string
  clientName?: string
}

const StageChecklistPage = () => {
  const { subscriptionId, clientName } = useParams<{ subscriptionId: string; clientName: string }>()
  const navigate = useNavigate()

  const { data: program } = useQuery({
    queryKey: ['accelerator-program', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return null
      
      const { data, error } = await supabase
        .from('accelerator_programs')
        .select(`
          *,
          subscriptions!inner(
            id,
            client_id,
            clients!inner(
              id,
              full_name
            ),
            plans!inner(
              id,
              name
            )
          )
        `)
        .eq('subscription_id', subscriptionId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!subscriptionId
  })

  const { data: stages } = useQuery({
    queryKey: ['accelerator-stages', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return []
      
      const { data, error } = await supabase
        .from('accelerator_stages')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('stage_number')

      if (error) throw error
      return data
    },
    enabled: !!subscriptionId
  })

  if (!subscriptionId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ID de suscripción no válido</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/accelerator')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Aceleradora
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Checklist de Etapas
              </h1>
              {program && (
                <p className="text-muted-foreground">
                  {program.subscriptions.clients.full_name} - {program.subscriptions.plans.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stage Checklists */}
        {program && stages && stages.length > 0 ? (
          <div className="space-y-6">
            {stages.map((stage) => (
              <Card key={stage.id} className="w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {stage.stage_number}
                    </div>
                    {stage.stage_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(stage.start_date).toLocaleDateString('es-ES')} - {new Date(stage.end_date).toLocaleDateString('es-ES')}
                  </p>
                </CardHeader>
                <CardContent>
                  <StageChecklist
                    subscriptionId={subscriptionId}
                    stageNumber={stage.stage_number}
                    stageName={stage.stage_name}
                    isCurrentStage={program.current_stage === stage.stage_number}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay etapas configuradas para este programa</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default StageChecklistPage