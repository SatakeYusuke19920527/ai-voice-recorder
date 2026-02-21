'use client';

import { Button } from '@/components/ui/button';
import { AudioLines, Loader2, Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type VoiceRecorderPanelProps = {
  transcriptionEndpoint: string;
};

export default function VoiceRecorderPanel({
  transcriptionEndpoint,
}: VoiceRecorderPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [meterLevels, setMeterLevels] = useState<number[]>(
    Array.from({ length: 20 }, () => 0.08),
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sourceNodeRef.current?.disconnect();
      analyserRef.current?.disconnect();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    setAudioUrl(null);
    setAudioLevel(0);
    setMeterLevels(Array.from({ length: 20 }, () => 0.08));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = sourceNode;

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(frequencyData);
        const step = Math.floor(frequencyData.length / 20);
        const bars = Array.from({ length: 20 }, (_, index) => {
          const start = index * step;
          const end = Math.min(start + step, frequencyData.length);
          let sum = 0;
          for (let i = start; i < end; i += 1) {
            sum += frequencyData[i];
          }
          const avg = end > start ? sum / (end - start) : 0;
          return Math.max(0.08, avg / 255);
        });
        const level = bars.reduce((acc, value) => acc + value, 0) / bars.length;
        setMeterLevels(bars);
        setAudioLevel(level);
        rafRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        sourceNodeRef.current?.disconnect();
        analyserRef.current?.disconnect();
        sourceNodeRef.current = null;
        analyserRef.current = null;
        if (audioContextRef.current) {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }
        setAudioLevel(0);
        setMeterLevels(Array.from({ length: 20 }, () => 0.08));

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        await transcribeAudio(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('録音開始に失敗しました:', err);
      setError('マイクの許可が必要です。ブラウザの権限を確認してください。');
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

  const transcribeAudio = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);
    try {
      const wavBlob = await convertToWav(blob);
      const formData = new FormData();
      const file = new File([wavBlob], 'recording.wav', {
        type: 'audio/wav',
      });
      formData.append('file', file);
      const response = await fetch(transcriptionEndpoint, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '文字起こしに失敗しました。');
      }
      const data = (await response.json()) as { text?: string };
      if (data.text) {
        toast.success('文字起こしが完了しました。');
      } else {
        toast.success('録音データを保存しました。');
      }
    } catch (err) {
      console.error('文字起こしに失敗しました:', err);
      setError('文字起こしに失敗しました。もう一度お試しください。');
      toast.error('文字起こしに失敗しました。');
    } finally {
      setIsProcessing(false);
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
    <main className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-hidden bg-white p-4 sm:p-6">
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div
          className={`relative flex items-center justify-center ${
            isRecording ? 'animate-pulse' : ''
          }`}
        >
          <div
            className="pointer-events-none absolute rounded-full bg-red-500/20 blur-2xl transition-all duration-100"
            style={{
              width: `${180 + audioLevel * 140}px`,
              height: `${180 + audioLevel * 140}px`,
              opacity: isRecording ? 0.45 + audioLevel * 0.45 : 0,
            }}
          />
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            variant="outline"
            className={`relative z-10 h-36 w-36 rounded-full border-4 text-foreground shadow-xl transition-all duration-200 ${
              isRecording
                ? 'border-red-500/70 bg-red-500/10 hover:bg-red-500/15'
                : 'border-primary/40 bg-primary/10 hover:bg-primary/15'
            }`}
            aria-pressed={isRecording}
            aria-label={isRecording ? '録音停止' : '録音開始'}
          >
            {isRecording ? (
              <Square className="h-10 w-10" />
            ) : (
              <Mic className="h-12 w-12" />
            )}
          </Button>
        </div>
        <div className="flex h-16 w-full max-w-md items-end justify-center gap-1.5">
          {meterLevels.map((level, index) => (
            <div
              key={`${transcriptionEndpoint}-${index}`}
              className={`w-1.5 rounded-full transition-all duration-75 ${
                isRecording ? 'bg-rose-500/80' : 'bg-slate-400/35'
              }`}
              style={{
                height: `${10 + level * 46}px`,
                opacity: isRecording ? Math.min(1, 0.4 + level * 0.9) : 0.35,
              }}
            />
          ))}
        </div>
        <div className="text-sm text-slate-600">
          {isRecording
            ? '録音中… クリックで停止'
            : isProcessing
              ? '文字起こし中…'
              : 'クリックで録音開始'}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs text-slate-500">
          <AudioLines className="h-3.5 w-3.5" />
          Live voice visualization
        </div>
      </div>
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full max-w-xl"></audio>
      )}
      {isProcessing && (
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 bg-sky-100/70 px-4 py-2 text-sm text-sky-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          文字起こし中...
        </div>
      )}
      {error && <div className="text-sm text-rose-600">{error}</div>}
    </main>
  );
}
