import type { Message } from '../entities/message';

export interface TitleService {
  generateTitle(messages: Message[]): Promise<string>;
}
