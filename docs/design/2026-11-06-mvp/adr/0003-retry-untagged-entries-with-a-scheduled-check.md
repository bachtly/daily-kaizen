# Retry Untagged entries with a scheduled check

Status: accepted · Date: 2026-11-06 · Deciders: Bach · Stage: [02-requirements.md](../02-requirements.md)

## Context and problem

Tagging runs on the Server after an Entry arrives. Supabase Database Webhooks and pg_net document no retries,
pg_net's default timeout is 2 seconds, and pending requests can be lost in a crash
([research item 3](../01-research.md)). A failed tagging call would leave an Entry Untagged for good.

## Decision drivers

- The Weekly review shows time per Category, so Untagged entries distort it (G1)
- Constraints: under about $5 a month, conventional approaches
- Volume: about 30 Entries a day

## Options

1. A scheduled check every 15 minutes that tags Untagged entries, with tagging safe to repeat 2. Rely on Database Webhook delivery 3. A queue table with attempt counts and backoff

## Decision

Chosen: "A scheduled check every 15 minutes", because it is simple, uses pg_cron which Supabase already provides, and covers every way a tagging call can fail.

- Good: no Entry stays Untagged for more than about 15 minutes after a failure.
- Bad: a call that times out but keeps running could tag an Entry twice. We live with it by making tagging safe to repeat: a repeat doesn't overwrite a Tag set by me, and doesn't create a second Suggested category.
- Bad: a permanently failing Entry is retried every 15 minutes. The backend stage sets a limit and makes such Entries visible.

## Pros and cons of the options

### Scheduled check every 15 minutes

- Good, because it's simple and catches lost requests.
- Bad, because a fresh failure can wait up to 15 minutes.

### Rely on Database Webhook delivery

- Good, because there's nothing extra to build.
- Bad, because a failed or lost call is never retried.

### Queue table with attempts and backoff

- Good, because it controls retries precisely.
- Bad, because it is more to build than 30 Entries a day need.
