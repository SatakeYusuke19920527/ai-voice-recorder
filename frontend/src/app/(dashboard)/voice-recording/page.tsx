import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listRecordingsByUserId } from '@/lib/cosmos/recording';
import { auth } from '@clerk/nextjs/server';
import { Clock3, FileAudio, NotebookText } from 'lucide-react';
import Link from 'next/link';

export default async function VoiceRecordingHistoryPage() {
  const { userId } = await auth();
  const recordings = userId ? await listRecordingsByUserId(userId, 9) : [];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">録音履歴</h1>
        <p className="text-sm text-muted-foreground">
          過去に録音したデータを確認できます。
        </p>
      </div>

      {recordings.length === 0 ? (
        <Card className="border-dashed border-muted/60">
          <CardContent className="py-10 text-sm text-muted-foreground">
            まだ録音履歴がありません。
          </CardContent>
        </Card>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recordings.map((recording) => (
            <Link
              href={`/voice-recording/${recording.id}`}
              key={recording.id}
              className="group"
            >
              <Card className="h-full border-muted/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md">
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FileAudio className="h-3.5 w-3.5" />
                      {recording.id}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {recording.language}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1 text-base group-hover:text-primary">
                    {recording.transcript || '文字起こし結果なし'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {recording.conversationSummary || '要約は未作成です。'}
                  </p>
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <NotebookText className="h-3.5 w-3.5" />
                    {new Date(recording.createdAt).toLocaleString('ja-JP')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
