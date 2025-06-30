
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Running daily alerts cron job...')
    
    // Marcar el tiempo de inicio para identificar alertas nuevas
    const executionStartTime = new Date().toISOString()

    // Ejecutar función para pagos retrasados
    const { error: overdueError } = await supabaseClient.rpc('create_payment_overdue_alerts')
    if (overdueError) {
      console.error('Error creating overdue payment alerts:', overdueError)
    } else {
      console.log('Overdue payment alerts created successfully')
    }

    // Ejecutar función para renovaciones próximas
    const { error: renewalError } = await supabaseClient.rpc('create_renewal_upcoming_alerts')
    if (renewalError) {
      console.error('Error creating renewal upcoming alerts:', renewalError)
    } else {
      console.log('Renewal upcoming alerts created successfully')
    }

    // Ejecutar función para servicios expirados
    const { error: expiredError } = await supabaseClient.rpc('create_service_expired_alerts')
    if (expiredError) {
      console.error('Error creating service expired alerts:', expiredError)
    } else {
      console.log('Service expired alerts created successfully')
    }

    // Ejecutar función para cambios de etapa de aceleradora
    const { error: stageError } = await supabaseClient.rpc('check_accelerator_stage_changes')
    if (stageError) {
      console.error('Error checking accelerator stage changes:', stageError)
    } else {
      console.log('Accelerator stage changes checked successfully')
    }

    // Obtener SOLO las alertas que se crearon en esta ejecución
    const { data: newAlerts, error: fetchError } = await supabaseClient
      .from('alerts')
      .select('id, alert_type')
      .eq('status', 'pending')
      .gte('created_at', executionStartTime)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching new alerts:', fetchError)
    } else if (newAlerts && newAlerts.length > 0) {
      console.log(`Found ${newAlerts.length} new alerts created in this execution to send`)
      
      // Enviar cada alerta nueva
      for (const alert of newAlerts) {
        try {
          // Determinar qué función usar según el tipo de alerta
          const functionName = (alert.alert_type === 'stage_change' || alert.alert_type === 'stage_overdue') 
            ? 'send-stage-change-alert' 
            : 'send-alert'
          
          const { error } = await supabaseClient.functions.invoke(functionName, {
            body: { alertId: alert.id }
          })
          
          if (error) {
            console.error(`Error sending alert ${alert.id}:`, error)
          } else {
            console.log(`Alert ${alert.id} sent successfully using ${functionName}`)
          }
        } catch (sendError) {
          console.error(`Error sending alert ${alert.id}:`, sendError)
        }
      }
    } else {
      console.log('No new alerts were created in this execution')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily alerts cron job completed successfully',
        newAlertsProcessed: newAlerts?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in daily alerts cron job:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
