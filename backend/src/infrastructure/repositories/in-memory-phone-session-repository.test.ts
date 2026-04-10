import { InMemoryPhoneSessionRepository } from './in-memory-phone-session-repository';

describe('InMemoryPhoneSessionRepository', () => {
  let repo: InMemoryPhoneSessionRepository;

  beforeEach(() => {
    repo = new InMemoryPhoneSessionRepository();
  });

  it('returns null for unknown phone', async () => {
    expect(await repo.findConversationId('+56967022669')).toBeNull();
  });

  it('returns conversationId after save', async () => {
    await repo.save('+56967022669', 'conv-123');
    expect(await repo.findConversationId('+56967022669')).toBe('conv-123');
  });

  it('overwrites conversationId on second save for same phone', async () => {
    await repo.save('+56967022669', 'conv-old');
    await repo.save('+56967022669', 'conv-new');
    expect(await repo.findConversationId('+56967022669')).toBe('conv-new');
  });

  it('isolates different phones', async () => {
    await repo.save('+56967022669', 'conv-aaa');
    await repo.save('+15551234567', 'conv-bbb');
    expect(await repo.findConversationId('+56967022669')).toBe('conv-aaa');
    expect(await repo.findConversationId('+15551234567')).toBe('conv-bbb');
  });
});
