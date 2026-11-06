# Backend feedback 1 (2026-11-06)

User answers:
- Sending domain (OQ-7): a subdomain of the owner's own domain, e.g. `mail.<my domain>`. The exact domain is given at setup; keep it as a setup step, not TBD.
- Push library (OQ-8): `@pushforge/builder`. Record as an ADR; first push on the device confirms it.
- Tagging retry cap (OQ-3): **3 attempts** (about 45 min), not 5.
- Session (OQ-6) and Local copy store (OQ-9): keep the recommended defaults (Supabase default sessions; Dexie + persist()), confirmed by the device test. Leave under open questions.
- Free-plan pause (OQ-5): daily use is the mechanism, the pause warning email is the signal; cron keep-alive only as an unverified extra. Drop the "keep-alive vs Pro" ADR candidate.

Gate: apply ALL critic findings (1–10) and ALL consistency issues, then approve.

Critic findings accepted (all):
1. Insert trigger: security definer, search_path '', owned by postgres, body wrapped in exception handler (raise warning) so it never fails the insert; Vault secret + URL created in the migration step before app deploy.
2. Job helpers: revoke EXECUTE from public/anon/authenticated, grant to service_role only (or non-exposed schema); pgTAP asserts it.
3. Notification dedupe: one SQL function computes due rows and claims them (insert ... on conflict do nothing returning), formatting `about` in SQL; Edge Function sends only claimed rows.
4. Tagging check time budget: oldest first, stop starting new AI calls after ~110 s; leftovers wait for the next run.
5. send-notifications: reply 202 and finish in EdgeRuntime.waitUntil; signal = non-2xx/timeouts in net._http_response (checked daily) plus the Sunday notifications_sent row.
6. NFR-2/NFR-3: app keeps last ~50 save and refresh durations in Dexie, Settings shows p95. NFR-5: weekly export (dashboard CSV or pg_dump) during the 14-day run; signal = export date; note free-plan backup availability unverified.
7. Kill switch: missing config → 503 that doesn't count as an attempt (or unschedule + disable trigger).
8. Nudge requires a push_subscriptions row.
9. Seed as `seed_account(uid)`, run once after creating the user; reused in pgTAP fixtures.
10. OQ-5 as above.

Consistency issues accepted (all): batch cap explained as "leftovers next run, oldest first" (NFR-4 still met); Nudge rule needs Push subscription and no Entries means no Nudge; Review reminder Sunday cut-off marked (judgement); drop glossary proposals for terms already in the glossary; use glossary terms (Rejected category, not "Rejected names"; avoid new terms like "Tag clearing"); say the job helpers are internal, service-role only (04 lists only phone-facing rpcs); define enums/types only by reference to 03 or mark as implementation names; cite sources as in research/report.md; add tests for AC-4.1, AC-5.3, AC-6.3, AC-2.3, AC-6.2, UC-6; Review reminder email goes to the login email.
