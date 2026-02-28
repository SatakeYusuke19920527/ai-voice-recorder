import type { EnglishConversationVoice } from '@/types/types';

export const ENGLISH_VOICE_OPTIONS: EnglishConversationVoice[] = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
];

export const DEFAULT_ENGLISH_VOICE: EnglishConversationVoice = 'alloy';

export const isEnglishConversationVoice = (
  value: string,
): value is EnglishConversationVoice =>
  ENGLISH_VOICE_OPTIONS.includes(value as EnglishConversationVoice);
