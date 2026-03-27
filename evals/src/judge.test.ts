import { parseScore } from './judge';
import type { Score } from './judge';

describe('parseScore', () => {
  it('maps snake_case Ollama output to camelCase Score', () => {
    const raw = JSON.stringify({
      engagement: 4,
      teaching_quality: 3,
      topic_coherence: 5,
      question_naturalness: 2,
      rationale: 'Tutor kept the topic but ended every turn with a question.',
    });

    expect(parseScore(raw)).toEqual<Score>({
      engagement: 4,
      teachingQuality: 3,
      topicCoherence: 5,
      questionNaturalness: 2,
      rationale: 'Tutor kept the topic but ended every turn with a question.',
    });
  });

  it('accepts boundary scores (1 and 5)', () => {
    const raw = JSON.stringify({
      engagement: 1,
      teaching_quality: 5,
      topic_coherence: 1,
      question_naturalness: 5,
      rationale: 'Mixed.',
    });

    expect(() => parseScore(raw)).not.toThrow();
  });

  it('throws when model returns 0 — signals judge needs tuning, not a real score', () => {
    const raw = JSON.stringify({
      engagement: 0,
      teaching_quality: 3,
      topic_coherence: 3,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw)).toThrow('engagement');
  });

  it('throws when model returns 6 — overflow from small model ignoring range constraint', () => {
    const raw = JSON.stringify({
      engagement: 3,
      teaching_quality: 6,
      topic_coherence: 3,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw)).toThrow('teachingQuality');
  });

  it('throws when score is a float — integer constraint not respected by model', () => {
    const raw = JSON.stringify({
      engagement: 3.5,
      teaching_quality: 3,
      topic_coherence: 3,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw)).toThrow('engagement');
  });

  it('throws on malformed JSON — Ollama returned non-parseable output', () => {
    expect(() => parseScore('not json')).toThrow();
  });
});
