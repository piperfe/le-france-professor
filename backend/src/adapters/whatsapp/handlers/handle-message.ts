import type { Request, Response } from 'express';
import { ResultAsync } from 'neverthrow';
import type { StartOrResumeConversationUseCase } from '../../../application/use-cases/start-or-resume-conversation-use-case';
import { ConversationStatus } from '../../../application/use-cases/start-or-resume-conversation-use-case';
import type { SendMessageUseCase } from '../../../application/use-cases/send-message-use-case';
import type { WhatsAppVoiceTranscriber } from '../voice-transcriber';
import type { WhatsAppSender } from '../ports/whatsapp-sender';
import type { WhatsAppCommand } from './whatsapp-command';
import { ServiceUnavailableError } from '../../../domain/errors';

// TODO: error handling & retry strategy
// Use cases are fired with void — if they fail the message is silently lost (Meta
// already got 200 and will not retry). See Notion card:
// [WhatsApp] Error handling & retry strategy for fire-and-forget use cases

export function createHandleMessageHandler(
  startOrResumeConversationUseCase: StartOrResumeConversationUseCase,
  sendMessageUseCase: SendMessageUseCase,
  whatsAppSender: WhatsAppSender,
  commands: WhatsAppCommand[],
  voiceTranscriber: WhatsAppVoiceTranscriber,
) {
  return (req: Request, res: Response): void => {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    res.status(200).json({ status: 'ok' });

    if (!msg) return;

    if (msg.type === 'text' && msg.text?.body) {
      void handleText(msg.from, msg.text.body);
      return;
    }

    if (msg.type === 'audio' && msg.audio?.id) {
      void voiceTranscriber.transcribe(msg.audio.id)
        .andThen((transcribedText) => handleText(msg.from, transcribedText));
    }
  };

  function handleText(phone: string, text: string): ResultAsync<void, ServiceUnavailableError> {
    return startOrResumeConversationUseCase.execute(phone).andThen((session) => {
      if (session.status === ConversationStatus.STARTED) {
        return reply(phone, session.initialMessage);
      }
      if (text.startsWith('/')) {
        return dispatchCommand(phone, session.conversationId, text);
      }
      return continueConversation(phone, session.conversationId, text);
    });
  }

  function dispatchCommand(phone: string, conversationId: string, text: string): ResultAsync<void, ServiceUnavailableError> {
    const command = commands.find((c) => c.trigger.test(text));
    if (!command) {
      return reply(phone, formatUnknownCommand(commands.map((c) => c.usage)));
    }
    return command.execute(phone, conversationId, text);
  }

  function continueConversation(phone: string, conversationId: string, text: string): ResultAsync<void, ServiceUnavailableError> {
    return sendMessageUseCase
      .execute(conversationId, text)
      .mapErr((error) => new ServiceUnavailableError(error.message))
      .andThen(({ tutorResponse }) => reply(phone, tutorResponse));
  }

  function reply(phone: string, body: string): ResultAsync<void, ServiceUnavailableError> {
    return ResultAsync.fromPromise(
      whatsAppSender.sendMessage(phone, body),
      (error) => new ServiceUnavailableError(error instanceof Error ? error.message : 'Failed to send WhatsApp reply'),
    );
  }
}

function formatUnknownCommand(availableUsages: string[]): string {
  const list = availableUsages.map((u) => `• ${u}`).join('\n');
  return `❓ *Commande inconnue.*\nCommandes disponibles :\n${list}`;
}
