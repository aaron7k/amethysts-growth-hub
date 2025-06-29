
-- Add foreign key constraint between accelerator_programs and subscriptions
ALTER TABLE public.accelerator_programs 
ADD CONSTRAINT accelerator_programs_subscription_id_fkey 
FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);

-- Add foreign key constraint between accelerator_stages and subscriptions
ALTER TABLE public.accelerator_stages 
ADD CONSTRAINT accelerator_stages_subscription_id_fkey 
FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);
