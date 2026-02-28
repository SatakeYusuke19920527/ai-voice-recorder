import { auth } from '@clerk/nextjs/server';
import {
  getUserEnglishConversationVoice,
  setUserEnglishConversationVoice,
} from '@/lib/cosmos/user';
import { isEnglishConversationVoice } from '@/lib/english-voice';

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const voice = await getUserEnglishConversationVoice(userId);
  return Response.json({ voice });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    voice?: string;
  } | null;
  const voice = body?.voice;

  if (!voice || !isEnglishConversationVoice(voice)) {
    return new Response('Invalid voice', { status: 400 });
  }

  await setUserEnglishConversationVoice(userId, voice);
  return Response.json({ voice });
}
