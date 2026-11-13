# daily-kaizen

- Current docs are in `docs/features/`; `docs/design/` is an archive and isn't edited.
- Every supabase-js `update()` and `delete()` is filtered by `user_id` or the row's `id` (e.g. `.eq('user_id', …)`). pg_safeupdate refuses unfiltered writes and mocked tests miss it, so a test asserts the filter.
