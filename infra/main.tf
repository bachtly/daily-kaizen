# The app's hosting and address. Supabase is managed by the CLI (see deploy.yml).
# State holds no secrets: tokens come from the environment, and the app's values are public.

terraform {
  required_version = ">= 1.9"

  # Connection comes from PG_CONN_STR and PGPASSWORD. Use Supabase's session pooler (port 5432),
  # because state locking needs advisory locks and the transaction pooler has none.
  backend "pg" {
    schema_name = "terraform_state"
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.26"
    }
  }
}

# Tokens: CLOUDFLARE_API_TOKEN and VERCEL_API_TOKEN.
provider "cloudflare" {}

provider "vercel" {
  team = var.vercel_team_id == "" ? null : var.vercel_team_id
}

variable "vercel_team_id" {
  description = "Vercel team that owns bachtly.com. Empty for a personal account."
  type        = string
  default     = ""
}

locals {
  account_id = "40c57ef1d4ac3562a7c1be5a71fef4ba"
  domain     = "bachtly.com"
  subdomain  = "kaizen"
}

# No Git source: GitHub Actions builds the app and uploads it (Direct Upload).
resource "cloudflare_pages_project" "app" {
  account_id        = local.account_id
  name              = "daily-kaizen"
  production_branch = "main"
}

resource "cloudflare_pages_domain" "app" {
  account_id   = local.account_id
  project_name = cloudflare_pages_project.app.name
  name         = "${local.subdomain}.${local.domain}"
}

# After the Pages domain: a CNAME that exists first gets a 522 from Cloudflare.
resource "vercel_dns_record" "app" {
  domain = local.domain
  name   = local.subdomain
  type   = "CNAME"
  value  = cloudflare_pages_project.app.subdomain
  ttl    = 60

  depends_on = [cloudflare_pages_domain.app]
}

output "pages_hostname" {
  value = cloudflare_pages_project.app.subdomain
}
