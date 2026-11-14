import type { SupabaseClient } from "@supabase/supabase-js";
import type { FactsEntry, WeekFacts } from "../_shared/facts.ts";
import type { ChangeResult } from "./evaluate.ts";
import type { Metric, PastInsight, Target, Verdict } from "./types.ts";

export type UserSettings = { user_id: string; time_zone: string; quiet_start: string; quiet_end: string };
export type ActivityRow = { id: string; name: string; status: "active" | "merged"; merged_into_id: string | null };

/** An insights row as the job writes it (save_insights). */
export type InsightRow = {
  kind: string;
  subject_key: string;
  rank: number;
  score: number;
  facts: Record<string, string>;
  entry_ids: string[];
  metric: Metric;
  finding: string;
  detail: string;
  try_this: string;
  text_source: "ai" | "template";
  may_not_apply: string | null;
  evidence: unknown;
};

export type RunningChange = { id: string; week_start: string; active_until: string; metric: Metric };
export type RunStatus = "running" | "ok" | "too_early" | "ai_failed";

export interface InsightsDb {
  listUsers(): Promise<UserSettings[]>;
  getCategories(userId: string): Promise<{ id: string; name: string }[]>;
  getActivities(userId: string): Promise<ActivityRow[]>;
  getTargets(userId: string): Promise<Target[]>;
  /** Entries overlapping [from, to), with their Activity ids. */
  getEntries(userId: string, from: string, to: string): Promise<FactsEntry[]>;
  upsertSummary(userId: string, f: WeekFacts): Promise<void>;
  /** Summaries from `sinceWeek` on, newest first. */
  getSummaries(userId: string, sinceWeek: string): Promise<WeekFacts[]>;
  getPastInsights(userId: string, sinceWeek: string): Promise<PastInsight[]>;
  saveInsights(userId: string, week: string, rows: InsightRow[]): Promise<number>;
  /** Accepted insights whose run includes `week`. */
  getRunningChanges(userId: string, week: string): Promise<RunningChange[]>;
  saveResult(userId: string, insightId: string, result: ChangeResult): Promise<void>;
  startRun(userId: string, week: string, trigger: "schedule" | "me"): Promise<string>;
  finishRun(
    userId: string,
    runId: string,
    patch: { status: RunStatus; model?: string; input_tokens?: number; output_tokens?: number; error?: string },
  ): Promise<void>;
  /** A run for the week with one of the statuses exists. */
  hasRun(userId: string, week: string, trigger: "schedule" | "me", statuses: RunStatus[]): Promise<boolean>;
  /** Statuses of the week's runs by a trigger. */
  runStatuses(userId: string, week: string, trigger: "schedule" | "me"): Promise<RunStatus[]>;
  /** When I last asked for insights (trigger me), or null. */
  lastMyRunAt(userId: string): Promise<string | null>;
  /** Every accepted change, oldest first. */
  getChanges(userId: string): Promise<
    { kind: string; try_this: string; week_start: string; active_until: string; result: ChangeResult | null }[]
  >;
  getDismissed(userId: string, sinceWeek: string): Promise<{ kind: string; subject: string; week_start: string; reason: string | null }[]>;
  /** Coach note versions, newest first (up to 20). */
  getCoachNotes(userId: string): Promise<{ body: string; source: "ai" | "me" }[]>;
  addCoachNote(userId: string, week: string, body: string): Promise<void>;
  /** The signed-in user's id for a JWT, or null. */
  userFromJwt(jwt: string): Promise<string | null>;
  getUser(userId: string): Promise<UserSettings | null>;
}

const fail = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

