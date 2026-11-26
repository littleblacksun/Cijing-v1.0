import { Capacitor } from '@capacitor/core';
import { db } from '@/db/database';
import { answerOptions, asRecord, completionUrl, makeId } from './llmClient';
import { computeQuestionFingerprint, stableHash } from './quizEngine';
import type { AppSettings, ConfusionGroup, Idiom, LocalQuestion, QuestionItem, StudyProgress } from '@/types/domain';
import type { StoredQuizSession } from './quizEngine';

type RecordValue = Record<string, unknown>;
type ExportSettings = Omit<AppSettings, 'llmApiKey'> & { llmApiKey?: string };

interface Backup {
  app: 'cijing';
  version: 2;
  exportedAt: string;
  localQuestions: LocalQuestion[];
  studyProgress: StudyProgress[];
  quizSessions: StoredQuizSession[];
  settings: ExportSettings | null;
}

const isText = (value: unknown): value is string => typeof value === 'string';
const nonempty = (value: unknown): value is string => isText(value) && Boolean(value.trim());
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const textList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);
const isId = (value: unknown): value is string => nonempty(value) && !Object.hasOwn(Object.prototype, value) && value !== 'prototype';
const records = (value: unknown, check: (entry: RecordValue) => boolean): boolean => Array.isArray(value)
  && value.every((item: unknown) => { const entry = asRecord(item); return Boolean(entry && check(entry)); });
const stringsAt = (entry: RecordValue, ...keys: string[]) => keys.every((key) => isText(entry[key]));
const options = (value: unknown) => {
  const object = asRecord(value);
  return Boolean(object && answerOptions.every((letter) => nonempty(object[letter])));
};
const isAnswer = (value: unknown) => answerOptions.some((letter) => letter === value);
const isMode = (value: unknown) => value === 'instant' || value === 'exam';
const hasAttributes = (entry: RecordValue) => ['positive', 'negative', 'neutral'].some((value) => entry.sentiment === value)
  && ['light', 'medium', 'heavy'].some((value) => entry.intensity === value);

function isQuestion(value: unknown): value is QuestionItem {
  const item = asRecord(value);
  return Boolean(item && isId(item.id) && (item.source === 'ai' || item.source === 'local') && nonempty(item.stem)
    && options(item.options) && isAnswer(item.answer) && options(item.optionAnalyses) && isText(item.overallAnalysis)
    && textList(item.contextClues) && textList(item.relatedIdioms) && count(item.createdAt));
}

function isLocalQuestion(value: unknown): value is LocalQuestion {
  const item = asRecord(value);
  return Boolean(item && isQuestion(value) && nonempty(item.fingerprint) && count(item.savedAt) && count(item.practiceCount)
    && count(item.wrongCount) && (item.lastPracticedAt === undefined || count(item.lastPracticedAt)));
}

function isProgress(value: unknown): value is StudyProgress {
  const item = asRecord(value);
  return Boolean(item && isId(item.idiomId) && count(item.mastery) && item.mastery <= 3
    && count(item.reviewCount) && count(item.lastReviewedAt) && count(item.nextReviewAt) && typeof item.isBookmarked === 'boolean');
}

