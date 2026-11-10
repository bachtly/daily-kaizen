import { type EmailConfig, sendEmail } from "../_shared/email.ts";
import {
  type PushConfig,
  type PushDeps,
  type PushMessage,
  pushToUser,
} from "../_shared/push.ts";
import type { ClaimedNotification, NotifyDb } from "./types.ts";

export interface NotifyDeps {
  db: NotifyDb;
  push: PushConfig;
  email: EmailConfig;
  pushDeps?: PushDeps;
  fetchFn?: typeof fetch;
}

export interface Counts {
  nudges: number;
  review_reminders: number;
}

/** "14:10" in the given time zone; null when `about` or the zone can't be parsed. */
export function localTime(about: string, timeZone: string | null): string | null {
  const d = new Date(about);
  if (!timeZone || Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
  } catch {
    return null;
  }
}

function nudgeMessage(time: string | null): PushMessage {
  return {
    title: "Time to log?",
    body: time
      ? `Your last Entry ended at ${time}. What have you been doing?`
      : "What have you been doing?",
    path: "/?log=now",
  };
}

const REVIEW_PUSH: PushMessage = {
  title: "Weekly review",
  body: "Your week is ready. See where your time went.",
  path: "/week",
};

/**
 * Sends only the claimed rows. The rows are already recorded in `notifications_sent`,
 * so nothing is retried and one failure never blocks the next row. Never logs Entry text.
 */
export async function sendClaimed(
  rows: ClaimedNotification[],
  d: NotifyDeps,
): Promise<Counts> {
  const counts: Counts = { nudges: 0, review_reminders: 0 };
  for (const row of rows) {
    try {
      if (row.kind === "nudge") {
        const tz = await d.db.getTimeZone(row.user_id);
        const n = await pushToUser(
          d.db,
          row.user_id,
          nudgeMessage(localTime(row.about, tz)),
          d.push,
          d.pushDeps,
        );
        if (n > 0) counts.nudges++;
      } else {
        try {
          await pushToUser(d.db, row.user_id, REVIEW_PUSH, d.push, d.pushDeps);
        } catch (e) {
          console.error(`review push failed: ${(e as Error).message}`);
        }
        const to = await d.db.getUserEmail(row.user_id);
        if (to) {
          await sendEmail(d.email, {
            to,
            subject: "Your weekly review is ready",
            text:
              "See where your time went this week. Open daily-kaizen from your Home Screen and go to This week.",
          }, d.fetchFn, `review_reminder:${row.user_id}:${row.about}`);
        }
        counts.review_reminders++;
      }
    } catch (e) {
      console.error(`${row.kind} send failed: ${(e as Error).message}`);
    }
  }
  return counts;
}
