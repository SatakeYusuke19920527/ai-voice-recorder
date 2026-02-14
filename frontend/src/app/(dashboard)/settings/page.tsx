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
import type { RecordingLanguage } from '@/lib/recording-language';

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Dashboard Settings</h1>
          <p className="text-muted-foreground">
            録音時の文字起こし言語を設定できます。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Voice Recording Language</CardTitle>
            <CardDescription>
              録音時に使用する音声認識の言語を選択してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as RecordingLanguage)
              }
              disabled={isLoading || isSaving}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
