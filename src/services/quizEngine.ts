import { db } from '@/db/database';
import { answerOptions, configFromSettings, generateLogicClozeQuestions, isLlmConfigured, makeId, normalizeStem, questionTextKey, throwIfAborted } from './llmClient';
import type { AnswerOption, Idiom, LocalQuestion, QuestionItem, QuizCount, QuizMode, QuizSession } from '@/types/domain';

export interface StoredQuizSession extends QuizSession {
  currentQuestionIndex?: number;
  origin?: 'bank';
  updatedAt?: number;
}

export const quizCounts = [5, 10, 15, 20] as const;

export function calcLocalQuota(totalCount: QuizCount, ratio: number) {
  return ratio <= 0 ? 0 : Math.min(totalCount, Math.max(1, Math.round(totalCount * ratio)));
}

export function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let end = copy.length - 1; end > 0; end -= 1) {
    const index = Math.floor(Math.random() * (end + 1));
    [copy[end], copy[index]] = [copy[index]!, copy[end]!];
  }
  return copy;
}

export async function resolveIdioms(idsOrWords: string[]): Promise<Map<string, Idiom>> {
  const [byId, byWord] = await Promise.all([
    db.idioms.bulkGet(idsOrWords),
    db.idioms.where('word').anyOf(idsOrWords).toArray(),
  ]);
  const names = new Map(byWord.map((entry) => [entry.word, entry]));
  return new Map(idsOrWords.flatMap((value, index) => {
    const idiom = byId[index] ?? names.get(value);
    return idiom ? [[value, idiom]] : [];
  }));
}

const day = 86_400_000;

function localScore(question: LocalQuestion, targets: Set<string>, now: number) {
  const match = question.relatedIdioms.some((word) => targets.has(word)) ? 100 : 0;
  const mistakes = question.wrongCount > 0 ? 30 + Math.min(20, question.wrongCount * 5) : 0;
  const spacing = question.lastPracticedAt === undefined ? 25
    : Math.min(20, Math.max(0, (now - question.lastPracticedAt) / day));
  return match + mistakes + spacing + Math.random() * 8;
}

