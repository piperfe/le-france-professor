import fetch from 'node-fetch';
import type { Transcript } from './runner';

export interface Score {
  engagement: number;           // 1-5: does the tutor keep the student wanting to continue?
  teachingQuality: number;      // 1-5: natural vocab intro, recasts, teaching in context
  topicCoherence: number;       // 1-5: does the tutor maintain a coherent topic thread?
  questionNaturalness: number;  // 1-5: varied and conversational — not a forced question every turn
  rationale: string;            // max 2 sentences explaining the scores
}

const JUDGE_SYSTEM_PROMPT = `You are evaluating the quality of a French language tutor's responses in a conversation with a student learning French.

Score only the TUTOR's responses (not the student's) on four dimensions, each from 1 to 5:

- engagement: Does the tutor keep the student interested and wanting to continue? (1=kills conversation, 5=highly engaging)
- teaching_quality: Does the tutor naturally introduce vocabulary, correct errors via recast, and teach in context without interrupting flow? (1=no teaching, 5=excellent in-context teaching)
- topic_coherence: Does the tutor maintain a coherent topic thread throughout? (1=scattered and generic, 5=focused and anchored to the topic)
- question_naturalness: Are the tutor's questions natural and varied, not a forced question at the end of every single response? (1=interrogation pattern every turn, 5=natural conversational rhythm)

Return JSON with integer fields: engagement, teaching_quality, topic_coherence, question_naturalness (all 1-5), and rationale (string, max 2 sentences).`;

const SCORE_FORMAT = {
  type: 'object',
  properties: {
    engagement: { type: 'integer' },
    teaching_quality: { type: 'integer' },
    topic_coherence: { type: 'integer' },
    question_naturalness: { type: 'integer' },
    rationale: { type: 'string' },
  },
  required: ['engagement', 'teaching_quality', 'topic_coherence', 'question_naturalness', 'rationale'],
};

interface OllamaRawScore {
  engagement: number;
  teaching_quality: number;
  topic_coherence: number;
  question_naturalness: number;
  rationale: string;
}

interface OllamaChatResponse {
  message: { content: string };
}

function formatTranscript(transcript: Transcript): string {
  return transcript.turns
    .map((t, i) => `Turn ${i + 1}:\nStudent: ${t.student}\nTutor: ${t.tutor}`)
    .join('\n\n');
}

export function parseScore(raw: string): Score {
  const parsed = JSON.parse(raw) as OllamaRawScore;

  const score: Score = {
    engagement: parsed.engagement,
    teachingQuality: parsed.teaching_quality,
    topicCoherence: parsed.topic_coherence,
    questionNaturalness: parsed.question_naturalness,
    rationale: parsed.rationale,
  };

  for (const [key, value] of Object.entries(score)) {
    if (key === 'rationale') continue;
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) {
      throw new Error(`Invalid score for ${key}: ${value} — must be integer 1-5`);
    }
  }

  return score;
}

export async function scoreTranscript(
  transcript: Transcript,
  ollamaUrl: string,
  model: string,
): Promise<Score> {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Evaluate this French tutoring conversation:\n\nLevel: ${transcript.level} | Interest: ${transcript.interest}\n\n${formatTranscript(transcript)}`,
        },
      ],
      stream: false,
      format: SCORE_FORMAT,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama judge call failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  return parseScore(data.message.content);
}
