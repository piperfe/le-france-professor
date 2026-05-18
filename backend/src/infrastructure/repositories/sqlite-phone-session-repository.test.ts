import { createDatabase } from '../db/client'
import { SqlitePhoneSessionRepository } from './sqlite-phone-session-repository'

describe('SqlitePhoneSessionRepository', () => {
  let repo: SqlitePhoneSessionRepository

  beforeEach(() => {
    repo = new SqlitePhoneSessionRepository(createDatabase(':memory:'))
  })

  describe('save', () => {
    it('phone-to-conversation mapping is permanent — first save wins', async () => {
      await repo.save('+10000000001', 'conv-old')
      await repo.save('+10000000001', 'conv-new')
      expect(await repo.findByPhone('+10000000001')).toBe('conv-old')
    })
  })

  describe('findByPhone', () => {
    it('returns null for unknown phone', async () => {
      expect(await repo.findByPhone('+10000000001')).toBeNull()
    })

    it('maps phone to its conversation after save', async () => {
      await repo.save('+10000000001', 'conv-123')
      expect(await repo.findByPhone('+10000000001')).toBe('conv-123')
    })

    it('isolates different phones', async () => {
      await repo.save('+10000000001', 'conv-aaa')
      await repo.save('+10000000002', 'conv-bbb')
      expect(await repo.findByPhone('+10000000001')).toBe('conv-aaa')
      expect(await repo.findByPhone('+10000000002')).toBe('conv-bbb')
    })
  })
})
