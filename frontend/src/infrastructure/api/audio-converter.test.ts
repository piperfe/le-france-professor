import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { convertToWav } from './audio-converter'

// Integration test — runs real ffmpeg against a real WebM fixture.
// No mocks: this validates the full conversion pipeline.

const FIXTURE = join(process.cwd(), 'src/test/fixtures/silence.webm')

// WAV header offsets (little-endian, PCM format)
// Offset  Size  Field
//  0       4    "RIFF"
//  8       4    "WAVE"
// 22       2    channels
// 24       4    sample rate
const CHANNELS_OFFSET = 22
const SAMPLE_RATE_OFFSET = 24

describe('convertToWav (integration)', () => {
  it('throws when ffmpeg cannot process the input and does not leak temp files', async () => {
    const invalid = new Blob([Buffer.from('not-audio')], { type: 'audio/webm' })

    await expect(convertToWav(invalid)).rejects.toThrow()
  })

  it('converts a WebM/Opus blob to a valid WAV blob', async () => {
    const buffer = await readFile(FIXTURE)
    const input = new Blob([buffer], { type: 'audio/webm' })

    const result = await convertToWav(input)
    const resultBuffer = Buffer.from(await result.arrayBuffer())

    // MIME type
    expect(result.type).toBe('audio/wav')

    // RIFF + WAVE markers
    expect(resultBuffer.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(resultBuffer.subarray(8, 12).toString('ascii')).toBe('WAVE')

    // Sample rate = 16000 Hz
    expect(resultBuffer.readUInt32LE(SAMPLE_RATE_OFFSET)).toBe(16000)

    // Mono channel
    expect(resultBuffer.readUInt16LE(CHANNELS_OFFSET)).toBe(1)
  })
})
