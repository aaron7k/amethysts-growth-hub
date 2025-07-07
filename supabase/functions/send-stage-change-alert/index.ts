
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

    const { alertId } = await req.json()

    if (!alertId) {
      return new Response(
        JSON.stringify({ error: 'alertId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Obtener la alerta
    const { data: alert, error: alertError } = await supabaseClient
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single()

    if (alertError || !alert) {
      console.error('Error fetching alert:', alertError)
      return new Response(
        JSON.stringify({ error: 'Alert not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Enviar a n8n webhook para cambios de etapa
    const n8nWebhook = 'https://hooks.infragrowthai.com/webhook/client/cambio-etapa'
    
    const webhookPayload = {
      alert_id: alert.id,
      alert_type: alert.alert_type,
      title: alert.title,
      message: alert.message,
      client_id: alert.client_id,
      subscription_id: alert.subscription_id,
      metadata: alert.metadata,
      created_at: alert.created_at,
      stage_info: {
        stage_number: alert.metadata?.stage_number,
        stage_name: alert.metadata?.stage_name,
        start_date: alert.metadata?.start_date,
        end_date: alert.metadata?.end_date,
        program_day: alert.metadata?.program_day
      }
    }

    const webhookResponse = await fetch(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    })

    if (!webhookResponse.ok) {
      throw new Error(`n8n webhook failed with status: ${webhookResponse.status}`)
    }

    // Si es una activación de etapa (stage_change), enviar también al webhook de activación
    if (alert.alert_type === 'stage_change') {
      const activatePhaseWebhook = 'https://hooks.infragrowthai.com/webhook/activate-phase'
      
      const activatePayload = {
        alert_id: alert.id,
        client_id: alert.client_id,
        subscription_id: alert.subscription_id,
        stage_number: alert.metadata?.stage_number,
        stage_name: alert.metadata?.stage_name,
        start_date: alert.metadata?.start_date,
        end_date: alert.metadata?.end_date,
        program_day: alert.metadata?.program_day,
        discord_channel: '#aceleradora', // Canal de Discord por defecto
        timestamp: alert.created_at
      }

      const activateResponse = await fetch(activatePhaseWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activatePayload)
      })

      if (!activateResponse.ok) {
        console.error(`Activate phase webhook failed with status: ${activateResponse.status}`)
        // No lanzamos error para que no falle la función principal
      } else {
        console.log(`Phase activation sent to Discord webhook for stage ${alert.metadata?.stage_number}`)
      }
    }

    // Actualizar el estado de la alerta
    const { error: updateError } = await supabaseClient
      .from('alerts')
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString(),
        webhook_url: n8nWebhook
      })
      .eq('id', alertId)

    if (updateError) {
      console.error('Error updating alert:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update alert status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Stage change alert ${alertId} sent successfully to n8n webhook`)

    return new Response(
      JSON.stringify({ success: true, message: 'Stage change alert sent successfully to n8n' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-stage-change-alert function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
