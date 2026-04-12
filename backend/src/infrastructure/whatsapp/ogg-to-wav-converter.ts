import { execFile } from 'node:child_process';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

if (!ffmpegPath) throw new Error('ffmpeg-static: binary not found for this platform');

export async function convertOggToWav(audio: Buffer): Promise<Buffer> {
  const id = `whisper-${crypto.randomUUID()}`;
  const inputPath = join(tmpdir(), `${id}.ogg`);
  const outputPath = join(tmpdir(), `${id}.wav`);

  await writeFile(inputPath, audio);

  try {
    await new Promise<void>((resolve, reject) =>
      execFile(
        ffmpegPath!,
        ['-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outputPath, '-y'],
        (err) => (err ? reject(err) : resolve()),
      ),
    );
    return await readFile(outputPath);
  } finally {
    await Promise.allSettled([unlink(inputPath), unlink(outputPath)]);
  }
}
