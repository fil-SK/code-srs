import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, GraduationCap, Keyboard, LifeBuoy, MessageSquare, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { helpArticles, type HelpArticle } from './helpArticles'
import './help.css'

const categories = [
  { name: 'Getting started', description: 'From your first deck to your first review.', icon: GraduationCap },
  { name: 'Studying', description: 'Build a steady rhythm and understand your reviews.', icon: BookOpen },
  { name: 'Your workspace', description: 'Keep your cards organized, safe and accessible.', icon: ShieldCheck },
] as const
const linkClass = 'inline-flex min-h-11 items-center gap-2 rounded-fliptap-control text-sm font-semibold text-fliptap-ink-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fliptap-accent'
const deliveryNotice = 'Message delivery is not connected yet. Your message cannot be sent or saved here. Please keep a copy until contact is available.'

export function HelpPage() {
  const { pathname } = useLocation()
  const { articleId } = useParams()
  const contact = pathname === '/help/contact'
  // A draft survives navigation between the two help sections, but is never
  // persisted or sent while the support destination is undecided.
  const [draft, setDraft] = useState({ subject: 'Bug report', message: '', email: '' })
  const article = helpArticles.find((item) => item.id === articleId)
  return (
    <div className="help-layout">
      <aside className="help-sidebar">
        <nav aria-label="Help & Support sections" className="help-nav">
          <p className="help-nav-caption">Help & Support</p>
          {[
            { to: '/help', label: 'Help Center', description: 'Guides & answers', icon: BookOpen, active: !contact },
            { to: '/help/contact', label: 'Contact & Feedback', description: 'Get in touch', icon: MessageSquare, active: contact },
          ].map(({ to, label, description, icon: Icon, active }) => (
            <Link key={to} to={to} aria-current={active ? 'page' : undefined}
              className={cn('help-nav-link', active && 'help-nav-link-active')}>
              <Icon size={19} aria-hidden="true" />
              <span><span className="block">{label}</span><span className="help-nav-description">{description}</span></span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="mb-7">
          <h1 className="font-fliptap-display text-[32px] font-bold leading-tight tracking-tight text-fliptap-ink-brand">Help & Support</h1>
          <p className="mt-2 text-sm text-fliptap-muted">A little guidance for your next step.</p>
        </header>
        {contact ? (
          <section className="help-panel max-w-[760px] p-5 sm:p-7" aria-labelledby="contact-title">
            <div className="mb-6 flex items-start gap-3">
              <span className="help-icon"><MessageSquare size={22} aria-hidden="true" /></span>
              <div><h2 id="contact-title" className="text-xl font-bold tracking-tight text-fliptap-ink-brand">Contact & Feedback</h2>
                <p className="mt-1 text-sm leading-relaxed text-fliptap-muted">Found a bug, have an idea, or need a hand? We’d like to hear it.</p></div>
            </div>
            <FeedbackForm draft={draft} onChange={setDraft} />
          </section>
        ) : articleId ? (
          article ? <Article key={article.id} article={article} /> : <section className="help-panel p-6"><h2 className="text-xl font-bold text-fliptap-ink-brand">Article not found</h2><p className="mt-2 text-sm text-fliptap-muted">This guide isn’t available. Browse the Help Center for another answer.</p><Link className={linkClass} to="/help">Back to Help Center →</Link></section>
        ) : <HelpCenter />}
      </div>
    </div>
  )
}

function HelpCenter() {
  return (
    <section aria-labelledby="help-center-title" className="space-y-5">
      <div className="help-panel p-5"><h3 className="text-lg font-semibold text-fliptap-ink-brand">Make your first flip</h3><p className="mt-2 text-sm leading-6 text-fliptap-muted">Follow the highlights to create a card, review it and see your progress.</p><Link to="/onboarding" className={linkClass}>Replay interactive tour →</Link></div>
      <div><h2 id="help-center-title" className="text-xl font-bold tracking-tight text-fliptap-ink-brand">Help Center</h2><p className="mt-1 text-sm text-fliptap-muted">Practical guides to getting more from FlipTap.</p></div>
      <div className="help-categories">
        {categories.map(({ name, description, icon: Icon }) => (
          <section key={name} className="help-panel p-5 sm:p-6" aria-label={name}>
            <span className="help-icon mb-4"><Icon size={22} aria-hidden="true" /></span>
            <h3 className="text-base font-bold text-fliptap-ink-brand">{name}</h3>
            <p className="mb-4 mt-1 text-sm leading-relaxed text-fliptap-muted">{description}</p>
            <div className="divide-y divide-fliptap-border">
              {helpArticles.filter((article) => article.category === name).map((article) => (
                <Link key={article.id} to={`/help/articles/${article.id}`} className="help-article-link group">
                  <span><span className="block text-sm font-semibold text-fliptap-ink-brand">{article.title}</span><span className="mt-1 block text-xs leading-relaxed text-fliptap-muted">{article.description}</span></span>
                  <ChevronRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-fliptap-muted" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="help-panel flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
        <div className="flex items-center gap-3"><LifeBuoy size={21} aria-hidden="true" className="text-fliptap-muted" /><div><p className="text-sm font-semibold text-fliptap-ink-brand">Can’t find your answer?</p><p className="mt-1 text-sm text-fliptap-muted">Visit Contact & Feedback for the next step.</p></div></div>
        <Link to="/help/contact" className={linkClass}>Contact us <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  )
}

function Article({ article }: { article: HelpArticle }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { titleRef.current?.focus() }, [])
  return (
    <article className="help-panel max-w-[850px] p-5 sm:p-8">
      <Link className={cn(linkClass, 'mb-5 text-fliptap-muted')} to="/help"><ArrowLeft size={16} aria-hidden="true" />All articles</Link>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fliptap-muted">{article.category}</p>
      <h2 ref={titleRef} tabIndex={-1} className="rounded-fliptap-control text-2xl font-bold leading-tight tracking-tight text-fliptap-ink-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fliptap-accent">{article.title}</h2>
      <p className="mb-7 mt-2 text-sm leading-relaxed text-fliptap-muted">{article.description}</p>
      <div className="space-y-6">
        {article.sections.map((section) => (
          <section key={section.title}><h3 className="mb-2 text-base font-bold text-fliptap-ink-brand">{section.title}</h3>
            <div className="space-y-3">{section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-fliptap-muted">{paragraph}</p>)}</div>
          </section>
        ))}
      </div>
      {article.id === 'keyboard-shortcuts' && (
        <dl className="mt-6 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 rounded-fliptap-control bg-fliptap-surface-subtle p-4 text-sm text-fliptap-ink">
          {[
            ['Space', 'Reveal Recall answer'], ['Enter', 'Submit a ready response'], ['1 / 2 / 3 / 4', 'Again / Hard / Good / Easy'], ['Esc', 'Exit session'], ['← / →', 'Previous / next preview card'],
          ].map(([keys, description]) => <div key={keys} className="contents"><dt><kbd className="rounded border border-fliptap-border bg-fliptap-surface px-2 py-1 font-mono text-xs">{keys}</kbd></dt><dd>{description}</dd></div>)}
        </dl>
      )}
      {article.links && <div className="mt-5 flex flex-wrap gap-x-5">{article.links.map((link) => <Link key={link.to} to={link.to} className={linkClass}>{link.label} →</Link>)}</div>}
      <footer className="mt-7 border-t border-fliptap-border pt-5"><Link to="/help/contact" className={linkClass}>Still need help? Contact us →</Link></footer>
    </article>
  )
}

interface FeedbackDraft { subject: string; message: string; email: string }
function FeedbackForm({ draft, onChange }: { draft: FeedbackDraft; onChange: (draft: FeedbackDraft) => void }) {
  const [notice, setNotice] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Keep the user's words intact. Enabling delivery requires a real support
    // destination and verified success/failure behavior, recorded in TODO.md.
    setNotice(true)
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Subject"><select aria-label="Subject" className={cn(selectClass, 'min-h-11')} value={draft.subject} onChange={(event) => onChange({ ...draft, subject: event.target.value })}>
        <option>Bug report</option><option>Feature request</option><option>General question</option>
      </select></Field>
      <Field label="Message"><textarea aria-label="Message" className={cn(fieldClass, 'min-h-48 resize-y leading-relaxed')} required maxLength={5000} value={draft.message} onChange={(event) => onChange({ ...draft, message: event.target.value })} placeholder="Tell us what happened or what you have in mind…" aria-describedby="message-hint" /></Field>
      <p id="message-hint" className="!mt-2 text-xs leading-relaxed text-fliptap-muted">For a bug, include what you were doing and what you expected. Please leave out passwords and private card content.</p>
      <Field label="Email address (optional)"><input aria-label="Email address (optional)" className={cn(fieldClass, 'min-h-11')} type="email" autoComplete="email" maxLength={254} value={draft.email} onChange={(event) => onChange({ ...draft, email: event.target.value })} placeholder="you@example.com" aria-describedby="email-hint" /></Field>
      <p id="email-hint" className="!mt-2 text-xs text-fliptap-muted">Add an email address if you’d like a reply.</p>
      <div id="delivery-notice" className="rounded-fliptap-control border border-fliptap-border bg-fliptap-surface-subtle p-4 text-sm leading-relaxed text-fliptap-muted">{deliveryNotice}</div>
      <div className="flex flex-wrap items-center gap-4 border-t border-fliptap-border pt-5">
        <Button type="submit" aria-disabled="true" aria-describedby="delivery-notice" className="flex min-h-11 items-center gap-2 px-5 py-2.5 text-fliptap-muted">
          Send message <span className="rounded-fliptap-pill bg-fliptap-navy-soft px-2 py-0.5 text-[10px] uppercase tracking-wide">Soon</span>
        </Button>
        <Link to="/help" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-fliptap-ink-brand underline underline-offset-4"><Keyboard size={16} aria-hidden="true" />Browse help articles</Link>
      </div>
      {notice && <p role="status" className="text-sm leading-relaxed text-fliptap-muted">Your message was not sent. Contact is not available yet; your draft is still here.</p>}
    </form>
  )
}
