-- Create events table for student attendance tracking
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  event_date date NOT NULL,
  invited_emails text[] NOT NULL DEFAULT '{}',
  attended_emails text[] NOT NULL DEFAULT '{}',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view all events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update events" 
ON public.events 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete events" 
ON public.events 
FOR DELETE 
TO authenticated
USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_events_updated_at();

-- Create index for better performance on date queries
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_invited_emails ON public.events USING GIN(invited_emails);
CREATE INDEX idx_events_attended_emails ON public.events USING GIN(attended_emails);