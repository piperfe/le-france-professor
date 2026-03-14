import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { Sidebar } from './sidebar'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => { server.resetHandlers(); vi.clearAllMocks() })
afterAll(() => server.close())

const CONVERSATIONS = [
  { id: 'conv-1', title: 'Salut ! Comment vas-tu ?' },
  { id: 'conv-2', title: 'Bonjour, je voudrais pratiquer' },
]

describe('Sidebar', () => {
  it('renders the brand name', () => {
    render(<Sidebar activeConversationId="conv-1" conversations={CONVERSATIONS} />)

    expect(screen.getByText(/Le France/)).toBeInTheDocument()
  })

  it('renders all conversation titles', () => {
    render(<Sidebar activeConversationId="conv-1" conversations={CONVERSATIONS} />)

    expect(screen.getByText('Salut ! Comment vas-tu ?')).toBeInTheDocument()
    expect(screen.getByText('Bonjour, je voudrais pratiquer')).toBeInTheDocument()
  })

  it('navigates to a conversation when its title is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar activeConversationId="conv-1" conversations={CONVERSATIONS} />)

    await user.click(screen.getByText('Bonjour, je voudrais pratiquer'))

    expect(pushMock).toHaveBeenCalledWith('/conversation/conv-2')
  })

  it('navigates to a new conversation on button click', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/conversations', () =>
        HttpResponse.json({ conversationId: 'conv-new' }, { status: 201 }),
      ),
    )

    render(<Sidebar activeConversationId="conv-1" conversations={CONVERSATIONS} />)
    await user.click(screen.getByRole('button', { name: '+ Nouvelle conversation' }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/conversation/conv-new'))
  })

  it('disables the button while the request is in flight', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/conversations', async () => {
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({ conversationId: 'conv-new' }, { status: 201 })
      }),
    )

    render(<Sidebar activeConversationId="conv-1" conversations={CONVERSATIONS} />)
    await user.click(screen.getByRole('button', { name: '+ Nouvelle conversation' }))

    expect(screen.getByRole('button', { name: '…' })).toBeDisabled()
  })

  it('renders empty list without crashing', () => {
    render(<Sidebar activeConversationId="conv-1" conversations={[]} />)

    expect(screen.getByText(/Le France/)).toBeInTheDocument()
  })
})