function isSession(value: unknown): value is StoredQuizSession {
  const item = asRecord(value);
  if (!item || !isId(item.id) || !isMode(item.mode) || !count(item.startedAt) || !count(item.durationSec)
    || (item.status !== 'in_progress' && item.status !== 'completed')
    || (item.completedAt !== undefined && !count(item.completedAt)) || (item.status === 'completed' && !count(item.completedAt))
    || (item.updatedAt !== undefined && !count(item.updatedAt)) || (item.origin !== undefined && item.origin !== 'bank')
    || !Array.isArray(item.questions) || !item.questions.every(isQuestion)
    || item.questions.length < 1 || item.questions.length > 20 || item.questions.length !== item.totalCount
    || !count(item.localCount) || !count(item.aiCount) || item.localCount + item.aiCount !== item.totalCount
    || item.localCount !== item.questions.filter(({ source }) => source === 'local').length
    || (item.currentQuestionIndex !== undefined && (!count(item.currentQuestionIndex) || item.currentQuestionIndex >= item.questions.length))
    || !textList(item.targetIdioms) || !textList(item.flaggedQuestionIds) || !textList(item.savedQuestionIds)) return false;
  const questionIds = new Set(item.questions.map(({ id }) => id));
  const answers = asRecord(item.userAnswers);
  const eliminated = asRecord(item.eliminatedOptions);
  return questionIds.size === item.questions.length && Boolean(answers && eliminated
    && [...item.flaggedQuestionIds, ...item.savedQuestionIds].every((id) => questionIds.has(id))
    && Object.entries(answers).every(([id, answer]) => questionIds.has(id) && isAnswer(answer))
    && Object.entries(eliminated).every(([id, letters]) => questionIds.has(id) && Array.isArray(letters) && letters.every(isAnswer)));
}

function isSettings(value: unknown): value is ExportSettings {
  const item = asRecord(value);
  if (!item || item.id !== 'default' || !isMode(item.defaultQuizMode)
    || typeof item.localBankRatio !== 'number' || !Number.isFinite(item.localBankRatio)
    || item.localBankRatio < 0 || item.localBankRatio > 0.5
    || (item.fontSize !== 'normal' && item.fontSize !== 'large')
    || !['guokao', 'shengkao', 'basic'].some((style) => style === item.llmPromptStyle)
    || !isText(item.llmBaseUrl) || !isText(item.llmModel) || (item.llmApiKey !== undefined && !isText(item.llmApiKey))) return false;
  if (item.llmBaseUrl.trim()) {
    try { completionUrl(item.llmBaseUrl); } catch { return false; }
  }
  return true;
}

function parseJson(raw: string): unknown {
  try { return JSON.parse(raw.replace(/^\uFEFF/, '')); }
  catch { throw new Error('文件不是有效的 JSON'); }
}

function localDateStamp(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, '0')).join('');
}

export async function buildPersonalBackup(): Promise<Backup> {
  return db.transaction('r', db.localQuestions, db.studyProgress, db.quizSessions, db.appSettings, async () => {
    const [localQuestions, studyProgress, quizSessions, settings] = await Promise.all([
      db.localQuestions.toArray(), db.studyProgress.toArray(), db.quizSessions.orderBy('startedAt').reverse().limit(30).toArray(),
      db.appSettings.get('default'),
    ]);
    let preferences: ExportSettings | null = null;
    if (settings) {
      const { llmApiKey: _key, ...safe } = settings;
      preferences = safe;
    }
    return { app: 'cijing', version: 2, exportedAt: new Date().toISOString(), localQuestions, studyProgress, quizSessions, settings: preferences };
  });
}

export async function exportPersonalBackup(): Promise<'download' | 'clipboard'> {
  const backup = await buildPersonalBackup();
  const json = JSON.stringify(backup, null, 2);
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      throw new Error('Android WebView 不能确认 Blob 下载');
    }
    const link = document.createElement('a');
    if (!('download' in link)) throw new Error('当前环境不支持文件下载');
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    link.href = url;
    link.download = `cijing-backup-${localDateStamp(new Date(backup.exportedAt))}.json`;
    document.body.append(link);
    try { link.click(); }
    finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
    return 'download';
  } catch {
    try {
      await navigator.clipboard.writeText(json);
      return 'clipboard';
    } catch { throw new Error('备份下载和复制都未成功，请检查应用权限后重试'); }
  }
}

