-- Create policy to allow authenticated users to insert alerts
CREATE POLICY "Authenticated users can insert alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND is_active = true
  )
);