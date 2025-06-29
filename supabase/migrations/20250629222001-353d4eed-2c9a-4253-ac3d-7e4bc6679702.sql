
-- Crear tabla para las etapas del programa Aceleradora
CREATE TABLE public.accelerator_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 4),
  stage_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, stage_number)
);

-- Crear tabla para el seguimiento del programa completo
CREATE TABLE public.accelerator_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL UNIQUE,
  program_start_date DATE NOT NULL,
  program_end_date DATE NOT NULL, -- 120 días desde el inicio
  current_stage INTEGER NOT NULL DEFAULT 1,
  goal_reached BOOLEAN DEFAULT FALSE,
  goal_reached_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Función para crear las etapas automáticamente cuando se crea un programa
CREATE OR REPLACE FUNCTION create_accelerator_stages()
RETURNS TRIGGER AS $$
BEGIN
  -- Etapa 1: Nicho & Oferta (Día 1-7)
  INSERT INTO public.accelerator_stages (subscription_id, stage_number, stage_name, start_date, end_date)
  VALUES (NEW.subscription_id, 1, 'Nicho & Oferta', NEW.program_start_date, NEW.program_start_date + INTERVAL '6 days');
  
  -- Etapa 2: Infraestructura (Día 8-21)
  INSERT INTO public.accelerator_stages (subscription_id, stage_number, stage_name, start_date, end_date)
  VALUES (NEW.subscription_id, 2, 'Infraestructura', NEW.program_start_date + INTERVAL '7 days', NEW.program_start_date + INTERVAL '20 days');
  
  -- Etapa 3: Validación & Ventas (Día 22-120)
  INSERT INTO public.accelerator_stages (subscription_id, stage_number, stage_name, start_date, end_date)
  VALUES (NEW.subscription_id, 3, 'Validación & Ventas', NEW.program_start_date + INTERVAL '21 days', NEW.program_start_date + INTERVAL '119 days');
  
  -- Etapa 4: Post-Meta (Flexible)
  INSERT INTO public.accelerator_stages (subscription_id, stage_number, stage_name, start_date, end_date)
  VALUES (NEW.subscription_id, 4, 'Post-Meta', NEW.program_start_date + INTERVAL '21 days', NEW.program_end_date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar etapas automáticamente
CREATE TRIGGER create_accelerator_stages_trigger
  AFTER INSERT ON public.accelerator_programs
  FOR EACH ROW
  EXECUTE FUNCTION create_accelerator_stages();

-- Función para verificar cambios de etapa y crear alertas
CREATE OR REPLACE FUNCTION check_accelerator_stage_changes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stage_record RECORD;
  alert_message TEXT;
  client_info RECORD;
BEGIN
  -- Buscar etapas que deberían haber empezado hoy
  FOR stage_record IN
    SELECT 
      s.id as stage_id,
      s.subscription_id,
      s.stage_number,
      s.stage_name,
      s.start_date,
      s.end_date,
      ap.id as program_id
    FROM accelerator_stages s
    JOIN accelerator_programs ap ON s.subscription_id = ap.subscription_id
    WHERE s.start_date = CURRENT_DATE
      AND s.status = 'pending'
      AND ap.status = 'active'
  LOOP
    -- Actualizar el estado de la etapa a 'in_progress'
    UPDATE public.accelerator_stages 
    SET status = 'in_progress', updated_at = now()
    WHERE id = stage_record.stage_id;
    
    -- Actualizar la etapa actual del programa
    UPDATE public.accelerator_programs 
    SET current_stage = stage_record.stage_number, updated_at = now()
    WHERE id = stage_record.program_id;
    
    -- Obtener información del cliente
    SELECT c.full_name, c.phone_number INTO client_info
    FROM subscriptions sub
    JOIN clients c ON sub.client_id = c.id
    WHERE sub.id = stage_record.subscription_id;
    
    alert_message := '🚀 CAMBIO DE ETAPA - El cliente ' || client_info.full_name || 
                     ' ha iniciado la ' || stage_record.stage_name || 
                     ' (Etapa ' || stage_record.stage_number || ') del programa Aceleradora. ' ||
                     'Período: ' || stage_record.start_date || ' - ' || stage_record.end_date;
    
    INSERT INTO public.alerts (
      alert_type,
      client_id,
      subscription_id,
      title,
      message,
      slack_channel,
      metadata
    ) SELECT
      'stage_change',
      sub.client_id,
      stage_record.subscription_id,
      'Cambio de Etapa - ' || client_info.full_name,
      alert_message,
      '#aceleradora',
      jsonb_build_object(
        'stage_number', stage_record.stage_number,
        'stage_name', stage_record.stage_name,
        'start_date', stage_record.start_date,
        'end_date', stage_record.end_date,
        'program_day', CURRENT_DATE - (SELECT program_start_date FROM accelerator_programs WHERE subscription_id = stage_record.subscription_id) + 1
      )
    FROM subscriptions sub WHERE sub.id = stage_record.subscription_id;
  END LOOP;
  
  -- Buscar etapas que deberían haber terminado ayer (están atrasadas)
  FOR stage_record IN
    SELECT 
      s.id as stage_id,
      s.subscription_id,
      s.stage_number,
      s.stage_name,
      s.start_date,
      s.end_date
    FROM accelerator_stages s
    JOIN accelerator_programs ap ON s.subscription_id = ap.subscription_id
    WHERE s.end_date = CURRENT_DATE - INTERVAL '1 day'
      AND s.status = 'in_progress'
      AND ap.status = 'active'
  LOOP
    -- Actualizar el estado de la etapa a 'overdue'
    UPDATE public.accelerator_stages 
    SET status = 'overdue', updated_at = now()
    WHERE id = stage_record.stage_id;
    
    -- Obtener información del cliente
    SELECT c.full_name, c.phone_number INTO client_info
    FROM subscriptions sub
    JOIN clients c ON sub.client_id = c.id
    WHERE sub.id = stage_record.subscription_id;
    
    alert_message := '⚠️ ETAPA ATRASADA - El cliente ' || client_info.full_name || 
                     ' no completó la ' || stage_record.stage_name || 
                     ' (Etapa ' || stage_record.stage_number || ') en el tiempo esperado. ' ||
                     'Debía terminar: ' || stage_record.end_date || '. Revisar progreso urgentemente.';
    
    INSERT INTO public.alerts (
      alert_type,
      client_id,
      subscription_id,
      title,
      message,
      slack_channel,
      metadata
    ) SELECT
      'stage_overdue',
      sub.client_id,
      stage_record.subscription_id,
      'Etapa Atrasada - ' || client_info.full_name,
      alert_message,
      '#aceleradora',
      jsonb_build_object(
        'stage_number', stage_record.stage_number,
        'stage_name', stage_record.stage_name,
        'end_date', stage_record.end_date,
        'days_overdue', CURRENT_DATE - stage_record.end_date
      )
    FROM subscriptions sub WHERE sub.id = stage_record.subscription_id;
  END LOOP;
END;
$$;

-- Actualizar el enum de tipos de alerta para incluir los nuevos tipos
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'stage_change';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'stage_overdue';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_accelerator_stages_updated_at
    BEFORE UPDATE ON public.accelerator_stages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accelerator_programs_updated_at
    BEFORE UPDATE ON public.accelerator_programs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
