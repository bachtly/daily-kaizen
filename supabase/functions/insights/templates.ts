// Template wording per kind (design §7): used when the AI is off, fails, or its card fails a check.
// Only numbers from the candidate's facts; within the card limits.
import type { CardText, Candidate } from "./types.ts";

export const LIMITS = { finding: 70, detail: 120, try_this: 120 } as const;

/** Shortens a name to keep a line within its limit. */
const nm = (s: string | undefined, max = 24) => {
  const t = (s ?? "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
const cap = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function templateText(c: Candidate): CardText {
  const f = c.facts;
  const t = ((): CardText => {
    switch (c.kind) {
      case "waste_window":
        return {
          finding: `Waste clusters between ${f.from} and ${f.to}`,
          detail: `${f.window_total} of your ${f.waste_total} Waste this week was in that window${
            f.activity ? `, mostly ${nm(f.activity)}` : ""
          }.`,
          try_this: `If it's ${f.from}, then I put my phone on the charger outside the room.`,
        };
      case "fragmented_deep":
        return {
          finding: `${f.switch_hours} hours of Deep work had many switches`,
          detail: `${f.short_blocks} Deep blocks were under 20 min (${f.short_deep}); ${f.busiest} had ${f.busiest_switches} switches.`,
          try_this: "If I leave a Deep task, then I note where I stopped and the next step.",
        };
      case "focus_length":
        return {
          finding: `Deep blocks of ${f.best_band} were least often followed by Waste`,
          detail: `Over ${f.weeks} weeks, ${f.best_waste} of ${f.best_blocks} such blocks were; after ${f.worst_band}, ${f.worst_waste} of ${f.worst_blocks}.`,
          try_this: `If I start Deep work, then I plan about ${f.best_minutes} and choose my own break.`,
        };
      case "scattered_shallow":
        return {
          finding: `${nm(f.activity)} came in ${f.count} short Entries`,
          detail: `About ${f.median} each, on ${f.days} days; ${f.near_deep} of them next to Deep work.`,
          try_this: `If it's 11:00 or 16:00, then I do ${nm(f.activity, 30)}, and not in between.`,
        };
      case "target_gap": {
        const key = f.category ? `${nm(f.activity)} · ${nm(f.category, 14)}` : nm(f.activity);
        return f.direction === "over"
          ? {
            finding: `${key} was ${f.actual}, over your ${f.target} limit`,
            detail: `That is ${f.gap} more than the target you set.`,
            try_this: `If I start ${nm(f.activity, 30)}, then I set a 30-minute timer.`,
          }
          : {
            finding: `${key} was ${f.actual} of your ${f.target} target`,
            detail: `That is ${f.gap} short of the target you set.`,
            try_this: `If it's Sunday evening, then I book next week's ${nm(f.activity, 30)} time in my calendar.`,
          };
      }
      case "sleep_short":
        return {
          finding: `${f.short_nights} of ${f.nights} nights had under ${f.under} of sleep`,
          detail: `Your median night was ${f.median_sleep}; ${f.shortfall} short of ${f.under} in all.`,
          try_this: "If it's 30 minutes before bed, then I put screens away.",
        };
      case "late_work":
        return {
          finding: `Work ran into the hours before Quiet hours on ${f.days} days`,
          detail: `${f.work} of Deep or Shallow after ${f.from}; your Quiet hours start at ${f.quiet_start}.`,
          try_this: "If I stop work, then I write tomorrow's first step and close the laptop.",
        };
      case "squeezed_recovery":
        return {
          finding: `${f.days_under} days had under ${f.under} of Recovery`,
          detail: `Not counting sleep; your median day had ${f.median_recovery} across ${f.logged_days} logged days.`,
          try_this: "If I finish work, then I take 30 minutes for a walk or something I enjoy.",
        };
      case "maintenance_drift":
        return f.direction === "more"
          ? {
            finding: `Maintenance took ${f.now}, more than your usual ${f.usual}`,
            detail: `Your usual weeks had ${f.usual_lo}–${f.usual_hi} by this point of the week.`,
            try_this: "If a chore comes up, then I add it to one weekly chores block.",
          }
          : {
            finding: `Maintenance took ${f.now}, less than your usual ${f.usual}`,
            detail: `Your usual weeks had ${f.usual_lo}–${f.usual_hi} by this point of the week.`,
            try_this: "If it's Saturday morning, then I do one hour of chores first.",
          };
    }
  })();
  return {
    finding: cap(t.finding, LIMITS.finding),
    detail: cap(t.detail, LIMITS.detail),
    try_this: cap(t.try_this, LIMITS.try_this),
  };
}
