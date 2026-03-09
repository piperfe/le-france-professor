import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { transcribeAudioUseCase } from '../../../lib/container'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const audio = form.get('audio')

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio field' }, { status: 400 })
  }

  const result = await transcribeAudioUseCase.execute(audio)

  if (result.isErr()) return NextResponse.json({ error: result.error.message }, { status: 503 })

  return NextResponse.json(result.value)
}
