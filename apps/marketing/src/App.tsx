import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDown, ArrowRight, BarChart3, BookOpen, Brain, Check, ChevronRight,
  CircleDot, Clock3, Code2, Flame, Layers3, Link2, ListChecks, ListOrdered,
  Monitor, MoveRight, Play, Smartphone, Sparkles, Waypoints,
} from 'lucide-react'
import { submitEarlyAccessInterest } from './earlyAccess'

const interactions = [
  { id: 'recall', label: 'Recall', Icon: Brain, tone: 'navy', description: 'Retrieve an idea, then compare your answer.' },
  { id: 'multiple-choice', label: 'Multiple Choice', Icon: ListChecks, tone: 'amber', description: 'Choose every correct statement, not just one lucky guess.' },
  { id: 'write-code', label: 'Write Code', Icon: Code2, tone: 'blue', description: 'Complete the implementation from memory.' },
  { id: 'ordering', label: 'Ordering', Icon: ListOrdered, tone: 'green', description: 'Put phases, operations, or events in sequence.' },
  { id: 'matching', label: 'Matching', Icon: Link2, tone: 'violet', description: 'Connect concepts, definitions, and consequences.' },
  { id: 'walkthrough', label: 'Walkthrough', Icon: Waypoints, tone: 'teal', description: 'Reason through a multi-step technical scenario.' },
] as const

type InteractionId = (typeof interactions)[number]['id']

const heatCells = [
  0, 1, 0, 2, 1, 0, 0, 1, 3, 2, 0, 1, 0, 2, 1, 4, 2, 0, 1, 2, 3, 1, 0, 0, 2, 4, 3, 1,
  0, 2, 1, 3, 2, 1, 0, 1, 2, 4, 2, 0, 1, 3, 2, 1, 0, 3, 4, 2, 1, 0, 1, 2, 3, 1, 0, 2,
]

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <a className={`brand${dark ? ' brand-dark' : ''}`} href="#top" aria-label="Itera, back to top">
      <img src="/itera-logo.png" alt="" />
      <span>Itera</span>
    </a>
  )
}

