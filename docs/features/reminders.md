# Reminders

## What it does
- A **Nudge** push when I forget to log: one per Gap (time since my last Entry) that reaches my Nudge gap.
- A **Review reminder** on Sunday 19:00 (my latest reported time zone), by email and by push.
- A push when the AI suggests a new Category.
- **Settings** has Quiet hours, the Nudge gap, Turn on notifications and a Diagnostics section.

## Rules
- Nudge gap: whole hours 1–12, default 3. Changing it applies from the next check; a Gap already Nudged never gets a second Nudge.
- Quiet hours default 23:00–07:00 and may wrap midnight; start and end must differ. A Gap that reaches the gap inside them gets its Nudge when they end.
- One Nudge per Gap and one Review reminder per week; each is recorded before sending.
- Jobs skip me while no time zone has been reported; the app reports it on every open.
- Turn on notifications asks the phone for permission; if denied, the app says push is off and the Review reminder email still arrives.
- A Nudge opens the Day view with the Log sheet; the Review reminder and Category suggestion open the Week page.
- A dead push endpoint is dropped and refreshed on the next open; no retries.
- The email has no link, because a link would open the browser rather than the home-screen app.

## Decisions
- The Nudge gap is a setting, not a fixed 3 hours, minutes, or a repeating Nudge (D6).
- Push goes from an Edge Function with `@pushforge/builder` (backend D5).
- One payload for both phones: the Declarative Web Push shape. iPhone shows it as is; on Android the service worker's `push` handler shows the same title, body and link. The payload isn't `mutable`, so iPhone never runs the handler and can't show it twice.
- If push proves unreliable, push is dropped and the Review reminder goes by email only.

Details: [archived design](../design/2026-11-06-mvp/06-backend.md).
