# Insights (#80): research behind each decision

Light web research, 2026-11-14, one round per design decision. It adds to the first research run ([report](https://claude.ai/artifact/FvUPNwfes2wxLdUgykZayw), 57 sources), whose findings are cited as `[r…]`. Confidence: **high** = 2+ independent sources, at least one primary; **medium** = 1 primary or 2 secondary; **low** = 1 secondary.

## R1. How the AI keeps context over months (→ D4, D5)
- Two main memory styles: an agent that pages its own memory in and out (MemGPT), and a fixed pipeline that stores and consolidates for it (Mem0, Generative Agents' reflection). Reflection, meaning distilling raw episodes into higher-level notes, kept agents coherent over days. [S1][S2] **medium**
- **The AI's own memories spread its errors.** Adding every output to memory did worse than a fixed memory; strict, selective adding did best [S3]. Memories consolidated over and over first improve, then degrade, sometimes below having no memory [S4]. **medium** (two preprints agree)
- A short **profile summary** of the user does as well as or better than retrieving raw history, with 75% less data [S5][S6]. The best structures layer it: dated evidence at the bottom, recurring patterns in the middle, stable claims at the top [S7]. **medium**
- **Long inputs make models less reliable** even on easy tasks (18 models), and irrelevant content makes it worse [S8]. **medium** (one primary report, widely replicated in commentary)
- People want to **see, edit and delete** what an assistant remembers; transparency and control are the top asks [S9][S10]. **medium**

## R2. Did the change help? (→ D6)
- SleepCoacher: recommendations come from the person's own correlations, are picked from 117 clinician-written templates, then tested by switching on and off and compared. A correlation alone does not show that changing the behaviour will help [S11]. SleepBandits lets people choose the experiment and uses Thompson sampling to analyse it [S12]. **high** (one research line, peer reviewed)
- **Regression to the mean**: a week chosen for being bad tends to be followed by a better one, change or no change. Compare against a baseline that wasn't chosen for being extreme [S13]. **medium** (textbook effect; sources secondary)
- Single-case designs: **at least 3 data points per phase** to count "with reservations", 5 to count fully (WWC) [S14]. Non-overlap (how much of the "after" phase falls outside the baseline range) is the simplest effect measure [S15]. **high**
- Habits take a median of about 66 days to become automatic (range 18–254); missing one day did not matter [S16]. One week only shows an early signal. **medium**
- **One if-then plan works; several plans for the same goal did not** (interference when acting on them). Plans in unrelated areas don't interfere [S17]. **medium** (small lab studies)

## R3. What the detectors compare against (→ D3)
- **Discretionary time**: wellbeing rises to about 2 h a day, levels off, and falls after about 5 h, but only when that time is solo and unproductive. Social or productive free time does not hurt [S18]. **high**
- **Sleep**: adults 18–60 need **7 h or more** regularly (AASM/SRS consensus, 15 experts) [S19]. **high**
- **Maintenance**: in the US, household activities average about 2.0 h a day; leisure 5.1 h; sleep 9.0 h (ATUS 2024) [S20]. These are population averages, not targets. **high** (official statistics)
- **A usable day of data**: ATUS drops a diary with more than **180 min** of unknown time or fewer than 5 activities [S21]. **high**
- **Switching off after work** goes with better wellbeing and less exhaustion (meta-analysis, 91 samples, N = 38,124; mostly cross-sectional). No study gives a number of hours [S22]. **high** (for the link), none for an amount
- **Focus blocks**: Microsoft counts focus time as uninterrupted blocks of **2 h or more** (older docs: 1 h) and the rest as fragmented [S23]. People return to an interrupted task after about 23–25 min on average, and that figure includes other work done in between [S24]. **medium**
- **Robust personal baseline**: use the median and the median absolute deviation (MAD), not the mean and SD. One extreme week inflates the SD and hides itself [S25]. **high** (NIST handbook)
- **Monitoring progress toward a goal** helps reach it (d = 0.40, 138 experiments), more so when it is recorded [S26]. **high**
- Batching email to 3 times a day lowered daily stress compared with unlimited checking (crossover, 124 adults). People found it hard to keep to, and felt no less productive [S27]. **medium**

## R4. Ranking, dismissals and repetition (→ D3, D7)
- Automatic insight pipelines generate candidates from templates, then **rank by significance, accuracy, user preference and reliability** [S28]. Long-term correlations gave people insights they couldn't get from charts [S29]. **medium**
- **"Not interested" buttons barely work when treated as a hint**: YouTube's cut 11% of unwanted recommendations [S31]. TikTok's cut 84% at first, but the effect faded unless repeated [S32]. Controls that act as an order work better. **medium**
- **Repeated prompts wear off**: boredom and habituation drove disengagement over 8 weeks [S33]; the step-count response to HeartSteps nudges shrank over time [S34]. **medium**
- **Thompson sampling** is the standard way to adapt in mobile health, usually with priors from pilot data or pooled across users. With very few decisions, simple bandits beat full reinforcement learning [S35]. **medium**

## R5. Keeping numbers and citations honest (→ D5)
- LLM data-to-text output **is not reliable without checking afterwards**; numbers are a common failure [S36][S37]. Practical checks: every number in the text must appear in the source (a set check) [S38], or each claim is turned into an executable check [S39]. **high**
- Citations raise trust even when random; a for-and-against explanation helps people judge [r3q07-01][r3q07-02]. So the AI may only pick citations from a hand-checked list. **high**

## R6. Platform (→ D8, D9)
- Supabase Edge Functions: 256 MB memory, wall clock 150 s (Free) or 400 s (paid), and a small CPU budget per request (sources say 2 s or 200 ms) [S40]. Facts for one user-week take milliseconds; the AI call is wall-clock time, not CPU time. **high**
- Importing code from outside `supabase/functions/` is newer and has open bug reports; `_shared/` inside it is the safe place [S41]. **medium**
- Hour buckets in Postgres need the overlap computed by hand and care around DST [S42], which is a reason to compute facts in TypeScript, where `app/src/data/week.ts` already handles DST.
- Prices (Anthropic list, cached 2026-11-03): Opus 5.5 $4 / $20 per M tokens in/out; Haiku 5.5 $0.10 / $0.50 [S43].

## Gaps
- No source gives the right **amount** of maintenance time; only population averages (ATUS). The app compares with my own median and shows ATUS for reference.
- No method found for classifying waste beyond self-report. The app keeps the Waste Category's own definition ("time I wouldn't choose again"), which is a regret measure.
- Focus length: no evidence for one best length. The detector finds my own (D3).

## Sources
- [S1] Memory for Autonomous LLM Agents (survey), arXiv 2603.07670 — https://arxiv.org/pdf/2603.07670
- [S2] Agent memory architectures (glossary, secondary) — https://klu.ai/glossary/agent-memory-architectures
- [S3] Xiong et al. 2025, How Memory Management Impacts LLM Agents — https://arxiv.org/abs/2505.16067
- [S4] Useful Memories Become Faulty When Continuously Updated by LLMs, arXiv 2605.12978 — https://arxiv.org/abs/2605.12978
- [S5] Richardson et al. 2023, Summarization and Retrieval for Personalization — https://arxiv.org/abs/2310.20081
- [S6] Step-back Profiling — https://arxiv.org/html/2406.14275v2
- [S7] PersonaTree: Structured Lifecycle Memory, 2026 — https://www.alphaxiv.org/abs/2606.04780v1
- [S8] Hong, Troynikov & Huber 2025, Context Rot (Chroma) — https://research.trychroma.com/context-rot
- [S9] Users' perceptions of LLM memory, arXiv 2508.07664 — https://arxiv.org/abs/2508.07664v1
- [S10] "Ghost of the past": LLM memory privacy (MemoAnalyzer, N = 36) — https://arxiv.org/html/2410.14931v1
- [S11] Daskalova et al. 2016, SleepCoacher (UIST) — https://jeffhuang.com/papers/SleepCoacher_UIST16.pdf
- [S12] Daskalova et al. 2020, SleepBandits (CHI) — https://jeffhuang.com/papers/SleepBandits_CHI20.pdf
- [S13] Regression to the mean, beginner's guide (secondary) — https://metricgate.com/blogs/what-is-regression-to-the-mean/
- [S14] WWC single-case design standards — https://ies.ed.gov/ncee/WWC/Docs/ReferenceResources/wwc_scd.pdf
- [S15] SingleCaseES effect size definitions (PND, NAP) — https://cran.r-project.org/web/packages/SingleCaseES/vignettes/Effect-size-definitions.html
- [S16] Lally et al. 2010, How are habits formed (summary) — https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit
- [S17] Verhoeven et al. 2013, Less is more: multiple implementation intentions — https://bps.org.uk/research-digest/less-more-when-it-comes-beating-bad-habits
- [S18] Sharif, Mogilner & Hershfield 2021, JPSP (APA release) — https://www.apa.org/news/press/releases/2021/09/too-much-free-time
- [S19] Watson et al. 2015, AASM/SRS adult sleep duration consensus — https://www.aasm.org/resources/pdf/adultsleepdurationconsensus.pdf
- [S20] BLS, American Time Use Survey 2024 — https://www.bls.gov/news.release/atus.nr0.htm
- [S21] ATUS data quality criteria (OMB filing 2025) — https://omb.report/icr/202504-1220-002/doc/157322600.pdf
- [S22] Wendsche & Lohmann-Haislah 2017, detachment meta-analysis, Frontiers in Psychology — https://www.frontiersin.org/articles/10.3389/fpsyg.2016.02072/full
- [S23] Microsoft Viva Insights glossary (focus hours) — https://learn.microsoft.com/en-us/viva/insights/advanced/reference/glossary
- [S24] Gloria Mark on attention and returning to work (critique and figures) — https://www.toolsforhumans.ai/blog/the-47-second-attention-crisis-what-the-research-actually-says-and-doesnt
- [S25] NIST Engineering Statistics Handbook, modified z-score — https://itl.nist.gov/div898/handbook/eda/section3/eda35h.htm
- [S26] Harkin et al. 2016, Psychological Bulletin, doi 10.1037/bul0000025 — https://eprints.whiterose.ac.uk/id/eprint/91437/
- [S27] Kushlev & Dunn 2015, Computers in Human Behavior 43:220–228 — https://www.interruptions.net/literature/Kushlev-ComputHumBehav15.pdf
- [S28] PhilHumans: insight candidates and ranking — https://arxiv.org/pdf/2405.02770
- [S29] Bentley et al., Health Mashups — https://quantifiedself.com/blog/health-mashups-helping-people-find-long-term-trends-between-wellbeing-and-activities-in-their-lives/
- [S31] Mozilla 2022, YouTube user controls study — https://www.technologyreview.com/2022/09/20/1059709/youtube-algorithm-recommendations/
- [S32] Northwestern 2026, TikTok "not interested" (summary) — https://www.shopifreaks.com/tiktoks-not-interested-feedback-cuts-unwanted-videos-84-but-only-briefly-as-its-algorithm-relapses-and-refills-the-feed/
- [S33] Park & Lee 2023, disengagement from JIT interventions — https://ic.kaist.ac.kr/files/papers/park2023understanding.pdf
- [S34] JITAI habituation review — https://pmc.ncbi.nlm.nih.gov/articles/PMC9276848
- [S35] IntelligentPooling: Thompson sampling for mHealth — https://arxiv.org/pdf/2008.01571
- [S36] Survey of hallucination in NLG — https://arxiv.org/pdf/2202.03629
- [S37] Faithfulness in NLG survey — https://arxiv.org/pdf/2203.05227
- [S38] ERATTA: number check against source data — https://arxiv.org/pdf/2405.03963
- [S39] Tables to quantified statements, executable verification — https://arxiv.org/pdf/2609.23966
- [S40] Supabase Edge Functions limits — https://supabase.com/docs/guides/functions/limits
- [S41] Supabase changelog: import files outside the supabase directory — https://supabase.com/changelog/33613-deploy-edge-functions-from-cli-without-needing-docker-import-files-outside-of-supabase-directory
- [S42] pgsql-general: hourly buckets and time zones — https://www.postgresql.org/message-id/CAEfWYywLggL0UJbnQxsafqmkkHYzrU494iEDgHxC%3DJMdCUj5rQ%40mail.gmail.com
- [S43] Anthropic pricing — https://platform.claude.com/docs/en/about-claude/pricing
