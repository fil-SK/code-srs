export const DECK_ICON_CATEGORIES = ['Code', 'Data', 'Systems', 'Workflow'] as const

// Stable persisted ids shared by platforms, including retired picker choices.
// Each renderer owns its vector components;
// deck data carries only an id, never markup, a URL or a company logo.
export const DECK_ICONS = [
  { id: 'code', label: 'Code', category: 'Code', keywords: 'programming source development' },
  { id: 'terminal', label: 'Terminal', category: 'Code', keywords: 'shell command cli bash' },
  { id: 'braces', label: 'Braces', category: 'Code', keywords: 'syntax json object' },
  { id: 'brackets', label: 'Brackets', category: 'Code', keywords: 'array syntax index' },
  { id: 'file-code', label: 'Source file', category: 'Code', keywords: 'script program source' },
  { id: 'bug', label: 'Debugging', category: 'Code', keywords: 'bug error fix' },
  { id: 'regex', label: 'Regex', category: 'Code', keywords: 'regular expression pattern' },
  { id: 'function', label: 'Functions', category: 'Code', keywords: 'method lambda call' },
  { id: 'variable', label: 'Variables', category: 'Code', keywords: 'value type binding' },
  { id: 'binary', label: 'Binary', category: 'Code', keywords: 'bits boolean encoding' },
  { id: 'puzzle', label: 'Problem solving', category: 'Code', keywords: 'algorithm challenge logic' },
  { id: 'blocks', label: 'Modules', category: 'Code', keywords: 'component composition build' },
  { id: 'database', label: 'Database', category: 'Data', keywords: 'sql storage queries' },
  { id: 'table', label: 'Tables', category: 'Data', keywords: 'rows columns relational' },
  { id: 'network', label: 'Graphs', category: 'Data', keywords: 'nodes edges algorithm network' },
  { id: 'git-branch', label: 'Branches', category: 'Data', keywords: 'git tree version control' },
  { id: 'list-tree', label: 'Trees', category: 'Data', keywords: 'hierarchy structure traversal' },
  { id: 'workflow', label: 'Data flow', category: 'Data', keywords: 'pipeline graph compiler' },
  { id: 'chart-line', label: 'Analysis', category: 'Data', keywords: 'complexity performance statistics' },
  { id: 'chart-column', label: 'Metrics', category: 'Data', keywords: 'statistics measurement analytics' },
  { id: 'filter', label: 'Filtering', category: 'Data', keywords: 'query select transform' },
  { id: 'search', label: 'Searching', category: 'Data', keywords: 'lookup find algorithm' },
  { id: 'scan-search', label: 'Inspection', category: 'Data', keywords: 'analysis scan parsing' },
  { id: 'hash', label: 'Hashing', category: 'Data', keywords: 'map dictionary hash table' },
  { id: 'cpu', label: 'Processor', category: 'Systems', keywords: 'cpu assembly architecture' },
  { id: 'memory', label: 'Memory', category: 'Systems', keywords: 'ram allocation pointer heap stack' },
  { id: 'circuit', label: 'Circuits', category: 'Systems', keywords: 'hardware embedded electronics' },
  { id: 'server', label: 'Servers', category: 'Systems', keywords: 'backend infrastructure distributed' },
  { id: 'disk', label: 'Storage', category: 'Systems', keywords: 'disk files filesystem drive' },
  { id: 'cloud', label: 'Cloud', category: 'Systems', keywords: 'hosting infrastructure deployment' },
  { id: 'globe', label: 'Web', category: 'Systems', keywords: 'internet browser http frontend' },
  { id: 'cable', label: 'Networking', category: 'Systems', keywords: 'connection protocol tcp socket' },
  { id: 'container', label: 'Containers', category: 'Systems', keywords: 'isolation deployment virtualization' },
  { id: 'boxes', label: 'Architecture', category: 'Systems', keywords: 'system design services' },
  { id: 'layers', label: 'Layers', category: 'Systems', keywords: 'abstraction stack architecture' },
  { id: 'shield', label: 'Security', category: 'Systems', keywords: 'authentication encryption protection' },
  { id: 'git-merge', label: 'Merging', category: 'Workflow', keywords: 'git integration version control' },
  { id: 'git-commit', label: 'Commits', category: 'Workflow', keywords: 'git history changes version control' },
  { id: 'git-pull-request', label: 'Code review', category: 'Workflow', keywords: 'git pull request collaboration' },
  { id: 'git-compare', label: 'Comparisons', category: 'Workflow', keywords: 'git diff changes versions' },
  { id: 'folder-code', label: 'Projects', category: 'Workflow', keywords: 'workspace repository source' },
  { id: 'package', label: 'Packages', category: 'Workflow', keywords: 'dependency library distribution' },
  { id: 'wrench', label: 'Tooling', category: 'Workflow', keywords: 'build developer tools utilities' },
  { id: 'settings', label: 'Configuration', category: 'Workflow', keywords: 'options setup settings' },
  { id: 'flask', label: 'Experiments', category: 'Workflow', keywords: 'research prototype science' },
  { id: 'test-tube', label: 'Testing', category: 'Workflow', keywords: 'test quality unit integration' },
  { id: 'clipboard-check', label: 'Checklists', category: 'Workflow', keywords: 'tasks verification validation' },
  { id: 'book-open', label: 'Documentation', category: 'Workflow', keywords: 'reference learning guide reading' },
] as const satisfies readonly {
  id: string
  label: string
  category: (typeof DECK_ICON_CATEGORIES)[number]
  keywords: string
}[]

export type DeckIconId = (typeof DECK_ICONS)[number]['id']

// Keep retired ids readable and importable without crowding new selections.
const pickerIds = new Set<DeckIconId>([
  'code', 'terminal', 'braces', 'bug', 'puzzle',
  'database', 'network', 'cpu', 'memory', 'server',
  'globe', 'layers', 'shield', 'wrench', 'book-open',
])
export const DECK_ICON_CHOICES = DECK_ICONS.filter((icon) => pickerIds.has(icon.id))
export const DEFAULT_DECK_ICON: DeckIconId = 'code'
const iconIds = new Set<string>(DECK_ICONS.map((icon) => icon.id))

export function isDeckIconId(value: unknown): value is DeckIconId {
  return typeof value === 'string' && iconIds.has(value)
}

export function getDeckIcon(value?: string) {
  return DECK_ICONS.find((icon) => icon.id === value) ?? DECK_ICONS[0]
}
