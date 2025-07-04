-- Function to extend accelerator stage by 7 days
CREATE OR REPLACE FUNCTION public.extend_stage_deadline(p_stage_id uuid, p_days integer DEFAULT 7)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stage_record RECORD;
  client_info RECORD;
  alert_message TEXT;
BEGIN
  -- Get stage information
  SELECT 
    s.id,
    s.subscription_id,
    s.stage_number,
    s.stage_name,
    s.start_date,
    s.end_date,
    s.status
  INTO stage_record
  FROM accelerator_stages s
  WHERE s.id = p_stage_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage not found';
  END IF;
  
  -- Update the end date by adding the specified days
  UPDATE public.accelerator_stages 
  SET end_date = end_date + (p_days || ' days')::interval,
      updated_at = now()
  WHERE id = p_stage_id;
  
  -- Get client information for alert
  SELECT c.full_name, c.phone_number 
  INTO client_info
  FROM subscriptions sub
  JOIN clients c ON sub.client_id = c.id
  WHERE sub.id = stage_record.subscription_id;
  
  -- Create alert for extension
  alert_message := '📅 PRÓRROGA OTORGADA - Se ha extendido la ' || stage_record.stage_name || 
                   ' (Etapa ' || stage_record.stage_number || ') del cliente ' || client_info.full_name || 
                   ' por ' || p_days || ' días adicionales. Nueva fecha límite: ' || 
                   (stage_record.end_date + (p_days || ' days')::interval)::date;
  
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
    'Prórroga Otorgada - ' || client_info.full_name,
    alert_message,
    '#aceleradora',
    jsonb_build_object(
      'stage_number', stage_record.stage_number,
      'stage_name', stage_record.stage_name,
      'original_end_date', stage_record.end_date,
      'new_end_date', stage_record.end_date + (p_days || ' days')::interval,
      'extension_days', p_days,
      'action_type', 'extension'
    )
  FROM subscriptions sub WHERE sub.id = stage_record.subscription_id;
END;
$$;