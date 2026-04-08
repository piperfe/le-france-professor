import fetch from 'node-fetch';
import type { EvalMode, Transcript } from './runner';

export interface Score {
  engagement: number;           // 1-5: does the tutor keep the student wanting to continue?
  teachingQuality: number;      // 1-5: natural vocab intro, recasts, teaching in context
  topicCoherence?: number;      // 1-5: present when evalMode === 'coherence'
  topicDiscovery?: number;      // 1-5: present when evalMode === 'discovery'
  questionNaturalness: number;  // 1-5: varied and conversational — not a forced question every turn
  rationale: string;            // max 2 sentences explaining the scores
}

const COMMON_DIMENSIONS = `- engagement: Does the tutor keep the student interested and wanting to continue? (1=kills conversation, 5=highly engaging)
- teaching_quality: Does the tutor naturally introduce vocabulary, correct errors via recast, and teach in context without interrupting flow? (1=no teaching, 5=excellent in-context teaching)`;

const COMMON_CLOSING = `- question_naturalness: Are the tutor's questions natural and varied, not a forced question at the end of every single response? (1=interrogation pattern every turn, 5=natural conversational rhythm)`;

function buildCoherencePrompt(interest: string): string {
  return `You are evaluating the quality of a French language tutor's responses in a conversation with a student learning French.

Score only the TUTOR's responses (not the student's) on four dimensions, each from 1 to 5:

${COMMON_DIMENSIONS}
- topic_coherence: The student's declared interest is: ${interest}. Does the tutor stay anchored to this topic throughout? Penalize if the tutor drifts to an unrelated topic (e.g. weather, generic small talk) and does not return. (1=scattered and generic or drifted away from declared interest, 5=focused and anchored to the declared interest)
${COMMON_CLOSING}

Return JSON with integer fields: engagement, teaching_quality, topic_coherence, question_naturalness (all 1-5), and rationale (string, max 2 sentences).`;
}

const DISCOVERY_PROMPT = `You are evaluating the quality of a French language tutor's responses in a conversation with a student learning French.

Score only the TUTOR's responses (not the student's) on four dimensions, each from 1 to 5:

${COMMON_DIMENSIONS}
- topic_discovery: The student gave only minimal responses throughout (e.g. oui/non/je sais pas/bof). Did the tutor actively probe for a specific interest and commit to it by the end, or give up and default to generic small talk (e.g. weather, vague questions)? (1=tutor defaulted to small talk without discovering a topic, 5=tutor persistently probed and landed on a concrete topic by turn 4)
${COMMON_CLOSING}

Return JSON with integer fields: engagement, teaching_quality, topic_discovery, question_naturalness (all 1-5), and rationale (string, max 2 sentences).`;

const COHERENCE_FORMAT = {
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

const DISCOVERY_FORMAT = {
  type: 'object',
  properties: {
    engagement: { type: 'integer' },
    teaching_quality: { type: 'integer' },
    topic_discovery: { type: 'integer' },
    question_naturalness: { type: 'integer' },
    rationale: { type: 'string' },
  },
  required: ['engagement', 'teaching_quality', 'topic_discovery', 'question_naturalness', 'rationale'],
};

interface OllamaRawScore {
  engagement: number;
  teaching_quality: number;
  topic_coherence?: number;
  topic_discovery?: number;
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

export function parseScore(raw: string, evalMode: EvalMode): Score {
  const parsed = JSON.parse(raw) as OllamaRawScore;

  const topicValue = evalMode === 'coherence' ? parsed.topic_coherence : parsed.topic_discovery;
  const topicKey = evalMode === 'coherence' ? 'topicCoherence' : 'topicDiscovery';

  const score: Score = {
    engagement: parsed.engagement,
    teachingQuality: parsed.teaching_quality,
    [topicKey]: topicValue,
    questionNaturalness: parsed.question_naturalness,
    rationale: parsed.rationale,
  };

  const numericFields: Array<[string, number | undefined]> = [
    ['engagement', score.engagement],
    ['teachingQuality', score.teachingQuality],
    [topicKey, topicValue],
    ['questionNaturalness', score.questionNaturalness],
  ];

  for (const [key, value] of numericFields) {
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
  const { evalMode, interest } = transcript;
  const systemPrompt = evalMode === 'coherence' ? buildCoherencePrompt(interest) : DISCOVERY_PROMPT;
  const format = evalMode === 'coherence' ? COHERENCE_FORMAT : DISCOVERY_FORMAT;

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Evaluate this French tutoring conversation:\n\nLevel: ${transcript.level} | Interest: ${transcript.interest}\n\n${formatTranscript(transcript)}`,
        },
      ],
      stream: false,
      format,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama judge call failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  return parseScore(data.message.content, evalMode);
}
