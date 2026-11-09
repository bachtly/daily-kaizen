# Deploying daily-kaizen

Each push to `main` runs `.github/workflows/deploy.yml`:

1. **Supabase CLI:** migrations, `supabase/config.toml` (`[remotes.production]`), function secrets, functions, then `supabase/post_deploy.sql` (Vault, first seed).
2. **Terraform (`infra/`):** Pages project, `kaizen.bachtly.com`, and the CNAME at Vercel.
3. **App:** build and Direct Upload to Pages.

The deploy is skipped, with a warning, until every secret below is set.

## First-time setup

These steps are outside the code:

- Create the Supabase project and my user (done). A new user is seeded on the next deploy.
- Verify the sending domain in Resend (done).

GitHub repo secrets (repo admin only):

```powershell
gh secret set -f .env --repo bachtly/daily-kaizen
gh secret set SUPABASE_ACCESS_TOKEN --repo bachtly/daily-kaizen
gh secret set SUPABASE_DB_PASSWORD --repo bachtly/daily-kaizen
gh secret set CLOUDFLARE_API_TOKEN --repo bachtly/daily-kaizen
gh secret set VERCEL_API_TOKEN --repo bachtly/daily-kaizen
```

| Secret | Where it comes from |
|---|---|
| `.env` | `JOB_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `APP_URL` |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | The database password of the project |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Custom token, permission Account / Cloudflare Pages / Edit |
| `VERCEL_API_TOKEN` | Vercel → Account Settings → Tokens, scoped to the team that owns `bachtly.com` |

If `bachtly.com` belongs to a Vercel team, also set the repo variable `VERCEL_TEAM_ID`.

## Rotating a secret

Update the GitHub secret and re-run **Actions → Deploy → Run workflow**. `JOB_SECRET` reaches the functions and Vault in the same run.

## Run Terraform by hand

```powershell
cd infra
$env:PG_CONN_STR = "postgres://postgres.naiiplbdydablbudaqzr@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
$env:PGPASSWORD = "<database password>"
$env:CLOUDFLARE_API_TOKEN = "<token>"
$env:VERCEL_API_TOKEN = "<token>"
terraform init
terraform plan
```
