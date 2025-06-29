
-- Eliminar las políticas restrictivas actuales
DROP POLICY IF EXISTS "Authenticated users can view accelerator programs" ON public.accelerator_programs;
DROP POLICY IF EXISTS "Authorized users can insert accelerator programs" ON public.accelerator_programs;
DROP POLICY IF EXISTS "Authorized users can update accelerator programs" ON public.accelerator_programs;
DROP POLICY IF EXISTS "Authorized users can delete accelerator programs" ON public.accelerator_programs;

DROP POLICY IF EXISTS "Authenticated users can view accelerator stages" ON public.accelerator_stages;
DROP POLICY IF EXISTS "Authorized users can insert accelerator stages" ON public.accelerator_stages;
DROP POLICY IF EXISTS "Authorized users can update accelerator stages" ON public.accelerator_stages;
DROP POLICY IF EXISTS "Authorized users can delete accelerator stages" ON public.accelerator_stages;

-- Crear políticas más permisivas temporalmente para usuarios autenticados
CREATE POLICY "Authenticated users can view accelerator programs" 
  ON public.accelerator_programs 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert accelerator programs" 
  ON public.accelerator_programs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update accelerator programs" 
  ON public.accelerator_programs 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete accelerator programs" 
  ON public.accelerator_programs 
  FOR DELETE 
  TO authenticated
  USING (true);

-- Políticas para accelerator_stages
CREATE POLICY "Authenticated users can view accelerator stages" 
  ON public.accelerator_stages 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert accelerator stages" 
  ON public.accelerator_stages 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update accelerator stages" 
  ON public.accelerator_stages 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete accelerator stages" 
  ON public.accelerator_stages 
  FOR DELETE 
  TO authenticated
  USING (true);
