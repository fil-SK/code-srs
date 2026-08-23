// The content-security fixture: strings that must render as inert text, and
// strings that must survive untouched because they are legitimate educational
// content. Both halves matter equally.
//
// It lives under test support rather than beside the parser so it cannot be
// pulled into a production bundle by an accidental import from the barrel. The
// web suite reaches it by source path, the same deliberate test-only exception
// backendParity.test.ts uses for the fake Supabase client.
//
// Every payload here is inert by construction in this app - none of them is an
// exploit against Itera, they are the shapes an exploit would take if a raw
// HTML sink were ever introduced at the content boundary. The browser harness
// pairs them with a `window.__iteraXssProbe` sentinel; nothing here executes
// anything, and none of them is destructive if one somehow did.

/**
 * Hostile strings. Each must appear as literal, visible text wherever card
 * content is shown, and must never become an element, an attribute, a handler
 * or a navigation.
 */
export const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">click</a>',
  'javascript:alert(1)',
  '"><img src=x onerror=alert(1)>',
  "'><svg onload=alert(1)>",
  '<svg/onload=alert(1)>',
  '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
  '<body onload=alert(1)>',
  '</div><script>alert(1)</script><div>',
  '<object data="data:text/html,<script>alert(1)</script>"></object>',
  '<style>*{background:url("javascript:alert(1)")}</style>',
  // The same payloads wearing Itera's own syntax, so the parser's emphasis and
  // inline-code branches are exercised rather than only its plain-text branch.
  '**<script>alert(1)</script>**',
  '*<img src=x onerror=alert(1)>*',
  '`<script>alert(1)</script>`',
] as const

/**
 * The same idea at block level: an attack string inside a fenced code block,
 * where it must be displayed exactly as written because that is the whole
 * point of a code block.
 */
export const XSS_CODE_BLOCK = [
  '```html\n<script>alert(1)</script>\n```',
  '```\n<img src=x onerror=alert(1)>\n```',
  '```js\ndocument.body.innerHTML = "<script>alert(1)<\\/script>"\n```',
] as const

/**
 * Content that a naive "strip every < and >" sanitizer would destroy. A
 * software-engineering flashcard app that mangles these is broken, which is
 * why the boundary is safe rendering rather than input mutation.
 */
export const MUST_SURVIVE_LITERALLY = [
  'Vec<T>',
  'std::map<int, std::string>',
  'a < b && c > d',
  'template <typename T> class Box {};',
  '<div class="row">…</div>',
  'List<Map<String, List<Integer>>>',
  "SELECT * FROM t WHERE name = 'O''Brien' AND n <> 3",
  'snake_case_identifier and __dunder__ stay literal',
  '5 & 3 == 1, x >>= 2, a <=> b',
] as const

/**
 * Image sources that must never be loaded, for WalkthroughInteraction.image.
 * Remote schemes are the actual defect: they turn opening a card into a
 * callback to whoever wrote the backup.
 */
export const REJECTED_IMAGE_SOURCES = [
  'https://attacker.example/beacon.gif',
  'http://attacker.example/beacon.gif',
  '//attacker.example/beacon.gif',
  'blob:https://attacker.example/6b2a',
  'file:///etc/passwd',
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  ' javascript:alert(1)',
  'vbscript:msgbox(1)',
  'data:text/html,<script>alert(1)</script>',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'data:image/svg+xml;base64,PHN2Zy8+',
  'data:image/svg+xml,<svg onload="alert(1)"/>',
  'data:application/octet-stream;base64,AAAA',
  'data:image/png,notbase64',
  'data:image/png;base64,',
  'data:image/png;base64,AA AA',
  'data:image/png;base64,AA\nAA',
  ' data:image/png;base64,AAAA',
  'data:image/png;base64,AAAA ',
  'data:image/pn\ng;base64,AAAA',
] as const

/**
 * A minimal but genuine 1x1 PNG data URL, byte-for-byte in the form
 * FileReader.readAsDataURL produces. The accepted case.
 */
export const VALID_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk' +
  'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
