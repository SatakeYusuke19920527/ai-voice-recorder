'use client';

import VoiceRecorderPanel from '@/components/dashboard/voice-recorder-panel';

export default function VoiceRecordingPage() {
  return <VoiceRecorderPanel transcriptionEndpoint="/api/recording" />;
}
