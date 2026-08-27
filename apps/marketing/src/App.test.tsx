import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('Itera marketing page', () => {
  it('renders the product positioning and primary CTA', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Technical knowledge takes more than a flashcard.' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Join early access/i }).length).toBeGreaterThan(0)
  })

  it('uses same-page navigation anchors', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Product' }).getAttribute('href')).toBe('#product')
    expect(screen.getByRole('link', { name: 'How it works' }).getAttribute('href')).toBe('#workflow')
  })

  it('validates malformed email addresses', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Email address'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /Join early access/i }))
    expect(screen.getByText('Enter a valid email address, such as you@example.com.')).toBeTruthy()
  })

  it('does not claim success when capture is unconfigured', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'dev@example.com' } })
    fireEvent.submit(screen.getByLabelText('Email address').closest('form')!)
    expect((await screen.findByRole('alert')).textContent).toContain('not been sent or stored')
    expect(screen.queryByText(/Thanks|You're on the list|success/i)).toBeNull()
  })
})
