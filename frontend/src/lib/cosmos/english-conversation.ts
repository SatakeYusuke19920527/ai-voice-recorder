import { randomUUID } from 'crypto';
import { getContainer } from './client';

const ENGLISH_CONVERSATION_CONTAINER =
  process.env.COSMOS_ENGLISH_CONVERSATION_CONTAINER ?? 'english-conversation';

type SaveEnglishConversationTurnInput = {
  sessionId: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  language: string;
  userText: string;
  assistantText: string;
};

export const saveEnglishConversationTurn = async (
  input: SaveEnglishConversationTurnInput,
) => {
  const container = await getContainer(
    ENGLISH_CONVERSATION_CONTAINER,
    '/userId',
  );
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    sessionId: input.sessionId,
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    userName: input.userName ?? null,
    language: input.language,
    userText: input.userText,
    assistantText: input.assistantText,
    createdAt: now,
  };
  await container.items.create(item);
  return item;
};
