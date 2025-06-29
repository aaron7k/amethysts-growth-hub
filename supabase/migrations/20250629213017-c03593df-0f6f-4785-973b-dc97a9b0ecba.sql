
-- Crear enum para tipos de alertas
CREATE TYPE public.alert_type AS ENUM (
  'payment_overdue',
  'renewal_upcoming', 
  'service_expired',
  'new_sale'
);

-- Crear enum para estados de alertas
CREATE TYPE public.alert_status AS ENUM (
  'pending',
  'sent',
  'failed'
);

-- Crear tabla de alertas
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type public.alert_type NOT NULL,
  status public.alert_status NOT NULL DEFAULT 'pending',
  client_id UUID REFERENCES public.clients(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  installment_id UUID REFERENCES public.installments(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  slack_channel TEXT NOT NULL,
  webhook_url TEXT,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en la tabla de alertas
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Crear política para que todos los usuarios autenticados puedan ver las alertas
CREATE POLICY "Users can view all alerts" 
  ON public.alerts 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear alerta de pago retrasado
CREATE OR REPLACE FUNCTION public.create_payment_overdue_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  overdue_record RECORD;
  alert_message TEXT;
BEGIN
  -- Buscar cuotas vencidas (due_date <= today) con status 'pending'
  FOR overdue_record IN
    SELECT 
      i.id as installment_id,
      i.subscription_id,
      i.due_date,
      i.amount_usd,
      i.installment_number,
      s.client_id,
      c.full_name,
      c.phone_number
    FROM installments i
    JOIN subscriptions s ON i.subscription_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE i.status = 'pending'
      AND i.due_date <= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.installment_id = i.id 
          AND a.alert_type = 'payment_overdue'
          AND a.created_at::date = CURRENT_DATE
      )
  LOOP
    alert_message := '⚠️ ¡ALERTA DE PAGO! El cliente ' || overdue_record.full_name || 
                     ' tiene una cuota #' || overdue_record.installment_number || 
                     ' de $' || overdue_record.amount_usd || 
                     ' vencida desde ' || overdue_record.due_date || 
                     '. Por favor, contactarlo.' ||
                     CASE WHEN overdue_record.phone_number IS NOT NULL 
                          THEN ' Tel: ' || overdue_record.phone_number 
                          ELSE '' END;

    INSERT INTO public.alerts (
      alert_type,
      client_id,
      subscription_id,
      installment_id,
      title,
      message,
      slack_channel,
      metadata
    ) VALUES (
      'payment_overdue',
      overdue_record.client_id,
      overdue_record.subscription_id,
      overdue_record.installment_id,
      'Pago Retrasado - ' || overdue_record.full_name,
      alert_message,
      '#departamentoventas',
      jsonb_build_object(
        'amount', overdue_record.amount_usd,
        'due_date', overdue_record.due_date,
        'installment_number', overdue_record.installment_number,
        'days_overdue', CURRENT_DATE - overdue_record.due_date
      )
    );
  END LOOP;
END;
$$;

-- Función para crear alertas de renovación próxima (7 días antes)
CREATE OR REPLACE FUNCTION public.create_renewal_upcoming_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  renewal_record RECORD;
  alert_message TEXT;
BEGIN
  -- Buscar suscripciones que vencen en exactamente 7 días
  FOR renewal_record IN
    SELECT 
      s.id as subscription_id,
      s.client_id,
      s.end_date,
      s.next_step,
      c.full_name,
      c.phone_number,
      p.name as plan_name
    FROM subscriptions s
    JOIN clients c ON s.client_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.end_date = CURRENT_DATE + INTERVAL '7 days'
      AND s.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.subscription_id = s.id 
          AND a.alert_type = 'renewal_upcoming'
          AND a.created_at::date = CURRENT_DATE
      )
  LOOP
    -- Actualizar el next_step a 'needs_contact'
    UPDATE public.subscriptions 
    SET next_step = 'needs_contact'
    WHERE id = renewal_record.subscription_id;

    alert_message := '🔔 ¡RENOVACIÓN PRÓXIMA! El servicio del cliente ' || renewal_record.full_name || 
                     ' (' || renewal_record.plan_name || ') vence en 7 días (' || renewal_record.end_date || 
                     '). Es momento de contactarlo para ofrecerle la renovación.' ||
                     CASE WHEN renewal_record.phone_number IS NOT NULL 
                          THEN ' Tel: ' || renewal_record.phone_number 
                          ELSE '' END;

    INSERT INTO public.alerts (
      alert_type,
      client_id,
      subscription_id,
      title,
      message,
      slack_channel,
      metadata
    ) VALUES (
      'renewal_upcoming',
      renewal_record.client_id,
      renewal_record.subscription_id,
      'Renovación Próxima - ' || renewal_record.full_name,
      alert_message,
      '#customer-success',
      jsonb_build_object(
        'plan_name', renewal_record.plan_name,
        'end_date', renewal_record.end_date,
        'days_until_expiry', 7
      )
    );
  END LOOP;
