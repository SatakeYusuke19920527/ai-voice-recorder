'use client';

import VoiceRecorderPanel from '@/components/dashboard/voice-recorder-panel';

export default function OpenAITalkPage() {
  return <VoiceRecorderPanel transcriptionEndpoint="/api/recording/openai" />;
}
