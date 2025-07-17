import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

interface ActiveSubscriptionHelperProps {
  clientId: string
  children: (activeSubscription: any) => React.ReactNode
}

export const ActiveSubscriptionHelper = ({ clientId, children }: ActiveSubscriptionHelperProps) => {
  const { data: activeSubscription } = useQuery({
    queryKey: ['active-subscription', clientId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(name, plan_type, price_usd)
        `)
        .eq('client_id', clientId)
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!clientId
  })

  return <>{children(activeSubscription)}</>
}

// Hook para obtener la suscripción activa de un cliente
export const useActiveSubscription = (clientId: string) => {
  return useQuery({
    queryKey: ['active-subscription', clientId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans(name, plan_type, price_usd)
        `)
        .eq('client_id', clientId)
        .eq('status', 'active')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!clientId
  })
}