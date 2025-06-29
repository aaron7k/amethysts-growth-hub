
-- Crear tabla para almacenar los templates de checklist por etapa
CREATE TABLE public.accelerator_stage_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 4),
  item_order INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stage_number, item_order)
);

-- Crear tabla para almacenar el progreso de checklist por suscripción
CREATE TABLE public.accelerator_checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 4),
  template_id UUID NOT NULL REFERENCES accelerator_stage_templates(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, template_id)
);

-- Insertar los templates de checklist predefinidos
-- Etapa 1: Nicho & Oferta
INSERT INTO public.accelerator_stage_templates (stage_number, item_order, item_name, item_description) VALUES
(1, 1, 'Desarrollo de nicho', 'Definir y desarrollar el nicho específico del cliente'),
(1, 2, 'Análisis de clientes potenciales', 'Investigar y analizar el mercado objetivo'),
(1, 3, 'Desarrollo de Avatar Dorado', 'Crear el perfil detallado del cliente ideal'),
(1, 4, 'Desarrollo de Oferta', 'Estructurar la propuesta de valor única');

-- Etapa 2: Infraestructura
INSERT INTO public.accelerator_stage_templates (stage_number, item_order, item_name, item_description, is_required) VALUES
(2, 1, 'Tutoriales de High Level', 'Completar capacitación en High Level', true),
(2, 2, 'Clases de Infraestructura', 'Asistir a clases de configuración técnica', true),
(2, 3, 'Clases de WA Level', 'Completar capacitación en WhatsApp automatización', true),
(2, 4, 'CRM Listo', 'Configurar y personalizar el sistema CRM', true),
(2, 5, 'Tener una instancia de WhatsApp', 'Configurar WhatsApp Business API', true),
(2, 6, 'Calendario conectado', 'Integrar sistema de calendarios', true),
(2, 7, 'Infraestructura Lista (n8n)', 'Configurar automatizaciones en n8n', true),
(2, 8, 'Agente de IA funcional', 'Implementar y probar chatbot de IA', true),
(2, 9, 'Agentes de Voz funcional (opcional)', 'Configurar sistema de voz automatizado', false);

-- Etapa 3: Validación & Ventas
INSERT INTO public.accelerator_stage_templates (stage_number, item_order, item_name, item_description) VALUES
(3, 1, 'Tener script preparado', 'Desarrollar y perfeccionar scripts de ventas');

-- Función para crear el progreso de checklist cuando se crea un programa
CREATE OR REPLACE FUNCTION create_checklist_progress_for_program()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear registros de progreso para todos los templates activos
  INSERT INTO public.accelerator_checklist_progress (subscription_id, stage_number, template_id)
  SELECT 
    NEW.subscription_id,
    ast.stage_number,
    ast.id
  FROM accelerator_stage_templates ast
  WHERE ast.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear el progreso de checklist automáticamente
CREATE TRIGGER create_checklist_progress_trigger
  AFTER INSERT ON public.accelerator_programs
  FOR EACH ROW
  EXECUTE FUNCTION create_checklist_progress_for_program();

-- Trigger para actualizar updated_at
CREATE TRIGGER update_accelerator_stage_templates_updated_at
    BEFORE UPDATE ON public.accelerator_stage_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accelerator_checklist_progress_updated_at
    BEFORE UPDATE ON public.accelerator_checklist_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Función para obtener el progreso de checklist por etapa
CREATE OR REPLACE FUNCTION get_stage_checklist_progress(p_subscription_id UUID, p_stage_number INTEGER)
RETURNS TABLE (
  template_id UUID,
  item_name TEXT,
  item_description TEXT,
  is_required BOOLEAN,
  is_completed BOOLEAN,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT,
  notes TEXT,
  item_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ast.id as template_id,
    ast.item_name,
    ast.item_description,
    ast.is_required,
    COALESCE(acp.is_completed, false) as is_completed,
    acp.completed_at,
    acp.completed_by,
    acp.notes,
    ast.item_order
  FROM accelerator_stage_templates ast
  LEFT JOIN accelerator_checklist_progress acp ON (
    ast.id = acp.template_id 
    AND acp.subscription_id = p_subscription_id
  )
  WHERE ast.stage_number = p_stage_number 
    AND ast.is_active = true
  ORDER BY ast.item_order;
END;
$$ LANGUAGE plpgsql;
