import type { RecordingLanguage } from '@/types/types';

export const RECORDING_LANGUAGES = ['en-US', 'ja-JP'] as const;

export const isRecordingLanguage = (
  value: string,
): value is RecordingLanguage => {
  return RECORDING_LANGUAGES.includes(value as RecordingLanguage);
};

export const DEFAULT_RECORDING_LANGUAGE: RecordingLanguage = 'en-US';