END;
$$;

-- Función para crear alertas de servicio finalizado (1 día después del vencimiento)
CREATE OR REPLACE FUNCTION public.create_service_expired_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_record RECORD;
  alert_message TEXT;
BEGIN
  -- Buscar suscripciones que vencieron ayer
  FOR expired_record IN
    SELECT 
      s.id as subscription_id,
      s.client_id,
      s.end_date,
      c.full_name,
      c.phone_number,
      p.name as plan_name
    FROM subscriptions s
    JOIN clients c ON s.client_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.end_date = CURRENT_DATE - INTERVAL '1 day'
      AND s.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.subscription_id = s.id 
          AND a.alert_type = 'service_expired'
          AND a.created_at::date = CURRENT_DATE
      )
  LOOP
    -- Actualizar el next_step a 'overdue_payment' (acción urgente)
    UPDATE public.subscriptions 
    SET next_step = 'overdue_payment'
    WHERE id = expired_record.subscription_id;

    alert_message := '❗ ¡ACCIÓN URGENTE! El servicio del cliente ' || expired_record.full_name || 
                     ' (' || expired_record.plan_name || ') finalizó ayer (' || expired_record.end_date || 
                     '). Contactar hoy mismo para decidir si renueva o si se le retiran los accesos.' ||
                     CASE WHEN expired_record.phone_number IS NOT NULL 
                          THEN ' Tel: ' || expired_record.phone_number 
                          ELSE '' END;

    INSERT INTO public.alerts (
      alert_type,
      client_id,
      subscription_id,
      title,
      message,
      slack_channel,
      metadata
    ) VALUES (
      'service_expired',
      expired_record.client_id,
      expired_record.subscription_id,
      'Servicio Finalizado - ' || expired_record.full_name,
      alert_message,
      '#customer-success',
      jsonb_build_object(
        'plan_name', expired_record.plan_name,
        'end_date', expired_record.end_date,
        'days_expired', 1
      )
    );
  END LOOP;
END;
$$;

-- Función para crear alerta de nueva venta (trigger)
CREATE OR REPLACE FUNCTION public.create_new_sale_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert_message TEXT;
  client_info RECORD;
  plan_info RECORD;
BEGIN
  -- Obtener información del cliente y plan
  SELECT c.full_name, c.phone_number INTO client_info
  FROM clients c WHERE c.id = NEW.client_id;
  
  SELECT p.name INTO plan_info
  FROM plans p WHERE p.id = NEW.plan_id;

  alert_message := '🎉 ¡NUEVA VENTA! Cliente ' || client_info.full_name || 
                   ' ha comprado el plan ' || plan_info.name || 
                   ' por $' || NEW.total_cost_usd || 
                   '. Por favor, iniciar el proceso de onboarding.' ||
                   CASE WHEN client_info.phone_number IS NOT NULL 
                        THEN ' Tel: ' || client_info.phone_number 
                        ELSE '' END;

  INSERT INTO public.alerts (
    alert_type,
    client_id,
    subscription_id,
    title,
    message,
    slack_channel,
    metadata
  ) VALUES (
    'new_sale',
    NEW.client_id,
    NEW.id,
    'Nueva Venta - ' || client_info.full_name,
    alert_message,
    '#customer-success',
    jsonb_build_object(
      'plan_name', plan_info.name,
      'total_cost', NEW.total_cost_usd,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date
    )
  );

  RETURN NEW;
END;
$$;

-- Crear trigger para nueva venta
DROP TRIGGER IF EXISTS new_sale_alert_trigger ON public.subscriptions;
CREATE TRIGGER new_sale_alert_trigger
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_sale_alert();
