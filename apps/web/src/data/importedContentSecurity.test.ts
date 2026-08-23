import { describe, expect, it } from 'vitest'
import {
  ALL_INTERACTION_TYPES,
  buildBackup,
  fixtureCard,
  fixtureDeck,
  getRepository,
  importBackup,
  parseBackup,
  parseRichInline,
  parseRichText,
  serializeBackup,
  type Card,
  type WalkthroughInteraction,
} from '@itera/core'
import {
  MUST_SURVIVE_LITERALLY,
  REJECTED_IMAGE_SOURCES,
  VALID_PNG_DATA_URL,
  XSS_PAYLOADS,
} from '@itera/core/src/test/attackPayloads'

// Stored XSS is a sequence, not a single call: a malicious backup is imported,
// the content is persisted, and the victim opens the card later. The renderer
// suites cover the last step; this covers the first two, end to end through
// the real import path and the real local backend.
//
// Two things are being asserted at once, and they pull in opposite directions:
//
//  - hostile content must survive the round trip *unchanged*, because the
//    alternative is destroying legitimate flashcards (a card about XSS, or
//    about HTML, is a completely reasonable card to own); and
//  - it must still be inert when it comes back out.
//
// That is only coherent because safety here is a property of how content is
// rendered, not of what characters it contains. The one exception is the
// walkthrough image, which is a URL rather than prose, and is rejected at the
// door.

function poisonedCard(type: (typeof ALL_INTERACTION_TYPES)[number], payload: string): Card {
  const card = fixtureCard(type, { id: `poisoned-${type}` })
  return {
    ...card,
    prompt: { format: 'markdown', value: payload },
    tip: { format: 'markdown', value: payload },
    explanation: { format: 'markdown', value: payload },
    tags: [payload],
  }
}

function backupJson(cards: Card[]): string {
  return serializeBackup(
    buildBackup({ cards, decks: [fixtureDeck()], drafts: [], reviewLogs: [], roadmaps: [] }),
  )
}

async function importJson(json: string): Promise<void> {
  await importBackup(getRepository(), parseBackup(json), 'merge')
}

describe('imported malicious content is persisted verbatim and stays inert', () => {
  it('accepts a structurally valid backup carrying attack strings in every card field', async () => {
    for (const payload of XSS_PAYLOADS) {
      const cards = ALL_INTERACTION_TYPES.map((t) => poisonedCard(t, payload))
      await importJson(backupJson(cards))

      for (const card of cards) {
        const stored = await getRepository().cards.getById(card.id)
        expect(stored, `${card.id} was not written`).toBeTruthy()
        // Byte for byte. Nothing was escaped, stripped or rewritten on the
        // way in - the store holds exactly what the file said.
        expect(stored?.prompt.value).toBe(payload)
        expect(stored?.tip?.value).toBe(payload)
        expect(stored?.explanation?.value).toBe(payload)
        expect(stored?.tags).toEqual([payload])
      }
    }
  })

  it('parses that persisted content back into inert nodes, never markup', async () => {
    const payload = '<img src=x onerror=alert(1)>'
    await importJson(backupJson([poisonedCard('recall', payload)]))

    const stored = await getRepository().cards.getById('poisoned-recall')
    const blocks = parseRichText(stored!.prompt.value)

    expect(blocks).toEqual([
      { kind: 'paragraph', children: [{ kind: 'text', value: payload }] },
    ])
    // No node carries a url, an attribute bag or raw html, so a renderer is
    // handed text and nothing else.
    for (const block of blocks) {
      expect(block.kind).toBe('paragraph')
      if (block.kind !== 'paragraph') continue
      for (const child of block.children) expect(child.kind).toBe('text')
    }
  })

  it('round-trips generics, templates and HTML examples without mutation', async () => {
    const cards = MUST_SURVIVE_LITERALLY.map((value, i) => ({
      ...fixtureCard('recall', { id: `literal-${i}` }),
      prompt: { format: 'markdown' as const, value },
    }))
    await importJson(backupJson(cards))

    for (const [i, value] of MUST_SURVIVE_LITERALLY.entries()) {
      const stored = await getRepository().cards.getById(`literal-${i}`)
      expect(stored?.prompt.value, value).toBe(value)
      // And the parser hands it back whole, so nothing is lost at render time
      // either.
      expect(parseRichInline(value).map((n) => n.value).join('')).toBe(value)
    }
  })

  it('keeps an attack string inside an imported code block exactly as authored', async () => {
    const source = '```html\n<script>alert(1)</script>\n```'
    await importJson(backupJson([{ ...fixtureCard('recall', { id: 'code-block' }), prompt: { format: 'markdown', value: source } }]))

    const stored = await getRepository().cards.getById('code-block')
    expect(parseRichText(stored!.prompt.value)).toEqual([
      { kind: 'code', language: 'html', value: '<script>alert(1)</script>' },
    ])
  })
})

describe('an imported walkthrough image is checked before it is written', () => {
  function walkthroughWith(image: string, id: string): Card {
    const card = fixtureCard('walkthrough', { id })
    return {
      ...card,
      interaction: { ...(card.interaction as WalkthroughInteraction), image },
    }
  }

  it('rejects every remote or hostile image source, writing nothing', async () => {
    for (const source of REJECTED_IMAGE_SOURCES) {
      const json = backupJson([walkthroughWith(source, 'rejected-image')])
      expect(() => parseBackup(json), source).toThrow(/image/i)

      const stored = await getRepository().cards.getById('rejected-image')
      expect(stored, `${source} was written despite validation`).toBeUndefined()
    }
  })

  it('names the field and the accepted formats in the rejection', () => {
    const json = backupJson([walkthroughWith('https://attacker.example/b.gif', 'x')])
    expect(() => parseBackup(json)).toThrow(/"image"/)
    expect(() => parseBackup(json)).toThrow(/image\/png/)
  })

  it('accepts an embedded raster image and stores its base64 unchanged', async () => {
    await importJson(backupJson([walkthroughWith(VALID_PNG_DATA_URL, 'good-image')]))

    const stored = await getRepository().cards.getById('good-image')
    const interaction = stored?.interaction as WalkthroughInteraction
    // No decode, no re-encode, no recompression: the bytes are the author's.
    expect(interaction.image).toBe(VALID_PNG_DATA_URL)
  })

  it('accepts a walkthrough card with no image at all', async () => {
    const card = fixtureCard('walkthrough', { id: 'no-image' })
    await importJson(backupJson([card]))
    expect(await getRepository().cards.getById('no-image')).toBeTruthy()
  })
})
