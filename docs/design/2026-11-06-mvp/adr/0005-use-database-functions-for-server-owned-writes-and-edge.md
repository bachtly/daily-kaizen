# Use database functions for Server-owned writes and Edge Functions only for outside calls

Status: accepted · Date: 2026-11-06 · Deciders: Bach · Stage: [04-api.md](../04-api.md)

## Context and problem

The phone writes through Supabase. Most writes are plain row changes on my own fields, but changing an
Entry's Tag and approving or rejecting a Suggested category set Server-owned fields and can change several
rows at once. Tagging, Nudges and the Review reminder call outside services: the AI, Web Push and Resend.
We need one rule for where each kind of logic runs.

## Decision drivers

- A Server-owned field is never written by the phone directly ([03-data-model.md](../03-data-model.md))
- Approving a Suggested category moves Entries in one step, or not at all
- Constraints: conventional approaches, little code, near-free

## Options

1. Generated API (PostgREST) for plain writes, Postgres functions (rpc) for Server-owned writes, Edge Functions only for the AI, Web Push and Resend 2. An Edge Function for every write 3. Generated API only, with database triggers for all logic

## Decision

Chosen: "Generated API plus database functions, Edge Functions only for outside calls", because each write runs in one transaction with no extra network hop, row-level security and table grants enforce the Server-owned field rule, and only work that must leave the database runs in an Edge Function.

- Good: approve and reject complete fully or not at all; no hand-managed transactions.
- Good: validation lives in the database as checks that return named error keys, so every write path follows the same rules.
- Bad: logic is split between SQL (functions, checks, triggers) and TypeScript (Edge Functions). We live with it because the SQL side is small and the split is one simple rule.
- Bad: Supabase's default table grants are wide open, so the backend must revoke them and grant per table, or the phone could write Server-owned fields.

## Pros and cons of the options

### Generated API plus database functions

- Good, because it is atomic, fast and needs little code.
- Bad, because some logic is in SQL.

### An Edge Function for every write

- Good, because all logic is TypeScript in one place.
- Bad, because every write takes an extra hop and transactions are handled by hand.

### Generated API with triggers only

- Good, because there is the least surface.
- Bad, because hidden trigger logic is hard to follow, and calls to outside services don't belong in triggers.
