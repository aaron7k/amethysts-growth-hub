-- Agregar columna para controlar si la etapa ha sido activada
ALTER TABLE public.accelerator_stages 
ADD COLUMN is_activated BOOLEAN DEFAULT FALSE NOT NULL;