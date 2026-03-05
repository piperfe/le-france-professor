import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { StartButton } from './start-button'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => { server.resetHandlers(); vi.clearAllMocks() })
afterAll(() => server.close())

describe('StartButton', () => {
  it('renders a "Commencer" button initially', () => {
    render(<StartButton />)

    const button = screen.getByRole('button', { name: 'Commencer' })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('shows "Démarrage..." while in flight then navigates on success', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/conversations', async () => {
        return HttpResponse.json({ conversationId: 'conv-1' }, { status: 201 })
      }),
    )

    render(<StartButton />)
    await user.click(screen.getByRole('button', { name: 'Commencer' }))

    // Loading state is set synchronously on click — observable before the fetch resolves
    expect(screen.getByRole('button', { name: 'Démarrage...' })).toBeDisabled()

    // setLoading(false) is never called on success — router.push fires instead
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/conversation/conv-1'))
  })

  it('shows an error and re-enables the button on API failure', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/conversations', () => new HttpResponse(null, { status: 503 })),
    )

    render(<StartButton />)
    await user.click(screen.getByRole('button', { name: 'Commencer' }))

    await waitFor(() => {
      expect(
        screen.getByText('Impossible de démarrer une conversation. Réessayez.'),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Commencer' })).not.toBeDisabled()
  })
})
