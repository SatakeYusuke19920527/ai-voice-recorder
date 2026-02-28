import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listMemorizeDocuments } from '@/lib/cosmos/memorize';
import { BookOpen, Languages, NotebookText } from 'lucide-react';

export default async function VocabularyGrammarPage() {
  const memorizeDocs = await listMemorizeDocuments(20);
  return (
    <main className="flex min-h-full flex-col gap-6 bg-white p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          単語＆文法
        </h1>
        <p className="text-sm text-slate-600">
          英会話トレーニングで使う単語と文法表現をまとめるページです。
        </p>
      </div>

      {memorizeDocs.length === 0 ? (
        <Card className="border-dashed border-slate-300/80 bg-white/80">
          <CardContent className="py-10 text-sm text-slate-600">
            まだ memorize データがありません。Blob Storage の
            `meeting-markdown` コンテナに markdown をアップロードしてください。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {memorizeDocs.map((doc) => (
            <Card key={doc.id} className="border-slate-200/80">
              <CardHeader className="gap-2">
                <CardTitle className="inline-flex items-center gap-2 text-base">
                  <NotebookText className="h-4 w-4" />
                  Meeting: {doc.meetingId}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Source: {doc.sourceBlobName} / Updated:{' '}
                  {new Date(doc.updatedAt).toLocaleString('ja-JP')}
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="space-y-3">
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <BookOpen className="h-4 w-4" />
                    重要単語
                  </h2>
                  <div className="space-y-2">
                    {doc.importantWords.length === 0 ? (
                      <p className="text-sm text-slate-500">単語は未抽出です。</p>
                    ) : (
                      doc.importantWords.map((word, index) => (
                        <div
                          key={`${doc.id}-word-${index}`}
                          className="rounded-xl border border-slate-200 p-3"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {word.word}
                          </p>
                          <p className="text-xs text-slate-600">{word.meaning}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            e.g. {word.example}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Languages className="h-4 w-4" />
                    重要文法
                  </h2>
                  <div className="space-y-2">
                    {doc.grammarPatterns.length === 0 ? (
                      <p className="text-sm text-slate-500">文法は未抽出です。</p>
                    ) : (
                      doc.grammarPatterns.map((grammar, index) => (
                        <div
                          key={`${doc.id}-grammar-${index}`}
                          className="rounded-xl border border-slate-200 p-3"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {grammar.pattern}
                          </p>
                          <p className="text-xs text-slate-600">
                            {grammar.explanation}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            e.g. {grammar.example}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
