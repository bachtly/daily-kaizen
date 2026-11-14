-- Insights check (#80, design §9): hourly at :05. The function decides per user what is due in their
-- local time (Sunday 18:00 new insights, Monday 04:00 change results). Vault secret: insights_url.
-- Until it exists every run is a quiet no-op (post_job).
select cron.schedule('insights-check', '5 * * * *', $$select public.post_job('insights_url')$$);
