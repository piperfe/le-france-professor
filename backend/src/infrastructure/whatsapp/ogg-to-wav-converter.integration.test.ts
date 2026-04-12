import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { convertOggToWav } from './ogg-to-wav-converter';

// Integration test — runs real ffmpeg against a real OGG fixture.
// No mocks: this validates the full conversion pipeline.

const FIXTURE = join(process.cwd(), 'src/test/fixtures/silence.ogg');

// WAV header offsets (little-endian, PCM format)
// Offset  Size  Field
//  0       4    "RIFF"
//  8       4    "WAVE"
// 22       2    channels
// 24       4    sample rate
const CHANNELS_OFFSET = 22;
const SAMPLE_RATE_OFFSET = 24;

describe('convertOggToWav (integration)', () => {
  it('throws when ffmpeg cannot process the input', async () => {
    const invalid = Buffer.from('not-audio');

    await expect(convertOggToWav(invalid)).rejects.toThrow();
  });

  it('converts an OGG/Opus buffer to a valid WAV buffer', async () => {
    const input = await readFile(FIXTURE);

    const result = await convertOggToWav(input);

    // RIFF + WAVE markers
    expect(result.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(result.subarray(8, 12).toString('ascii')).toBe('WAVE');

    // Sample rate = 16000 Hz
    expect(result.readUInt32LE(SAMPLE_RATE_OFFSET)).toBe(16000);

    // Mono channel
    expect(result.readUInt16LE(CHANNELS_OFFSET)).toBe(1);
  });
});
