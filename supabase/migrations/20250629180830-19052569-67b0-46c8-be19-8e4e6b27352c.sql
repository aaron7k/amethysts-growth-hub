
-- Remove the approved_by column from user_profiles table
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS approved_by;

-- Create or replace the approve_user function without the approver_id parameter
CREATE OR REPLACE FUNCTION public.approve_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE user_profiles
  SET 
    is_approved = true,
    is_active = true,
    approved_at = now()
  WHERE id = user_id;
END;
$function$;
