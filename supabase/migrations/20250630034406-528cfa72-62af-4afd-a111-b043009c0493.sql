
-- Agregar columna status a la tabla clients con valor por defecto false
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT false;

-- Actualizar todos los clientes existentes para que tengan status = true si tienen suscripciones activas
UPDATE public.clients 
SET status = CASE 
  WHEN EXISTS (
    SELECT 1 FROM subscriptions s 
    WHERE s.client_id = clients.id 
    AND s.status = 'active'
  ) THEN true 
  ELSE false 
END;
