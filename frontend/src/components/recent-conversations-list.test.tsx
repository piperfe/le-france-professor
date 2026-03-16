import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentConversationsList } from './recent-conversations-list'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

beforeEach(() => { vi.clearAllMocks() })

const today = new Date()
const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14, 32)
const threeDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 0, 0, 0)

const CONVERSATIONS = [
  { id: 'conv-1', title: 'Gastronomie française', createdAt: yesterday.toISOString() },
  { id: 'conv-2', title: "L'IA en France", createdAt: threeDaysAgo.toISOString() },
]

describe('RecentConversationsList', () => {
  it('renders nothing when there are no conversations', () => {
    const { container } = render(<RecentConversationsList conversations={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the section label and all conversation titles', () => {
    render(<RecentConversationsList conversations={CONVERSATIONS} />)

    expect(screen.getByText('conversations récentes')).toBeInTheDocument()
    expect(screen.getByText('Gastronomie française')).toBeInTheDocument()
    expect(screen.getByText("L'IA en France")).toBeInTheDocument()
  })

  it('shows a relative date label for each conversation', () => {
    render(<RecentConversationsList conversations={CONVERSATIONS} />)

    expect(screen.getByText(/Hier à/)).toBeInTheDocument()
    expect(screen.getByText('Il y a 3 jours')).toBeInTheDocument()
  })

  it('navigates to the conversation when its item is clicked', async () => {
    const user = userEvent.setup()
    render(<RecentConversationsList conversations={CONVERSATIONS} />)

    await user.click(screen.getByRole('button', { name: /Gastronomie française/ }))

    expect(pushMock).toHaveBeenCalledWith('/conversation/conv-1')
  })
})
