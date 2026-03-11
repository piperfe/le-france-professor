import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { synthesizeSpeechUseCase } from '../../../lib/container'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const text = body?.text
  const lengthScale: number | undefined = typeof body?.lengthScale === 'number' ? body.lengthScale : undefined

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text field' }, { status: 400 })
  }

  const result = await synthesizeSpeechUseCase.execute(text, lengthScale)

  if (result.isErr()) return NextResponse.json({ error: result.error.message }, { status: 503 })

  const arrayBuffer = await result.value.audio.arrayBuffer()
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: { 'Content-Type': 'audio/wav' },
  })
}
