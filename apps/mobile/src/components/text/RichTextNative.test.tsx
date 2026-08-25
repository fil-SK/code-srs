import { render, screen } from '@testing-library/react-native'

import { RichInlineNative, RichTextNative } from './RichTextNative'

// What this covers is the native binding, not the syntax: parseRichText and
// parseRichInline are already proven once in core. These assertions are about
// the tree reaching React Native elements intact.

describe('RichTextNative', () => {
  it('renders ordinary prose', () => {
    render(<RichTextNative text="An expression has a value category." />)
    expect(screen.getByText('An expression has a value category.')).toBeTruthy()
  })

  it('renders strong and emphasis as their own runs', () => {
    render(<RichTextNative text="A **move** is really a *cast*." />)
    expect(screen.getByText('move')).toBeTruthy()
    expect(screen.getByText('cast')).toBeTruthy()
  })

  it('renders inline code', () => {
    render(<RichTextNative text="Call `std::move` first." />)
    expect(screen.getByText('std::move')).toBeTruthy()
  })

  it('renders a fenced block with its language and every line', () => {
    render(<RichTextNative text={'Before\n\n```cpp\nint a = 1;\nint b = 2;\n```'} />)

    expect(screen.getByText('Before')).toBeTruthy()
    expect(screen.getByLabelText('cpp code block')).toBeTruthy()
    expect(screen.getByText('int a = 1;')).toBeTruthy()
    expect(screen.getByText('int b = 2;')).toBeTruthy()
  })

  it('numbers the lines of a fenced block', () => {
    render(<RichTextNative text={'```text\nalpha\nbeta\ngamma\n```'} />)

    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('gives an unlabelled fence a language rather than nothing', () => {
    render(<RichTextNative text={'```\nplain\n```'} />)
    expect(screen.getByLabelText('text code block')).toBeTruthy()
  })

  it('keeps underscores literal - they are never emphasis markers', () => {
    render(<RichTextNative text="snake_case_identifier and __dunder__ stay literal" />)
    expect(
      screen.getByText('snake_case_identifier and __dunder__ stay literal'),
    ).toBeTruthy()
  })

  it('lets inline code win over emphasis', () => {
    render(<RichTextNative text="`a * b * c`" />)
    expect(screen.getByText('a * b * c')).toBeTruthy()
  })

  it('lets bold win over italic', () => {
    render(<RichTextNative text="**bold**" />)
    expect(screen.getByText('bold')).toBeTruthy()
  })
})

describe('RichInlineNative', () => {
  it('renders a label with inline code', () => {
    render(<RichInlineNative text="They can be called on a `const` object." />)
    expect(screen.getByText('const')).toBeTruthy()
  })

  it('does not treat a fence as a block in a label', () => {
    render(<RichInlineNative text="```cpp" />)
    expect(screen.queryByLabelText('cpp code block')).toBeNull()
  })
})
