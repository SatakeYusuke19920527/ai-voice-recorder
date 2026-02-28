import { saveEnglishConversationTurn } from '@/lib/cosmos/english-conversation';
import {
  getUserEnglishConversationVoice,
  getUserRecordingLanguage,
} from '@/lib/cosmos/user';
import {
  DEFAULT_RECORDING_LANGUAGE,
  isRecordingLanguage,
} from '@/lib/recording-language';
import { auth, currentUser } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { APIError, AzureOpenAI } from 'openai';
import { join } from 'path';

export const runtime = 'nodejs';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT?.trim();
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY?.trim();
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY?.trim();
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION?.trim();
const AZURE_OPENAI_API_VERSION =
  process.env.AZURE_OPENAI_API_VERSION?.trim() ??
  process.env.OPENAI_API_VERSION?.trim() ??
  '2024-10-21';
const AZURE_OPENAI_TRANSCRIBE_MODEL = (
  process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT?.trim() ??
  process.env.AZURE_OPENAI_TRANSCRIBE_MODEL?.trim() ??
  'gpt-4o-mini-transcribe'
).trim();
const AZURE_OPENAI_CHAT_MODEL = (
  process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim() ??
  process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ??
  process.env.AZURE_OPENAI_CHAT_MODEL?.trim() ??
  ''
).trim();
const AZURE_OPENAI_TTS_MODEL = (
  process.env.AZURE_OPENAI_TTS_DEPLOYMENT?.trim() ??
  process.env.AZURE_OPENAI_TTS_MODEL?.trim() ??
  'gpt-4o-mini-tts'
).trim();
const AZURE_OPENAI_TTS_VOICE =
  process.env.AZURE_OPENAI_TTS_VOICE?.trim() ?? 'alloy';
const DEFAULT_OPENAI_LANGUAGE = isRecordingLanguage(
  process.env.AZURE_OPENAI_TRANSCRIBE_LANGUAGE?.trim() ??
    process.env.OPENAI_TRANSCRIBE_LANGUAGE?.trim() ??
    '',
)
  ? (process.env.AZURE_OPENAI_TRANSCRIBE_LANGUAGE?.trim() ??
      process.env.OPENAI_TRANSCRIBE_LANGUAGE!.trim())
  : DEFAULT_RECORDING_LANGUAGE;

const normalizeAzureEndpoint = (rawEndpoint: string) =>
  rawEndpoint
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/openai\/v1$/i, '')
    .replace(/\/openai$/i, '');

const getAzureOpenAIClient = () => {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    return null;
  }
  const endpoint = normalizeAzureEndpoint(AZURE_OPENAI_ENDPOINT);
  return new AzureOpenAI({
    endpoint,
    apiKey: AZURE_OPENAI_API_KEY,
    apiVersion: AZURE_OPENAI_API_VERSION,
  });
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ConversationPromptConfig = {
  systemPrompt: string;
  userPrompt: string;
};

const DEFAULT_SYSTEM_PROMPT =
  'You are a friendly English conversation partner. Keep responses concise and natural for language learners. Ask one follow-up question in each response.';
const PROMPT_FILE_PATH = join(
  process.cwd(),
  'src',
  'prompt',
  'english-conversation.md',
);

let promptConfigCache: ConversationPromptConfig | null = null;

const parsePromptConfig = (raw: string): ConversationPromptConfig => {
  const systemMatch = raw.match(
    /#\s*SYSTEM_PROMPT\s*([\s\S]*?)(?:\n#\s*USER_PROMPT|\s*$)/i,
  );
  const userMatch = raw.match(/#\s*USER_PROMPT\s*([\s\S]*?)\s*$/i);
  return {
    systemPrompt: systemMatch?.[1]?.trim() || DEFAULT_SYSTEM_PROMPT,
    userPrompt: userMatch?.[1]?.trim() || '',
  };
};

const getPromptConfig = async (): Promise<ConversationPromptConfig> => {
  if (promptConfigCache) {
    return promptConfigCache;
  }
  try {
    const raw = await readFile(PROMPT_FILE_PATH, 'utf-8');
    promptConfigCache = parsePromptConfig(raw);
  } catch (error) {
    console.error('Failed to read english conversation prompt file:', error);
    promptConfigCache = {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPrompt: '',
    };
  }
  return promptConfigCache;
};

const parseHistory = (raw: FormDataEntryValue | null): ConversationMessage[] => {
  if (typeof raw !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const candidate = item as { role?: unknown; content?: unknown };
        if (
          (candidate.role !== 'user' && candidate.role !== 'assistant') ||
          typeof candidate.content !== 'string'
        ) {
          return null;
        }
        const content = candidate.content.trim();
        if (!content) return null;
        return { role: candidate.role, content };
      })
      .filter((item): item is ConversationMessage => item !== null)
      .slice(-10);
  } catch {
    return [];
  }
};

const toOpenAITranscriptionLanguage = (language: string): 'en' | 'ja' => {
  const normalized = language.toLowerCase();
  if (normalized.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
};

const transcribeWithAzureSpeech = async (
  file: File,
  language: string,
): Promise<string> => {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    return '';
  }
  const endpoint = `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(
    language,
  )}`;
  const speechResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
    },
    body: file,
  });

  if (!speechResponse.ok) {
    return '';
  }

  const payload = (await speechResponse.json()) as {
    DisplayText?: string;
    NBest?: Array<{ Display?: string }>;
  };
  return (payload.DisplayText ?? payload.NBest?.[0]?.Display ?? '').trim();
};

