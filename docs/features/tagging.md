# Tagging

## What it does
- Each saved Entry gets one **Category** from the AI, with no effort from me.
- Starting Categories: Deep, Shallow, Maintenance, Waste, Recovery.
- The AI may propose a new Category: it appears as a **Suggested category** on the Week page for me to approve or reject, with a push.
- I can change an Entry's Tag on the Day view.

## Rules
- The Server tags a new Entry and a scheduled **Tagging check** (every 15 minutes) retries Entries still untagged; an Entry created in the last 2 minutes is skipped.
- After 3 failed attempts the Entry shows as Untagged with a "couldn't tag" note and I tag it by hand.
- A Tag I set (source me) is never changed by the AI, even if I edit the text.
- An AI result saves only if I haven't changed the Entry meanwhile.
- The AI's pick must be an Active Category; anything else counts as a failed attempt.
- A proposal keeps the Entry in the best Active Category. A name matching a Suggested one sets it silently; a name matching an Active or Rejected one creates nothing; otherwise a new Suggested category and one push.
- Approve makes it Active and moves Entries that have it suggested, except those I tagged. Reject keeps every Tag; a rejected name never returns.
- Repeating an approve or reject changes nothing.
- **Learning from my corrections (#62):** each call includes up to 20 of my most recent corrections as examples (text → the labels I set), the newest per normalised text, Category only if I set it, Activity only if I set it ("none" if I cleared it). AI-set labels are never examples. A merged Activity shows its target's name. No corrections → no examples.
- Corrections come only from my own Entries.

## Decisions
- A scheduled retry check, not webhook retries or a queue table (D2): 30 Entries a day don't need more.
- Suggested Categories need my approval (Activities don't, see [activities](activities.md)).
- Learning uses examples in the prompt, not fine-tuning or a separate registry table (#62); the corrections already live on the Entries.
- Model: Anthropic `claude-haiku-5-5`.

Details: [archived design](../design/2026-11-06-mvp/02-requirements.md).
