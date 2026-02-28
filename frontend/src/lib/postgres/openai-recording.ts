import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const OPENAI_RECORDING_TABLE = 'openai_recordings';

const getSqlClient = () => {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }
  return neon(DATABASE_URL);
};

let initPromise: Promise<void> | null = null;

const ensureOpenAIRecordingTable = async () => {
  if (initPromise) {
    return initPromise;
  }

  const sql = getSqlClient();
  initPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS openai_recordings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT,
        user_name TEXT,
        transcript TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
        language TEXT NOT NULL,
        audio_mime_type TEXT,
        audio_size INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      ALTER TABLE openai_recordings
      ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT ''
    `;
    await sql`
      ALTER TABLE openai_recordings
      ADD COLUMN IF NOT EXISTS next_actions JSONB NOT NULL DEFAULT '[]'::jsonb
    `;
  })();

  return initPromise;
};

type OpenAIRecordingInput = {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  transcript: string;
  summary?: string;
  nextActions?: string[];
  language: string;
  audioMimeType?: string | null;
  audioSize?: number | null;
};

export type OpenAIRecording = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  transcript: string;
  summary: string;
  nextActions: string[];
  language: string;
  audioMimeType: string | null;
  audioSize: number | null;
  createdAt: string;
};

export const saveOpenAIRecording = async (input: OpenAIRecordingInput) => {
  await ensureOpenAIRecordingTable();
  const sql = getSqlClient();
  const id = randomUUID();

  await sql`
    INSERT INTO openai_recordings (
      id,
      user_id,
      user_email,
      user_name,
      transcript,
      summary,
      next_actions,
      language,
      audio_mime_type,
      audio_size
    )
    VALUES (
      ${id},
      ${input.userId},
      ${input.userEmail ?? null},
      ${input.userName ?? null},
      ${input.transcript},
      ${input.summary ?? ''},
      ${JSON.stringify(input.nextActions ?? [])}::jsonb,
      ${input.language},
      ${input.audioMimeType ?? null},
      ${input.audioSize ?? null}
    )
  `;

  return { id, table: OPENAI_RECORDING_TABLE };
};

type OpenAIRecordingRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  transcript: string;
  summary: string;
  next_actions: unknown;
  language: string;
  audio_mime_type: string | null;
  audio_size: number | null;
  created_at: string;
};

const toNextActions = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const toOpenAIRecording = (row: OpenAIRecordingRow): OpenAIRecording => ({
  id: row.id,
  userId: row.user_id,
  userEmail: row.user_email,
  userName: row.user_name,
  transcript: row.transcript,
  summary: row.summary ?? '',
  nextActions: toNextActions(row.next_actions),
  language: row.language,
  audioMimeType: row.audio_mime_type,
  audioSize: row.audio_size,
  createdAt: row.created_at,
});

export const listOpenAIRecordingsByUserId = async (
  userId: string,
  limit = 20,
): Promise<OpenAIRecording[]> => {
  await ensureOpenAIRecordingTable();
  const sql = getSqlClient();

  const rows = (await sql`
    SELECT
      id,
      user_id,
      user_email,
      user_name,
      transcript,
      summary,
      next_actions,
      language,
      audio_mime_type,
      audio_size,
      created_at
    FROM openai_recordings
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as OpenAIRecordingRow[];

  return rows.map(toOpenAIRecording);
};

export const findOpenAIRecordingById = async (
  userId: string,
  recordingId: string,
): Promise<OpenAIRecording | null> => {
  await ensureOpenAIRecordingTable();
  const sql = getSqlClient();

  const rows = (await sql`
    SELECT
      id,
      user_id,
      user_email,
      user_name,
      transcript,
      summary,
      next_actions,
      language,
      audio_mime_type,
      audio_size,
      created_at
    FROM openai_recordings
    WHERE id = ${recordingId}
      AND user_id = ${userId}
    LIMIT 1
  `) as OpenAIRecordingRow[];

  const row = rows[0];
  return row ? toOpenAIRecording(row) : null;
};
