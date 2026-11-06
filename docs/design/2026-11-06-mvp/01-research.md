# daily-kaizen MVP: research

Sources are cited as `[S1]` and listed in [`research/report.md`](research/report.md). Marks:
**(snippet)** means only a search summary was seen, **(forum)** means a forum post with no vendor reply,
**(judgement)** is my reasoning, and **(general knowledge)** has no source in this run. Unmarked
citations are official or project pages that were read. Nothing has been tested on a device.

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

**O1**, recorded as [ADR 0001](adr/0001-web-app-with-an-outbox-for-the-mvp.md). It keeps the agreed stack
and budget, and adds no service. It accepts best-effort storage for the Outbox, silently missed Nudges, and
hand-written sync code.

What would change this:

- **Logging feels too slow:** speed up the logging form first. Add O4 only if authentication and offline queuing are solved.
- **Nudges aren't delivered during the 14-day run, or Web Push fails the device test:** drop all push (Nudge, Review reminder and Category suggestion), and rely on the Review reminder email.
- **Weekly reviews are missed:** check whether the Review reminder email arrived. Email is the dependable channel for G1's reviews, since push can die silently (item 4).
- **Outbox entries are lost in practice:** consider O3, which needs the budget relaxed. This is noticed only if I remember an entry that isn't on the server, since eviction leaves no trace.

## Open questions

- Which push sender library works from an Edge Function, and can the app re-subscribe without a tap? (backend stage, device test)
- How does the Supabase login session behave in the home-screen app, offline and after a long gap? (requirements and backend, device test)
- Does Resend need a purchased sending domain for login emails? (backend)
- Does the pause rule count pg_cron or Edge Function traffic? Not found [S8]. (backend)
- Cloudflare Pages limits and Dexie behaviour on iOS: unresearched. (backend, device test)
- How accurately does Claude Haiku 5.5 tag my entries? Benchmark later, as `docs/mvp-design.md:103` plans. (after launch)