export async function pickLocalQuestions(targetIdiomWords: string[], quota: number): Promise<QuestionItem[]> {
  if (quota <= 0) return [];
  const lookup = await resolveIdioms(targetIdiomWords);
  const targets = new Set([...targetIdiomWords, ...Array.from(lookup.values()).flatMap(({ id, word }) => [id, word])]);
  const now = Date.now();
  return (await db.localQuestions.toArray())
    .map((question) => ({ question, score: localScore(question, targets, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, quota)
    .map(({ question }) => ({ ...question, source: 'local' }));
}

interface QuizParameters {
  wordIds: string[];
  count: QuizCount;
  mode: QuizMode;
  signal?: AbortSignal;
  onLocalPicked?: (count: number, ratio: number) => void;
  onProgress?: (progress: { generated: number; total: number }) => void;
  onAssembling?: () => void;
}

function makeSession(questions: QuestionItem[], mode: QuizMode, targetIdioms: string[], origin?: 'bank'): StoredQuizSession {
  const now = Date.now();
  const localCount = questions.filter((question) => question.source === 'local').length;
  return {
    id: makeId('quiz'), mode,
    // The regular picker accepts QuizCount presets. Local-only sheets may be shorter.
    totalCount: questions.length as QuizCount, localCount, aiCount: questions.length - localCount,
    targetIdioms, questions, origin, currentQuestionIndex: 0, updatedAt: now,
    userAnswers: {}, eliminatedOptions: {}, flaggedQuestionIds: [], savedQuestionIds: [],
    status: 'in_progress', startedAt: now, durationSec: 0,
  };
}

export async function createQuizSession({ wordIds, count, mode, signal, onLocalPicked, onProgress, onAssembling }: QuizParameters) {
  throwIfAborted(signal);
  if (!quizCounts.includes(count) || !['instant', 'exam'].includes(mode)) throw new Error('无效的组卷参数');
  const targets = [...new Set(wordIds.map((word) => word.trim()).filter(Boolean))];
  if (!targets.length) throw new Error('请先选择考察成语');
  const [idioms, settings] = await Promise.all([resolveIdioms(targets), db.appSettings.get('default')]);
  throwIfAborted(signal);
  const targetWords = [...new Set(targets.map((target) => idioms.get(target)?.word ?? target))];
  const ratio = settings?.localBankRatio ?? 0.2;
  const local = await pickLocalQuestions(targetWords, calcLocalQuota(count, ratio));
  throwIfAborted(signal);
  onLocalPicked?.(local.length, ratio);
  const needed = count - local.length;
  const config = configFromSettings(settings);
  if (needed > 0 && !isLlmConfigured(config)) throw new Error('请先配置 LLM API，再生成 AI 新题');
  const details = new Map(Array.from(idioms.values(), (entry) => [entry.word, entry]));
  const ai = needed ? await generateLogicClozeQuestions({
    config, count: needed, signal, onProgress, avoidStems: local.map(({ stem }) => stem),
    idioms: targetWords.map((word) => ({ word, coreMeaning: details.get(word)?.coreMeaning ?? '', confusableWith: details.get(word)?.confusableWith ?? [] })),
  }) : [];
  throwIfAborted(signal);
  onAssembling?.();
  const session = makeSession(shuffled([...local, ...ai]), mode, targetWords);
  await db.transaction('rw', db.quizSessions, async () => {
    throwIfAborted(signal);
    await db.quizSessions.put(session);
    throwIfAborted(signal);
  });
  return session.id;
}

export function createLocalReviewSession(onlyWrong: boolean, maxCount = 15) {
  return db.transaction('rw', db.localQuestions, db.quizSessions, db.appSettings, async () => {
    const [all, settings] = await Promise.all([db.localQuestions.toArray(), db.appSettings.get('default')]);
    const wrong = onlyWrong ? all.filter(({ wrongCount }) => wrongCount > 0) : all;
    if (!all.length) throw new Error('本地题库暂无收藏题');
    const fallback = onlyWrong && wrong.length === 0;
    const size = Math.min(20, Math.max(1, Math.floor(maxCount)));
    const available = fallback ? all : wrong;
    const now = Date.now();
    const questions = available.map((question) => ({ question, score: localScore(question, new Set(), now) }))
      .sort((a, b) => b.score - a.score).slice(0, size)
      .map(({ question }) => ({ ...question, source: 'local' as const }));
    const session = makeSession(questions, settings?.defaultQuizMode ?? 'instant', [], 'bank');
    await db.quizSessions.put(session);
    return { id: session.id, fallback };
  });
}

export function stableHash(value: string) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

export function computeQuestionFingerprint(stem: string, options: QuestionItem['options']): string {
  const normalizedStem = normalizeStem(stem).split('____').map(questionTextKey).join('____');
  return stableHash(JSON.stringify([normalizedStem, answerOptions.map((letter) => questionTextKey(options[letter])).sort()]));
}

export function fingerprintOf(question: QuestionItem) {
  return computeQuestionFingerprint(question.stem, question.options);
}

export function findBankQuestion(question: QuestionItem) {
  return db.localQuestions.where('fingerprint').equals(fingerprintOf(question)).first();
}

export function saveQuestionsToBank(questions: QuestionItem[]): Promise<{ added: number; skipped: number }> {
  return db.transaction('rw', db.localQuestions, async () => {
    const keys = questions.map(fingerprintOf);
    const existing = new Set(await db.localQuestions.where('fingerprint').anyOf(keys).keys());
    const usedIds = new Set(await db.localQuestions.bulkGet(questions.map(({ id }) => id)).then((rows) => rows.flatMap((row) => row?.id ?? [])));
    const additions: LocalQuestion[] = [];
    for (const [index, question] of questions.entries()) {
      const fingerprint = keys[index]!;
      if (existing.has(fingerprint)) continue;
      existing.add(fingerprint);
      const id = usedIds.has(question.id) ? makeId('local') : question.id;
      usedIds.add(id);
      additions.push({ ...question, id, source: 'local', savedAt: Date.now(), practiceCount: 0, wrongCount: 0, lastPracticedAt: undefined, fingerprint });
    }
    if (additions.length) await db.localQuestions.bulkAdd(additions);
    return { added: additions.length, skipped: questions.length - additions.length };
  });
}

export function removeQuestionFromBank(questionIdOrFingerprint: string) {
  return db.transaction('rw', db.localQuestions, async () => {
    const question = await db.localQuestions.get(questionIdOrFingerprint)
      ?? await db.localQuestions.where('fingerprint').equals(questionIdOrFingerprint).first();
    if (question) await db.localQuestions.delete(question.id);
  });
}

export function recordLocalQuestionOutcome(question: QuestionItem, isCorrect: boolean): Promise<void> {
  return db.transaction('rw', db.localQuestions, async () => {
    const existing = await findBankQuestion(question) ?? await db.localQuestions.get(question.id);
    if (!existing) return;
    await db.localQuestions.put({
      ...existing, practiceCount: existing.practiceCount + 1,
      wrongCount: existing.wrongCount + Number(!isCorrect), lastPracticedAt: Date.now(),
    });
  });
}

export async function getQuizSession(id: string | undefined): Promise<StoredQuizSession | undefined> {
  return id ? db.quizSessions.get(id) : undefined;
}

export type QuizAction =
  | { type: 'answer'; id: string; answer: AnswerOption }
  | { type: 'eliminate'; id: string; answer: AnswerOption }
  | { type: 'flag'; id: string }
  | { type: 'jump'; index: number };

export function updateQuizSession(id: string, action: QuizAction) {
  return db.transaction('rw', db.quizSessions, db.localQuestions, async () => {
    const session = await getQuizSession(id);
    if (!session || session.status !== 'in_progress') return;
    if (action.type === 'jump') {
      if (Number.isInteger(action.index) && session.questions[action.index]) session.currentQuestionIndex = action.index;
    } else {
      const question = session.questions.find((item) => item.id === action.id);
      if (!question) return;
      const chosen = session.userAnswers[question.id];
      const eliminated = session.eliminatedOptions[question.id] ?? [];
      if (action.type === 'answer') {
        if ((session.mode === 'instant' && chosen) || eliminated.includes(action.answer)) return;
        session.userAnswers[question.id] = action.answer;
        if (session.mode === 'instant') await recordLocalQuestionOutcome(question, action.answer === question.answer);
      } else if (session.mode === 'exam' && action.type === 'eliminate' && action.answer !== chosen) {
        session.eliminatedOptions[question.id] = eliminated.includes(action.answer)
          ? eliminated.filter((item) => item !== action.answer) : [...eliminated, action.answer];
      } else if (session.mode === 'exam' && action.type === 'flag') {
        session.flaggedQuestionIds = session.flaggedQuestionIds.includes(question.id)
          ? session.flaggedQuestionIds.filter((item) => item !== question.id) : [...session.flaggedQuestionIds, question.id];
      } else return;
    }
    session.updatedAt = Date.now();
    await db.quizSessions.put(session);
  });
}

export function finishQuizSession(id: string) {
  return db.transaction('rw', db.quizSessions, db.localQuestions, async () => {
    const session = await getQuizSession(id);
    if (!session) throw new Error('找不到本次试卷');
    if (session.status === 'completed') return;
    if (session.mode === 'exam') {
      for (const question of session.questions) {
        const answer = session.userAnswers[question.id];
        if (answer) await recordLocalQuestionOutcome(question, answer === question.answer);
      }
    }
    const now = Date.now();
    session.status = 'completed';
    session.completedAt = now;
    session.updatedAt = now;
    session.durationSec = Math.max(0, Math.floor((now - session.startedAt) / 1000));
    await db.quizSessions.put(session);
  });
}

export async function markUnfamiliar(ids: string[]) {
  const resolved = await resolveIdioms(ids);
  const idiomIds = [...new Set(Array.from(resolved.values(), ({ id }) => id))];
  return db.transaction('rw', db.studyProgress, async () => {
    const progress = await db.studyProgress.bulkGet(idiomIds);
    const now = Date.now();
    const updates = idiomIds.flatMap((idiomId, index) => {
      const existing = progress[index];
      if (existing?.mastery === 0 && existing.reviewCount > 0) return [];
      return [{
        idiomId, mastery: 0 as const, reviewCount: Math.max(1, existing?.reviewCount ?? 0),
        lastReviewedAt: existing?.lastReviewedAt ?? 0, nextReviewAt: now, isBookmarked: existing?.isBookmarked ?? false,
      }];
    });
    if (updates.length) await db.studyProgress.bulkPut(updates);
    return updates.length;
  });
}
