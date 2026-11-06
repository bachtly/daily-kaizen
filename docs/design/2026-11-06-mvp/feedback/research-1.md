# Feedback on 01-research.md, round 1

## User decisions
- Direction: O1, the web app with an Outbox. Record it as ADR 0001.
- G3: guarantee only Synced entries. Entries in the Outbox are best-effort, with no detection requirement. Edit the approved brief accordingly.
- Review gap: run a small extra research pass. Done; results are appended to research/report.md as S52 to S63.
- iPhone is on iOS 18.4 or later, so Declarative Web Push is available.

## Findings
Accepted: critic findings 1, 3 to 12 and all six suggestions; consistency issue 1 ("gap" becomes "Unlogged").
Finding 2: partly accepted. The user chose "Synced entries only" for G3, so no loss-detection requirement is added. The doc states that the export protects only before eviction, that the unsynced count can't reveal eviction, and that O3 would need the budget relaxed. The storage device test stays as a build check.
Suggestion on push: the trigger covers Nudge delivery during the 14-day run, and says what happens to the other two push types.
