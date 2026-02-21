import type { ComponentType } from 'react';

export interface Article {
  title: string;
  url: string;
  published_at: string;
  likes_count: number;
  user: string;
  avatar_small_url?: string;
  platform: 'zenn' | 'qiita' | 'kentsu';
}

export interface ChartData {
  [key: string]: {
    likes: number;
    posts: number;
  };
}

export interface UserStats {
  totalPosts: number;
  totalLikes: number;
}

export type TimeRange = 'all' | 'month' | 'custom';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface PoCCard {
  title: string;
  description: string;
  image: string;
  priceId: string;
  link: string;
  content?: {
    overview: string;
    architecture?: string;
    implementation: string[];
    technologies: string[];
    benefits: string[];
    considerations: string[];
  };
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  date: string;
  author: string;
  isFeatured: boolean;
  category: string;
}

// Used by: frontend/src/config/nav.ts
export type NavItem = {
  title: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
};

// Used by: frontend/src/lib/recording-language.ts,
// frontend/src/lib/cosmos/user.ts,
// frontend/src/app/(dashboard)/settings/page.tsx
export type RecordingLanguage = 'en-US' | 'ja-JP';

// Used by: frontend/src/lib/cosmos/recording.ts (saveRecording input)
export type RecordingInput = {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  transcript: string;
  audioMimeType?: string | null;
  audioSize?: number | null;
  language?: string | null;
};

// Used by: frontend/src/lib/cosmos/recording.ts,
// frontend/src/app/(dashboard)/voice-recording/page.tsx,
// frontend/src/app/(dashboard)/voice-recording/[recordingId]/page.tsx
export type RecordingDocument = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  transcript: string;
  language: string;
  conversationSummary: string;
  bodyTemperature: string;
  bloodPressure: string;
  pulse: string;
  oxygenSaturation: string;
  patientCondition: string;
  audio: {
    mimeType: string | null;
    size: number | null;
  };
  createdAt: string;
};

// Used by: frontend/src/lib/cosmos/recording.ts (Cosmos raw document mapping)
export type RawRecordingDocument = Omit<
  RecordingDocument,
  'conversationSummary'
> & {
  conversationSummary?: string;
  summary?: string;
};

// Used by: frontend/src/lib/cosmos/user.ts
export type UserDocument = {
  id: string;
  email?: string | null;
  recordingLanguage?: RecordingLanguage;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};
