# Research report: daily-kaizen MVP risks (2026-11-06)

Method: "Official" means the vendor's own docs or blog. "Snippet" means only a search-result summary was seen, not the page. Several pages were read through a small summarising model. Nothing was tested on a device.

## Sources

| sid | Title | URL | Publisher | Date | Official |
|---|---|---|---|---|---|
| S1 | Web Push for Web Apps on iOS and iPadOS | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ | WebKit | 2023-02-16 | Yes |
| S2 | Meet Declarative Web Push | https://webkit.org/blog/16535/meet-declarative-web-push/ | WebKit | 2025-03-27 | Yes |
| S3 | Full Third-Party Cookie Blocking and More (7-day cap) | https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ | WebKit | 2020 (date not shown) | Yes |
| S4 | Updates to Storage Policy | https://webkit.org/blog/14403/updates-to-storage-policy/ | WebKit | 2023-08-10 | Yes |
| S5 | Supabase push notifications example | https://supabase.com/docs/guides/functions/examples/push-notifications | Supabase | n/k | Yes |
| S6 | Billing on Supabase | https://supabase.com/docs/guides/platform/billing-on-supabase | Supabase | n/k | Yes |
| S7 | Supabase Free plan | https://supabase.com/docs/guides/platform/free-plan | Supabase | n/k | Yes |
| S8 | Project Pausing | https://supabase.com/docs/guides/platform/project-pausing | Supabase | n/k | Yes |
| S9 | Database Webhooks | https://supabase.com/docs/guides/database/webhooks | Supabase | n/k | Yes |
| S10 | pg_net | https://supabase.com/docs/guides/database/extensions/pg_net | Supabase | n/k | Yes |
| S11 | Edge Functions limits | https://supabase.com/docs/guides/functions/limits | Supabase | n/k | Yes |
| S12 | Auth rate limits | https://supabase.com/docs/guides/auth/rate-limits | Supabase | n/k | Yes |
| S13 | Auth custom SMTP | https://supabase.com/docs/guides/auth/auth-smtp | Supabase | n/k | Yes |
| S14 | Supabase Cron | https://supabase.com/docs/guides/cron | Supabase | n/k | Yes |
| S15 | Auth sessions | https://supabase.com/docs/guides/auth/sessions | Supabase | n/k | Yes |
| S16 | Passwordless email logins | https://supabase.com/docs/guides/auth/auth-email-passwordless | Supabase | n/k | Yes |
| S17 | Storage downloads | https://supabase.com/docs/guides/storage/serving/downloads | Supabase | n/k | Yes |
| S18 | Resend pricing | https://resend.com/pricing | Resend | n/k | Yes |
| S19 | Resend quotas and limits | https://resend.com/docs/knowledge-base/account-quotas-and-limits | Resend | n/k | Yes |
| S20 | WebKit bug 273063 (iOS push subscription becomes invalid) | https://bugs.webkit.org/show_bug.cgi?id=273063 | WebKit Bugzilla | 2024-04-22 to 2024-07-30 | Semi (engineer comments) |
| S21 | Apple forum: Web Push response always success | https://developer.apple.com/forums/thread/719990 | Apple Developer Forums | 2022-11, 2024-02 | Forum, no Apple reply seen |
| S22 | Supabase GitHub discussion 2557 (HTML in Storage) | https://github.com/orgs/supabase/discussions/2557 | Supabase maintainer | 2021-07-26, 2023-06-12 | Semi |
| S23 | Apple forum: Safari iOS PWA data persistence beyond 7 days | https://developer.apple.com/forums/thread/710157 | Apple Developer Forums | 2022-07 to 2023-02 | Forum, no Apple staff |
| S24 | Replicache | https://replicache.dev/ | Rocicorp | n/k | Yes |
| S25 | Electric: writes guide | https://electric.ax/docs/guides/writes | ElectricSQL | n/k | Yes |
| S26 | RxDB Supabase replication | https://rxdb.info/replication-supabase.html | RxDB | n/k | Yes |
| S27 | PowerSync pricing | https://powersync.com/pricing.md | PowerSync | n/k | Yes |
| S28 | TimeTagger on GitHub | https://github.com/almarklein/timetagger | TimeTagger | n/k | Yes |
| S29 | timetagger.app | https://timetagger.app/ | TimeTagger | n/k | Yes |
| S30 | TimeTagger docs landing | https://timetagger.readthedocs.io/en/latest/ | TimeTagger | n/k | Yes |
| S31 | Traggo server | https://github.com/traggo/server | Traggo | n/k | Yes |
| S32 | aTimeLogger | https://atimelogger.pro/ | aTimeLogger | n/k | Yes |
| S33 | Toggl Track features | https://toggl.com/track/features/ | Toggl | n/k | Yes |
| S34 | Apple Developer Program enrollment | https://developer.apple.com/programs/enroll/ | Apple | n/k | Yes |
| S35 | Compare memberships | https://developer.apple.com/support/compare-memberships/ | Apple | n/k | Yes |
| S36 | Supabase: Scheduling Edge Functions | https://supabase.com/docs/guides/functions/schedule-functions | Supabase | n/k | Yes |
| S37 | Supabase: Background tasks | https://supabase.com/docs/guides/functions/background-tasks | Supabase | n/k | Yes |
| S38 | MDN: Background Synchronization API | https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API | MDN | modified 2024-04 | Yes (page lacks compat table) |
| S39 | MDN: StorageManager.persist() | https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist | MDN | n/k | Yes |
| S40 | Snippet: PushForge builder README (Deno support; web-push "limited") | https://cdn.jsdelivr.net/npm/@pushforge/builder@2.0.4/README.md | PushForge | n/k | No, snippet |
| S41 | Snippet: negrel/webpush on JSR | https://jsr.io/@negrel/webpush | JSR | n/k | No, snippet |
| S42 | Snippet: Supabase CLI issue 4396 (HTML served as text/plain) | https://github.com/supabase/cli/issues/4396 | GitHub | 2025-11 | No, snippet |
| S43 | Snippet: blog guides saying pg_cron runs in UTC | https://www.rapidevelopers.com/md/supabase-tutorial/how-to-schedule-cron-jobs-with-supabase | Blogs | n/k | No |
| S44 | Snippet: WebKit bug 249766, push to expired endpoint returns 200 | https://lists.webkit.org/pipermail/webkit-unassigned/2023-January/1079032.html | WebKit Bugzilla mailing list | 2023-01 | Semi, snippet |
| S45 | Snippet: Zero 1.0 | https://infoq.com/news/2026/06/zero-version-1 | InfoQ | 2026-06 | No, snippet |
| S46 | Snippet: Beyond Abandonment to Next Steps (Epstein et al.) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5428074/ | PMC / CHI 2016 | 2016 | Peer-reviewed, snippet |
| S47 | Snippet: Simple Time Tracker (Razeeman) | https://f-droid.org/packages/com.razeeman.util.simpletimetracker | F-Droid | n/k | Catalogue, snippet |
| S48 | Snippets: AI logging apps (Everlog, No Time, GamiNote, Rize) | https://apps.apple.com/app/everlog/id6761266088 | App Store / vendors | n/k | Vendor, snippet |
| S49 | Snippets: vendor/forum posts on why manual time tracking stops | https://medium.com/shoutbase/why-we-stop-tracking-time-b0582f2b6599 | Medium, Atlassian community | n/k | No |
| S50 | Snippet: WebKit bug 181850 (home-screen app storage on other origins) | https://bugs.webkit.org/show_bug.cgi?id=181850 | WebKit Bugzilla | 2018, 2022 comment | Semi, snippet |
| S51 | Apple Shortcuts User Guide (titles only) | https://support.apple.com/guide/shortcuts/welcome/ios | Apple | n/k | Yes, no detail seen |
| S64 | Apple forum post: IndexedDB connection lost, then localStorage cleared on iOS 17 (URL not recorded) | not recorded | Apple Developer Forums | n/k | Forum, snippet only |