function parseBackup(raw: string): Backup {
  const value = asRecord(parseJson(raw));
  if (!value || value.app !== 'cijing' || value.version !== 2 || !isText(value.exportedAt) || !Number.isFinite(Date.parse(value.exportedAt))
    || !Array.isArray(value.localQuestions) || !value.localQuestions.every(isLocalQuestion)
    || !Array.isArray(value.studyProgress) || !value.studyProgress.every(isProgress)
    || !Array.isArray(value.quizSessions) || !value.quizSessions.every(isSession)
    || (value.settings !== null && !isSettings(value.settings))) throw new Error('请选择有效的词境 v2 个人数据备份');
  return { app: 'cijing', version: 2, exportedAt: value.exportedAt, localQuestions: value.localQuestions,
    studyProgress: value.studyProgress, quizSessions: value.quizSessions, settings: value.settings };
}

export async function restorePersonalBackup(raw: string) {
  const backup = parseBackup(raw);
  return db.transaction('rw', db.localQuestions, db.studyProgress, db.quizSessions, db.appSettings, async () => {
    const stats = { questions: 0, progress: 0, sessions: 0 };
    for (const question of backup.localQuestions) {
      const fingerprint = computeQuestionFingerprint(question.stem, question.options);
      const existing = await db.localQuestions.where('fingerprint').equals(fingerprint).first();
      if (!existing) {
        const id = await db.localQuestions.get(question.id) ? makeId('local') : question.id;
        await db.localQuestions.add({ ...question, id, fingerprint, source: 'local' });
        stats.questions += 1;
      } else {
        const practiceCount = Math.max(question.practiceCount, existing.practiceCount);
        const wrongCount = Math.max(question.wrongCount, existing.wrongCount);
        const lastPracticedAt = Math.max(question.lastPracticedAt ?? 0, existing.lastPracticedAt ?? 0) || undefined;
        if (practiceCount === existing.practiceCount && wrongCount === existing.wrongCount && lastPracticedAt === existing.lastPracticedAt) continue;
        await db.localQuestions.put({ ...existing, practiceCount, wrongCount, lastPracticedAt });
        stats.questions += 1;
      }
    }
    for (const progress of backup.studyProgress) {
      const existing = await db.studyProgress.get(progress.idiomId);
      const newest = existing && (existing.lastReviewedAt > progress.lastReviewedAt
        || (existing.lastReviewedAt === progress.lastReviewedAt && existing.reviewCount >= progress.reviewCount)) ? existing : progress;
      const isBookmarked = progress.isBookmarked || Boolean(existing?.isBookmarked);
      if (existing && newest === existing && existing.isBookmarked === isBookmarked) continue;
      await db.studyProgress.put({ ...newest, isBookmarked });
      stats.progress += 1;
    }
    for (const session of backup.quizSessions) {
      const existing = await db.quizSessions.get(session.id) as StoredQuizSession | undefined;
      if (existing?.status === 'completed' && session.status === 'in_progress') continue;
      if (existing && existing.status === session.status
        && (existing.updatedAt ?? existing.completedAt ?? existing.startedAt) >= (session.updatedAt ?? session.completedAt ?? session.startedAt)) continue;
      await db.quizSessions.put(session);
      stats.sessions += 1;
    }
    if (backup.settings) {
      const current = await db.appSettings.get('default');
      const llmApiKey = current?.llmApiKey || backup.settings.llmApiKey || '';
      const endpoint = current?.llmApiKey
        ? { llmBaseUrl: current.llmBaseUrl, llmModel: current.llmModel } : {};
      await db.appSettings.put({ ...backup.settings, ...endpoint, llmApiKey });
    }
    return stats;
  });
}

function validIdiom(entry: RecordValue) {
  const morpheme = asRecord(entry.morphemeHint);
  return nonempty(entry.word) && nonempty(entry.pinyin) && nonempty(entry.coreMeaning)
    && count(entry.frequency) && entry.frequency >= 1 && entry.frequency <= 5 && hasAttributes(entry)
    && Boolean(morpheme && stringsAt(morpheme, 'keyChar', 'explanation')) && isText(entry.commonMistake)
    && [entry.applicableObjects, entry.collocations, entry.tags, entry.confusableWith].every(textList)
    && records(entry.examples, (example) => isText(example.sentence) && textList(example.highlightClues));
}

