import { getUserRecordingLanguage } from '@/lib/cosmos/user';
import { saveOpenAIRecording } from '@/lib/postgres/openai-recording';
import {
  DEFAULT_RECORDING_LANGUAGE,
  isRecordingLanguage,
} from '@/lib/recording-language';
import { auth, currentUser } from '@clerk/nextjs/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL?.trim() ?? 'gpt-4o-mini-transcribe';
const DEFAULT_OPENAI_LANGUAGE = isRecordingLanguage(
  process.env.OPENAI_TRANSCRIBE_LANGUAGE?.trim() ?? '',
)
  ? process.env.OPENAI_TRANSCRIBE_LANGUAGE!.trim()
  : DEFAULT_RECORDING_LANGUAGE;

const getOpenAIClient = () => {
  if (!OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
};

const toOpenAITranscriptionLanguage = (language: string): 'en' | 'ja' => {
  const normalized = language.toLowerCase();
  if (normalized.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
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

  const client = getOpenAIClient();
  if (!client) {
    return new Response(
      'OpenAI の設定が不足しています。OPENAI_API_KEY を設定してください。',
      { status: 500 },
    );
  }

  try {
    const language =
      (await getUserRecordingLanguage(userId)) || DEFAULT_OPENAI_LANGUAGE;
    const transcription = await client.audio.transcriptions.create({
      file,
      model: OPENAI_TRANSCRIBE_MODEL,
      language: toOpenAITranscriptionLanguage(language),
    });
    const text = transcription.text?.trim() ?? '';

    const user = await currentUser();
    const saved = await saveOpenAIRecording({
      userId,
      userEmail: user?.emailAddresses?.[0]?.emailAddress ?? null,
      userName: user?.fullName ?? user?.username ?? null,
      transcript: text,
      audioMimeType: file.type,
      audioSize: file.size,
      language,
    });

    return Response.json({ text, id: saved.id, storage: 'neon' });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429 && error.code === 'insufficient_quota') {
        console.error('OpenAI quota exceeded:', {
          requestId: error.requestID,
          code: error.code,
          status: error.status,
        });
        return new Response(
          'OpenAI API の利用上限に達しました。Billing/Quota を確認するか、別の API キーを設定してください。',
          { status: 429 },
        );
      }

      console.error('OpenAI transcription API error:', {
        requestId: error.requestID,
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return new Response(`OpenAI API エラー: ${error.message}`, {
        status: error.status || 500,
      });
    }

    console.error('OpenAI 文字起こしの保存に失敗しました:', error);
    return new Response('文字起こしに失敗しました。', { status: 500 });
  }
}
