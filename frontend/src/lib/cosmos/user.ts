import {
  DEFAULT_RECORDING_LANGUAGE,
  isRecordingLanguage,
} from '../recording-language';
import {
  DEFAULT_ENGLISH_VOICE,
  isEnglishConversationVoice,
} from '../english-voice';
import { getContainer } from './client';
import type {
  EnglishConversationVoice,
  RecordingLanguage,
  UserDocument,
} from '@/types/types';

const USER_CONTAINER = process.env.COSMOS_USER_CONTAINER ?? 'user';

const findUserById = async (id: string): Promise<UserDocument | null> => {
  const container = await getContainer(USER_CONTAINER);
  const { resources } = await container.items
    .query<UserDocument>({
      query: `
        SELECT TOP 1 *
        FROM c
        WHERE c.id = @id
      `,
      parameters: [{ name: '@id', value: id }],
    })
    .fetchAll();
  return resources[0] ?? null;
};

export const createUser = async (id: string, email: string) => {
  const container = await getContainer(USER_CONTAINER);
  const now = new Date().toISOString();
  const item = {
    id,
    email,
    recordingLanguage: DEFAULT_RECORDING_LANGUAGE,
    englishConversationVoice: DEFAULT_ENGLISH_VOICE,
    createdAt: now,
    updatedAt: now,
  };
  await container.items.create(item);
  return item;
};

export const updateUser = async (id: string, email: string) => {
  const container = await getContainer(USER_CONTAINER);
  const now = new Date().toISOString();
  const current = await findUserById(id);
  const item: UserDocument = {
    ...(current ?? {}),
    id,
    email,
    recordingLanguage: current?.recordingLanguage ?? DEFAULT_RECORDING_LANGUAGE,
    englishConversationVoice:
      typeof current?.englishConversationVoice === 'string' &&
      isEnglishConversationVoice(current.englishConversationVoice)
        ? current.englishConversationVoice
        : DEFAULT_ENGLISH_VOICE,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  await container.items.upsert(item);
  return item;
};

export const deleteUser = async (id: string) => {
  const container = await getContainer(USER_CONTAINER);
  await container.item(id, id).delete();
  return { id };
};

export const getUserRecordingLanguage = async (
  id: string,
): Promise<RecordingLanguage> => {
  const user = await findUserById(id);
  if (user && typeof user.recordingLanguage === 'string') {
    if (isRecordingLanguage(user.recordingLanguage)) {
      return user.recordingLanguage;
    }
  }
  return DEFAULT_RECORDING_LANGUAGE;
};

export const setUserRecordingLanguage = async (
  id: string,
  language: RecordingLanguage,
) => {
  const container = await getContainer(USER_CONTAINER);
  const now = new Date().toISOString();
  const current = await findUserById(id);
  const item: UserDocument = {
    ...(current ?? {}),
    id,
    recordingLanguage: language,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  await container.items.upsert(item);
  return item;
};

export const getUserEnglishConversationVoice = async (
  id: string,
): Promise<EnglishConversationVoice> => {
  const user = await findUserById(id);
  if (user && typeof user.englishConversationVoice === 'string') {
    if (isEnglishConversationVoice(user.englishConversationVoice)) {
      return user.englishConversationVoice;
    }
  }
  return DEFAULT_ENGLISH_VOICE;
};

export const setUserEnglishConversationVoice = async (
  id: string,
  voice: EnglishConversationVoice,
) => {
  const container = await getContainer(USER_CONTAINER);
  const now = new Date().toISOString();
  const current = await findUserById(id);
  const item: UserDocument = {
    ...(current ?? {}),
    id,
    englishConversationVoice: voice,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  await container.items.upsert(item);
  return item;
};
