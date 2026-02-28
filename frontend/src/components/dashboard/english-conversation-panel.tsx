'use client';

import { Button } from '@/components/ui/button';
import { Bot, Loader2, Mic, Square, User, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  isPending?: boolean;
};

type FeedbackMessage = {
  id: string;
  original: string;
  rewritten: string;
};

const toHistoryPayload = (messages: ChatMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.text,
  }));

export default function EnglishConversationPanel() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dotCount, setDotCount] = useState(1);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlsRef = useRef<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const audioUrls = audioUrlsRef.current;
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        await sendMessage({ audioBlob: blob });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('録音開始に失敗しました:', err);
      setError('マイクの利用を許可してください。');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  };

  const sendMessage = async ({
    audioBlob,
  }: {
    audioBlob?: Blob;
  }) => {
    setIsLoading(true);
    setError(null);
    const timestamp = Date.now();
    const pendingUserId = `${timestamp}-user-pending`;
    const pendingAssistantId = `${timestamp}-assistant-pending`;
    setMessages((prev) => [
      ...prev,
      {
        id: pendingUserId,
        role: 'user',
        text: 'Transcribing your voice',
        isPending: true,
      },
      {
        id: pendingAssistantId,
        role: 'assistant',
        text: 'Thinking',
        isPending: true,
      },
    ]);

    try {
      const formData = new FormData();
      if (audioBlob) {
        const wavBlob = await convertToWav(audioBlob);
        const file = new File([wavBlob], 'english-conversation.wav', {
          type: 'audio/wav',
        });
        formData.append('file', file);
      }
      formData.append('history', JSON.stringify(toHistoryPayload(messages)));
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const response = await fetch('/api/english-conversation/chat', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '英会話トレーニングの実行に失敗しました。');
      }

      const data = (await response.json()) as {
        sessionId: string;
        userText: string;
        assistantText: string;
        feedbackText?: string | null;
        audioBase64: string | null;
        audioMimeType?: string | null;
      };
      setSessionId(data.sessionId);

      let assistantAudioUrl: string | undefined;
      if (data.audioBase64) {
        const binary = Uint8Array.from(atob(data.audioBase64), (c) =>
          c.charCodeAt(0),
        );
        const assistantBlob = new Blob([binary], {
          type: data.audioMimeType || 'audio/mpeg',
        });
        assistantAudioUrl = URL.createObjectURL(assistantBlob);
        audioUrlsRef.current.push(assistantAudioUrl);
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (message.id === pendingUserId) {
            return {
              id: `${timestamp}-user`,
              role: 'user',
              text: data.userText,
            };
          }
          if (message.id === pendingAssistantId) {
            return {
              id: `${timestamp + 1}-assistant`,
              role: 'assistant',
              text: data.assistantText,
              audioUrl: assistantAudioUrl,
            };
          }
          return message;
        }),
      );
      const rewritten = data.feedbackText?.trim();
      if (rewritten) {
        setFeedbackMessages((prev) => [
          {
            id: `${timestamp}-feedback`,
            original: data.userText,
            rewritten,
          },
          ...prev,
        ]);
      }

      if (assistantAudioUrl) {
        const player = new Audio(assistantAudioUrl);
        await player.play();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.assistantText);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('英会話トレーニングに失敗しました:', err);
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== pendingUserId && message.id !== pendingAssistantId,
        ),
      );
      setError(
        err instanceof Error
          ? err.message
          : '音声の処理に失敗しました。設定またはモデルデプロイを確認してください。',
      );
      toast.error('英会話トレーニングに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToWav = async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const targetSampleRate = 16000;
    const offlineContext = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * targetSampleRate),
      targetSampleRate,
    );
    const source = offlineContext.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineContext.destination);
    source.start(0);
    const renderedBuffer = await offlineContext.startRendering();
    const wavBuffer = encodeWav(renderedBuffer);
    await audioContext.close();
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const encodeWav = (buffer: AudioBuffer) => {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const samples = buffer.getChannelData(0);
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const bufferLength = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    let offset = 0;

    const writeString = (value: string) => {
      for (let i = 0; i < value.length; i += 1) {
        view.setUint8(offset, value.charCodeAt(i));
        offset += 1;
      }
    };

    writeString('RIFF');
    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numChannels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, byteRate, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, bytesPerSample * 8, true);
    offset += 2;
    writeString('data');
    view.setUint32(offset, dataSize, true);
    offset += 4;

    for (let i = 0; i < samples.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }

    return arrayBuffer;
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col bg-[#f7f7f8]">
      <div className="mx-auto grid h-full w-full max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f7f8]">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-[#f7f7f8]/95 px-4 py-3 backdrop-blur">
            <h1 className="text-base font-semibold text-slate-800">
              English Conversation
            </h1>
            <p className="text-xs text-slate-500">
              音声入力で会話し、右側にビジネス表現の添削を表示します。
            </p>
          </header>

          <section className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="mt-1 rounded-full border border-emerald-200 bg-emerald-100 p-1.5 text-emerald-700">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-[#dbeafe] text-slate-900'
                      : 'bg-white text-slate-800 shadow-sm'
                  }`}
                >
                  {message.isPending ? (
                    <p>
                      {message.text}
                      {'.'.repeat(dotCount)}
                    </p>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  {message.role === 'assistant' && message.audioUrl && (
                    <audio controls src={message.audioUrl} className="mt-2 w-full" />
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="mt-1 rounded-full border border-sky-200 bg-sky-100 p-1.5 text-sky-700">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </section>

          <footer className="border-t border-slate-200 bg-[#f7f7f8] px-4 py-4">
            <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5" />
                  AI voice is configured in Settings
                </div>
              </div>
                <Button
                  type="button"
                  variant={isRecording ? 'destructive' : 'outline'}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className="h-9"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : isRecording ? (
                    <>
                      <Square className="h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Voice
                    </>
                  )}
                </Button>
              </div>
            </div>
            {error && <p className="mx-auto mt-2 max-w-3xl text-sm text-rose-600">{error}</p>}
          </footer>
        </div>

        <aside className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Business Rewrite</h2>
            <p className="text-xs text-slate-500">
              あなたの発話を、ビジネスで自然な表現に添削します
            </p>
          </div>
          <div className="h-full max-h-[calc(100vh-180px)] space-y-3 overflow-y-auto p-3">
            {feedbackMessages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                会話するとここに添削が表示されます。
              </p>
            ) : (
              feedbackMessages.map((item) => (
                <div key={item.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">You said</p>
                  <p className="text-xs text-slate-700">{item.original}</p>
                  <p className="text-[11px] font-semibold text-sky-600">Business version</p>
                  <p className="text-sm text-slate-900">{item.rewritten}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
