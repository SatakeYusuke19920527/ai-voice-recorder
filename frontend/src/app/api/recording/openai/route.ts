import { getUserRecordingLanguage } from '@/lib/cosmos/user';
import { saveRecording } from '@/lib/cosmos/recording';
import {
  DEFAULT_RECORDING_LANGUAGE,
  isRecordingLanguage,
} from '@/lib/recording-language';
import { auth, currentUser } from '@clerk/nextjs/server';
import { APIError, AzureOpenAI } from 'openai';

export const runtime = 'nodejs';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT?.trim();
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY?.trim();
const AZURE_OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION?.trim() ?? '2024-10-21';
const AZURE_OPENAI_TRANSCRIBE_MODEL =
  process.env.AZURE_OPENAI_TRANSCRIBE_MODEL?.trim() ?? 'gpt-4o-mini-transcribe';
const AZURE_OPENAI_CHAT_MODEL =
  process.env.AZURE_OPENAI_CHAT_MODEL?.trim() ?? 'gpt-4o-mini';
const DEFAULT_OPENAI_LANGUAGE = isRecordingLanguage(
  process.env.AZURE_OPENAI_TRANSCRIBE_LANGUAGE?.trim() ??
    process.env.OPENAI_TRANSCRIBE_LANGUAGE?.trim() ??
    '',
)
  ? (process.env.AZURE_OPENAI_TRANSCRIBE_LANGUAGE?.trim() ??
      process.env.OPENAI_TRANSCRIBE_LANGUAGE!.trim())
  : DEFAULT_RECORDING_LANGUAGE;

const getAzureOpenAIClient = () => {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    return null;
  }
  return new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
  });
};

const toOpenAITranscriptionLanguage = (language: string): 'en' | 'ja' => {
  const normalized = language.toLowerCase();
  if (normalized.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
};

type SummaryAndActions = {
  summary: string;
  nextActions: string[];
};

const toSummaryAndActions = (value: unknown): SummaryAndActions => {
  if (!value || typeof value !== 'object') {
    return { summary: '', nextActions: [] };
  }

  const candidate = value as {
    summary?: unknown;
    nextActions?: unknown;
  };
  const summary =
    typeof candidate.summary === 'string' ? candidate.summary.trim() : '';
  const nextActions = Array.isArray(candidate.nextActions)
    ? candidate.nextActions
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];

  return { summary, nextActions };
};

const createSummaryAndActions = async (
  client: AzureOpenAI,
  transcript: string,
  language: string,
): Promise<SummaryAndActions> => {
  if (!transcript.trim()) {
    return { summary: '', nextActions: [] };
  }

  const outputLanguage = language.toLowerCase().startsWith('ja')
    ? '日本語'
    : 'English';
  const completion = await client.chat.completions.create({
    model: AZURE_OPENAI_CHAT_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You summarize transcript content and extract action items. Reply only as JSON with keys: "summary" (string), "nextActions" (string[]). Use ${outputLanguage}.`,
      },
      {
        role: 'user',
        content: `以下の文字起こしを要約し、実行可能なNextActionを抽出してください。\n\n${transcript}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return { summary: '', nextActions: [] };
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    return toSummaryAndActions(parsed);
  } catch (error) {
    console.error('Summary JSON parse failed:', error);
    return { summary: '', nextActions: [] };
  }
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return new Response('音声ファイルが見つかりません。', { status: 400 });
  }

  const client = getAzureOpenAIClient();
  if (!client) {
    return new Response(
      'Azure OpenAI の設定が不足しています。AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY を設定してください。',
      { status: 500 },
    );
  }

  try {
    const language =
      (await getUserRecordingLanguage(userId)) || DEFAULT_OPENAI_LANGUAGE;
    const transcription = await client.audio.transcriptions.create({
      file,
      model: AZURE_OPENAI_TRANSCRIBE_MODEL,
      language: toOpenAITranscriptionLanguage(language),
    });
    const text = transcription.text?.trim() ?? '';
    const { summary, nextActions } = await createSummaryAndActions(
      client,
      text,
      language,
    );

    const user = await currentUser();
    const saved = await saveRecording({
      userId,
      userEmail: user?.emailAddresses?.[0]?.emailAddress ?? null,
      userName: user?.fullName ?? user?.username ?? null,
      transcript: text,
      summary,
      nextActions,
      audioMimeType: file.type,
      audioSize: file.size,
      language,
    });

    return Response.json({ text, id: saved.id, storage: 'cosmos' });
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 429 && error.code === 'insufficient_quota') {
        console.error('Azure OpenAI quota exceeded:', {
          requestId: error.requestID,
          code: error.code,
          status: error.status,
        });
        return new Response(
          'Azure OpenAI API の利用上限に達しました。Quota を確認してください。',
          { status: 429 },
        );
      }

      console.error('Azure OpenAI transcription API error:', {
        requestId: error.requestID,
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return new Response(`Azure OpenAI API エラー: ${error.message}`, {
        status: error.status || 500,
      });
    }

    console.error('Azure OpenAI 文字起こしの保存に失敗しました:', error);
    return new Response('文字起こしに失敗しました。', { status: 500 });
  }
}
