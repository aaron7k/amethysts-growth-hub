-- Fix: Create missing onboarding checklists for existing accelerator programs
INSERT INTO public.accelerator_onboarding_checklist (subscription_id, client_id)
SELECT s.id, s.client_id
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
JOIN clients c ON s.client_id = c.id
JOIN accelerator_programs ap ON s.id = ap.subscription_id
WHERE c.client_type = 'accelerator_member'
  AND p.plan_type = 'core'
  AND NOT EXISTS (
    SELECT 1 FROM accelerator_onboarding_checklist aoc 
    WHERE aoc.subscription_id = s.id
  );

-- Also, let's fix the trigger function to ensure it works correctly
DROP TRIGGER IF EXISTS create_accelerator_onboarding_checklist_trigger ON public.accelerator_programs;
DROP FUNCTION IF EXISTS create_accelerator_onboarding_checklist();

-- Recreate improved trigger function
CREATE OR REPLACE FUNCTION create_accelerator_onboarding_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert checklist for any accelerator program
  INSERT INTO public.accelerator_onboarding_checklist (subscription_id, client_id)
  SELECT NEW.subscription_id, s.client_id
  FROM subscriptions s
  JOIN clients c ON s.client_id = c.id
  WHERE s.id = NEW.subscription_id
    AND c.client_type = 'accelerator_member'
    AND NOT EXISTS (
      SELECT 1 FROM accelerator_onboarding_checklist aoc 
      WHERE aoc.subscription_id = NEW.subscription_id
    );
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER create_accelerator_onboarding_checklist_trigger
AFTER INSERT ON public.accelerator_programs
FOR EACH ROW
EXECUTE FUNCTION create_accelerator_onboarding_checklist();