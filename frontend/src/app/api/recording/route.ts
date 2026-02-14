import { auth, currentUser } from '@clerk/nextjs/server';
import { saveRecording } from '@/lib/cosmos/recording';
import { getUserRecordingLanguage } from '@/lib/cosmos/user';
import {
  DEFAULT_RECORDING_LANGUAGE,
  isRecordingLanguage,
} from '@/lib/recording-language';

export const runtime = 'nodejs';

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY?.trim();
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION?.trim();
const DEFAULT_SPEECH_LANGUAGE = isRecordingLanguage(
  process.env.AZURE_SPEECH_LANGUAGE?.trim() ?? '',
)
  ? process.env.AZURE_SPEECH_LANGUAGE!.trim()
  : DEFAULT_RECORDING_LANGUAGE;

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

  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    return new Response(
      'Azure Speech の設定が不足しています。AZURE_SPEECH_KEY / AZURE_SPEECH_REGION を設定してください。',
      { status: 500 },
    );
  }

  try {
    const language = (await getUserRecordingLanguage(userId)) || DEFAULT_SPEECH_LANGUAGE;
    const endpoint = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(
      language,
    )}`;
    const speechResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type':
          'audio/wav; codecs=audio/pcm; samplerate=16000',
      },
      body: file,
    });

    if (!speechResponse.ok) {
      const message = await speechResponse.text();
      throw new Error(message || 'Azure Speech での文字起こしに失敗しました。');
    }

    const payload = (await speechResponse.json()) as {
      DisplayText?: string;
      RecognitionStatus?: string;
      NBest?: Array<{ Display?: string }>;
    };

    const text =
      payload.DisplayText ??
      payload.NBest?.[0]?.Display ??
      '';

    const user = await currentUser();
    await saveRecording({
      userId,
      userEmail: user?.emailAddresses?.[0]?.emailAddress ?? null,
      userName: user?.fullName ?? user?.username ?? null,
      transcript: text,
      audioMimeType: file.type,
      audioSize: file.size,
      language,
    });

    return Response.json({ text });
  } catch (error) {
    console.error('録音の保存に失敗しました:', error);
    return new Response('文字起こしに失敗しました。', { status: 500 });
  }
}
