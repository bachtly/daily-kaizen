# Queue entry edits and deletes in the Outbox

Status: accepted · Date: 2026-11-06 · Deciders: Bach · Stage: [02-requirements.md](../02-requirements.md)

## Context and problem

Entries can be edited and deleted after saving, so a typo such as 13:00–23:00 doesn't stay in the weekly totals.
ADR 0001 assumed the Outbox only carries new Entries. Edits and deletes can also happen offline, while the
Server writes Tags back, so the two sides can change the same Entry.

## Decision drivers

- G2: logging and fixing entries works offline
- G3: no Synced entry is ever lost
- A Tag set by me always wins over the AI (`docs/mvp-design.md:52`)
- Constraint: conventional approaches, little sync logic

## Options

1. Edits and deletes of Entries via the Outbox; Tag corrections and Suggested category decisions online only 2. Everything via the Outbox, including Tag corrections and Suggested category decisions 3. Only new Entries offline; edits, deletes and Tag corrections need a connection

## Decision

Chosen: "Edits and deletes via the Outbox", because fixing an entry is part of logging and should work wherever logging works, while Tag and Category decisions belong to the Weekly review, which needs Server data anyway.

- Good: my own fields (text, start, end) follow one simple rule: the latest change wins.
- Good: Tags and Categories have one writer at a time, so the Server's fields are never overwritten by a resend.
- Bad: Sync must carry updates and deletes, not only creates, so a deleted Entry needs a record the Server can act on.
- Bad: correcting a Tag needs a connection. We live with it because Tag corrections happen during the Weekly review.

## Pros and cons of the options

### Edits and deletes via the Outbox

- Good, because entry fixes work offline with a single conflict rule.
- Bad, because Sync handles three kinds of change instead of one.

### Everything via the Outbox

- Good, because nothing needs a connection.
- Bad, because Tag corrections offline could conflict with the AI's tagging, which needs more rules.

### Only new Entries offline

- Good, because Sync stays create-only, as ADR 0001 assumed.
- Bad, because a wrong time can't be fixed until I'm online, and edits made offline would be lost or blocked.
