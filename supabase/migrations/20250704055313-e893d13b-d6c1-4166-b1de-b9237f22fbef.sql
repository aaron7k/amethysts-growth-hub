-- Add meeting_code column to events table
ALTER TABLE public.events 
ADD COLUMN meeting_code text;