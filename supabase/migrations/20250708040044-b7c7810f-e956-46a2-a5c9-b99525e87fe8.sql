-- Eliminar el cron job existente si existe
SELECT cron.unschedule('daily-alerts-job');

-- Crear el nuevo cron job para ejecutar las alertas diarias todos los días a las 10:00 AM
SELECT cron.schedule(
  'daily-alerts-job',
  '0 10 * * *', -- Todos los días a las 10:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://gyfmqedtupmpyfjujbwt.supabase.co/functions/v1/run-daily-alerts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Zm1xZWR0dXBtcHlmanVqYnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMTc2NDcsImV4cCI6MjA2Njc5MzY0N30.TGZka6qTsI8MGuPS9-4gw0ehAEVS_MnqGzeXdyrI7Ew"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);