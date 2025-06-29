
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

    // Enviar a n8n webhook
    const n8nWebhook = 'https://hooks.infragrowthai.com/webhook/client/alerts'
    
    const webhookPayload = {
      alert_id: alert.id,
      alert_type: alert.alert_type,
      title: alert.title,
      message: alert.message,
      slack_channel: alert.slack_channel,
      client_id: alert.client_id,
      subscription_id: alert.subscription_id,
      installment_id: alert.installment_id,
      metadata: alert.metadata,
      created_at: alert.created_at,
      color: getAlertColor(alert.alert_type),
      type_label: getAlertTypeLabel(alert.alert_type)
    }

    const webhookResponse = await fetch(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    })

    if (!webhookResponse.ok) {
      throw new Error(`n8n webhook failed with status: ${webhookResponse.status}`)
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

    console.log(`Alert ${alertId} sent successfully to n8n webhook`)

    return new Response(
      JSON.stringify({ success: true, message: 'Alert sent successfully to n8n' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-alert function:', error)
    
    // Marcar la alerta como fallida si hay un alertId
    try {
      const { alertId } = await req.json()
      if (alertId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabaseClient
          .from('alerts')
          .update({ status: 'failed' })
          .eq('id', alertId)
      }
    } catch (updateError) {
      console.error('Error marking alert as failed:', updateError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function getAlertColor(alertType: string): string {
  switch (alertType) {
    case 'payment_overdue':
      return 'danger'
    case 'renewal_upcoming':
      return 'warning'
    case 'service_expired':
      return 'danger'
    case 'new_sale':
      return 'good'
    default:
      return 'warning'
  }
}

function getAlertTypeLabel(alertType: string): string {
  switch (alertType) {
    case 'payment_overdue':
      return 'Pago Retrasado'
    case 'renewal_upcoming':
      return 'Renovación Próxima'
    case 'service_expired':
      return 'Servicio Finalizado'
    case 'new_sale':
      return 'Nueva Venta'
    default:
      return alertType
  }
}
