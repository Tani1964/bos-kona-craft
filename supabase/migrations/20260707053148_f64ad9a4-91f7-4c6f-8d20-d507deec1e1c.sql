
CREATE OR REPLACE FUNCTION public.admin_cron_runs(_limit int DEFAULT 50)
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  runid bigint,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz,
  duration_ms numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    r.runid,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time,
    EXTRACT(EPOCH FROM (r.end_time - r.start_time)) * 1000 AS duration_ms
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT * FROM cron.job_run_details d
    WHERE d.jobid = j.jobid
    ORDER BY d.start_time DESC
    LIMIT _limit
  ) r ON true
  ORDER BY r.start_time DESC NULLS LAST
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.admin_cron_runs(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cron_runs(int) TO service_role;
