import { auth } from '@clerk/nextjs/server';
import {
  getUserRecordingLanguage,
  setUserRecordingLanguage,
} from '@/lib/cosmos/user';
import { isRecordingLanguage } from '@/lib/recording-language';

export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const language = await getUserRecordingLanguage(userId);
  return Response.json({ language });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    language?: string;
  } | null;
  const language = body?.language;

  if (!language || !isRecordingLanguage(language)) {
    return new Response('Invalid language', { status: 400 });
  }

  await setUserRecordingLanguage(userId, language);
  return Response.json({ language });
}
