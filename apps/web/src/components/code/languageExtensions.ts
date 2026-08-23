import type { Extension } from '@codemirror/state'
import { cpp } from '@codemirror/lang-cpp'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { rust } from '@codemirror/lang-rust'

// CodeMirror language grammars. Imported only by CodeView (which is lazy-loaded),
// keeping these grammars out of the main bundle.
export function languageExtension(language: string): Extension[] {
  switch (language) {
    case 'cpp':
    case 'c':
      return [cpp()]
    case 'python':
    case 'py':
      return [python()]
    case 'javascript':
    case 'js':
      return [javascript()]
    case 'typescript':
    case 'ts':
      return [javascript({ typescript: true })]
    case 'rust':
    case 'rs':
      return [rust()]
    default:
      return []
  }
}
