-- Hacer subscription_id opcional y agregar client_id directo
ALTER TABLE public.provisioned_services 
ALTER COLUMN subscription_id DROP NOT NULL;

-- Agregar columna client_id para relación directa con cliente
ALTER TABLE public.provisioned_services 
ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Agregar constraint para asegurar que al menos uno de los dos esté presente
ALTER TABLE public.provisioned_services 
ADD CONSTRAINT provisioned_services_client_or_subscription_check 
CHECK (subscription_id IS NOT NULL OR client_id IS NOT NULL);