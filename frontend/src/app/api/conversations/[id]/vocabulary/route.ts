import { type NextRequest, NextResponse } from 'next/server'
import { explainVocabularyUseCase } from '../../../../../lib/container'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { word, context } = await req.json()

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 })
  }

  const result = await explainVocabularyUseCase.execute(id, word, context ?? '')

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.message }, { status: 503 })
  }

  return NextResponse.json(result.value)
}
