'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import type { RecordingLanguage } from '@/types/types';
import { Check, Globe, Sparkles, Waves } from 'lucide-react';

const LANGUAGE_OPTIONS: Array<{ value: RecordingLanguage; label: string }> = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'ja-JP', label: '日本語 (ja-JP)' },
];

export default function SettingsPage() {
  const [language, setLanguage] = useState<RecordingLanguage>('en-US');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/settings/recording-language');
        if (!response.ok) {
          throw new Error('failed to fetch setting');
        }
        const data = (await response.json()) as { language?: RecordingLanguage };
        if (data.language === 'en-US' || data.language === 'ja-JP') {
          setLanguage(data.language);
        }
      } catch {
        toast.error('設定の読み込みに失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/settings/recording-language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (!response.ok) {
        throw new Error('failed to save setting');
      }
      toast.success('録音言語を保存しました。');
    } catch {
      toast.error('設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white p-4 sm:p-8">
      <div className="relative mx-auto max-w-3xl space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-100/70 px-3 py-1 text-xs font-semibold text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
            Personal Preferences
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Settings
          </h1>
          <p className="text-slate-600">
            録音時の文字起こし言語を設定できます。
          </p>
        </div>

        <Card className="border-white/80 bg-white/85 shadow-xl shadow-slate-900/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-slate-900">
              <Globe className="h-5 w-5 text-sky-700" />
              Voice Recording Language
            </CardTitle>
            <CardDescription>
              録音時に使用する音声認識の言語を選択してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isLoading || isSaving}
                    onClick={() => setLanguage(option.value)}
                    className={`group rounded-2xl border px-4 py-4 text-left transition-all ${
                      selected
                        ? 'border-sky-300 bg-sky-50/80 shadow-md shadow-sky-900/10'
                        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {option.label}
                      </span>
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                          selected
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-transparent group-hover:text-slate-400'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {option.value === 'en-US'
                        ? 'English conversation recognition'
                        : 'Japanese conversation recognition'}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
              <Waves className="h-3.5 w-3.5" />
              Current: {language}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading || isSaving} size="lg">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