n/k = not known. The Apple page "Sending web push notifications in web apps and browsers" returned no page text, so none of it is used.

## Q1. iPhone Web Push

Verified (official):

- Requirements: a home-screen web app with manifest `display` of `standalone` or `fullscreen`, added to the Home Screen. It uses standard W3C Web Push. The permission prompt must follow a direct user interaction [S1].
- Delivery goes through Apple's push service. No Apple Developer Program membership is needed. Servers must allow `*.push.apple.com` [S1].
- Declarative Web Push is testable on iOS 18.4. The payload has a top-level `"web_push"` key and a `"notification"` object with required `title` and `navigate`. The notification shows even if no script runs, so the silent-push penalty that can revoke subscriptions does not apply. The same format still works in older browsers [S2].

Reliability problems:

- A 2024 WebKit bug reports iOS PWA subscriptions becoming invalid without user action (`getSubscription()` returned null just after a push). WebKit does not fire `pushsubscriptionchange`. A WebKit engineer said some causes were in Web.app, not WebKit, and asked for retests on 17.5. The bug was still NEW and unresolved at last update (2024-07-30). One commenter had to re-subscribe after updating to 17.6 [S20].
- Apple's endpoint may not signal dead subscriptions. Forum reports show 200 after the user denied notifications, and 201 for a replaced subscription where 410 was expected [S21]. A WebKit bug says the same [S44].
- A search-result summary attributes to a WebKit maintainer that a 410 after unsubscribe is not guaranteed and may be delayed. The advice there was to send the current subscription to the backend on every visit and prune mismatches. This statement was not seen on a page.
- Detection: a 404 or 410 means delete the row, but no error does not prove the subscription works. Compare `getSubscription()` with the stored endpoint on each app open.
- Apple's silent-push rule (every push must show a notification) could not be read from Apple's doc. S2 implies the penalty exists, so this is only partly verified.

