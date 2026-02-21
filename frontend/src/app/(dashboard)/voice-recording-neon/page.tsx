import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listOpenAIRecordingsByUserId } from '@/lib/postgres/openai-recording';
import { auth } from '@clerk/nextjs/server';
import {
  ArrowRight,
  Clock3,
  Database,
  FileAudio,
  NotebookText,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default async function VoiceRecordingNeonHistoryPage() {
  const { userId } = await auth();
  const recordings = userId ? await listOpenAIRecordingsByUserId(userId, 20) : [];

  return (
    <main className="relative flex min-h-full flex-col gap-6 bg-white p-4 sm:p-6">
      <div className="relative space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" />
          Voice Archive
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          録音履歴 (Neon)
        </h1>
        <p className="text-sm text-slate-600">
          New Talk w/ OpenAI で保存したデータです。
        </p>
      </div>

      {recordings.length === 0 ? (
        <Card className="relative border-dashed border-slate-300/80 bg-white/80 shadow-lg shadow-slate-900/5">
          <CardContent className="flex flex-col items-center gap-4 py-14 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Database className="h-5 w-5" />
            </div>
            <p>まだNeon側の録音履歴がありません。</p>
            <Link
              href="/new-talk-openai"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
            >
              New Talk w/ OpenAI で録音を始める
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <section className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recordings.map((recording) => (
            <Link
              href={`/voice-recording-neon/${recording.id}`}
              key={recording.id}
              className="group"
            >
              <Card className="h-full border-white/80 bg-white/85 shadow-md shadow-slate-900/5 backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300/80 hover:shadow-xl hover:shadow-emerald-900/10">
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                      <FileAudio className="h-3.5 w-3.5" />
                      {recording.id}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                      <Clock3 className="h-3.5 w-3.5" />
                      {recording.language}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1 text-base text-slate-900 group-hover:text-emerald-700">
                    {recording.transcript || '文字起こし結果なし'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-slate-600">
                    OpenAI (Neon) の録音データ
                  </p>
                  <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <NotebookText className="h-3.5 w-3.5" />
                    {new Date(recording.createdAt).toLocaleString('ja-JP')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
