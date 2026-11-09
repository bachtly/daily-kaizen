# supabase

- New functions get no execute by default: grant phone RPCs to `authenticated` and job helpers to `service_role` only.
- A trigger fired by a phone write that calls other functions, Vault or pg_net is `security definer` with `search_path=''`. The pgTAP test does that write as `authenticated`.
