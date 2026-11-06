# Build the MVP as a web app with an Outbox

Status: superseded by [0004](0004-require-a-connection-for-all-writes.md) · Date: 2026-11-06 · Deciders: Bach · Stage: [01-research.md](../01-research.md)

## Context and problem

The MVP must log entries in under 15 seconds, online or offline, on an iPhone, for under about $5 a month.
Offline entries have to wait on the phone until they reach the server, and iPhone browser storage carries no guarantee.

## Decision drivers

- G2: logging under 15 seconds, offline too
- G3: no Synced entry is ever lost
- Constraints: keep the agreed stack, under about $5 a month, conventional approaches

## Options

1. Web app with an Outbox (O1) 2. Web app with RxDB (O2a) 3. Web app with PowerSync (O2b) 4. Native iPhone app (O3) 5. O1 plus an Apple Shortcut (O4) 6. Reuse TimeTagger (O0)

## Decision

Chosen: "Web app with an Outbox", because it keeps the agreed stack and budget, adds no service, and one user adding entries creates no conflicts that a sync library would need to solve. Tags still flow back from the server, so a resend must never overwrite server-owned fields; the api stage defines this.

- Good: no new vendor or library; server data doesn't depend on the phone's storage design, so it's easy to change later.
- Bad: entries in the Outbox are best-effort, and could be lost if iOS clears browser storage. We live with it by narrowing G3 to Synced entries, syncing on every open and requesting persistent storage.
- Bad: the Outbox, sync and retry logic are hand-written.

## Pros and cons of the options

### Web app with an Outbox

- Good, because it fits the agreed stack and stays near-free.
- Bad, because Outbox storage is best-effort and sync code is hand-written.

### Web app with RxDB

- Good, because it replicates to the existing Supabase with less sync code.
- Bad, because its licence and price weren't found, and it still relies on browser storage.

### Web app with PowerSync

- Good, because sync is handled for us.
- Bad, because it adds a service that may deactivate when idle, and Pro is $49 a month.

### Native iPhone app

- Good, because native storage and push would avoid browser limits (not researched).
- Bad, because it costs $99 a year, over budget, and replaces the planned app.

### O1 plus an Apple Shortcut

- Good, because logging could be faster.
- Bad, because it has no defined way to authenticate, and offline posts would fail.

### Reuse TimeTagger

- Good, because logging and offline support exist.
- Bad, because AI tagging and the weekly review weren't found, and most of the agreed design would be dropped.
