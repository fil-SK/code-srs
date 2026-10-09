export interface HelpArticle {
  id: string
  category: 'Getting started' | 'Studying' | 'Your workspace'
  title: string
  description: string
  sections: { title: string; paragraphs: string[] }[]
  links?: { label: string; to: string }[]
}

// Published help covers shipped behavior. New articles can join a category
// without adding another route or teaching the renderer a markup syntax.
export const helpArticles: HelpArticle[] = [
  {
    id: 'first-deck', category: 'Getting started', title: 'Create your first deck',
    description: 'Organize a topic and add your first cards.',
    sections: [
      { title: 'Start in Library', paragraphs: ['Choose New Deck, give it a name and pick an icon. A focused topic makes a useful deck: one language concept, course chapter or interview subject.'] },
      { title: 'Add a card', paragraphs: ['Open the deck and choose Add Card. Recall is a good place to start: write a question or prompt, then an answer you can check after revealing it. The other formats let you select answers, write code, order items, match pairs or work through steps.', 'Keep each card focused on one idea. An optional hint helps before answering; an explanation adds context after answering. Save the card to make it available for study.'] },
      { title: 'Group related decks', paragraphs: ['Decks can be nested through the Parent deck choice in Deck settings. A deck with children becomes a collection. Your cards stay attached to their own deck.'] },
    ],
    links: [{ label: 'Open Library', to: '/decks' }],
  },
  {
    id: 'daily-session', category: 'Getting started', title: 'Start a study session',
    description: 'Review due cards and choose what to study today.',
    sections: [
      { title: 'Follow Today', paragraphs: ['Today shows the cards that are due. Start the suggested session, or use Adjust session to choose a deck or collection and a card count. A collection includes its nested decks.', 'The queue is fixed when a session opens. Grading changes each card’s next due date without rebuilding the session you are in.'] },
      { title: 'Answer, then rate', paragraphs: ['For Recall, think through your answer before revealing it. For interactive cards, complete the response and submit it to see feedback. Choose a rating to save the review and move on.', 'You can undo the latest saved review during the session. Undo restores that card’s previous schedule and removes the review from history.'] },
      { title: 'When nothing is due', paragraphs: ['All caught up means there are no cards due in the selected scope. Come back when cards are due, add new cards, or use a deck’s flip-through preview to browse without saving reviews.'] },
    ],
    links: [{ label: 'Open Today', to: '/' }, { label: 'Understand review ratings', to: '/help/articles/review-ratings' }],
  },
  {
    id: 'review-ratings', category: 'Studying', title: 'Review ratings & spaced repetition',
    description: 'Use Again, Hard, Good and Easy with confidence.',
    sections: [
      { title: 'Choose the rating that matches your recall', paragraphs: ['Again: you did not remember the answer. Hard: you remembered it, but with significant effort. Good: you recalled it with a normal amount of effort. Easy: you recalled it immediately and confidently.', 'Interactive cards suggest a rating from their answer check. You still choose the final rating. Judge your understanding, rather than choosing a rating just to get a longer interval.'] },
      { title: 'How FSRS schedules a card', paragraphs: ['FSRS (Free Spaced Repetition Scheduler) uses the card’s review history and your rating to calculate its next due date. New and forgotten cards can return after short learning steps; established cards can have longer intervals.', 'FlipTap currently uses the scheduler’s default parameters for every deck. Custom retention targets and FSRS tuning are not available yet. Study settings explains the current behavior.'] },
    ],
    links: [{ label: 'Open Study settings', to: '/settings/study' }],
  },
  {
    id: 'keyboard-shortcuts', category: 'Studying', title: 'Keyboard shortcuts',
    description: 'Move through reviews and previews with your keyboard.',
    sections: [
      { title: 'During review', paragraphs: ['Space reveals a Recall answer when focus is outside an interactive control. Enter submits a ready interactive response when focus is outside an input or control. After feedback, press 1 for Again, 2 for Hard, 3 for Good or 4 for Easy. Escape exits the session.', 'Text and code fields keep their own editing keys. To submit from a focused control, use Tab to reach the Submit button, then press Enter.'] },
      { title: 'Inside a card', paragraphs: ['Tab moves between controls. Enter or Space selects a focused Multiple Choice option. For Ordering, focus a row, press Space to pick it up, use the arrow keys to move it, then press Space to drop it. For Matching, focus and activate a term, then its matching value.'] },
      { title: 'In flip-through previews', paragraphs: ['Left and Right arrows move between cards when focus is outside an interactive control. Previewing does not save a review or change the card’s schedule.'] },
    ],
  },
  {
    id: 'backup', category: 'Your workspace', title: 'Back up & restore your cards',
    description: 'Keep a JSON copy of your workspace and import it safely.',
    sections: [
      { title: 'Export a backup', paragraphs: ['Open Import / Export in Account settings and choose Export JSON. Keep the downloaded file somewhere you can find it again. A backup includes your cards, decks and review history.'] },
      { title: 'Choose Merge or Replace', paragraphs: ['Merge adds or updates records from the file. Replace replaces the whole local workspace, so export your current workspace before using it. Imported records are checked before any write.', 'Cloud mode supports Merge, but Replace is unavailable because a failed cloud replace cannot currently be rolled back. The page explains the import guarantee for your active storage mode.'] },
      { title: 'If an import is refused', paragraphs: ['Read the error for the entity or field that needs attention. Use a FlipTap backup in the current format, or follow the AI card prompt provided in Import / Export. Do not delete your existing workspace to work around an invalid file.'] },
    ],
    links: [{ label: 'Open Import / Export', to: '/settings/import-export' }],
  },
  {
    id: 'storage', category: 'Your workspace', title: 'Where your data lives',
    description: 'Understand browser storage, offline use and backups.',
    sections: [
      { title: 'Browser-local mode', paragraphs: ['In local mode, cards and review history live in this browser’s IndexedDB storage. Signing in with an email does not turn a local workspace into a cloud account. Another browser or device has its own separate workspace.', 'The installed web app can work offline after its assets have loaded. Clearing site data or losing browser storage can remove the workspace. Export backups regularly, especially before changing browsers or devices.'] },
      { title: 'Cloud mode', paragraphs: ['When the app is configured for Supabase, data access uses the cloud backend and requires a connection. The account menu identifies your active storage mode. A local workspace is not automatically uploaded when cloud mode is configured.'] },
    ],
    links: [{ label: 'Export a backup', to: '/settings/import-export' }],
  },
]
