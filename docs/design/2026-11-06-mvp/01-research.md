# daily-kaizen MVP: research

Sources are cited as `[S1]` and listed under [Sources](#sources). Marks:
**(snippet)** means only a search summary was seen, **(forum)** means a forum post with no vendor reply,
**(judgement)** is my reasoning, and **(general knowledge)** has no source in this run. Unmarked
citations are official or project pages that were read. Nothing has been tested on a device.

This research was done when the agreed design still had an offline Outbox, so the items below mention it. The
design later dropped it: every write needs a connection ([D3](03-data-model.md#decisions)).

## Our system today

- Current flow: no implementation. Goals are in `README.md:12`; the agreed stack and behaviour are in `docs/mvp-design.md:20` and `docs/mvp-design.md:31`.
- Relevant modules, data and contracts: only a data sketch at `docs/mvp-design.md:82`.
- Reusable pieces: none in this repo.
- Constraints and debt: no code debt. The brief requires the agreed stack unless there's a blocker, under about $5 a month, and conventional approaches.

What the research found about the agreed design, now constraints for later stages:

1. **Outbox storage isn't guaranteed.** Safari storage is best-effort. WebKit says home-screen apps have their own use counter and calls deleting their data a serious bug, but makes no promise [S3, S4]. `persist()` is decided by heuristics [S4, S39]. Requesting it on each launch is forum advice [S23] (forum). An iOS 17 report of storage being cleared, cause unknown, exists [S64] (forum, snippet). Safari not supporting Background Sync is general knowledge, and `docs/mvp-design.md:43` already assumes it. So the app syncs on every open. Two proposals for the requirements stage, an unsynced count and an export of the Outbox, protect only before eviction, since eviction clears them too. G3 now guarantees only Synced entries.
2. **Login session in the home-screen app is unverified.** Supabase sessions have no time limit by default, and refresh tokens are single-use [S15]. No source covers Supabase login inside an iOS home-screen app (not found). Requirement candidates: logging works without a live session, and the Outbox survives sign-out and re-login.
3. **Tagging has no retry.** `docs/mvp-design.md:51` says "retried", but Database Webhooks and pg_net document no retries, pg_net's default timeout is 2 seconds, and its queue can lose pending requests in a crash [S9, S10]. A scheduled sweep of Untagged entries is needed, and the function should answer fast or continue with `waitUntil` [S37]. A timed-out call that keeps running could be tagged twice by the sweep (judgement), so tagging must be safe to repeat.
4. **Push can die silently.** iPhone subscriptions have been reported to become invalid without user action, in a WebKit bug still open at its last update in 2024 [S20]. Apple's endpoint may report success for dead subscriptions [S21] (forum), [S44] (snippet). Re-sending the subscription on every open is a mitigation (judgement), and re-subscribing without a tap may not be allowed, since the prompt needs a user gesture [S1]. The iPhone runs iOS 18.4 or later (brief, Constraints), so Declarative Web Push is available, which avoids the silent-push penalty [S2]; that penalty is only partly verified.
5. **Push sender library is open.** npm `web-push` is reported as limited on Deno by the README of a competing library [S40] (snippet). Supabase's example doesn't cover browser push [S5]. Candidates: `@pushforge/builder`, `negrel/webpush` [S40, S41] (snippets).
6. **Login email.** Supabase's built-in email sends 2 per hour, best-effort, to team members only [S12, S13]. Whether a sole team member is enough is unverified. Rate limits and reliability favour custom SMTP through Resend from the start [S13], at 100 emails a day free [S18]. Whether Resend needs a purchased sending domain is unverified.
7. **Smaller facts.** Free projects pause without "sufficient" database activity over a week, with no number given [S8]. pg_cron's time zone isn't in the official docs; blogs say UTC [S14, S43]. Supabase can't reliably host the app [S11, S22]. Cloudflare Pages stays by the brief's stack constraint, unresearched. Dexie is unresearched.
8. **Logging burden.** Required start and end times are more input than one-tap tools such as aTimeLogger [S32]. Epstein et al. list six reasons people stop self-tracking; the cost of collecting data is one, and manual entry is its most common burden. Seeing gaps in data can feel judgmental [S63]. This bears on G1 and G2, and the ui stage owns it.

## How others solve it

| Solution | Approach | Strengths | Weaknesses | Source |
|---|---|---|---|---|
| TimeTagger | Web timeline, tags, offline-capable client, CSV and PDF reports, targets, web API | Simple, self-hostable, cheap | No native mobile app; AI tagging, weekly review and Unlogged handling not found | [S28, S29, S30, S60] |
| Traggo | Tagged time spans, custom dashboards | Tags only, no projects | Web UI only; maintenance status unclear | [S31] |
| Simple Time Tracker | One-tap activities, widgets, offline | Fast logging | Android only as far as found | [S47] (snippet) |
| Toggl Track | Timer, manual entry, idle prompts, reports, scheduled report emails | The only tool found with reminder and digest emails | Built for billing and teams; scheduling is Premium | [S33, S61], [S62] (snippet) |
| aTimeLogger | One-tap timers, widget, Siri start, reports | Fast logging on iPhone | Sync costs $4.99 a month | [S32] |
| Super Productivity | Daily freeform Reflection; asks on return how away time was spent | Classify-or-discard prompt for away time | No weekly review | [S55, S56] |
| Kimai | Weekly, monthly, yearly reports; weekly entry table | Clear weekly view | No guided review or reminders found | [S58, S59] |
| life_logger, LIFE-LOGGER | Terminal log; Telegram bot storing to GitHub | Each entry starts where the last ended, so no Unlogged time | Early stage; no review | [S52, S53] |
| AI logging apps | Natural-language or automatic capture with AI categories | Low-effort capture | Mostly business timesheets; vendor claims only | [S48] (snippet) |

**Review:** none of the tools read offers a guided weekly review. They give reports you open yourself,
and Toggl emails a link [S55, S58, S59, S60, S61]. **Unlogged time:** only Super Productivity's
prompt on return [S56] and life_logger's start-at-last-end rule [S52] address it. Judgement: a short
scheduled review with neutral Unlogged wording would be unusual among these tools, but there's no
evidence that it improves retention.

## Options

### O1 · Web app with an Outbox (the agreed design, hardened)

The agreed stack. Entries go into the Outbox, then are sent to the server with an ID created on the phone,
so a resend creates no duplicate. Supabase's upsert behaviour wasn't researched, and the api stage owns this
contract. A resend must never overwrite server-owned fields, such as a Tag set by the AI or by me. The phone
also reads Tags and Categories back from the server, so creation is conflict-free but tags flow both ways.
Fit: full. Running cost: about $0.04 a month for Claude, plus any sending domain, with free plans for the
rest [S7, S18]. Build effort: the Outbox, sync, export and retry logic are hand-written (judgement: moderate).
Main risks: items 1 to 4 above. Reversible: yes, because server data doesn't depend on the phone's storage design.

### O2a · Web app with RxDB

RxDB replicates to the existing Supabase through PostgREST and Realtime, so no new server [S26]. Licence and
price weren't found; the site links to a Premium section [S26]. It still stores data in the browser, so the
eviction risk remains (judgement). Build effort: less sync code, but a new library and data model to learn.
Reversible: costly, because the phone's data layer is built around it (judgement).

### O2b · Web app with PowerSync

Free cloud plan, which deactivates after 1 or 2 weeks of inactivity (its page says both), or a free
self-hosted edition that would need its own server; Pro starts at $49 a month, over budget [S27]. Same
browser-storage risk and reversibility as O2a (judgement).

### O3 · Native iPhone app

Native storage and push would avoid browser limits (general knowledge, not researched). Cost: $99 a year,
about $8 a month, which would need the budget relaxed; the free route expires every 7 days [S34, S35].
Build effort: a new app instead of the React app (judgement: high). Reversible: costly.

### O4 · O1 plus an Apple Shortcut

A Shortcut posting entries directly (general knowledge; [S51] showed titles only). Fit: partial. It has no
defined way to authenticate, since data is limited to the signed-in user and access tokens last an hour
[S15], and offline posts would fail without a queue, which conflicts with the Outbox. Reversible: yes.

### O0 · Reuse TimeTagger, or do nothing

TimeTagger provides logging, an offline-capable client and an API, hosted at EUR 3 a month [S28, S29, S30].
AI tagging and a weekly review weren't found, and its API details weren't read (404). It has no native
mobile app. Doing nothing produces no data and fails every goal. Reversible: yes.

## Comparison

| Criterion (from the brief) | O1 Outbox | O2a RxDB | O2b PowerSync | O3 native | O4 + Shortcut | O0 TimeTagger |
|---|---|---|---|---|---|---|
| Job: AI tagging and Weekly review | Yes | Yes | Yes | Yes | Yes | Must be added to TimeTagger (not found) |
| iPhone home-screen use | Yes | Yes | Yes | Native app | Yes | Web app; mobile use not checked |
| G1 logging habit | Unproven | Unproven | Unproven | Unproven | Unproven | Weekly review missing |
| G2 under 15 seconds, offline too | To test | To test | To test | Not researched | Offline unverified | Not checked |
| G3 Synced entries never lost | Yes, server-side | Yes | Yes | Yes | Yes | Not checked |
| Keeps the agreed stack | Yes | Adds a library | Adds a service | No | Yes | No |
| Under about $5 a month | Yes | Licence unknown | Free plan only | No | Yes | Yes |
| Conventional, easy to maintain | Yes | New library | New service | New platform | Auth gap | Another project's code |

## Recommendation

**O1** on the agreed stack, recorded as [D1](#decisions). It keeps the agreed stack and budget, and adds no service.
It accepts silently missed Nudges. Its Outbox was later dropped for online-only writes ([D3](03-data-model.md#decisions)).

What would change this:

- **Logging feels too slow:** speed up the logging form first. Add O4 only if authentication and offline queuing are solved.
- **Nudges aren't delivered during the 14-day run, or Web Push fails the device test:** drop all push (Nudge, Review reminder and Category suggestion), and rely on the Review reminder email.
- **Weekly reviews are missed:** check whether the Review reminder email arrived. Email is the dependable channel for G1's reviews, since push can die silently (item 4).

## Decisions

### D1 · Build the MVP as a home-screen web app on the agreed stack

The MVP must log an Entry in under 15 seconds on an iPhone, for under about $5 a month, using conventional approaches
(brief). Options are described above.

| Option | Outcome | Reason |
|---|---|---|
| O1 · Web app on the agreed stack (React + Vite on Cloudflare Pages, Supabase) | **Chosen** | Keeps the agreed stack and budget and adds no service |
| O2a · Web app with RxDB | Rejected | Licence and price not found; a new library and data model; still relies on browser storage |
| O2b · Web app with PowerSync | Rejected | Adds a service that deactivates when idle; Pro is $49 a month |
| O3 · Native iPhone app | Rejected | $99 a year breaks the budget, and it replaces the planned app |
| O4 · O1 plus an Apple Shortcut | Rejected | No defined way to authenticate, and offline posts fail; reconsider only if logging is too slow |
| O0 · Reuse TimeTagger, or do nothing | Rejected | No AI tagging or Weekly review found; drops most of the design |

Consequences:
- O1 as researched also queued offline writes in an Outbox on the phone. That part is not in the design: every write
  needs a connection ([D3](03-data-model.md#decisions)).
- Nudges can be missed silently (item 4), so email stays the dependable channel for the Review reminder.

## Open questions

- Which push sender library works from an Edge Function, and can the app re-subscribe without a tap? (backend stage, device test)
- How does the Supabase login session behave in the home-screen app, offline and after a long gap? (requirements and backend, device test)
- Does Resend need a purchased sending domain for login emails? (backend)
- Does the pause rule count pg_cron or Edge Function traffic? Not found [S8]. (backend)
- Cloudflare Pages limits and Dexie behaviour on iOS: unresearched. (backend, device test)
- How accurately does Claude Haiku 5.5 tag my entries? Benchmark later, as `docs/mvp-design.md:103` plans. (after launch)

## Sources

Official means the vendor's own docs or blog. Snippet means only a search-result summary was seen. Unless marked, the page was read.

| Id | Title | URL | Publisher | Date | Official |
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
| S52 | life_logger README | https://github.com/mvi-x/life_logger | mvi-x | n/k | Project's own |
| S53 | LIFE-LOGGER README | https://github.com/naborajs/LIFE-LOGGER | naborajs | n/k | Project's own |
| S54 | Super Productivity wiki index | https://github.com/super-productivity/super-productivity/wiki | Super Productivity | n/k | Yes (titles only) |
| S55 | Super Productivity wiki: 4.18 Reflection | https://github.com/super-productivity/super-productivity/wiki/4.18-Reflection | Super Productivity | n/k | Yes |
| S56 | Super Productivity wiki: 4.17 Idle Time | https://github.com/super-productivity/super-productivity/wiki/4.17-Idle-Time | Super Productivity | n/k | Yes |
| S57 | Kimai documentation index | https://www.kimai.org/documentation/ | Kimai | n/k | Yes (index only) |
| S58 | Kimai: Weekly hours | https://www.kimai.org/documentation/weekly-times.html | Kimai | n/k | Yes |
| S59 | Kimai: Reporting | https://www.kimai.org/documentation/reporting.html | Kimai | n/k | Yes |
| S60 | TimeTagger home | https://timetagger.app/ | TimeTagger | n/k | Yes |
| S61 | Toggl: Saving, sharing and scheduling reports | https://support.toggl.com/saving-sharing-and-scheduling-reports | Toggl | n/k | Yes |
| S62 | Toggl help search results (weekly overview email, reminders) | support.toggl.com (result list) | Toggl | n/k | Yes (snippet only) |
| S63 | Beyond Abandonment to Next Steps (Epstein et al.) | https://pmc.ncbi.nlm.nih.gov/articles/PMC5428074/ | PMC / CHI | about 2016 | Peer-reviewed |
| S64 | Apple forum post: IndexedDB connection lost, then localStorage cleared on iOS 17 (URL not recorded) | not recorded | Apple Developer Forums | n/k | Forum, snippet only |

n/k = not known. Not reached: Apple's "Sending web push notifications in web apps and browsers" (no page text), docs.timetagger.app (DNS failure), superproductivity.com (empty page), one Toggl digest URL (404).
