# daily-kaizen

- Every supabase-js `update()` and `delete()` has a filter that matches the contract in `docs/design/2026-11-06-mvp/04-api.md` (e.g. `.eq('user_id', …)`). pg_safeupdate refuses unfiltered writes and mocked tests miss it, so a test asserts the filter.
