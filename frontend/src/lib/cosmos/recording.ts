import { randomUUID } from 'crypto';
import { getContainer } from './client';

const RECORDING_CONTAINER = process.env.COSMOS_CONTAINER ?? 'recording';

type RecordingInput = {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  transcript: string;
  audioMimeType?: string | null;
  audioSize?: number | null;
  language?: string | null;
};

export type RecordingDocument = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  transcript: string;
  language: string;
  conversationSummary: string;
  bodyTemperature: string;
  bloodPressure: string;
  pulse: string;
  oxygenSaturation: string;
  patientCondition: string;
  audio: {
    mimeType: string | null;
    size: number | null;
  };
  createdAt: string;
};

type RawRecordingDocument = Omit<RecordingDocument, 'conversationSummary'> & {
  conversationSummary?: string;
  summary?: string;
};

const normalizeRecording = (doc: RawRecordingDocument): RecordingDocument => ({
  ...doc,
  conversationSummary: doc.conversationSummary ?? doc.summary ?? '',
});

export const saveRecording = async (input: RecordingInput) => {
  const container = await getContainer(RECORDING_CONTAINER);
  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    userName: input.userName ?? null,
    transcript: input.transcript,
    language: input.language ?? 'en-US',
    summary: '',
    audio: {
      mimeType: input.audioMimeType ?? null,
      size: input.audioSize ?? null,
    },
    createdAt: now,
  };
  await container.items.create(item);
  return item;
};

export const listRecordingsByUserId = async (
  userId: string,
  limit = 9,
): Promise<RecordingDocument[]> => {
  const container = await getContainer(RECORDING_CONTAINER);
  const { resources } = await container.items
    .query<RawRecordingDocument>({
      query: `
          SELECT TOP @limit *
          FROM c
          WHERE c.userId = @userId
          ORDER BY c.createdAt DESC
        `,
      parameters: [
        { name: '@limit', value: limit },
        { name: '@userId', value: userId },
      ],
    })
    .fetchAll();

  return resources.map(normalizeRecording);
};

export const findRecordingById = async (
  userId: string,
  recordingId: string,
): Promise<RecordingDocument | null> => {
  const container = await getContainer(RECORDING_CONTAINER);
  const { resources } = await container.items
    .query<RawRecordingDocument>({
      query: `
          SELECT TOP 1 *
          FROM c
          WHERE c.id = @recordingId
            AND c.userId = @userId
        `,
      parameters: [
        { name: '@recordingId', value: recordingId },
        { name: '@userId', value: userId },
      ],
    })
    .fetchAll();

  const document = resources[0];
  return document ? normalizeRecording(document) : null;
};
