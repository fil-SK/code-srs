// Lightweight language metadata (no grammar imports) so editors can show a
// language picker without pulling CodeMirror grammars into the main bundle.
// The heavy grammars live in languageExtensions.ts, used only by CodeView.
export const SUPPORTED_LANGUAGES: { id: string; label: string }[] = [
  { id: 'cpp', label: 'C / C++' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'rust', label: 'Rust' },
  { id: 'text', label: 'Plain text' },
]