Sending from Supabase Edge Functions:

- Supabase's push example covers Expo and FCM only, not browser Web Push [S5].
- Whether npm `web-push` works on Deno: not found as a verified yes. A vendor README says it is "limited" on Deno because it uses Node `crypto.createECDH` and `https.request` [S40].
- Alternatives named: `@pushforge/builder` (Web Crypto; you send with `fetch`) [S40] and `negrel/webpush` on JSR [S41]. Both are snippet-only. Test on a real iPhone.
- Edge Function limits are 2 s CPU, 150 s wall clock (Free) and 256 MB [S11]. That is plenty for encrypting a payload.

Reliable enough for a 3-hour nudge? Judgement, not a source claim: yes for a nudge that can be missed, no for anything the app depends on. Evidence: unresolved subscription loss [S20], no dependable dead-endpoint signal [S21, S44], no `pushsubscriptionchange` [S20]. The Sunday review is also sent by email, which covers that case.

## Q2. Storage durability, background sync, auth

Verified (official):

- The 7-day cap: Safari deletes all script-writable storage, IndexedDB included, after 7 days of Safari use without user interaction on the site [S3]. Home-screen web apps "have their own counter of days of use". WebKit does not expect their data to be deleted and calls such deletion a serious bug. It is not worded as an explicit exemption [S3].
- Quotas (Safari 17+): a standalone home-screen app gets the same origin and overall quotas as in the browser [S4].
- Eviction can still happen under quota pressure, storage pressure, or after a period without interaction, per origin, least recently used first. Origins in persistent mode or with an active page may be excluded. The default is best-effort with no guarantee [S4].
- `persist()`: WebKit decides by heuristics, and being a Home Screen Web App is one factor [S4]. MDN says the browser may refuse and data may then be cleared under pressure [S39]. No Apple statement was found that `persist()` fully protects against the 7-day rule.
- Forum answers (no Apple staff): home-screen apps are not subject to the 7-day limit, `persist()` worked in the poster's experience, and the request is needed on each launch [S23]. Unverified.
- Field reports: one Apple forum post (snippet) describes IndexedDB connection loss followed by cleared localStorage on iOS 17, cause unknown. No confirmed 2025-2026 eviction report for an installed app was found. Not found is not proof of safety.
- Background Sync is marked limited availability and not Baseline on MDN [S38]. That Safari lacks it comes from the fetch tool's general knowledge, not the page. No official statement was found on whether a service worker can sync while the app is closed on iOS; the missing API implies it cannot.
- Auth: Supabase sessions have no time limit by default (time-box and inactivity limits are Pro-only). Access tokens last 1 hour by default. Refresh tokens do not expire but are single-use, with a 10 s reuse window; other reuse ends the whole session. A lost refresh response is tolerated [S15].
- Supabase auth in an iOS home-screen web app: no source found. A 2018 WebKit bug about storage on other origins (snippet) probably does not apply to first-party storage. Unverified [S50].

## Q3. Offline writes with Supabase

