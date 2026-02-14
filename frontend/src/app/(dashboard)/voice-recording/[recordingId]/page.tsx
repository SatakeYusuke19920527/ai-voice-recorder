import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { findRecordingById } from '@/lib/cosmos/recording';
import { auth } from '@clerk/nextjs/server';
import { FileAudio, NotebookText } from 'lucide-react';
import { notFound } from 'next/navigation';

type RecordingDetailPageProps = {
  params: Promise<{ recordingId: string }>;
};

export default async function RecordingDetailPage({
  params,
}: RecordingDetailPageProps) {
  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const { recordingId } = await params;
  const recording = await findRecordingById(userId, recordingId);

  if (!recording) {
    notFound();
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Recording Detail
        </h1>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <FileAudio className="h-4 w-4" />
          {recording.id}
        </p>
      </div>

      <Card className="border-muted/60">
        <CardHeader className="gap-3">
          <CardTitle className="text-base">録音情報</CardTitle>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <NotebookText className="h-4 w-4" />
              作成日時: {new Date(recording.createdAt).toLocaleString('ja-JP')}
            </span>
            <span>言語: {recording.language}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">要約</h2>
            <p className="text-sm text-muted-foreground">
              {recording.conversationSummary || '要約は未作成です。'}
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">文字起こし</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {recording.transcript}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