function SectionIntro({ eyebrow, title, copy, light = false }: { eyebrow: string; title: string; copy: string; light?: boolean }) {
  return (
    <div className={`section-intro${light ? ' section-intro-light' : ''}`}>
      <p className="section-eyebrow"><span />{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  )
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="metric"><span className="metric-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div></div>
}

function ProductDemo() {
  return (
    <div className="product-demo" data-future-media-slot="20–40 second product recording">
      <div className="demo-browser-bar">
        <div aria-hidden="true"><span /><span /><span /></div>
        <p><span className="lock-dot" /> itera / today</p>
        <button type="button" aria-label="Product recording placeholder"><Play size={14} fill="currentColor" /> Demo slot</button>
      </div>
      <div className="demo-app">
        <aside>
          <Brand dark />
          <nav aria-label="Product preview navigation">
            <span className="active"><CircleDot size={15} /> Today</span>
            <span><BookOpen size={15} /> Library</span>
            <span><BarChart3 size={15} /> Progress</span>
          </nav>
          <div className="demo-sidebar-note"><Sparkles size={16} /><span>Small sessions.<br />Steady progress.</span></div>
        </aside>
        <div className="demo-main">
          <div className="demo-heading"><div><small>Tuesday, 27 August</small><h3>Good evening, Alex.</h3></div><span className="sample-pill">Sample workspace</span></div>
          <div className="demo-grid">
            <div className="suggested-card"><div className="stack-card stack-back" /><div className="stack-card stack-mid" /><div className="stack-card stack-front"><p>Suggested session</p><h4>12 cards are ready</h4><span>About 8 focused minutes</span><button type="button">Start review <ArrowRight size={15} /></button></div></div>
            <div className="demo-metrics"><Metric icon={<Clock3 size={18} />} label="Due" value="12" detail="ready now" /><Metric icon={<Brain size={18} />} label="Retention" value="84%" detail="sample view" /><Metric icon={<Flame size={18} />} label="Streak" value="6 days" detail="current" /></div>
          </div>
          <div className="continue-panel"><div className="panel-heading"><div><small>Continue learning</small><h4>Pick up where you left off</h4></div><button type="button">View library</button></div><div className="learning-row"><span className="deck-mark">C++</span><div><strong>C++ Fundamentals</strong><small>Declarations and definitions</small></div><b>5 due</b><ChevronRight size={16} /></div><div className="learning-row"><span className="deck-mark deck-mark-blue">MLIR</span><div><strong>Compiler Architecture</strong><small>Passes and lowering</small></div><b>4 due</b><ChevronRight size={16} /></div></div>
        </div>
      </div>
    </div>
  )
}

function InteractionPreview({ active }: { active: InteractionId }) {
  const header = <><span className="interaction-preview-label">Practice card</span><h3>How does this concept behave under pressure?</h3></>
  if (active === 'recall') return <div className="interaction-card">{header}<p className="prompt">What invariant does binary search maintain while narrowing its range?</p><button className="preview-action" type="button">Reveal answer</button></div>
  if (active === 'multiple-choice') return <div className="interaction-card">{header}<p className="prompt">Which statements are true for a stable sort?</p><div className="choice-list"><span><i />Equal keys keep their relative order</span><span><i />The algorithm must be in-place</span><span><i />Stability can matter for multi-key sorting</span></div><button className="preview-action" type="button">Submit answer</button></div>
  if (active === 'write-code') return <div className="interaction-card interaction-code">{header}<p className="prompt">Complete the ownership-safe move.</p><pre><code><em>auto</em> next = std::<b>________</b>(current);{`\n`}queue.push(<b>________</b>);</code></pre><button className="preview-action" type="button">Check code</button></div>
  if (active === 'ordering') return <div className="interaction-card">{header}<p className="prompt">Arrange a compiler pipeline.</p><ol className="order-list"><li><span>1</span>Lexing</li><li><span>2</span>Parsing</li><li><span>3</span>Semantic analysis</li><li><span>4</span>Lowering</li></ol><button className="preview-action" type="button">Submit order</button></div>
  if (active === 'matching') return <div className="interaction-card">{header}<p className="prompt">Match each concept to its role.</p><div className="match-grid"><span>Mutex</span><b>Mutual exclusion</b><span>Semaphore</span><b>Resource count</b><span>Condition variable</span><b>Wait for state</b></div><button className="preview-action" type="button">Check matches</button></div>
  return <div className="interaction-card">{header}<p className="prompt">Trace a cache miss through the memory hierarchy.</p><div className="walkthrough"><div><span>2</span><small>of 4</small></div><p><strong>L2 lookup</strong><br />What happens if the requested line is not present?</p></div><div className="step-dots"><i /><i className="current" /><i /><i /></div><button className="preview-action" type="button">Continue</button></div>
}

function EarlyAccessForm() {
  const [email, setEmail] = useState('')
  const [goal, setGoal] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    const normalized = email.trim()
    if (!normalized) { setFieldError('Enter your email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setFieldError('Enter a valid email address, such as you@example.com.'); return }
    setFieldError('')
    setSubmitting(true)
    try {
      await submitEarlyAccessInterest({ email: normalized, learningGoal: goal.trim() || undefined })
    } catch {
      setSubmitError('Email capture is not connected yet. Your details have not been sent or stored.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="access-form" onSubmit={onSubmit} noValidate>
      <div className="form-row"><label htmlFor="early-access-email">Email address</label><input id="early-access-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'email-error' : undefined} onChange={(event) => { setEmail(event.target.value); setFieldError(''); setSubmitError('') }} />{fieldError ? <p id="email-error" className="field-error">{fieldError}</p> : null}</div>
      <div className="form-row"><label htmlFor="learning-goal">What would you use Itera to learn? <span>Optional</span></label><input id="learning-goal" name="learningGoal" type="text" maxLength={160} placeholder="Compilers, system design, C++…" value={goal} onChange={(event) => setGoal(event.target.value)} /></div>
      <button className="button button-primary form-submit" type="submit" disabled={submitting}>{submitting ? 'Checking…' : 'Join early access'} <ArrowRight size={18} aria-hidden="true" /></button>
      <p className="form-honesty"><span /> Preview form: submissions are not stored yet.</p>
      {submitError ? <p className="submit-error" role="alert">{submitError}</p> : null}
    </form>
  )
}

export function App() {
  const [activeInteraction, setActiveInteraction] = useState<InteractionId>('write-code')
  const activeMeta = interactions.find((interaction) => interaction.id === activeInteraction)!

  return (
    <div id="top">
      <header className="site-header"><div className="nav-shell"><Brand /><nav aria-label="Primary navigation"><a href="#product">Product</a><a href="#workflow">How it works</a><a className="nav-cta" href="#early-access">Join early access</a></nav></div></header>
      <main>
        <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow"><span /> Preparing for early access</p><h1 id="hero-title">Technical knowledge takes more than a flashcard.</h1><p className="hero-lede">Itera is a spaced-repetition workspace for developers who need to recall, write, order, match, and reason through serious technical material.</p><div className="hero-actions"><a className="button button-primary" href="#early-access">Join early access <ArrowRight size={18} aria-hidden="true" /></a><a className="text-link" href="#product">See the product <ArrowDown size={16} aria-hidden="true" /></a></div><p className="hero-note">For software engineering, computer science, and the systems behind both.</p></div><div className="hero-visual" aria-label="Preview of an Itera code review card"><div className="code-window"><div className="window-bar"><span /><span /><span /><b>Itera / Review</b></div><div className="review-progress"><span>08 / 12</span><i><b /></i><span>Esc to exit</span></div><article className="review-card"><p className="card-kicker">&lt;/&gt; Write Code</p><h2>Complete the binary search invariant.</h2><pre><code><em>while</em> (left &lt; right) {'{'}{`\n`}  mid = left + <mark>__________</mark>;{`\n`}  <em>if</em> (values[mid] &lt; target) {'{'}{`\n`}    left = mid + 1;{`\n`}  {'}'} <em>else</em> {'{'}{`\n`}    right = mid;{`\n`}  {'}'}{`\n`}{'}'}</code></pre><div className="answer-row"><span>Type the missing expression</span><kbd>Enter</kbd></div></article></div><div className="floating-chip chip-one">Due now</div><div className="floating-chip chip-two">C++ · Algorithms</div></div></section>

        <section id="product" className="section product-section" aria-labelledby="product-title"><SectionIntro eyebrow="The product" title="From a body of knowledge to today’s focused session." copy="Organize technical material into decks, practise it through the interaction that fits, and let Itera surface what is due next." /><ProductDemo /><p className="media-note"><Play size={14} /> This frame is prepared to become a 20–40 second product recording. The UI shown is a static composition of real Itera concepts.</p></section>
        <section className="section problem-section" aria-labelledby="problem-title"><div className="problem-copy"><SectionIntro eyebrow="The thesis" title="Code is not a sentence to memorize." copy="A front-and-back card can test a definition. Technical understanding often asks for something more active." light /></div><div className="problem-list"><div><span>01</span><p><strong>Write it.</strong> Reconstruct syntax, an invariant, or a complete answer.</p></div><div><span>02</span><p><strong>Structure it.</strong> Arrange the phases of a compiler or the events in a protocol.</p></div><div><span>03</span><p><strong>Connect it.</strong> Match abstractions to behaviour and follow a process step by step.</p></div></div></section>
        <section className="section interaction-section" aria-labelledby="interaction-title"><SectionIntro eyebrow="Six interaction types" title="Practise the shape of the knowledge." copy="Each card type has its own response model. Pick an interaction below to see how the review experience changes." /><div className="interaction-layout"><div className="interaction-tabs" role="tablist" aria-label="Card interaction examples">{interactions.map(({ id, label, Icon, tone }, index) => <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={activeInteraction === id} aria-controls="interaction-preview" className={activeInteraction === id ? 'active' : ''} onClick={() => setActiveInteraction(id)}><span className={`interaction-icon tone-${tone}`}><Icon size={18} /></span><span><strong>{label}</strong><small>{index + 1} / 6</small></span><ChevronRight size={16} /></button>)}</div><div className="interaction-stage"><div className="interaction-stage-meta"><span>{activeMeta.label}</span><p>{activeMeta.description}</p></div><div id="interaction-preview" role="tabpanel" aria-labelledby={`tab-${activeInteraction}`}><InteractionPreview active={activeInteraction} /></div></div></div></section>
        <section id="workflow" className="section workflow-section" aria-labelledby="workflow-title"><SectionIntro eyebrow="Designed around your day" title="Build at your desk. Review in the gaps." copy="The Itera experience is being shaped around two different moments: careful authoring when you have a keyboard, and a short purposeful review when you only have a few minutes." /><div className="workflow-canvas"><div className="device-step desktop-step"><div className="step-copy"><span>01</span><Monitor size={22} /><div><h3>Create and organize</h3><p>Use the room of a desktop to structure decks, write code, and choose the right interaction.</p></div></div><div className="desktop-device"><div className="mini-toolbar"><span /><span /><span /><b>New card</b></div><div className="authoring-ui"><aside><small>Interaction</small><strong>Write Code</strong><span>Prompt</span><span>Answer</span><span>Organize</span></aside><div><small>Prompt</small><p>Implement a move constructor that preserves the class invariant.</p><small>Accepted answer</small><pre><code>Buffer(Buffer&amp;&amp; other) noexcept {'{'} … {'}'}</code></pre></div></div></div></div><div className="workflow-arrow" aria-hidden="true"><span>Intended workflow</span><MoveRight size={31} /></div><div className="device-step phone-step"><div className="step-copy"><span>02</span><Smartphone size={22} /><div><h3>Review when it fits</h3><p>Open a compact session and use the interaction itself, not a stripped-down imitation.</p></div></div><div className="phone-device"><div className="phone-speaker" /><div className="phone-ui"><div className="phone-head"><Brand dark /><span>3 / 8</span></div><span className="phone-label">Recall</span><h4>Why does RAII make exception safety easier?</h4><p>Think through ownership and cleanup before revealing the answer.</p><button type="button">Reveal answer</button><nav aria-label="Mobile product preview"><span>Library</span><span className="active">Review</span><span>Today</span><span>Progress</span></nav></div></div></div></div><p className="direction-note">Cross-device continuity is the intended product direction for early access, not a claim that production sync is live today.</p></section>
        <section className="section rhythm-section" aria-labelledby="rhythm-title"><div className="rhythm-copy"><SectionIntro eyebrow="A daily learning rhythm" title="Open Itera. Know what deserves attention." copy="Today turns scheduling into a clear next action. Review the due queue, continue an active deck, and move on with your day." /><div className="rhythm-points"><p><Check size={16} /> Due cards gathered into a focused session</p><p><Check size={16} /> Recall quality updates the next review</p><p><Check size={16} /> No need to rebuild a study plan every time</p></div></div><div className="today-card"><span className="sample-label">Illustrative product values</span><div className="today-card-head"><div><small>Today</small><h3>Your next review is ready.</h3></div><span><Flame size={18} /> 6 day streak</span></div><div className="today-metric-row"><div><small>Due</small><strong>12</strong><span>cards</span></div><div><small>Retention</small><strong>84%</strong><span>sample</span></div><div><small>Session</small><strong>~8m</strong><span>estimate</span></div></div><button type="button">Start focused review <ArrowRight size={17} /></button><div className="today-continue"><span className="deck-mark deck-mark-blue">MLIR</span><div><small>Continue learning</small><strong>Compiler Architecture</strong></div><b>4 due</b></div></div></section>
        <section className="section progress-section" aria-labelledby="progress-title"><SectionIntro eyebrow="Progress with context" title="See the work behind the streak." copy="Reviews change the things that matter in a learning system: what is learned, what is due, how often you return, and how well material is being retained." light /><div className="progress-board"><div className="progress-top"><div><span>Example learning view</span><h3>Last 8 weeks</h3></div><button type="button">All decks <ChevronRight size={14} /></button></div><div className="progress-kpis"><Metric icon={<Layers3 size={18} />} label="Learned" value="128" detail="sample cards" /><Metric icon={<Clock3 size={18} />} label="Due" value="12" detail="today" /><Metric icon={<Brain size={18} />} label="Retention" value="84%" detail="example" /><Metric icon={<Flame size={18} />} label="Current streak" value="6 days" detail="sample" /></div><div className="progress-visuals"><div className="heatmap-panel"><div><h4>Review activity</h4><span>Daily cards reviewed</span></div><div className="heatmap" aria-label="Illustrative review activity heat map">{heatCells.map((level, index) => <i key={index} data-level={level} />)}</div><div className="heat-legend"><span>Less</span><i data-level="0" /><i data-level="1" /><i data-level="2" /><i data-level="3" /><i data-level="4" /><span>More</span></div></div><div className="retention-panel"><div><h4>Retention history</h4><span>Illustrative trend</span></div><div className="retention-chart"><span>90%</span><span>80%</span><span>70%</span><svg viewBox="0 0 360 130" role="img" aria-label="Illustrative retention line trending upward"><path className="chart-grid" d="M0 24H360M0 65H360M0 106H360" /><path className="chart-line" d="M4 104 C35 91,48 66,76 73 S118 52,145 62 S181 42,209 50 S249 39,278 47 S323 29,356 35" /><circle cx="356" cy="35" r="5" /></svg></div></div></div></div></section>
        <section className="section audience-section" aria-labelledby="audience-title"><div><SectionIntro eyebrow="Who Itera is for" title="Built for material you want to keep." copy="Itera starts with software engineers and technical learners who are building durable understanding, not collecting disposable notes." /></div><div className="topic-cloud" aria-label="Example technical subjects">{['Algorithms & data structures', 'Systems programming', 'C++ & Rust', 'Compilers', 'Distributed systems', 'Programming languages', 'Computer science', 'Technical interviews'].map((topic, index) => <span key={topic} className={index === 0 || index === 4 ? 'wide' : ''}>{topic}</span>)}</div></section>
        <section className="status-section" aria-labelledby="status-title"><div className="status-orbit" aria-hidden="true"><span /><span /><span /></div><div className="status-copy"><p className="section-eyebrow"><span />Current status</p><h2 id="status-title">Itera is being prepared for early access.</h2><p>The product is being polished, the workflow is being tested with early users, and the first public release is taking shape.</p></div><div className="status-steps"><div><span>Now</span><strong>Polish the core experience</strong></div><div><span>Next</span><strong>Learn with early users</strong></div><div><span>Then</span><strong>Open early access</strong></div></div></section>
        <section id="early-access" className="section access-section" aria-labelledby="access-title"><div className="access-copy"><p className="section-eyebrow"><span />Early access</p><h2 id="access-title">Want technical practice that feels made for the material?</h2><p>Share your interest in Itera and what you would use it to learn.</p></div><EarlyAccessForm /></section>
      </main>
      <footer><Brand dark /><p>Spaced repetition for serious technical learning.</p><a href="#top">Back to top <ArrowRight size={14} /></a></footer>
    </div>
  )
}
