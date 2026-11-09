# daily-kaizen

- Every supabase-js `update()` and `delete()` has a filter that matches the 04-api contract (e.g. `.eq('user_id', …)`). pg_safeupdate refuses unfiltered writes and mocked tests miss it, so a test asserts the filter.