const createBusinessRewrite = async (
  client: AzureOpenAI,
  userText: string,
): Promise<string | null> => {
  try {
    const completion = await client.chat.completions.create({
      model: AZURE_OPENAI_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a business English coach. Rewrite the user sentence into natural executive business English. Return only one improved sentence.',
        },
        {
          role: 'user',
          content: userText,
        },
      ],
    });
    const rewrite = completion.choices[0]?.message?.content?.trim() ?? '';
    return rewrite || null;
  } catch (error) {
    console.error('Business rewrite generation failed:', error);
    return null;
  }
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const textInputRaw = formData.get('text');
  const textInput =
    typeof textInputRaw === 'string' ? textInputRaw.trim() : '';
  const hasAudio = file instanceof File;
  if (!hasAudio && !textInput) {
    return new Response('音声ファイルまたはテキスト入力が必要です。', {
      status: 400,
    });
  }

  const client = getAzureOpenAIClient();
  if (!client) {
    return new Response(
      'Azure OpenAI の設定が不足しています。AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY を設定してください。',
      { status: 500 },
    );
  }
  if (!AZURE_OPENAI_CHAT_MODEL) {
    return new Response(
      'Chat用 deployment が未設定です。AZURE_OPENAI_CHAT_DEPLOYMENT または AZURE_OPENAI_DEPLOYMENT を設定してください。',
      { status: 500 },
    );
  }

  try {
    const language =
      (await getUserRecordingLanguage(userId)) || DEFAULT_OPENAI_LANGUAGE;
    const selectedVoice =
      (await getUserEnglishConversationVoice(userId)) || AZURE_OPENAI_TTS_VOICE;

    let userText = textInput;
    if (!userText && hasAudio) {
      if (AZURE_OPENAI_TRANSCRIBE_MODEL) {
        try {
          const transcription = await client.audio.transcriptions.create({
            file,
            model: AZURE_OPENAI_TRANSCRIBE_MODEL,
            language: toOpenAITranscriptionLanguage(language),
          });
          userText = transcription.text?.trim() ?? '';
        } catch (error) {
          if (!(error instanceof APIError && error.status === 404)) {
            throw error;
          }
        }
      }
      if (!userText && file instanceof File) {
        userText = await transcribeWithAzureSpeech(file, language);
      }
    }

    if (!userText) {
      return new Response(
        '音声を認識できませんでした。STT deployment か AZURE_SPEECH_KEY / AZURE_SPEECH_REGION を確認してください。',
        { status: 400 },
      );
    }

    const history = parseHistory(formData.get('history'));
    const promptConfig = await getPromptConfig();
    const feedbackText = await createBusinessRewrite(client, userText);
    const messages = [
      {
        role: 'system' as const,
        content: promptConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      },
      {
        role: 'system' as const,
        content:
          'In this chat reply, do not include scoring, feedback labels, or rewrite coaching. Continue the conversation naturally in up to 3 lines and ask one question.',
      },
      ...(history.length === 0 && promptConfig.userPrompt
        ? [{ role: 'user' as const, content: promptConfig.userPrompt }]
        : []),
      ...history.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      {
        role: 'user' as const,
        content: userText,
      },
    ];

    let completion;
    try {
      completion = await client.chat.completions.create({
        model: AZURE_OPENAI_CHAT_MODEL,
        messages,
      });
    } catch (error) {
      if (error instanceof APIError && error.status === 404) {
        return new Response(
          'Chat deployment が見つかりません。AZURE_OPENAI_CHAT_DEPLOYMENT (または AZURE_OPENAI_DEPLOYMENT) を Azure Portal の deployment 名に合わせてください。',
          { status: 500 },
        );
      }
      throw error;
    }
    const assistantText =
      completion.choices[0]?.message?.content?.trim() ||
      'Could you say that one more time?';

    let audioBase64: string | null = null;
    let audioMimeType: string | null = null;
    if (AZURE_OPENAI_TTS_MODEL) {
      try {
        const ttsResponse = await client.audio.speech.create({
          model: AZURE_OPENAI_TTS_MODEL,
          voice: selectedVoice,
          input: assistantText,
          response_format: 'mp3',
        });
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        audioBase64 = audioBuffer.toString('base64');
        audioMimeType = 'audio/mpeg';
      } catch (error) {
        if (!(error instanceof APIError && error.status === 404)) {
          throw error;
        }
      }
    }

    const sessionIdRaw = formData.get('sessionId');
    const sessionId =
      typeof sessionIdRaw === 'string' && sessionIdRaw.trim()
        ? sessionIdRaw.trim()
        : randomUUID();

    const user = await currentUser();
    await saveEnglishConversationTurn({
      sessionId,
      userId,
      userEmail: user?.emailAddresses?.[0]?.emailAddress ?? null,
      userName: user?.fullName ?? user?.username ?? null,
      language,
      userText,
      assistantText,
    });

    return Response.json({
      sessionId,
      userText,
      assistantText,
      feedbackText,
      audioBase64,
      audioMimeType,
    });
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Azure OpenAI English conversation API error:', {
        requestId: error.requestID,
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return new Response(`Azure OpenAI API エラー: ${error.message}`, {
        status: error.status || 500,
      });
    }

    console.error('英会話トレーニング処理に失敗しました:', error);
    return new Response('英会話トレーニング処理に失敗しました。', {
      status: 500,
    });
  }
}
