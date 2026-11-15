# Architecture (C4)

The top three levels of the [C4 model](https://c4model.com): system context, containers, components. Diagrams are Mermaid and render on GitHub.

## 1. System context

```mermaid
C4Context
  title System context: daily-kaizen
  Person(user, "Me", "Logs activities in free text and reviews the week")
  System(dk, "daily-kaizen", "Capture, classify, review and optimise how I spend my time")
  System_Ext(claude, "Anthropic API", "Tags entries, words insights")
  System_Ext(push, "Web push service", "Delivers reminders to my devices")
  Rel(user, dk, "Logs entries, reviews weeks", "Phone / laptop PWA")
  Rel(dk, claude, "Sends Category and Activity names and numbers", "HTTPS")
  Rel(dk, push, "Sends notifications", "Web Push")
  Rel(push, user, "Review and logging reminders")
```

## 2. Containers

```mermaid
C4Container
  title Containers: daily-kaizen
  Person(user, "Me")
  System_Boundary(dk, "daily-kaizen") {
    Container(app, "Web app (PWA)", "Vite, React, service worker", "Capture, Week review, insights, settings; works offline for reading")
    Container(fns, "Edge functions", "Deno, Supabase Edge Functions", "tag-entries, insights, send-notifications")
    ContainerDb(db, "Database and auth", "Supabase Postgres, RLS", "Entries, categories, insights, push subscriptions")
    Container(cron, "Scheduler", "pg_cron", "Sunday insights, reminders, change results")
    Container(host, "Static hosting", "Cloudflare Pages", "Serves the built app")
  }
  System_Ext(claude, "Anthropic API")
  System_Ext(push, "Web push service")
  Rel(user, app, "Uses")
  Rel(host, app, "Serves")
  Rel(app, db, "Reads and writes own rows", "supabase-js")
  Rel(app, fns, "Requests tagging and insights", "HTTPS")
  Rel(fns, db, "Reads and writes", "SQL")
  Rel(cron, fns, "Triggers", "HTTP")
  Rel(fns, claude, "Tags and words insights", "HTTPS")
  Rel(fns, push, "Sends reminders", "Web Push")
  Rel(push, app, "Notifies", "Service worker")
```

## 3. Components (edge functions)

```mermaid
C4Component
  title Components: edge functions
  Container(app, "Web app (PWA)")
  ContainerDb(db, "Database and auth")
  Container(cron, "Scheduler", "pg_cron")
  System_Ext(claude, "Anthropic API")
  System_Ext(push, "Web push service")
  Container_Boundary(fns, "Edge functions") {
    Component(tag, "tag-entries", "Deno", "Handler and tagger: assigns a Category and Activity to each entry")
    Component(ins, "insights", "Deno", "Detectors, ranking, AI wording and checks, change results")
    Component(notif, "send-notifications", "Deno", "Sends due reminders")
    Component(shared, "_shared", "Deno modules", "facts, week, config, push, pushDb: shared maths and push helpers")
  }
  Rel(app, tag, "New entries")
  Rel(app, ins, "Get insights now")
  Rel(cron, ins, "Sunday 18:00, Monday 04:00")
  Rel(cron, notif, "Reminder times")
  Rel(tag, claude, "Classifies")
  Rel(ins, claude, "Words cards")
  Rel(notif, push, "Delivers")
  Rel(tag, db, "Writes tags")
  Rel(ins, db, "Reads week, writes insights")
  Rel(notif, db, "Reads subscriptions")
  Rel(ins, shared, "Uses")
  Rel(notif, shared, "Uses")
  Rel(tag, shared, "Uses")
```
