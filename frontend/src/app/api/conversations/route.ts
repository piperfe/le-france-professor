import { NextResponse } from 'next/server'
import { createConversationUseCase } from '../../../lib/container'

export async function POST() {
  const result = await createConversationUseCase.execute()

  if (result.isErr()) return NextResponse.json({ error: result.error.message }, { status: 503 })

  return NextResponse.json(result.value, { status: 201 })
}
