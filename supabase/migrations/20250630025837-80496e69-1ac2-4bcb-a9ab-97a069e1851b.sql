
-- Agregar columna updated_at a la tabla clients (si no existe)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Crear trigger para actualizar updated_at automáticamente en clients
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS update_clients_updated_at_trigger ON public.clients;
CREATE TRIGGER update_clients_updated_at_trigger
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Agregar columna client_type para diferenciar entre cliente, alumno y miembro aceleradora
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'client' CHECK (client_type IN ('client', 'student', 'accelerator_member'));

-- Actualizar el enum de métodos de pago para incluir los nuevos
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bbva';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'dolar_app';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'payoneer';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'binance';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'mercado_pago';

-- Nota: 'stripe' ya existe en el enum actual