- Outbox plus idempotent upsert with a client UUID: no source was read for Supabase upsert behaviour. It keeps the stack as is.
- Electric: read-path only. Client writes are the developer's job, with four patterns including an embedded PGlite database [S25].
- Replicache: maintenance mode, no new features, free and open source, users told to move to Zero [S24]. Zero 1.0 shipped June 2026 per a snippet [S45]. Fit for Supabase and free hosting: not verified.
- RxDB: a Supabase replication plugin exists (PostgREST pulls and pushes, Realtime stream, soft deletes). Licence and price are not on that page ("not found"); the site links to a Premium section [S26].
- PowerSync: Free is $0 with 2 GB synced a month, 500 MB hosted and 50 concurrent clients. Its own page says projects are deactivated after 1 week of inactivity in one place and 2 weeks in another. Pro is from $49 a month. A free self-hosted Open Edition exists [S27].
- Fit (judgement): a single-user append-mostly log has no merge conflicts, so a sync engine adds a vendor or server for little gain. PowerSync Pro breaks the $5 cost limit [S27]. Recommendation: keep outbox plus upsert.

## Q4. Supabase and Resend operational facts

- Free plan: 2 projects, 5 GB egress, 500 MB database, 50,000 MAU, 1 GB storage, 500,000 Edge Function invocations, 2M Realtime messages [S6, S7].
- Pausing: "A Free plan project is considered inactive if it does not receive sufficient user database activity over the past week." A few daily requests are typically enough. There is a warning email about a week before and a confirmation after [S8]. The exact threshold is not found. Whether pg_cron or Edge Function traffic counts is not found.
- Conflict on restore window: the page read says "up to 1 year" [S8]. A search snippet of the .md version said 90 days. The page read is trusted over the snippet.
- Database Webhooks wrap triggers using pg_net and fire after the row change; history is in the `net` schema [S9]. No delivery guarantee or retry is documented [S9, S10].
- pg_net: requests start only after the transaction commits. Request and response tables are unlogged, so pending requests can be lost in a crash. Responses are kept 6 hours, the default timeout is 2000 ms, and it is designed for up to 200 requests per second. Failures are recorded in `net._http_response`. Retries are not mentioned [S10]. A tagging call that fails or times out is therefore lost unless the app retries it.
- Edge Function limits: 150 s wall clock (Free), 2 s CPU, 256 MB, 20 MB bundle when bundled locally, 100 functions on Free. Outgoing ports 25 and 587 are blocked. `text/html` is rewritten to `text/plain` unless a custom domain is used [S11]. Background work can continue after the response via `EdgeRuntime.waitUntil` [S37].
- pg_cron: set up via SQL or Dashboard, runs logged in `cron.job_run_details`, recommended at most 8 concurrent jobs of under 10 minutes each [S14]. The time zone is not stated in the official docs ("not found"). Two blog guides say UTC [S43]. Jobs call functions through pg_net with a secret key kept in Vault [S36].
- Email OTP: put `{{ .Token }}` in the Magic Link template to get a 6-digit code. Expiry defaults to 1 hour and resend is allowed once per 60 s [S16].
- Built-in email service: team members only, 2 emails an hour, best-effort [S12, S13]. Custom SMTP is required for real login. After setting it the limit starts at 30 an hour and is adjustable. Resend is listed as compatible [S13].
- OTP session lifetime: no limit by default (see Q2) [S15].
- Static hosting on Supabase: no official statement that it is supported. A maintainer said in 2021 that HTML is overridden to plain text, and in 2023 that uploading HTML is "currently not supported" [S22]. A November 2025 issue (snippet) reports `text/plain` still returned [S42]. The Storage docs page is silent [S17]. Keep Cloudflare Pages.
- Resend Free: 100 emails a day, 3,000 a month, 3 domains, 30-day retention, 10 requests per second [S18, S19].

## Q5. How others do the job

