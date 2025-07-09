-- Create table for quick access shortcuts
CREATE TABLE public.quick_access_shortcuts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'link',
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quick_access_shortcuts ENABLE ROW LEVEL SECURITY;

-- Create policies - these shortcuts should be visible to all authenticated users
CREATE POLICY "Shortcuts are viewable by authenticated users" 
ON public.quick_access_shortcuts 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage shortcuts" 
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

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quick_access_shortcuts_updated_at
BEFORE UPDATE ON public.quick_access_shortcuts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default shortcuts
INSERT INTO public.quick_access_shortcuts (name, url, icon, description, display_order) VALUES
('Go High Level', 'https://app.infra-growth.com', 'external-link', 'Acceso a la plataforma principal', 1),
('Alta de cuenta GHL', 'https://signup.infra-growth.com', 'user-plus', 'Registro de nuevas cuentas GHL', 2),
('Alta de servidor', 'https://server.infra-growth.com', 'server', 'Configuración de servidores', 3),
('Form Onboarding', 'https://site.infragrowthai.com/widget/form/nP2VF3tOgiJmOaB2RlOI', 'clipboard-list', 'Formulario de onboarding para clientes', 4),
('Form Etapa 1', 'https://site.infragrowthai.com/widget/form/1MAaaJr5yVjDst6KP8WC', 'calendar-check', 'Formulario para etapa 1 del proceso', 5),
('Form Etapa 2', 'https://site.infragrowthai.com/widget/form/VrVSAWqyWBuHFVDP2Lsb', 'calendar-check-2', 'Formulario para etapa 2 del proceso', 6);