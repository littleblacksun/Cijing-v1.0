import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppData } from '@/components/layout/AppShell';
import { db } from '@/db/database';
import { findIdiomsByWord } from '@/services/learningService';
import type { ConfusionGroup, Idiom, Intensity, MasteryLevel, Sentiment, StudyProgress } from '@/types/domain';

export const masteryStyles = [
  { label: '陌生', color: 'bg-danger-soft text-[color:var(--learning-danger-ink)]', active: 'border-danger' },
  { label: '模糊', color: 'bg-warning-soft text-[color:var(--learning-warning-ink)]', active: 'border-warning' },
  { label: '熟悉', color: 'bg-primary-soft text-primary', active: 'border-primary' },
  { label: '掌握', color: 'bg-success-soft text-[color:var(--learning-success-ink)]', active: 'border-success' },
] as const;

export const sentimentLabels: Record<Sentiment, string> = { positive: '褒义', negative: '贬义', neutral: '中性' };
export const intensityLabels: Record<Intensity, string> = { light: '较轻', medium: '适中', heavy: '较重' };
export const libraryFilters = ['全部', ...masteryStyles.map(({ label }) => label), '国考高频', '易望文生义', '褒贬易错'] as const;

export interface LibraryView {
  query: string;
  filter: (typeof libraryFilters)[number];
  limit: number;
}

export interface IdiomQueueState {
  queueIds: string[];
  libraryView?: LibraryView;
}

export function groupBadge(group: ConfusionGroup) {
  return group.category.split('·')[0]?.trim() || '易混辨析';
}

interface LearningVocabulary {
  idioms: Idiom[];
  groups: ConfusionGroup[];
  progress: ReadonlyMap<string, StudyProgress>;
}

const emptyVocabulary: LearningVocabulary = { idioms: [], groups: [], progress: new Map() };
const libraryWordOrder = ['首当其冲', '差强人意', '不以为然', '万人空巷', '目无全牛'];
const libraryRanks = new Map(libraryWordOrder.map((word, index) => [word, index]));

async function readVocabulary(): Promise<LearningVocabulary> {
  return db.transaction('r', db.idioms, db.confusionGroups, db.studyProgress, async () => {
    const [idioms, groups, progress] = await Promise.all([
      db.idioms.toArray(), db.confusionGroups.toArray(), db.studyProgress.toArray(),
    ]);
    const wordRank = (word: string) => libraryRanks.get(word) ?? libraryRanks.size;
    idioms.sort((a, b) => wordRank(a.word) - wordRank(b.word) || b.frequency - a.frequency);
    return { idioms, groups, progress: new Map(progress.map((entry) => [entry.idiomId, entry])) };
  });
}

export function useLearningQuery<T>(read: () => Promise<T>, refreshByTime = false) {
  const appData = useOutletContext<AppData>();
  const ready = appData.status === 'ready';
  const [result, setResult] = useState<{ read: typeof read; data: T }>();
  const [failedRead, setFailedRead] = useState<typeof read>();
  const hasResult = result?.read === read;
  const readFailed = failedRead === read;

  useEffect(() => {
    if (!ready) return;
    let subscription: { unsubscribe(): void } | undefined;
    let active = true;

    function subscribe() {
      subscription?.unsubscribe();
      subscription = liveQuery(read).subscribe({
        next(data) {
          if (!active) return;
          setResult({ read, data });
          setFailedRead(undefined);
        },
        error() {
          if (active) setFailedRead(() => read);
        },
      });
    }

    subscribe();
    // Dexie observes writes. Refresh also when time alone changes a due date or the local day.
    const timer = refreshByTime ? window.setInterval(subscribe, 30_000) : undefined;
    if (refreshByTime) {
      window.addEventListener('focus', subscribe);
      window.addEventListener('storage', subscribe);
    }
    return () => {
      active = false;
      subscription?.unsubscribe();
      if (timer !== undefined) window.clearInterval(timer);
      if (refreshByTime) {
        window.removeEventListener('focus', subscribe);
        window.removeEventListener('storage', subscribe);
      }
    };
  }, [read, ready, refreshByTime]);

  return {
    data: hasResult ? result.data : undefined,
    loading: appData.status === 'loading' || (ready && !hasResult && !readFailed),
    failed: appData.status === 'error' || readFailed,
    retry: appData.status === 'error' ? appData.retry : undefined,
  };
}

export function useLearningVocabulary() {
  const { data, ...status } = useLearningQuery(readVocabulary);
  return { ...(data ?? emptyVocabulary), ...status };
}

export function masteryFor(idiom: Idiom, progress: LearningVocabulary['progress']): MasteryLevel {
  return progress.get(idiom.id)?.mastery ?? 0;
}

export function readDailyConfusionCandidates() {
  return db.transaction('r', db.confusionGroups, db.idioms, async () => {
    const [groups, frequentIdioms] = await Promise.all([
      db.confusionGroups.toArray(),
      db.idioms.where('frequency').aboveOrEqual(4).toArray(),
    ]);
    const frequentWords = new Set(frequentIdioms.map(({ word }) => word));
    const frequentGroups = groups.filter((group) => group.words.some(({ word }) => frequentWords.has(word)));
    return frequentGroups.length >= 2 ? frequentGroups : groups;
  });
}

export function readConfusionDetail(id: string | undefined) {
  return db.transaction('r', db.confusionGroups, db.idioms, async () => {
    const group = id ? await db.confusionGroups.get(id) : undefined;
    if (!group) return;
    const idiomsByWord = await findIdiomsByWord(group.words.map(({ word }) => word));
    return { group, groupIds: [...new Set(group.words.map(({ word }) => idiomsByWord.get(word)?.id ?? word))] };
  });
}
