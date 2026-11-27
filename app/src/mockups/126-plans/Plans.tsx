/**
 * #126 Plans: presentational mockups only (no data, no network). Driven by props from plans.mocks.ts.
 * Reuses theme.css classes; plans.css adds the few new ones.
 */
import type { ReactNode } from 'react';
import { Phone } from '../../ui/Phone';
import { activities, categories, draft, draftText, goals, weekResult, type MockPlan } from './plans.mocks';
import './plans.css';

export function PlanCard({ plan }: { plan: MockPlan }) {
  const paused = plan.status === 'paused';
  return (
    <article className={paused ? 'plan paused' : 'plan'} aria-label={plan.do}>
      <p className="trig">{paused ? `Paused · ${plan.trigger}` : plan.trigger}</p>
      <p className="do">{plan.do}</p>
      <p className="meta">
        <span>Instead of {plan.instead} · for {plan.goal}</span>
        {plan.saves
          ? <b className="saves">Saves {plan.saves}</b>
          : <span>Saves: not enough history yet</span>}
      </p>
      <p className="why">{plan.timing}</p>
      {paused ? (
        <div className="row-actions">
          <span className="field-hint">Still useful? {plan.last}.</span>
          <button className="secondary" type="button">Keep it</button>
          <button className="link" type="button">Change timing</button>
          <button className="link danger" type="button">Stop</button>
        </div>
      ) : (
        <div className="row-actions">
          <span className="field-hint">Last: {plan.last}</span>
          <button className="link" type="button">Edit</button>
        </div>
      )}
    </article>
  );
}

/** The Plans block: list, empty state, or the cap note. */
export function PlansPanel({ plans, heading = 'Plans' }: { plans: MockPlan[]; heading?: string }) {
  return (
    <section className="panel" aria-labelledby="plans-h">
      <h2 id="plans-h">{heading}</h2>
      {plans.length === 0 ? (
        <>
          <p className="ins-sub">A Plan reminds you at the right moment: “After Lunch, walk 10 min instead of scrolling”.</p>
          <button className="primary" type="button">New Plan</button>
          <button className="link" type="button">Make one from an insight</button>
        </>
      ) : (
        <>
          <p className="ins-sub">{plans.filter((p) => p.status === 'active').length} of 5 active · at most 3 pushes a day</p>
          {plans.map((p) => <PlanCard key={p.id} plan={p} />)}
          <button className="secondary more" type="button">New Plan</button>
        </>
      )}
    </section>
  );
}

const plansIcon = <><path d="M5 6h9M5 12h6M5 18h9" /><path d="M16 11l2 2 4-4" /></>;
const tabIcons = {
  day: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  week: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  plans: plansIcon,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>,
};

/** Option B's 4-tab bar (mock only; the real TabBar has 3). */
function FourTabs({ current }: { current: keyof typeof tabIcons }) {
  const labels = { day: 'Day', week: 'Week', plans: 'Plans', settings: 'Settings' } as const;
  return (
    <nav className="tabbar four" aria-label="Main">
      {(Object.keys(tabIcons) as (keyof typeof tabIcons)[]).map((id) => (
        <a key={id} className="tab" href={`#${id}`} aria-current={current === id ? 'page' : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tabIcons[id]}</svg>
          <span>{labels[id]}</span>
        </a>
      ))}
    </nav>
  );
}

function WeekTop() {
  return (
    <>
      <div className="week-picker"><h1>23 – 29 Nov</h1></div>
      <section className="panel" aria-labelledby="ins-h">
        <h2 id="ins-h">Insights</h2>
        <InsightCard />
      </section>
    </>
  );
}

/** Nav Option A: Plans is a section on the Week page, under Insights. */
export function WeekWithPlans({ plans }: { plans: MockPlan[] }) {
  return (
    <Phone tab="week">
      <WeekTop />
      <PlansPanel plans={plans} />
    </Phone>
  );
}

/** Nav Option B: Plans gets its own tab. */
export function PlansTab({ plans }: { plans: MockPlan[] }) {
  return (
    <div className="phone" style={{ position: 'relative' }}>
      <div className="phone-status" />
      <main className="phone-body" tabIndex={0}>
        <h1>Plans</h1>
        <PlansPanel plans={plans} heading="Active" />
        <WeekResult />
      </main>
      <FourTabs current="plans" />
      <div className="phone-home" />
    </div>
  );
}