/** Real `InsightsDb` over the service-role client. Every update is filtered by user_id (CLAUDE.md). */
export function dbFromClient(client: SupabaseClient): InsightsDb {
  return {
    async listUsers() {
      const { data, error } = await client
        .from("settings")
        .select("user_id,time_zone,quiet_start,quiet_end")
        .not("time_zone", "is", null);
      fail("list users", error);
      return (data ?? []) as UserSettings[];
    },
    async getCategories(userId) {
      const { data, error } = await client.from("categories").select("id,name").eq("user_id", userId);
      fail("get categories", error);
      return data ?? [];
    },
    async getActivities(userId) {
      const { data, error } = await client
        .from("activities")
        .select("id,name,status,merged_into_id")
        .eq("user_id", userId);
      fail("get activities", error);
      return (data ?? []) as ActivityRow[];
    },
    async getTargets(userId) {
      const { data, error } = await client
        .from("activity_targets")
        .select("id,activity_id,category_id,minutes")
        .eq("user_id", userId);
      fail("get targets", error);
      return (data ?? []) as Target[];
    },
    async getEntries(userId, from, to) {
      const { data, error } = await client
        .from("entries")
        .select("id,started_at,ended_at,created_at,category_id,entry_activities(activity_id)")
        .eq("user_id", userId)
        .eq("entry_activities.user_id", userId)
        .lt("started_at", to)
        .gt("ended_at", from);
      fail("get entries", error);
      // deno-lint-ignore no-explicit-any
      return (data ?? []).map((r: any) => ({
        id: r.id,
        started_at: r.started_at,
        ended_at: r.ended_at,
        created_at: r.created_at,
        category_id: r.category_id,
        activity_ids: (r.entry_activities ?? []).map((a: { activity_id: string }) => a.activity_id),
      }));
    },
    async upsertSummary(userId, f) {
      const { error } = await client.from("week_summaries").upsert({
        user_id: userId,
        week_start: f.weekStart,
        time_zone: f.tz,
        as_of: f.asOf,
        logged_days: f.loggedDays,
        facts: f,
        computed_at: new Date().toISOString(),
      });
      fail("upsert summary", error);
    },
    async getSummaries(userId, sinceWeek) {
      const { data, error } = await client
        .from("week_summaries")
        .select("facts")
        .eq("user_id", userId)
        .gte("week_start", sinceWeek)
        .order("week_start", { ascending: false });
      fail("get summaries", error);
      return (data ?? []).map((r: { facts: WeekFacts }) => r.facts);
    },
    async getPastInsights(userId, sinceWeek) {
      const { data, error } = await client
        .from("insights")
        .select("week_start,kind,subject_key,status,active_until,result")
        .eq("user_id", userId)
        .gte("week_start", sinceWeek);
      fail("get past insights", error);
      // deno-lint-ignore no-explicit-any
      return (data ?? []).map((r: any) => ({
        week_start: r.week_start,
        kind: r.kind,
        subject_key: r.subject_key,
        status: r.status,
        active_until: r.active_until,
        verdict: (r.result?.verdict ?? null) as Verdict | null,
      }));
    },
    async saveInsights(userId, week, rows) {
      const { data, error } = await client.rpc("save_insights", {
        p_user_id: userId,
        p_week_start: week,
        p_cards: rows,
      });
      fail("save_insights", error);
      return Number(data ?? 0);
    },
    async getRunningChanges(userId, week) {
      const { data, error } = await client
        .from("insights")
        .select("id,week_start,active_until,metric")
        .eq("user_id", userId)
        .eq("status", "accepted")
        .lt("week_start", week)
        .gte("active_until", week);
      fail("get running changes", error);
      return (data ?? []) as RunningChange[];
    },
    async saveResult(userId, insightId, result) {
      const { error } = await client
        .from("insights")
        .update({ result })
        .eq("id", insightId)
        .eq("user_id", userId);
      fail("save result", error);
    },
    async startRun(userId, week, trigger) {
      const { data, error } = await client
        .from("insight_runs")
        .insert({ user_id: userId, week_start: week, trigger })
        .select("id")
        .single();
      fail("start run", error);
      return (data as { id: string }).id;
    },
    async finishRun(userId, runId, patch) {
      const { error } = await client
        .from("insight_runs")
        .update({ ...patch, finished_at: new Date().toISOString() })
        .eq("id", runId)
        .eq("user_id", userId);
      fail("finish run", error);
    },
    async hasRun(userId, week, trigger, statuses) {
      const { count, error } = await client
        .from("insight_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("week_start", week)
        .eq("trigger", trigger)
        .in("status", statuses);
      fail("has run", error);
      return (count ?? 0) > 0;
    },
    async runStatuses(userId, week, trigger) {
      const { data, error } = await client
        .from("insight_runs")
        .select("status")
        .eq("user_id", userId)
        .eq("week_start", week)
        .eq("trigger", trigger);
      fail("run statuses", error);
      return (data ?? []).map((r: { status: RunStatus }) => r.status);
    },
    async lastMyRunAt(userId) {
      const { data, error } = await client
        .from("insight_runs")
        .select("started_at")
        .eq("user_id", userId)
        .eq("trigger", "me")
        .order("started_at", { ascending: false })
        .limit(1);
      fail("last run", error);
      return data?.[0]?.started_at ?? null;
    },
    async getChanges(userId) {
      const { data, error } = await client
        .from("insights")
        .select("kind,try_this,week_start,active_until,result")
        .eq("user_id", userId)
        .eq("status", "accepted")
        .order("week_start", { ascending: true });
      fail("get changes", error);
      return data ?? [];
    },
    async getDismissed(userId, sinceWeek) {
      const { data, error } = await client
        .from("insights")
        .select("kind,subject_key,facts,week_start,dismiss_reason")
        .eq("user_id", userId)
        .eq("status", "dismissed")
        .gte("week_start", sinceWeek)
        .order("week_start", { ascending: true });
      fail("get dismissed", error);
      // deno-lint-ignore no-explicit-any
      return (data ?? []).map((r: any) => ({
        kind: r.kind,
        subject: r.facts?.activity ?? r.facts?.category ?? "",
        week_start: r.week_start,
        reason: r.dismiss_reason,
      }));
    },
    async getCoachNotes(userId) {
      const { data, error } = await client
        .from("coach_notes")
        .select("body,source")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      fail("get coach notes", error);
      return (data ?? []) as { body: string; source: "ai" | "me" }[];
    },
    async addCoachNote(userId, week, body) {
      const { error } = await client.from("coach_notes").insert({ user_id: userId, week_start: week, body, source: "ai" });
      fail("add coach note", error);
    },
    async userFromJwt(jwt) {
      const { data, error } = await client.auth.getUser(jwt);
      if (error || !data?.user) return null;
      return data.user.id;
    },
    async getUser(userId) {
      const { data, error } = await client
        .from("settings")
        .select("user_id,time_zone,quiet_start,quiet_end")
        .eq("user_id", userId)
        .maybeSingle();
      fail("get user", error);
      return data?.time_zone ? (data as UserSettings) : null;
    },
  };
}
