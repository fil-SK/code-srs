// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelpPage } from './HelpPage'

function renderAt(path = '/help') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/help" element={<HelpPage />} />
    <Route path="/help/contact" element={<HelpPage />} />
    <Route path="/help/articles/:articleId" element={<HelpPage />} />
  </Routes></MemoryRouter>)
}
afterEach(cleanup)

describe('Help & Support', () => {
  it('opens categorized articles and connects them to contact', async () => {
    const user = userEvent.setup()
    renderAt()
    for (const category of ['Getting started', 'Studying', 'Your workspace']) {
      expect(screen.getByRole('region', { name: category })).toBeTruthy()
    }
    await user.click(screen.getByRole('link', { name: /Keyboard shortcuts Move/ }))
    expect(screen.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Help Center/ }).getAttribute('aria-current')).toBe('page')
    await user.click(screen.getByRole('link', { name: /Still need help/ }))
    expect(screen.getByRole('heading', { name: 'Contact & Feedback' })).toBeTruthy()
  })

  it('honestly prevents unconfigured delivery and preserves an optional-email draft', async () => {
    const user = userEvent.setup()
    renderAt('/help/contact')
    await user.selectOptions(screen.getByLabelText('Subject'), 'Feature request')
    await user.type(screen.getByLabelText('Message'), 'Please add a study timer.')
    expect((screen.getByLabelText('Email address (optional)') as HTMLInputElement).value).toBe('')
    const send = screen.getByRole('button', { name: /Send message/ })
    expect(send.getAttribute('aria-disabled')).toBe('true')
    await user.click(send)
    expect(screen.getByRole('status').textContent).toContain('Your message was not sent')
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Please add a study timer.')
    await user.click(screen.getByRole('link', { name: /Browse help articles/ }))
    await user.click(screen.getByRole('link', { name: /Contact & Feedback/ }))
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Please add a study timer.')
    expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('Feature request')
  })

  it('handles unknown article URLs with a recovery link', () => {
    renderAt('/help/articles/missing')
    expect(screen.getByRole('heading', { name: 'Article not found' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Back to Help Center/ }).getAttribute('href')).toBe('/help')
  })
})
