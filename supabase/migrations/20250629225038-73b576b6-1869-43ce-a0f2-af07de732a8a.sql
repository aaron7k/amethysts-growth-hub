
-- Habilitar RLS en las nuevas tablas de aceleradora
ALTER TABLE public.accelerator_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accelerator_stages ENABLE ROW LEVEL SECURITY;

-- Crear función de seguridad para verificar si el usuario puede acceder a programas de aceleradora
CREATE OR REPLACE FUNCTION public.can_access_accelerator_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_approved = true 
    AND is_active = true
    AND role IN ('admin', 'operations', 'customer_success')
  );
$$;

-- Políticas para accelerator_programs
CREATE POLICY "Authenticated users can view accelerator programs" 
  ON public.accelerator_programs 
  FOR SELECT 
  TO authenticated
  USING (public.can_access_accelerator_data());

CREATE POLICY "Authorized users can insert accelerator programs" 
  ON public.accelerator_programs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.can_access_accelerator_data());

CREATE POLICY "Authorized users can update accelerator programs" 
  ON public.accelerator_programs 
  FOR UPDATE 
  TO authenticated
  USING (public.can_access_accelerator_data());

CREATE POLICY "Authorized users can delete accelerator programs" 
  ON public.accelerator_programs 
  FOR DELETE 
  TO authenticated
  USING (public.can_access_accelerator_data());

-- Políticas para accelerator_stages
CREATE POLICY "Authenticated users can view accelerator stages" 
  ON public.accelerator_stages 
  FOR SELECT 
  TO authenticated
  USING (public.can_access_accelerator_data());

CREATE POLICY "Authorized users can insert accelerator stages" 
  ON public.accelerator_stages 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.can_access_accelerator_data());

CREATE POLICY "Authorized users can update accelerator stages" 
  ON public.accelerator_stages 
  FOR UPDATE 
  TO authenticated
  USING (public.can_access_accelerator_data());

CREATE POLICY "Authorized users can delete accelerator stages" 
  ON public.accelerator_stages 
  FOR DELETE 
  TO authenticated
  USING (public.can_access_accelerator_data());