- TimeTagger (GPL-3.0): interactive timeline, tags instead of projects, offline-capable client with sync, CSV and PDF reports, targets, web API and CLI. Strengths: simple and self-hostable. Weaknesses: no native mobile app; no gap handling or AI found [S28, S29, S30].
- Traggo: "no tasks, only tagged time spans", customisable dashboards, web UI only. Weakness: maintenance status unclear (no release shown, Travis badge) [S31].
- Simple Time Tracker (Android, Razeeman): one-tap activities, widgets, offline, statistics, CSV export. About 557K installs and a 4.71 rating per a store tracker. Weakness: no iOS version found [S47, snippet].
- Toggl Track: timer, manual entries, idle-detection prompts, reminders when hours fall short, an app and website auto-tracker timeline you convert by hand, calendar events, summary and detail reports. Built for billing and teams; no AI tagging seen [S33].
- aTimeLogger: one-tap timers, widget, Siri and automation start, categories, groups and tags, reports. Standard is $5.99 one-time; sync needs $4.99 a month [S32].
- ATracker: the App Store page returned 404. Not found.
- AI logging apps: natural-language entries (No Time, GamiNote), AI extraction from voice or text (Everlog), automatic capture with AI categories (Rize). Mostly business timesheets, vendor claims only, maturity unverified [S48, snippet].
- No product read describes handling of unlogged gaps beyond Toggl's idle prompt. Not found.

Why people stop: the only peer-reviewed work found covers self-tracking generally, not time logs. Epstein et al. (193 surveyed, 12 interviewed) found lapsing and stopping are common, with forgetting among the causes. The full list of six reasons was not read [S46, snippet]. Vendor and forum posts say people forget to start or stop timers after a few days, postpone logging until it is inaccurate, and find manual entry a burden [S49]. Those sources sell automation. No measured abandonment rate for time logging was found.

## Q6. Alternatives to a PWA

- Apple Shortcut or widget posting to the backend: the Shortcuts guide page showed only titles (home-screen widget, Action button, automations, web API) [S51]. Details on posting and on offline behaviour: not found. Cost and effort: not found. General knowledge says it is free and quick to build, but an offline post would fail unless the Shortcut queues it. Unverified.
- Free native app via Xcode Personal Team: up to 3 devices and 3 apps per device, profiles expire after 7 days, so it must be rebuilt and reinstalled weekly [S35].
- Paid Apple Developer Program: $99 a year, needed for TestFlight and App Store distribution [S34, S35]. The TestFlight build lifetime was not on the pages read: not found.
- Reuse TimeTagger: self-hosted is free; hosted is EUR 3 a month or EUR 144 lifetime [S29]. It has a web API to query, create and update records [S30]. The API page itself returned 404, so authentication details are not found. No AI tagging or weekly waste review was found. Using it would drop most of the design.

## Risks to the design in docs/mvp-design.md (most serious first)

1. Unsynced entries rely on IndexedDB that Safari treats as best-effort. Home-screen apps have their own use counter and WebKit calls deletion a bug, but there is no guarantee and no official `persist()` promise [S3, S4, S39]. This threatens G3. Mitigate: call `persist()` on each launch, sync on every open, show an unsynced count, add an outbox export.
2. Tagging on insert has no documented retry. pg_net tables are unlogged and the default timeout is 2 s [S9, S10]. The design says "retried" with no mechanism. Add a cron sweep of untagged entries and answer fast or use `waitUntil` [S37].
3. Push can die silently. iOS subscriptions get invalidated without user action, Apple may return 200 or 201 for dead endpoints, and `pushsubscriptionchange` is not fired [S20, S21]. 410 pruning is not enough. Re-send the subscription on each open, consider Declarative Web Push on iOS 18.4+ [S2], and keep email for the Sunday review.
4. Login: the built-in email service allows 2 emails an hour, team members only [S12, S13]. Configure Resend SMTP before the first login test. Resend Free is 100 emails a day [S18].
5. Push sender library is undecided. npm `web-push` is reported as limited on Deno [S40], and Supabase's example does not cover browser push [S5]. Choose a Deno-native library and test it early.
6. Pausing: the rule is "sufficient user database activity" over a week with no number [S8]. Daily logging probably keeps it alive, but a holiday week could trigger the warning. Not found whether cron counts.
7. Time zones: the Sunday 19:00 phone-zone schedule needs an hourly cron that checks the zone, because the official page does not give pg_cron's zone and blogs say UTC [S14, S43].
8. Logging speed versus abandonment: required start and end times on every entry are more input than one-tap tools like aTimeLogger [S32]. Evidence on abandonment is weak but points to burden and forgetting [S46, S49]. This bears on G1 and G2.
9. Costs are not a risk for one user (3,000 emails a month, 500,000 invocations) [S7, S18]. Cloudflare Pages and Dexie were not researched in this pass.

# Follow-up: review and Unlogged time in other tools (2026-11-06)

