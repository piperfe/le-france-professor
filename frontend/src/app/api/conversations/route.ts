import { NextResponse } from 'next/server'
import { createUseCase } from '../../../lib/container'

export async function POST() {
  const result = await createUseCase.execute()

  if (result.isErr()) return NextResponse.json({ error: result.error.message }, { status: 503 })

  return NextResponse.json(result.value, { status: 201 })
}
