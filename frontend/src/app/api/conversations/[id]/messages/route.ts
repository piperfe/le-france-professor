import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { sendUseCase } from '../../../../../lib/container'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { message } = await req.json()
  const result = await sendUseCase.execute(id, message)

  if (result.isErr()) return NextResponse.json({ error: result.error.message }, { status: 503 })

  return NextResponse.json(result.value)
}