/** An insight card with the new "Make it a Plan" action (R9). */
export function InsightCard() {
  return (
    <div className="ins">
      <p className="f">Waste after Lunch: 35 min a day</p>
      <p className="d">On 4 of 5 weekdays, scrolling followed Lunch.</p>
      <p className="try"><b>Try:</b> If Lunch is done, then I walk 10 min.</p>
      <div className="row">
        <button className="primary small" type="button">Make it a Plan</button>
        <button className="link" type="button">Make it next week’s change</button>
      </div>
    </div>
  );
}

function EditorShell({ children, title = 'New Plan' }: { children: ReactNode; title?: string }) {
  return (
    <Phone>
      <div className="sheet-head">
        <h1 className="sheet-title">{title}</h1>
        <button className="link" type="button">Cancel</button>
      </div>
      {children}
    </Phone>
  );
}

function SavesPreview() {
  return (
    <p className="note">
      <b className="changed">Saves {draft.saves}</b><br />
      {draft.timing} Based on your last 4 weeks.
    </p>
  );
}

function Messages() {
  return (
    <>
      <span className="field-label" id="msgs-l">Messages (one per push, in turn)</span>
      <ul className="msg-list" aria-labelledby="msgs-l">
        {draft.messages.map((m) => <li key={m}>{m}</li>)}
      </ul>
      <button className="link" type="button">Rewrite with AI</button>
    </>
  );
}

function Select({ id, label, value, options, hidden }: { id: string; label: string; value: string; options: string[]; hidden?: boolean }) {
  return (
    <>
      <label htmlFor={id} className={hidden ? 'sr-only' : 'field-label'}>{label}</label>
      <select id={id} className={hidden ? undefined : 'text'} defaultValue={value}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </>
  );
}

type EditorState = 'ready' | 'drafting' | 'ai-failed' | 'invalid';

/** Editor Option A: AI box on top, the Plan as one editable sentence below. */
export function SentenceEditor({ state = 'ready' }: { state?: EditorState }) {
  return (
    <EditorShell>
      <div className="ai-box">
        <label htmlFor="a-text" className="field-label">Describe it in your words</label>
        <textarea id="a-text" defaultValue={draftText} />
        <button className="secondary" type="button" disabled={state === 'drafting'}>
          {state === 'drafting' ? 'Drafting…' : 'Draft with AI'}
        </button>
      </div>
      {state === 'ai-failed' && <p className="note warn">The AI couldn’t draft this. Here’s a template: fill in the blanks.</p>}
      {state === 'drafting' ? (
        <div className="panel" aria-busy="true"><span className="skeleton" style={{ width: '80%' }} /><span className="skeleton" /><span className="skeleton" style={{ width: '60%' }} /></div>
      ) : (
        <section className="panel" aria-labelledby="a-plan">
          <h2 id="a-plan">Your Plan</h2>
          <div className="sentence">
            After <Select id="a-after" label="After" value={draft.afterActivity} options={activities} hidden /> {' '}
            + <Select id="a-delay" label="Delay" value={draft.delay} options={['0 min', '10 min', '20 min', '30 min']} hidden />,{' '}
            I will
            <label htmlFor="a-do" className="sr-only">I will</label>
            <input id="a-do" defaultValue={state === 'ai-failed' ? '' : draft.do} aria-invalid={state === 'invalid' || undefined}
              aria-describedby={state === 'invalid' ? 'a-do-err' : undefined} placeholder="what you’ll do" />
            {state === 'invalid' && <p className="error" id="a-do-err">Say what you’ll do.</p>}
            instead of <Select id="a-instead" label="Instead of" value={draft.instead} options={categories} hidden />,{' '}
            for <Select id="a-goal" label="For goal" value={draft.goal} options={goals} hidden />.
          </div>
          {state !== 'ai-failed' && <SavesPreview />}
        </section>
      )}
      {state !== 'drafting' && state !== 'ai-failed' && <section className="panel" aria-label="Messages"><Messages /></section>}
      <button className="primary" type="button" disabled={state === 'drafting'}>Save Plan</button>
    </EditorShell>
  );
}

/** Editor Option B: chat first; the AI answers with a Plan card to accept or tweak. */
export function ChatEditor() {
  return (
    <EditorShell>
      <div className="bubble me">{draftText}</div>
      <div className="bubble ai">
        <p style={{ margin: 0 }}>Here’s a Plan:</p>
        <p style={{ margin: '6px 0 0' }}><b>After Lunch + 10 min → {draft.do}</b></p>
        <p style={{ margin: '4px 0 0' }}>Instead of Waste · for {draft.goal}</p>
        <p className="changed" style={{ margin: '4px 0 0' }}>Saves {draft.saves}</p>
        <p className="field-hint">“{draft.messages[0]}” + 2 more messages</p>
      </div>
      <div className="row-actions">
        <button className="primary small" type="button">Save Plan</button>
        <button className="secondary" type="button">Edit fields</button>
      </div>
      <div className="chat-in" style={{ marginTop: 16 }}>
        <label htmlFor="b-text" className="field-label">Change something</label>
        <textarea id="b-text" placeholder="e.g. only on weekdays, 20 min later" />
        <button className="secondary" type="button">Send</button>
      </div>
    </EditorShell>
  );
}

