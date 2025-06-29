
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  client: {
    id: string
    full_name: string
    email: string
    phone_number?: string
    drive_folder_url?: string
    created_at: string
  }
  subscription: {
    id: string
    start_date: string
    end_date: string
    total_cost_usd: number
    status: string
    next_step: string
    call_level_included: boolean
    notes?: string
    created_at: string
  }
  plan: {
    id: string
    name: string
    description?: string
    price_usd: number
    duration_days: number
    plan_type: string
  }
  installments: Array<{
    id: string
    installment_number: number
    amount_usd: number
    due_date: string
    status: string
    payment_method?: string
    payment_date?: string
  }>
  onboarding_data: {
    steps_completed: string[]
    progress_percentage: number
    estimated_completion_date: string
    requires_immediate_attention: boolean
  }
}

async function sendWebhook(payload: WebhookPayload) {
  try {
    console.log('Sending webhook to infragrowthai.com:', JSON.stringify(payload, null, 2))
    
    const response = await fetch('https://hooks.infragrowthai.com/webhook/client/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${await response.text()}`)
    }

    console.log('Webhook sent successfully:', response.status)
    return { success: true, status: response.status }
  } catch (error) {
    console.error('Webhook error:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    console.log('Received subscription webhook:', record)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get complete subscription data with related information
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        clients(*),
        plans(*),
        installments(*)
      `)
      .eq('id', record.id)
      .single()

    if (subscriptionError) {
      throw new Error(`Failed to fetch subscription data: ${subscriptionError.message}`)
    }

    // Calculate onboarding progress
    const onboardingSteps = [
      'contract_sent',
      'onboarding_doc_sent', 
      'academy_access_granted',
      'high_level_account_created',
      'discord_access_granted'
    ]

    const completedSteps: string[] = []
    const progressPercentage = 0 // Initially 0% since it's a new subscription

    // Estimate completion date (7 days from start)
    const estimatedCompletionDate = new Date(subscriptionData.start_date)
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7)

    // Build webhook payload
    const webhookPayload: WebhookPayload = {
      client: {
        id: subscriptionData.clients.id,
        full_name: subscriptionData.clients.full_name,
        email: subscriptionData.clients.email,
        phone_number: subscriptionData.clients.phone_number,
        drive_folder_url: subscriptionData.clients.drive_folder_url,
        created_at: subscriptionData.clients.created_at
      },
      subscription: {
        id: subscriptionData.id,
        start_date: subscriptionData.start_date,
        end_date: subscriptionData.end_date,
        total_cost_usd: subscriptionData.total_cost_usd,
        status: subscriptionData.status,
        next_step: subscriptionData.next_step,
        call_level_included: subscriptionData.call_level_included,
        notes: subscriptionData.notes,
        created_at: subscriptionData.created_at
      },
      plan: {
        id: subscriptionData.plans.id,
        name: subscriptionData.plans.name,
        description: subscriptionData.plans.description,
        price_usd: subscriptionData.plans.price_usd,
        duration_days: subscriptionData.plans.duration_days,
        plan_type: subscriptionData.plans.plan_type
      },
      installments: subscriptionData.installments.map((installment: any) => ({
        id: installment.id,
        installment_number: installment.installment_number,
        amount_usd: installment.amount_usd,
        due_date: installment.due_date,
        status: installment.status,
        payment_method: installment.payment_method,
        payment_date: installment.payment_date
      })),
      onboarding_data: {
        steps_completed: completedSteps,
        progress_percentage: progressPercentage,
        estimated_completion_date: estimatedCompletionDate.toISOString().split('T')[0],
        requires_immediate_attention: subscriptionData.next_step === 'pending_onboarding'
      }
    }

    // Send webhook
    await sendWebhook(webhookPayload)

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
