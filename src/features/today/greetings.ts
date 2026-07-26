// Time-of-day (mainText, subtext) pool for the Today page's hero heading.
// Each bucket mixes serious and dry/goofy lines on purpose (see
// docs/design-system.md's tone) rather than being pure motivational copy —
// one random pair picked per bucket per page load.

export type TimeBucket = 'morning' | 'day' | 'evening' | 'lateNight'

export interface DashboardMessage {
  mainText: string
  subtext: string
}

export function getTimeBucket(hour: number): TimeBucket {
  if (hour >= 23 || hour < 5) return 'lateNight'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}

export const DASHBOARD_MESSAGES: Record<TimeBucket, DashboardMessage[]> = {
  morning: [
    {
      mainText: 'Good morning. Shall we wake up a few neurons?',
      subtext: 'Start gently with something familiar.',
    },
    {
      mainText: 'Morning. Fresh stack, fresh start.',
      subtext: 'A new session, with no context carried over.',
    },
    {
      mainText: 'Good morning. Your brain is booting nicely.',
      subtext: 'Give it a few easy ideas to warm up with.',
    },
    {
      mainText: 'Morning. Let’s see what survived the night.',
      subtext: 'Take a quick look at what still feels familiar.',
    },
    {
      mainText: 'Good morning. A few cards to get things moving?',
      subtext: 'Ease into the day at your own pace.',
    },
    {
      mainText: 'Morning. Memory is online.',
      subtext: 'Let’s see what is ready to be retrieved.',
    },
    {
      mainText: 'The day has started. No rush.',
      subtext: 'Begin wherever feels easiest.',
    },
    {
      mainText: 'Good morning. Let’s load something useful into cache.',
      subtext: 'Bring a few important ideas closer to the surface.',
    },
    {
      mainText: 'Morning. Curious about what you still remember?',
      subtext: 'There is only one way to find out.',
    },
    {
      mainText: 'Morning. Pick up wherever you left off.',
      subtext: 'Your progress is right where you left it.',
    },
    {
      mainText: 'Brain boot complete. Mostly.',
      subtext: 'A few warm-up cards should handle the rest.',
    },
    {
      mainText: 'Good morning. Let’s make one thing clearer.',
      subtext: 'One solid connection is enough for a good session.',
    },
  ],

  day: [
    {
      mainText: 'Hello again. What are we learning today?',
      subtext: 'Choose something that feels worth revisiting.',
    },
    {
      mainText: 'A fine time to remember something.',
      subtext: 'See which ideas come back without much effort.',
    },
    {
      mainText: 'Back for another pass?',
      subtext: 'A second look often reveals something new.',
    },
    {
      mainText: 'Your knowledge stack awaits.',
      subtext: 'Pick a layer and start from there.',
    },
    {
      mainText: 'Ready when you are.',
      subtext: 'There is no need to rush into it.',
    },
    {
      mainText: 'Let’s pull a few ideas back into focus.',
      subtext: 'Start with whatever feels slightly fuzzy.',
    },
    {
      mainText: 'A little repetition, a little more intuition.',
      subtext: 'Give the details another chance to settle in.',
    },
    {
      mainText: 'Time for a quick memory refresh.',
      subtext: 'A short pass is often all it takes.',
    },
    {
      mainText: 'Let’s see what clicks today.',
      subtext: 'Some ideas just need one more encounter.',
    },
    {
      mainText: 'One session. No dramatic montage required.',
      subtext: 'A few focused minutes will do just fine.',
    },
    {
      mainText: 'Welcome back. Your context has been restored.',
      subtext: 'Continue from wherever you last stopped.',
    },
    {
      mainText: 'Let’s reconnect a few neurons.',
      subtext: 'See which concepts still belong together.',
    },
    {
      mainText: 'Another iteration?',
      subtext: 'Same ideas, slightly sharper understanding.',
    },
    {
      mainText: 'Let’s turn familiarity into fluency.',
      subtext: 'Practice until the answer feels natural.',
    },
  ],

  evening: [
    {
      mainText: 'Good evening. Let’s keep this one easy.',
      subtext: 'A light review is more than enough.',
    },
    {
      mainText: 'Evening. A quiet moment for a few ideas.',
      subtext: 'Take your time and let them come back naturally.',
    },
    {
      mainText: 'The day is winding down. Your memory can too.',
      subtext: 'Revisit something without pushing too hard.',
    },
    {
      mainText: 'Good evening. Let’s revisit something interesting.',
      subtext: 'Choose a topic you would not mind seeing again.',
    },
    {
      mainText: 'A calm session before calling it a day?',
      subtext: 'A few thoughtful cards should be plenty.',
    },
    {
      mainText: 'Evening mode: fewer distractions, softer lighting.',
      subtext: 'A good setting for some unhurried recall.',
    },
    {
      mainText: 'Let’s give today one final pass.',
      subtext: 'See which ideas are still hanging around.',
    },
    {
      mainText: 'Good evening. No hurry.',
      subtext: 'Move through the session at a comfortable pace.',
    },
    {
      mainText: 'A little recall before the day fades out.',
      subtext: 'Bring one or two useful ideas back into view.',
    },
    {
      mainText: 'The world is quieter. Good time to think.',
      subtext: 'Settle in with something worth understanding.',
    },
    {
      mainText: 'Evening. Let’s see what stuck.',
      subtext: 'Notice what feels clear and what needs another pass.',
    },
    {
      mainText: 'Good evening. Your cards are right where you left them.',
      subtext: 'Continue without needing to start over.',
    },
    {
      mainText: 'Slow down. Think clearly. Continue.',
      subtext: 'Give each idea the attention it needs.',
    },
    {
      mainText: 'Let’s close a few mental tabs.',
      subtext: 'Clear up one or two loose ends before logging off.',
    },
  ],

  lateNight: [
    {
      mainText: 'Ready to burn some midnight cards?',
      subtext: 'Keep it light and follow your curiosity.',
    },
    {
      mainText: 'Late-night learning has entered the chat.',
      subtext: 'A few interesting ideas are still awake too.',
    },
    {
      mainText: 'Quiet system. Active mind.',
      subtext: 'A good moment for focused recall.',
    },
    {
      mainText: 'The night shift begins.',
      subtext: 'Take on only as much as feels comfortable.',
    },
    {
      mainText: 'Still compiling?',
      subtext: 'Maybe one more concept will finish the build.',
    },
    {
      mainText: 'Midnight mode: minimal noise, maximum curiosity.',
      subtext: 'Explore a few ideas without overthinking it.',
    },
    {
      mainText: 'You, me, and a suspicious amount of screen light.',
      subtext: 'Might as well make the pixels useful.',
    },
    {
      mainText: 'The rest of the stack is asleep.',
      subtext: 'Quiet hours are good for quiet thinking.',
    },
    {
      mainText: 'Welcome to the after-hours build.',
      subtext: 'A small update to long-term memory awaits.',
    },
    {
      mainText: 'A few cards from the edge of tomorrow?',
      subtext: 'Take a quick look, then leave the rest for later.',
    },
    {
      mainText: 'Late night. Strange bugs. Clear thoughts.',
      subtext: 'See which ideas make more sense after dark.',
    },
    {
      mainText: 'The sun is offline. Itera is not.',
      subtext: 'Your session can be as short as you like.',
    },
    {
      mainText: 'Just one more iteration?',
      subtext: 'Take another pass and see what changes.',
    },
    {
      mainText: 'Low light, high bandwidth.',
      subtext: 'A little uninterrupted focus goes a long way.',
    },
    {
      mainText: 'Everyone else logged off. Nerd.',
      subtext: 'Enjoy the quiet and review something interesting.',
    },
  ],
}

// Picks once per call; callers that render across re-renders should stash the
// result in state (e.g. useState(() => pickDashboardMessage())) rather than
// calling this on every render, or the message will change under the user's
// cursor.
export function pickDashboardMessage(now: Date = new Date()): DashboardMessage {
  const list = DASHBOARD_MESSAGES[getTimeBucket(now.getHours())]
  return list[Math.floor(Math.random() * list.length)]
}
