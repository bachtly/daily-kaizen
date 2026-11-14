// Evidence library for Insights (#80, design §5). Each entry was checked against its source by hand
// (docs/design/2026-11-14-insights/research.md). The AI may only pick ids from a candidate's list; the
// insight row stores a snapshot, so editing an entry never rewrites old cards. Add an entry only with a check.

export type Evidence = {
  id: string;
  /** short line on the chip */
  label: string;
  source: string;
  shows: string;
  /** the case against, when the evidence is mixed */
  against?: string;
  limits: string;
  url: string;
  checked_on: string;
};

export const EVIDENCE: readonly Evidence[] = [
  {
    id: "if-then-plans",
    label: "If-then plans · 21 studies",
    source: "Wang, Wang & Gai 2021, meta-analysis of mental contrasting with implementation intentions",
    shows: "If-then plans raised goal attainment with a small-to-medium effect (g = 0.34, 15,907 people).",
    limits: "Publication bias was found, so the real effect may be smaller. Written plans worked less well than coached ones.",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8149892/",
    checked_on: "2026-11-13",
  },
  {
    id: "attention-residue",
    label: "Attention residue · 4 studies",
    source: "Leroy & Glomb 2018, Organization Science",
    shows: "A short “ready-to-resume” note cut the attention left on the old task, and the next task did not suffer.",
    limits: "Lab and field studies with office tasks; it does not measure total output over a day.",
    url: "https://econpapers.repec.org/RePEc:inm:ororsc:v:29:y:2018:i:3:p:380-397",
    checked_on: "2026-11-13",
  },
  {
    id: "break-timing",
    label: "Break timing · 1 study, mixed",
    source: "Smits, Wenzel & de Bruin 2025, Behavioral Sciences",
    shows: "Self-chosen breaks: fatigue rose more slowly than with fixed Pomodoro timers, with the same productivity.",
    against: "Popular rules (90-min cycles, 52:17) say a fixed length works for everyone, but they come from blogs without studies behind them.",
    limits: "One study, 94 students, one 2-hour session.",
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12292963/",
    checked_on: "2026-11-13",
  },
  {
    id: "email-batching",
    label: "Batching · 1 experiment",
    source: "Kushlev & Dunn 2015, Computers in Human Behavior 43:220–228",
    shows: "People who checked email 3 times a day felt less daily stress than when they checked freely, and no less productive.",
    limits: "It measured stress, not output; 124 adults, one week per condition, and many found the limit hard to keep.",
    url: "https://www.interruptions.net/literature/Kushlev-ComputHumBehav15.pdf",
    checked_on: "2026-11-14",
  },
  {
    id: "progress-monitoring",
    label: "Progress monitoring · 138 studies",
    source: "Harkin et al. 2016, Psychological Bulletin 142(2)",
    shows: "Checking progress toward a goal helped people reach it (d = 0.40), more so when progress was written down.",
    limits: "Most studies were about health goals, not time use.",
    url: "https://doi.org/10.1037/bul0000025",
    checked_on: "2026-11-14",
  },
  {
    id: "sleep-duration",
    label: "Sleep duration · expert consensus",
    source: "Watson et al. 2015, AASM and SRS consensus statement, Sleep 38:843",
    shows: "Adults 18–60 should sleep 7 hours or more on a regular basis; less is linked to poorer health.",
    limits: "A consensus of 15 experts on observational evidence, not a trial; it sets no upper limit.",
    url: "https://www.aasm.org/resources/pdf/adultsleepdurationconsensus.pdf",
    checked_on: "2026-11-14",
  },
  {
    id: "detachment",
    label: "Switching off · meta-analysis",
    source: "Wendsche & Lohmann-Haislah 2017, Frontiers in Psychology",
    shows: "People who switched off from work after hours had better wellbeing and less exhaustion (91 samples, 38,124 people).",
    limits: "Mostly surveys at one point in time, so it shows a link, not a cause; it gives no number of hours.",
    url: "https://www.frontiersin.org/articles/10.3389/fpsyg.2016.02072/full",
    checked_on: "2026-11-14",
  },
  {
    id: "free-time",
    label: "Free time · surveys and experiments",
    source: "Sharif, Mogilner & Hershfield 2021, Journal of Personality and Social Psychology",
    shows: "Wellbeing rose with free time up to about 2 hours a day; less than that went with more stress.",
    against: "Above about 5 hours it fell again, but only when the time was solo and unproductive.",
    limits: "Mostly survey data; the authors give a range, not a prescription.",
    url: "https://www.apa.org/news/press/releases/2021/09/too-much-free-time",
    checked_on: "2026-11-14",
  },
  {
    id: "atus-reference",
    label: "Reference · US time use 2024",
    source: "US Bureau of Labor Statistics, American Time Use Survey 2024",
    shows: "People in the US spent about 2.0 hours a day on household activities on average.",
    limits: "An average across people, not a target; no study says how much is right for one person.",
    url: "https://www.bls.gov/news.release/atus.nr0.htm",
    checked_on: "2026-11-14",
  },
];

export const evidenceById = (id: string): Evidence | undefined => EVIDENCE.find((e) => e.id === id);
