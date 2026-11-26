import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  AppSettings,
  ConfusionGroup,
  Idiom,
  LocalQuestion,
  QuizSession,
  StudyProgress,
} from '@/types/domain';

class CiJingDB extends Dexie {
  declare idioms: Table<Idiom, Idiom['id']>;
  declare confusionGroups: Table<ConfusionGroup, ConfusionGroup['id']>;
  declare studyProgress: Table<StudyProgress, StudyProgress['idiomId']>;
  declare localQuestions: Table<LocalQuestion, LocalQuestion['id']>;
  declare quizSessions: Table<QuizSession, QuizSession['id']>;
  declare appSettings: Table<AppSettings, AppSettings['id']>;

  constructor() {
    super('CiJingDB');
    this.version(1).stores({
      idioms: 'id, word, frequency, sentiment, *tags',
      confusionGroups: 'id, title, category, difficulty',
      studyProgress: 'idiomId, mastery, nextReviewAt, isBookmarked',
      localQuestions: 'id, &fingerprint, savedAt, wrongCount, lastPracticedAt, *relatedIdioms',
      quizSessions: 'id, status, startedAt, completedAt',
      appSettings: 'id',
    });
  }
}

export const db = new CiJingDB();
