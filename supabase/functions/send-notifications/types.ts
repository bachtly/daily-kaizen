import type { PushDb } from "../_shared/push.ts";

/**
 * A row returned by `claim_due_notifications()`, which returns `setof notifications_sent`
 * (service_role only; built in db-notifications): only rows this call newly claimed.
 * For a nudge, `about` is the Gap start as a timestamp string; for a review_reminder, the week start (date).
 */
export interface ClaimedNotification {
  user_id: string;
  kind: "nudge" | "review_reminder";
  about: string;
}

export interface NotifyDb extends PushDb {
  claim(): Promise<ClaimedNotification[]>;
  /** `settings.time_zone`, null while unknown. */
  getTimeZone(userId: string): Promise<string | null>;
  /** The login email from Auth. */
  getUserEmail(userId: string): Promise<string | null>;
}
