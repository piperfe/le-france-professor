import { HttpConversationRepository } from '../infrastructure/api/http-conversation-repository'
import { HttpTranscriptionRepository } from '../infrastructure/api/http-transcription-repository'
import { HttpTtsRepository } from '../infrastructure/api/http-tts-repository'
import { CreateConversationUseCase } from '../application/use-cases/create-conversation-use-case'
import { SendMessageUseCase } from '../application/use-cases/send-message-use-case'
import { GetConversationUseCase } from '../application/use-cases/get-conversation-use-case'
import { TranscribeAudioUseCase } from '../application/use-cases/transcribe-audio-use-case'
import { SynthesizeSpeechUseCase } from '../application/use-cases/synthesize-speech-use-case'

const conversationRepository = new HttpConversationRepository(
  process.env.BACKEND_URL ?? 'http://localhost:3001/api',
)

export const createConversationUseCase = new CreateConversationUseCase(conversationRepository)
export const sendMessageUseCase = new SendMessageUseCase(conversationRepository)
export const getConversationUseCase = new GetConversationUseCase(conversationRepository)
export const transcribeAudioUseCase = new TranscribeAudioUseCase(
  new HttpTranscriptionRepository(process.env.WHISPER_URL ?? 'http://127.0.0.1:7600'),
)
export const synthesizeSpeechUseCase = new SynthesizeSpeechUseCase(
  new HttpTtsRepository(process.env.PIPER_URL ?? 'http://127.0.0.1:7602'),
)
