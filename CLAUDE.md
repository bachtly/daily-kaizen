# daily-kaizen

- Current feature docs are in `docs/features/`. Existing files in `docs/design/` are an archive and aren't edited; new agent design docs and slice breakdowns are added there.
- Every supabase-js `update()` and `delete()` is filtered by `user_id` or the row's `id` (e.g. `.eq('user_id', …)`). pg_safeupdate refuses unfiltered writes and mocked tests miss it, so a test asserts the filter.

## Check command

Run from the repo root before every commit:

```sh
npm --prefix app run lint && npm --prefix app run build && npm --prefix app test
```

## Architecture

- `app/`: Vite + React web app. Unit tests run with Vitest (`--project unit`); Storybook stories are a separate Vitest project.
- `supabase/functions/`: Deno edge functions; shared code and its `*.test.ts` live in `_shared/`.
- `supabase/`: local config and DB tests (`supabase test db`).
- `infra/`: Terraform.
- `docs/features/`: current feature docs.

## Do not

- Edit `.github/workflows/` (the agent can't push workflow changes).
- Edit `infra/` or `supabase/config.toml` unless the issue asks for it.
- Agent runs can't run Deno, Supabase or Storybook tests. CI runs them on the PR, so say in the PR body that they're unverified.
