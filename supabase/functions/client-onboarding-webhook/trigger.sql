
-- Función para enviar webhook cuando se crea una nueva suscripción
CREATE OR REPLACE FUNCTION public.send_onboarding_webhook()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Enviar webhook usando pg_net (requiere extensión pg_net)
  PERFORM
    net.http_post(
      url := 'https://gyfmqedtupmpyfjujbwt.supabase.co/functions/v1/client-onboarding-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Zm1xZWR0dXBtcHlmanVqYnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMTc2NDcsImV4cCI6MjA2Njc5MzY0N30.TGZka6qTsI8MGuPS9-4gw0ehAEVS_MnqGzeXdyrI7Ew'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  
  RETURN NEW;
END;
$$;

-- Crear trigger para nuevas suscripciones
DROP TRIGGER IF EXISTS subscription_onboarding_webhook_trigger ON public.subscriptions;
CREATE TRIGGER subscription_onboarding_webhook_trigger
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.send_onboarding_webhook();
