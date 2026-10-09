// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getRepository } from '@fliptap/core'
import { OnboardingPage } from './OnboardingPage'
import { onboardingTour } from './tourStore'

afterEach(() => { cleanup(); onboardingTour.stop() })
it('starts the live tour on Today without seeding or changing learning data', async () => {
  const repo = getRepository()
  const before = await Promise.all([repo.decks.getAll(), repo.cards.getAll(), repo.reviews.all()])
  render(<MemoryRouter initialEntries={['/onboarding']}><Routes>
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/" element={<p>Today destination</p>} />
  </Routes></MemoryRouter>)
  expect(screen.getByText('Today destination')).toBeTruthy()
  expect(onboardingTour.getSnapshot()?.step).toBe('today')
  expect(await Promise.all([repo.decks.getAll(), repo.cards.getAll(), repo.reviews.all()])).toEqual(before)
})
