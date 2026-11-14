# Account

## What it does
- **Sign in** with my email and a 6-digit emailed code, in the home-screen app or any browser. A new email creates an account.
- **/install** explains Add to Home Screen for this phone: Safari or Chrome on iPhone, Chrome on Android. Any other browser or device is told to open the address in one of those.
- The app keeps a read-only **Local copy** so the Day view and Week page work offline.
- **Settings → Account → Sign out** signs this device out.

## Rules
- Every account's data is private to it (row-level security); a new account gets its settings and 5 starting Categories automatically.
- The Local copy holds my Entries ending after the previous Monday 00:00, Categories, Activities and chip counts, settings and Review done records, plus when it was refreshed.
- It refreshes on open, on returning to the foreground, and after a confirmed change; it changes only by a refresh. Mounted screens re-read it when data changes.
- On open the app also reports the time zone and the push subscription (if permitted).
- Every write needs a connection and is shown as done only after the Server confirms it. On failure the form keeps my text.
- A lost session asks me to sign in and keeps what I typed.
- If iOS clears browser storage the session goes too; I sign in again and nothing saved is lost.
- Sign-out needs a connection (the button is disabled offline); on failure the session and Local copy stay with "Couldn't sign out. Try again."
- Sign-out ends only this device's session and clears every Local copy table, so a table added later can't be missed (#72).
- A wrong or expired code shows an error; a new code can be requested after a wait.

## Decisions
- Anyone can sign up, with the same copy for every email (#48).
- Sign-in from any browser, with install steps on their own page (#56).
- Android is supported as a home-screen web app from Chrome, like the iPhone; no native app.
- Online writes with a read-only Local copy, not an Outbox (D3).
- Sign-out clears via `db.tables` rather than a hand-kept list (#72).

Details: [archived design](../design/2026-11-06-mvp/03-data-model.md).
