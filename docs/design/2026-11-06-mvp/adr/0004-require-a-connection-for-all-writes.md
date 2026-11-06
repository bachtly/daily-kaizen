# Require a connection for all writes

Status: accepted · Date: 2026-11-06 · Deciders: Bach · Stage: [03-data-model.md](../03-data-model.md) · Supersedes: [0001](0001-web-app-with-an-outbox-for-the-mvp.md), [0002](0002-queue-entry-edits-and-deletes-in-the-outbox.md)

## Context and problem

ADRs 0001 and 0002 let me log, edit and delete Entries offline through an Outbox on the phone.
Working through requirements and the data model showed the cost: change ordering, deletes of Entries the
Server never saw, rejected changes, phone-clock versioning, and best-effort iPhone storage that can lose
unsynced Entries without a trace. For one user who is almost always online, that is a lot of design and
code for a rare case.

## Decision drivers

- G3: no saved Entry is ever lost
- Constraints: conventional approaches, little code; keep edge cases light
- G2: logging stays fast

## Options

1. All writes need a connection; the phone keeps a read-only copy of the last 2 weeks 2. Keep the Outbox for writes (ADRs 0001 and 0002) 3. Fully online, with no local copy at all

## Decision

Chosen: "All writes need a connection, with a read-only local copy of the last 2 weeks", because it removes the Outbox and its sync rules while keeping the This week page and the form defaults usable offline.

- Good: every saved Entry is on the Server the moment it's saved, so iPhone storage can't lose it. G3 holds without exceptions.
- Good: no Outbox, change IDs, ordering rules, rejected changes or phone-clock versioning. The Server validates and answers immediately.
- Bad: I can't log, edit or delete without a connection. I log it later as a backfill, which the form already supports.
- Bad: the local copy can be out of date until the next online open; it is for reading only.

## Pros and cons of the options

### Writes online, local read-only copy

- Good, because it's simple and nothing saved can be lost.
- Bad, because logging needs a connection.

### Keep the Outbox

- Good, because logging works anywhere.
- Bad, because of the sync rules and the risk of losing unsynced Entries from browser storage.

### Fully online

- Good, because it's the simplest.
- Bad, because the This week page and the form defaults wouldn't work offline at all.
