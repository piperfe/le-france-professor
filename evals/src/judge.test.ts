import nock from 'nock';
import { parseScore, scoreTranscript } from './judge';
import type { Score, JudgeConfig } from './judge';
import type { Transcript } from './runner';

const BASE_URL = 'http://localhost:9999';
const COMPLETIONS_PATH = '/v1/chat/completions';

const FAKE_CONFIG: JudgeConfig = { baseURL: `${BASE_URL}/v1`, model: 'test-model' };

const COHERENCE_TRANSCRIPT: Transcript = {
  scenarioId: 'a1-test',
  level: 'A1',
  interest: 'food',
  evalMode: 'coherence',
  turns: [{ student: 'Bonjour', tutor: 'Salut !' }],
};

const DISCOVERY_TRANSCRIPT: Transcript = {
  scenarioId: 'a2-test',
  level: 'A2',
  interest: 'unknown',
  evalMode: 'discovery',
  turns: [{ student: 'oui', tutor: 'Tu aimes quoi ?' }],
};

function mockCompletion(content: string) {
  return { choices: [{ message: { content } }] };
}

function validCoherenceScore() {
  return JSON.stringify({ engagement: 4, teaching_quality: 3, topic_coherence: 5, question_naturalness: 2, rationale: 'Good.' });
}

function validDiscoveryScore() {
  return JSON.stringify({ engagement: 3, teaching_quality: 3, topic_discovery: 4, question_naturalness: 3, rationale: 'Decent.' });
}

describe('scoreTranscript', () => {
  beforeAll(() => { nock.disableNetConnect(); });
  afterAll(() => { nock.enableNetConnect(); });
  beforeEach(() => { nock.cleanAll(); });

  it('returns a parsed Score when the judge returns a valid coherence response', async () => {
    nock(BASE_URL).post(COMPLETIONS_PATH).reply(200, mockCompletion(validCoherenceScore()));
    const score = await scoreTranscript(COHERENCE_TRANSCRIPT, FAKE_CONFIG);
    expect(score.engagement).toBe(4);
    expect(score.topicCoherence).toBe(5);
    expect(score.topicDiscovery).toBeUndefined();
  });

  it('returns a parsed Score for discovery mode', async () => {
    nock(BASE_URL).post(COMPLETIONS_PATH).reply(200, mockCompletion(validDiscoveryScore()));
    const score = await scoreTranscript(DISCOVERY_TRANSCRIPT, FAKE_CONFIG);
    expect(score.topicDiscovery).toBe(4);
    expect(score.topicCoherence).toBeUndefined();
  });

  it('requests structured JSON output from the judge API', async () => {
    let body: unknown;
    nock(BASE_URL).post(COMPLETIONS_PATH, (b) => { body = b; return true; }).reply(200, mockCompletion(validCoherenceScore()));
    await scoreTranscript(COHERENCE_TRANSCRIPT, FAKE_CONFIG);
    expect(body).toMatchObject({ response_format: { type: 'json_object' } });
  });

  it('includes the API key in the request when provided', async () => {
    let authHeader: string | undefined;
    nock(BASE_URL)
      .post(COMPLETIONS_PATH)
      .reply(200, function () { authHeader = this.req.headers['authorization']; return mockCompletion(validCoherenceScore()); });
    await scoreTranscript(COHERENCE_TRANSCRIPT, { ...FAKE_CONFIG, apiKey: 'gsk_test' });
    expect(authHeader).toBe('Bearer gsk_test');
  });

  it('throws when the judge API returns a non-ok status', async () => {
    nock(BASE_URL).post(COMPLETIONS_PATH).reply(500, { error: 'Internal server error' });
    await expect(scoreTranscript(COHERENCE_TRANSCRIPT, FAKE_CONFIG)).rejects.toThrow();
  });

  it('throws when the judge returns an empty response', async () => {
    nock(BASE_URL).post(COMPLETIONS_PATH).reply(200, { choices: [] });
    await expect(scoreTranscript(COHERENCE_TRANSCRIPT, FAKE_CONFIG)).rejects.toThrow('empty response');
  });
});

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