A second, smaller pass on how tools support weekly review, Unlogged time and reminders. Same marking rules. aTimeLogger was not checked in this pass.

## Sources (continued)

| sid | Title | URL | Publisher | Date | Official | Read |
|---|---|---|---|---|---|---|
| S52 | life_logger README | https://github.com/mvi-x/life_logger | mvi-x | n/k | Project's own | Read |
| S53 | LIFE-LOGGER README | https://github.com/naborajs/LIFE-LOGGER | naborajs | n/k | Project's own | Read |
| S54 | Super Productivity wiki index | https://github.com/super-productivity/super-productivity/wiki | Super Productivity | n/k | Yes | Titles only |
| S55 | Super Productivity wiki: 4.18 Reflection | https://github.com/super-productivity/super-productivity/wiki/4.18-Reflection | Super Productivity | n/k | Yes | Read |
| S56 | Super Productivity wiki: 4.17 Idle Time | https://github.com/super-productivity/super-productivity/wiki/4.17-Idle-Time | Super Productivity | n/k | Yes | Read |
| S57 | Kimai documentation index | https://www.kimai.org/documentation/ | Kimai | n/k | Yes | Index only |
| S58 | Kimai: Weekly hours | https://www.kimai.org/documentation/weekly-times.html | Kimai | n/k | Yes | Read |
| S59 | Kimai: Reporting | https://www.kimai.org/documentation/reporting.html | Kimai | n/k | Yes | Read |
| S60 | TimeTagger home | https://timetagger.app/ | TimeTagger | n/k | Yes | Read |
| S61 | Toggl: Saving, sharing and scheduling reports | https://support.toggl.com/saving-sharing-and-scheduling-reports | Toggl | n/k | Yes | Read |
| S62 | Toggl help search results (weekly overview email, reminders) | support.toggl.com (result list) | Toggl | n/k | Yes | Snippet only |
| S63 | Beyond Abandonment to Next Steps (Epstein et al.) | https://pmc.ncbi.nlm.nih.gov/articles/PMC5428074/ | PMC / CHI | about 2016 | Peer-reviewed | Read |

Not reached: docs.timetagger.app (DNS failure), superproductivity.com (empty page), one Toggl digest URL (404).

## How tools support review

- Super Productivity: Reflection is a freeform note for one day, with no prompts and no weekly review [S55]. Its Worklog, Quick History and Metrics pages were not read [S54].
- Kimai: weekly, monthly and yearly report views, and a spreadsheet-style weekly entry table; no guided review or prompts found [S58, S59].
- TimeTagger: CSV and PDF reports and targets on a timeline; no weekly view or prompts mentioned [S60].
- Toggl Track: saved reports can be scheduled daily, weekly or monthly by email, weekly ones on Mondays, on the Premium plan [S61]. A weekly overview email also exists [S62, snippet]. Reports and digests only, not a guided review.
- life_logger: hours per tag and filtering in a terminal; the README says it "is definitely not usable" [S52].
- LIFE-LOGGER: a Telegram bot committing entries to GitHub; no weekly review, AI reflections listed as future work [S53].
- No time-tracking product with an explicit guided weekly review was found.

## Unlogged time

- Super Productivity subtracts idle time after 5 minutes by default, and on return asks whether the away time was task time, a break, or should be discarded [S56]. This is a prompt on return, not an Unlogged view.
- life_logger starts each entry at the end of the previous one, so there are no gaps by construction, and has a `--catch-up` option whose behaviour isn't described [S52].
- Kimai, TimeTagger and LIFE-LOGGER: no handling of Unlogged time found [S53, S58, S59, S60].

## Reminders

- Toggl is the only tool found with real reminder channels: scheduled report emails with a link (Premium) [S61], and email reminders to track time (snippet, Premium) [S62].
- Super Productivity has break reminders (title only) [S54]. None found for Kimai, TimeTagger, life_logger or LIFE-LOGGER [S52, S53, S57, S60].

## Why reviews stick or lapse

- No evidence specific to weekly time reviews was found. Epstein et al. cover self-tracking in general and list six reasons people stop: the cost of collecting data, the cost of sharing it, discomfort with what the data shows, doubts about data quality, having learned enough, and life changes. Manual entry is the most common burden, and seeing gaps in the data can feel judgmental [S63]. Applying this to a weekly time review is inference.
