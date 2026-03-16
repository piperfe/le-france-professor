import { type NextRequest, NextResponse } from 'next/server'
import { explainVocabularyUseCase, getVocabularyUseCase } from '../../../../../lib/container'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { word, context, sourceMessageId } = await req.json()

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 })
  }

  const result = await explainVocabularyUseCase.execute(id, word, context ?? '', sourceMessageId ?? '')

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.message }, { status: 503 })
  }

  return NextResponse.json(result.value)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const result = await getVocabularyUseCase.execute(id)

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.message }, { status: 503 })
  }

  return NextResponse.json({ vocabulary: result.value })
}
