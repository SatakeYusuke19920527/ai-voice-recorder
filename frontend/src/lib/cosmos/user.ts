import { getContainer } from './client';
import {
  DEFAULT_RECORDING_LANGUAGE,
  isRecordingLanguage,
  type RecordingLanguage,
} from '../recording-language';

const USER_CONTAINER = process.env.COSMOS_USER_CONTAINER ?? 'user';

type UserDocument = {
  id: string;
  email?: string | null;
  recordingLanguage?: RecordingLanguage;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

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
    recordingLanguage:
      current?.recordingLanguage ?? DEFAULT_RECORDING_LANGUAGE,
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