function validGroup(entry: RecordValue) {
  return nonempty(entry.title) && stringsAt(entry, 'category', 'summary') && typeof entry.difficulty === 'number' && Number.isFinite(entry.difficulty)
    && Array.isArray(entry.words) && entry.words.length >= 2
    && records(entry.words, (word) => nonempty(word.word) && stringsAt(word, 'focus', 'applicable', 'pitfall')
      && textList(word.diffChars) && hasAttributes(word))
    && new Set(entry.words.map((word: ConfusionGroup['words'][number]) => word.word.trim())).size === entry.words.length
    && records(entry.contrastExamples, (example) => stringsAt(example, 'context', 'correctWord', 'wrongWord', 'clue'))
    && records(entry.quickDrills, (drill) => stringsAt(drill, 'stem', 'answer', 'analysis') && textList(drill.options)
      && drill.options.length >= 2 && drill.options.includes(drill.answer as string));
}

async function appendVocabulary<T extends { id: string }>(
  table: import('dexie').Table<T, string>, items: Omit<T, 'id'>[], names: string[], requestedIds: (string | undefined)[],
  uniqueIndex: 'word' | 'title', prefix: 'idiom' | 'group',
) {
  return db.transaction('rw', table, async () => {
    const existing = new Set(await table.orderBy(uniqueIndex).keys());
    const usedIds = new Set(await table.toCollection().primaryKeys());
    const additions: T[] = [];
    for (const [index, item] of items.entries()) {
      const name = names[index]!;
      if (existing.has(name)) continue;
      const explicit = requestedIds[index];
      const base = explicit && !usedIds.has(explicit) ? explicit : `${prefix}_${stableHash(name)}`;
      let id = base;
      for (let suffix = 2; usedIds.has(id); suffix += 1) id = `${base}_${suffix}`;
      existing.add(name);
      usedIds.add(id);
      additions.push({ ...item, [uniqueIndex]: name, id } as T);
    }
    if (additions.length) await table.bulkAdd(additions);
    return { added: additions.length, skipped: items.length - additions.length };
  });
}

export async function importExternalVocabJson(rawJsonText: string) {
  const file = asRecord(parseJson(rawJsonText));
  if (!file || !Array.isArray(file.items) || !['idioms', 'confusion_groups'].some((type) => file.type === type)) {
    throw new Error('语库文件须包含 idioms 或 confusion_groups 类型和 items 数组');
  }
  const idioms = file.type === 'idioms';
  const validate = idioms ? validIdiom : validGroup;
  const items = file.items.map((item: unknown, index: number) => {
    const entry = asRecord(item);
    const supplied = entry?.id;
    if (!entry || !validate(entry) || (supplied != null && (!isText(supplied) || (supplied.trim() && !isId(supplied.trim()))))) {
      throw new Error(`语库第 ${index + 1} 条记录字段不符合规范`);
    }
    return entry;
  });
  const requestedIds = items.map(({ id }) => typeof id === 'string' ? id.trim() || undefined : undefined);
  if (idioms) {
    const rows = items as unknown as Omit<Idiom, 'id'>[];
    return { type: 'idioms' as const, ...await appendVocabulary(db.idioms, rows, rows.map(({ word }) => word.trim()), requestedIds, 'word', 'idiom') };
  }
  const rows = (items as unknown as Omit<ConfusionGroup, 'id'>[]).map((group) => ({
    ...group, words: group.words.map(({ word, ...details }) => ({ ...details, word: word.trim() })),
  }));
  return { type: 'confusion_groups' as const, ...await appendVocabulary(db.confusionGroups, rows, rows.map(({ title }) => title.trim()), requestedIds, 'title', 'group') };
}
