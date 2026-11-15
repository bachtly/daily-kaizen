# Flows

Flow charts and sequence diagrams for three important user flows. Rules and decisions live in the feature docs linked under each flow; the code and tests hold the details.

## 1. Log time

See [logging](logging.md) and [tagging](tagging.md).

```mermaid
flowchart TD
    A[Tap + or Fill on an Unlogged slot] --> B[Log sheet: text, start, end, day]
    B --> C{Valid?}
    C -- "empty text, end not after start,<br>end > 5 min ahead" --> B
    C -- yes --> D{Overlaps another Entry?}
    D -- yes --> W[Warn, still allow]
    D -- no --> S
    W --> S[Save: insert Entry, ignore duplicate id]
    S --> E{Saved?}
    E -- "no connection / error" --> K[Sheet keeps my text and says so]
    K --> S
    E -- yes --> F[Day view refreshes; rest of a slot stays a slot]
    F --> G[Server tags the Entry: Category + Activities]
```

```mermaid
sequenceDiagram
    actor U as User
    participant App as Phone app
    participant DB as Supabase (Postgres)
    participant Tag as Tagging (edge function)
    participant AI as AI (Haiku)

    U->>App: Type text, set times, Save
    App->>DB: upsert entries (id, ignore duplicate)
    alt id already exists (resend)
        DB-->>App: no row inserted
        App->>DB: update entries where id (same fields)
    end
    DB-->>App: Entry
    App-->>U: Day view shows the Entry
    DB->>Tag: new Entry
    Tag->>AI: text + my recent corrections
    AI-->>Tag: Category, 0-3 Activities
    Tag->>DB: save labels (only if Entry unchanged meanwhile)
    Note over Tag,DB: Untagged after 2 min: the 15-minute<br>Tagging check retries, up to 3 attempts
    DB-->>App: labels appear on next refresh
```

## 2. Generate insights

See [insights](insights.md).

```mermaid
flowchart TD
    T1[Sunday 18:00 local: scheduled job] --> R
    T2[Get insights now / Regenerate: this or last week] --> L{Asked in the last minute?}
    L -- yes --> X[Refused: too soon]
    L -- no --> R[Start run]
    R --> M[Compute week facts + 8 weeks of history]
    M --> G{Enough logged days?<br>5 scheduled, 2 on request}
    G -- no --> Z[Run ends: too early, no cards]
    G -- yes --> D[Run 9 detectors, rank, keep at most 8]
    D --> AI[AI words the cards and spots up to 5 more findings]
    AI --> V{Passes checks?}
    V -- yes --> C[Use AI wording]
    V -- no --> TP[Use template wording; dropped if AI-spotted]
    AI -- AI call fails --> TP
    C --> S[Save insights]
    TP --> S
    S --> RT{Scheduled and AI failed?}
    RT -- "yes, under 3 runs" --> T1b[Retry later that Sunday evening]
    RT -- no --> W[Week page: top 3, See more]
```

```mermaid
sequenceDiagram
    actor U as User
    participant App as Phone app
    participant Fn as insights edge function
    participant DB as Supabase (Postgres)
    participant AI as AI (Opus)

    alt Sunday 18:00 (job)
        Note over Fn: hourly job with x-job-secret
    else Get insights now
        U->>App: Get insights now
        App->>Fn: invoke insights (JWT, week_start)
        Fn->>DB: last run time for me
        Fn-->>App: 429 if under a minute ago
    end
    Fn->>DB: entries, summaries, targets, past insights
    Fn->>Fn: compute facts, detect, rank
    Fn->>AI: ranked candidates + week timeline (no Entry text)
    AI-->>Fn: card wording, source ids, AI-spotted findings
    Fn->>Fn: validate (ids, source, numbers, length, if-then)
    Fn->>DB: save insights and run status
    Fn-->>App: outcome (ok / too_early / ai_failed)
    App->>DB: read insights
    App-->>U: Week page cards
    Note over Fn,DB: Monday 04:00: finalise weeks, judge running change
```

## 3. Set an Activity's weekly target

See [week-review](week-review.md) and [activities](activities.md).

```mermaid
flowchart TD
    A[Week page: Time per activity] --> B[Tap an Activity row]
    B --> C{Which target?}
    C -- "Target on the row" --> D[Any-Category target]
    C -- "Tap a Category line" --> E[Activity + Category target]
    D --> F[Target editor: hours]
    E --> F
    F --> G{Valid?<br>whole or half hours, 0.5 to 80}
    G -- empty --> H[Clear the target]
    G -- no --> F
    G -- yes --> I[Save target]
    H --> I
    I --> J{Saved?}
    J -- "no connection / error" --> F
    J -- yes --> K[Row shows actual / target, tick on the bar]
```

```mermaid
sequenceDiagram
    actor U as User
    participant App as Phone app
    participant DB as Supabase (Postgres)

    U->>App: Open Activity row, enter hours (or clear)
    App->>App: validate (0.5 to 80 h, halves), convert to minutes
    App->>DB: rpc set_activity_target(activity, category or null, minutes or null)
    DB->>DB: check Activity and Category are mine and Active
    alt minutes is null
        DB->>DB: delete target for that pair
    else
        DB->>DB: upsert target (30 to 4800 min)
    end
    DB-->>App: target (or error)
    App->>DB: refresh
    App-->>U: actual / target on the row
    Note over App,DB: Insights read targets for the missed-target check
```
