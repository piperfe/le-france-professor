import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { sendMessageUseCase } from '../../../../../lib/container'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { message } = await req.json()
  const result = await sendMessageUseCase.execute(id, message)

  if (result.isErr()) return NextResponse.json({ error: result.error.message }, { status: 503 })

  return NextResponse.json(result.value)
}
