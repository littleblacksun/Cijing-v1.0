import { liveQuery } from 'dexie';
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppData } from '@/components/layout/AppShell';
import { db } from '@/db/database';
import { configFromSettings } from '@/services/llmClient';
import { getQuizSession, quizCounts, resolveIdioms, shuffled } from '@/services/quizEngine';
import type { AppSettings, QuizCount, QuizMode, QuizSession } from '@/types/domain';

export { answerOptions as letters } from '@/services/llmClient';
export { quizCounts as counts, shuffled } from '@/services/quizEngine';
export const modeLabels = { instant: '即时解析模式', exam: '交卷解析模式' };
export const contentInset = 'px-[var(--learning-gutter)]';
export const fixedFooter = `pb-safe grid shrink-0 grid-cols-2 gap-2.5 border-t border-border-subtle bg-surface pt-2.5 ${contentInset}`;
export const outlineBlue = '!border-primary !text-primary';
export const successInk = 'text-[color:var(--learning-success-ink)]';
export const warningInk = 'text-[color:var(--learning-warning-ink)]';
export const dangerInk = 'text-[color:var(--learning-danger-ink)]';
export const masteryLabels = ['陌生', '模糊', '熟悉', '掌握'] as const;
export const masteryDots = ['bg-danger', 'bg-warning', 'bg-primary', 'bg-success'] as const;

export function parseCount(value: string | null, fallback: QuizCount = 15): QuizCount {
  return quizCounts.find((count) => String(count) === value) ?? fallback;
}

export function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function searchText(value: string) {
  return value.normalize('NFD').replace(/\p{M}|\s/gu, '').toLowerCase();
}

export function wrongQuestions(session: QuizSession) {
  return session.questions.filter((item) => session.userAnswers[item.id] !== item.answer);
}

export function quizPath(id: string, suffix = '') {
  return `/quiz/${encodeURIComponent(id)}${suffix}`;
}

export type Strategy = '手动自选' | '陌生词优先' | '易混组' | '随机';
export interface PracticeDraft {
  count?: QuizCount;
  modeOverride?: QuizMode;
}

export interface PracticeApiReturn extends PracticeDraft {
  source: 'practice';
  wordIds: string[];
}

export function usePracticeQuery<T>(read: () => Promise<T>) {
  const app = useOutletContext<AppData>();
  const ready = app.status === 'ready';
  const [result, setResult] = useState<{ query: typeof read; data: T } | { query: typeof read; error: true }>();
  useEffect(() => {
    if (!ready) return;
    const subscription = liveQuery(read).subscribe({
      next: (data) => setResult({ query: read, data }),
      error: () => setResult({ query: read, error: true }),
    });
    return () => subscription.unsubscribe();
  }, [ready, read]);
  const current = result?.query === read ? result : undefined;
  return {
    data: current && 'data' in current ? current.data : undefined,
    loading: app.status === 'loading' || (ready && !current),
    failed: app.status === 'error' || Boolean(current && 'error' in current),
  };
}

function readSettings() { return db.appSettings.get('default'); }
export function usePracticeSettings() { return usePracticeQuery(readSettings); }

export async function updatePracticeSettings(patch: Partial<Omit<AppSettings, 'id'>>) {
  await db.transaction('rw', db.appSettings, async () => {
    const current = await db.appSettings.get('default');
    if (!current) throw new Error('设置尚未载入，请稍后再试');
    await db.appSettings.put({ ...current, ...patch });
  });
}

export function useQuizSession(id: string | undefined) {
  return usePracticeQuery(useCallback(() => getQuizSession(id), [id]));
}

function readBank() { return db.localQuestions.orderBy('savedAt').reverse().toArray(); }
export function useLocalBank() { return usePracticeQuery(readBank); }

async function readHistory() {
  const [finished, active] = await Promise.all([
    db.quizSessions.orderBy('completedAt').reverse().filter(({ status }) => status === 'completed').limit(30).toArray(),
    db.quizSessions.orderBy('startedAt').reverse().filter(({ status }) => status === 'in_progress').limit(5).toArray(),
  ]);
  return { finished, active };
}
export function useQuizHistory() { return usePracticeQuery(readHistory); }

function readBankCount() { return db.localQuestions.count(); }
export function useBankCount() { return usePracticeQuery(readBankCount); }

function readPickerWords() {
  return db.transaction('r', db.idioms, db.studyProgress, async () => {
    const [words, progress] = await Promise.all([
      db.idioms.orderBy('frequency').reverse().toArray(), db.studyProgress.toArray(),
    ]);
    const entries = new Map(progress.map((entry) => [entry.idiomId, entry]));
    return words.map(({ id, word, pinyin, coreMeaning, tags, frequency }) => ({
      id, word, pinyin, meaning: coreMeaning, mastery: entries.get(id)?.mastery ?? 0,
      frequent: tags.includes('国考高频'), frequency,
    }));
  });
}

export function usePracticeWords() { return usePracticeQuery(readPickerWords); }

export function useResolvedIdioms(values: string[]) {
  const serialized = JSON.stringify(values);
  return usePracticeQuery(useCallback(() => resolveIdioms(JSON.parse(serialized) as string[]), [serialized]));
}

export async function pickStrategyWords(strategy: Exclude<Strategy, '手动自选'>) {
  if (strategy === '随机') {
    return shuffled(await db.idioms.where('frequency').aboveOrEqual(4).primaryKeys()).slice(0, 10);
  }
  if (strategy === '易混组') {
    const groups = shuffled(await db.confusionGroups.toArray()).slice(0, 3);
    const names = [...new Set(groups.flatMap(({ words }) => words.map(({ word }) => word)))];
    const idioms = await db.idioms.where('word').anyOf(names).toArray();
    return idioms.map(({ id }) => id);
  }
  return db.transaction('r', db.idioms, db.studyProgress, async () => {
    const [words, progress] = await Promise.all([
      db.idioms.orderBy('frequency').reverse().toArray(), db.studyProgress.toArray(),
    ]);
    const byId = new Map(progress.map((entry) => [entry.idiomId, entry]));
    const weak = words.filter(({ id }) => {
      const entry = byId.get(id);
      return entry && entry.reviewCount > 0 && entry.mastery <= 1;
    });
    const unseen = words.filter(({ id }) => !byId.get(id)?.reviewCount);
    return [...weak, ...unseen].slice(0, 10).map(({ id }) => id);
  });
}

export const presets = {
  deepseek: { label: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  qwen: { label: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  zhipu: { label: '智谱', url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  custom: { label: '自定义', url: '', model: '' },
};
export type Preset = keyof typeof presets;

export function apiFormFromSettings(settings: AppSettings) {
  const config = configFromSettings(settings);
  const preset = (Object.keys(presets) as Preset[]).find((key) => key !== 'custom'
    && presets[key].url === config.url.trim().replace(/\/+$/, '')) ?? 'custom';
  return { ...config, preset };
}
