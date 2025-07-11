-- Allow all authenticated users to create shortcuts, not just admins
DROP POLICY "Admins can manage shortcuts" ON public.quick_access_shortcuts;

-- Create new policy allowing all authenticated users to manage shortcuts
CREATE POLICY "Authenticated users can manage shortcuts" 
ON public.quick_access_shortcuts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND is_active = true
  )
);

-- Also allow admins specifically (redundant but explicit)
CREATE POLICY "Admins can always manage shortcuts" 
ON public.quick_access_shortcuts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_approved = true 
    AND is_active = true
  )
);