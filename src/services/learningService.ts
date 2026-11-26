import { db } from '@/db/database';
import type { ConfusionGroup, Idiom, MasteryLevel, StudyProgress } from '@/types/domain';

const studyDaysKey = 'cijing_study_days';
const minute = 60_000;
const day = 24 * 60 * minute;
export const dailyGoal = 20;

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

function readStudyDays(): Set<string> {
  try {
    const dates: unknown = JSON.parse(localStorage.getItem(studyDaysKey) ?? '[]');
    return new Set(Array.isArray(dates)
      ? dates.filter((date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
      : []);
  } catch {
    return new Set();
  }
}

function recordStudyDay(now: number) {
  const dates = readStudyDays();
  const today = dateKey(new Date(now));
  if (dates.has(today)) return;
  dates.add(today);
  try {
    localStorage.setItem(studyDaysKey, JSON.stringify([...dates].sort()));
  } catch {
    // IndexedDB retains the review timestamp if localStorage is unavailable.
  }
}

function emptyProgress(idiomId: string): StudyProgress {
  return { idiomId, mastery: 0, reviewCount: 0, lastReviewedAt: 0, nextReviewAt: 0, isBookmarked: false };
}

function reviewedProgress(progress: StudyProgress, mastery: MasteryLevel, now: number): StudyProgress {
  const interval = [10 * minute, day, 3 * day, 7 * day][mastery]!;
  return {
    ...progress,
    mastery,
    reviewCount: progress.reviewCount + 1,
    lastReviewedAt: now,
    nextReviewAt: now + interval,
  };
}

export async function recordIdiomMastery(idiomId: string, mastery: MasteryLevel): Promise<StudyProgress> {
  const progress = await db.transaction('rw', db.studyProgress, async () => {
    const existing = await db.studyProgress.get(idiomId);
    const updated = reviewedProgress(existing ?? emptyProgress(idiomId), mastery, Date.now());
    await db.studyProgress.put(updated);
    return updated;
  });
  recordStudyDay(progress.lastReviewedAt);
  return progress;
}

export function toggleIdiomBookmark(idiomId: string): Promise<boolean> {
  return db.transaction('rw', db.studyProgress, async () => {
    const progress = await db.studyProgress.get(idiomId) ?? emptyProgress(idiomId);
    const isBookmarked = !progress.isBookmarked;
    await db.studyProgress.put({ ...progress, isBookmarked });
    return isBookmarked;
  });
}

export async function recordConfusionDrillMistake(group: ConfusionGroup): Promise<void> {
  const reviewedAt = await db.transaction('rw', db.idioms, db.studyProgress, async () => {
    const ids = await db.idioms.where('word').anyOf(group.words.map(({ word }) => word)).primaryKeys();
    if (ids.length === 0) return;
    const existing = await db.studyProgress.bulkGet(ids);
    const now = Date.now();
    await db.studyProgress.bulkPut(ids.map((id, index) => {
      const progress = existing[index];
      return reviewedProgress(progress ?? emptyProgress(id), progress?.mastery === 0 ? 0 : 1, now);
    }));
    return now;
  });
  if (reviewedAt !== undefined) recordStudyDay(reviewedAt);
}

export function getDueReviewProgress(records: Iterable<StudyProgress>, now = Date.now()): StudyProgress[] {
  return Array.from(records)
    .filter(({ reviewCount, mastery, nextReviewAt }) => reviewCount > 0 && (nextReviewAt <= now || mastery <= 1))
    .sort((a, b) => Number(a.nextReviewAt > now) - Number(b.nextReviewAt > now) || a.nextReviewAt - b.nextReviewAt);
}

function studyStreak(records: StudyProgress[], today: Date): number {
  const dates = readStudyDays();
  // Include committed reviews even before their date reaches localStorage.
  for (const { lastReviewedAt } of records) {
    if (lastReviewedAt > 0) dates.add(dateKey(new Date(lastReviewedAt)));
  }
  const cursor = new Date(today);
  if (!dates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getHomeStats() {
  return db.transaction('r', db.studyProgress, db.idioms, db.localQuestions, async () => {
    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const [records, localQuestionCount] = await Promise.all([
      db.studyProgress.toArray(),
      db.localQuestions.count(),
    ]);
    const due = getDueReviewProgress(records, now);
    let nextReviewIdiomId = due[0]?.idiomId;
    if (!nextReviewIdiomId) {
      const learned = new Set(records.filter(({ reviewCount }) => reviewCount > 0).map(({ idiomId }) => idiomId));
      const next = await db.idioms.orderBy('frequency').reverse().filter(({ id }) => !learned.has(id)).first();
      nextReviewIdiomId = next?.id;
    }
    return {
      todayReviewed: records.filter(({ lastReviewedAt }) => lastReviewedAt >= today.getTime()).length,
      dailyGoal,
      streak: studyStreak(records, today),
      dueReviewCount: due.length,
      masteredCount: records.filter(({ mastery }) => mastery === 3).length,
      localQuestionCount,
      nextReviewIdiomId,
    };
  });
}

export function pickDailyConfusionGroups(groups: ConfusionGroup[], count = 2): ConfusionGroup[] {
  const ordered = [...new Map(groups.map((group) => [group.id, group])).values()]
    .sort((a, b) => a.id.localeCompare(b.id));
  const size = Math.min(Math.max(0, Math.floor(count)), ordered.length);
  if (size === 0) return [];

  // Hash the local calendar date to its day number so adjacent days always rotate.
  const dateHash = Date.parse(dateKey(new Date())) / day;
  const offset = (((dateHash * size) % ordered.length) + ordered.length) % ordered.length;
  return Array.from({ length: size }, (_, index) => ordered[(offset + index) % ordered.length]!);
}

export function findRelatedConfusionGroups(word: string, groups: ConfusionGroup[]): ConfusionGroup[] {
  return groups.filter((group) => group.words.some((entry) => entry.word === word) || group.title.includes(word));
}

export async function findIdiomsByWord(words: string[]): Promise<ReadonlyMap<string, Idiom>> {
  const idioms = await db.idioms.where('word').anyOf(words).toArray();
  return new Map(idioms.map((idiom) => [idiom.word, idiom]));
}
