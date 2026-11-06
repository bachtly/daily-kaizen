# Send Web Push from Edge Functions with @pushforge/builder

Status: accepted · Date: 2026-11-06 · Deciders: Bach · Stage: [06-backend.md](../06-backend.md)

## Context and problem

Nudges, the Review reminder and Category suggestions are sent as Web Push to the iPhone from Supabase
Edge Functions, which run on Deno. The usual npm `web-push` library relies on Node APIs. We need a
sender library that works on Deno.

## Decision drivers

- Runs in Deno Edge Functions without Node-only APIs
- Constraints: conventional approaches, little code, near-free

## Options

1. `@pushforge/builder` (Web Crypto, send with `fetch`) [S40] 2. `negrel/webpush` on JSR [S41] 3. npm `web-push`

## Decision

Chosen: "`@pushforge/builder`", because it uses only Web Crypto and `fetch`, with no Node dependencies, so it fits the Deno runtime [S40].

- Good: small; we control the `fetch` call, its timeout and the 404/410 handling.
- Bad: the sources are snippets only and not tested on iOS. We confirm it with the first push on the iPhone and fall back to `negrel/webpush` if it fails.

## Pros and cons of the options

### @pushforge/builder

- Good, because it has no Node dependencies and states Deno support [S40].
- Bad, because it is less widely used than `web-push`.

### negrel/webpush

- Good, because it is built for Deno and published on JSR [S41].
- Bad, because there is little documentation beyond the package page.

### npm web-push

- Good, because it is the most widely used.
- Bad, because it is "limited" on Deno: it uses Node `crypto.createECDH` and `https.request` [S40].
