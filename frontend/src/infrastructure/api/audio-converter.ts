import { execFile } from 'node:child_process'
import { writeFile, readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ffmpegPath from 'ffmpeg-static'

if (!ffmpegPath) throw new Error('ffmpeg-static: binary not found for this platform')

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer))
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}

export async function convertToWav(audio: Blob): Promise<Blob> {
  const buffer = await blobToBuffer(audio)
  const id = `whisper-${crypto.randomUUID()}`
  const inputPath = join(tmpdir(), `${id}.webm`)
  const outputPath = join(tmpdir(), `${id}.wav`)

  await writeFile(inputPath, buffer)

  try {
    await new Promise<void>((resolve, reject) =>
      execFile(
        ffmpegPath!,
        ['-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outputPath, '-y'],
        (err) => (err ? reject(err) : resolve()),
      ),
    )

    const wav = await readFile(outputPath)
    return new Blob([wav], { type: 'audio/wav' })
  } finally {
    await Promise.allSettled([unlink(inputPath), unlink(outputPath)])
  }
}
