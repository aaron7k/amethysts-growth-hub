
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProvisionedServices = () => {
  return useQuery({
    queryKey: ['provisioned-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provisioned_services')
        .select(`
          *,
          subscription:subscriptions(
            client:clients(full_name)
          )
        `)
        .in('service_type', ['gohighlevel_account', 'infraestructure_server']);
      
      if (error) throw error;
      return data;
    },
  });
};
