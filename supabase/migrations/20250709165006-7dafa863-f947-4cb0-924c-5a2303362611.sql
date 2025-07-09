-- Create table for accelerator onboarding checklist
CREATE TABLE public.accelerator_onboarding_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL,
  client_id UUID NOT NULL,
  
  -- Checklist items
  document_sent BOOLEAN DEFAULT FALSE,
  document_sent_at TIMESTAMP WITH TIME ZONE,
  document_sent_by TEXT,
  
  academy_access_granted BOOLEAN DEFAULT FALSE,
  academy_access_granted_at TIMESTAMP WITH TIME ZONE,
  academy_access_granted_by TEXT,
  
  contract_sent BOOLEAN DEFAULT FALSE,
  contract_sent_at TIMESTAMP WITH TIME ZONE,
  contract_sent_by TEXT,
  
  highlevel_subccount_created BOOLEAN DEFAULT FALSE,
  highlevel_subccount_created_at TIMESTAMP WITH TIME ZONE,
  highlevel_subccount_created_by TEXT,
  
  discord_groups_created BOOLEAN DEFAULT FALSE,
  discord_groups_created_at TIMESTAMP WITH TIME ZONE,
  discord_groups_created_by TEXT,
  
  onboarding_meeting_scheduled BOOLEAN DEFAULT FALSE,
  onboarding_meeting_scheduled_at TIMESTAMP WITH TIME ZONE,
  onboarding_meeting_scheduled_by TEXT,
  
  -- Metadata
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.accelerator_onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view accelerator onboarding checklist"
ON public.accelerator_onboarding_checklist
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND is_active = true
  )
);

CREATE POLICY "Authenticated users can insert accelerator onboarding checklist"
ON public.accelerator_onboarding_checklist
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND is_active = true
  )
);

CREATE POLICY "Authenticated users can update accelerator onboarding checklist"
ON public.accelerator_onboarding_checklist
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND is_active = true
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_accelerator_onboarding_checklist_updated_at
BEFORE UPDATE ON public.accelerator_onboarding_checklist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_accelerator_onboarding_subscription_id ON public.accelerator_onboarding_checklist(subscription_id);
CREATE INDEX idx_accelerator_onboarding_client_id ON public.accelerator_onboarding_checklist(client_id);

-- Function to automatically create onboarding checklist when an accelerator program is created
CREATE OR REPLACE FUNCTION create_accelerator_onboarding_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create checklist for accelerator subscriptions
  IF EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = NEW.subscription_id
    AND p.plan_type = 'core'
    AND EXISTS (
      SELECT 1 FROM clients c 
      WHERE c.id = s.client_id 
      AND c.client_type = 'accelerator_member'
    )
  ) THEN
    INSERT INTO public.accelerator_onboarding_checklist (subscription_id, client_id)
    SELECT NEW.subscription_id, s.client_id
    FROM subscriptions s
    WHERE s.id = NEW.subscription_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create checklist when accelerator program is created
CREATE TRIGGER create_accelerator_onboarding_checklist_trigger
AFTER INSERT ON public.accelerator_programs
FOR EACH ROW
EXECUTE FUNCTION create_accelerator_onboarding_checklist();