-- Add completed_by field to alerts table to track who marked the alert as completed
ALTER TABLE public.alerts 
ADD COLUMN completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;