/** Editor Option C: a three-step form (When · What · Why). Shown on step 1 with the others collapsed. */
export function StepEditor({ step = 1 }: { step?: 1 | 2 | 3 }) {
  const names = ['When', 'What', 'Why'];
  return (
    <EditorShell>
      <ol className="steps" aria-label="Steps">
        {names.map((n, i) => <li key={n} aria-current={step === i + 1 ? 'step' : undefined}>{i + 1}. {n}</li>)}
      </ol>
      <section className="panel" aria-labelledby="c-h">
        <h2 id="c-h">{names[step - 1]}</h2>
        {step === 1 && (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field-label">Remind me</legend>
              <div className="chips" role="group" aria-label="Trigger">
                <button className="chip" type="button" aria-pressed="true">After an Activity</button>
                <button className="chip" type="button" aria-pressed="false">At a time</button>
              </div>
            </fieldset>
            <Select id="c-after" label="After" value={draft.afterActivity} options={activities} />
            <div style={{ height: 12 }} />
            <Select id="c-delay" label="Wait" value={draft.delay} options={['0 min', '10 min', '20 min', '30 min']} />
            <p className="note">{draft.timing}</p>
          </>
        )}
        {step === 2 && (
          <>
            <label htmlFor="c-do" className="field-label">I will</label>
            <input id="c-do" className="text" defaultValue={draft.do} />
            <div style={{ height: 12 }} />
            <Select id="c-instead" label="Instead of" value={draft.instead} options={categories} />
            <div style={{ height: 12 }} />
            <Messages />
          </>
        )}
        {step === 3 && (
          <>
            <Select id="c-goal" label="For goal" value={draft.goal} options={goals} />
            <SavesPreview />
          </>
        )}
      </section>
      <div className="ai-box" style={{ marginTop: 12 }}>
        <label htmlFor="c-text" className="field-label">Or describe it and let AI fill the steps</label>
        <textarea id="c-text" defaultValue={step === 1 ? draftText : ''} />
      </div>
      <button className="primary" type="button">{step === 3 ? 'Save Plan' : 'Next'}</button>
    </EditorShell>
  );
}

/** The push on the lock screen (R6 AC13): title = Do, body = Message, then goal and saves. */
export function PushPreview({ predicted = false }: { predicted?: boolean }) {
  return (
    <div className="phone">
      <main className="lock" tabIndex={0}>
        <p className="clock">{predicted ? '13:00' : '12:52'}</p>
        <p className="date">Friday 27 November</p>
        <div className="push" role="group" aria-label="Notification">
          <p className="app"><span>daily-kaizen</span><span>now</span></p>
          <p className="t">{draft.do}</p>
          <p className="b">{predicted ? `Lunch done by now? ${draft.messages[1]}` : draft.messages[0]}</p>
          <p className="g">≈25 min of Waste · toward Side project 5 h</p>
        </div>
      </main>
    </div>
  );
}

/** What a tap on the push opens (R7). */
export function CheckInSheet() {
  return (
    <Phone tab="day" overlay={
      <div className="sheet-backdrop">
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="ci-h">
          <h2 id="ci-h" className="sheet-title">{draft.do}</h2>
          <p className="sheet-sub">After Lunch · sent 13:00 because Lunch usually ends ≈12:50</p>
          <button className="primary" type="button">Did it</button>
          <div className="row-actions">
            <button className="secondary" type="button">Not today</button>
            <button className="secondary" type="button">Too early: 10 min later next time</button>
          </div>
          <button className="link" type="button">Log Lunch now</button>
        </div>
      </div>
    }>
      <h1>Today</h1>
      <p className="ins-sub">Day view behind the sheet.</p>
    </Phone>
  );
}

/** Week page result card (R8). */
export function WeekResult() {
  return (
    <section className="panel" aria-labelledby="wr-h">
      <h2 id="wr-h">Plans this week</h2>
      {weekResult.map((r) => (
        <div className="lastweek" key={r.plan}>
          <p><b>{r.plan}</b></p>
          <p className="field-hint">Sent {r.sent} · did it {r.done}</p>
          <p className="res">{r.saved}</p>
        </div>
      ))}
      <p className="note">Compared with your 4 weeks before each Plan started.</p>
    </section>
  );
}
