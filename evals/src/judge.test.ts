import { parseScore } from './judge';
import type { Score } from './judge';

describe('parseScore — coherence mode', () => {
  it('parses a valid coherence score into a Score with topicCoherence set', () => {
    const raw = JSON.stringify({
      engagement: 4,
      teaching_quality: 3,
      topic_coherence: 5,
      question_naturalness: 2,
      rationale: 'Tutor kept the topic but ended every turn with a question.',
    });

    expect(parseScore(raw, 'coherence')).toEqual<Score>({
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

    expect(() => parseScore(raw, 'coherence')).not.toThrow();
  });

  it('throws when topic score is 0 — below valid range', () => {
    const raw = JSON.stringify({
      engagement: 3,
      teaching_quality: 3,
      topic_coherence: 0,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw, 'coherence')).toThrow('topicCoherence');
  });

  it('throws when model returns 0 on engagement', () => {
    const raw = JSON.stringify({
      engagement: 0,
      teaching_quality: 3,
      topic_coherence: 3,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw, 'coherence')).toThrow('engagement');
  });

  it('throws when model returns 6 on teachingQuality', () => {
    const raw = JSON.stringify({
      engagement: 3,
      teaching_quality: 6,
      topic_coherence: 3,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw, 'coherence')).toThrow('teachingQuality');
  });

  it('throws when score is a float', () => {
    const raw = JSON.stringify({
      engagement: 3.5,
      teaching_quality: 3,
      topic_coherence: 3,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw, 'coherence')).toThrow('engagement');
  });

  it('throws on malformed JSON', () => {
    expect(() => parseScore('not json', 'coherence')).toThrow();
  });
});

describe('parseScore — discovery mode', () => {
  it('parses a valid discovery score into a Score with topicDiscovery set and topicCoherence absent', () => {
    const raw = JSON.stringify({
      engagement: 2,
      teaching_quality: 3,
      topic_discovery: 1,
      question_naturalness: 4,
      rationale: 'Tutor gave up and talked about the weather.',
    });

    expect(parseScore(raw, 'discovery')).toEqual<Score>({
      engagement: 2,
      teachingQuality: 3,
      topicDiscovery: 1,
      questionNaturalness: 4,
      rationale: 'Tutor gave up and talked about the weather.',
    });
  });

  it('throws when topic score is out of range', () => {
    const raw = JSON.stringify({
      engagement: 3,
      teaching_quality: 3,
      topic_discovery: 6,
      question_naturalness: 3,
      rationale: 'Bad.',
    });

    expect(() => parseScore(raw, 'discovery')).toThrow('topicDiscovery');
  });
});
