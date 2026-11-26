export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Intensity = 'light' | 'medium' | 'heavy';
export type MasteryLevel = 0 | 1 | 2 | 3;
export type QuizMode = 'instant' | 'exam';
export type QuizCount = 5 | 10 | 15 | 20;
export type AnswerOption = 'A' | 'B' | 'C' | 'D';

type Frequency = 1 | 2 | 3 | 4 | 5;

export interface Idiom {
  id: string;
  word: string;
  pinyin: string;
  frequency: Frequency;
  coreMeaning: string;
  morphemeHint: {
    keyChar: string;
    explanation: string;
  };
  sentiment: Sentiment;
  intensity: Intensity;
  applicableObjects: string[];
  collocations: string[];
  commonMistake: string;
  tags: string[];
  examples: {
    sentence: string;
    highlightClues: string[];
  }[];
  confusableWith: string[];
}

export interface ConfusionGroup {
  id: string;
  title: string;
  category: string;
  difficulty: number;
  summary: string;
  words: {
    word: string;
    diffChars: string[];
    focus: string;
    sentiment: Sentiment;
    intensity: Intensity;
    applicable: string;
    pitfall: string;
  }[];
  contrastExamples: {
    context: string;
    correctWord: string;
    wrongWord: string;
    clue: string;
  }[];
  quickDrills: {
    stem: string;
    options: string[];
    answer: string;
    analysis: string;
  }[];
}

export interface GeneratedVocabulary {
  idioms: Idiom[];
  confusionGroups: ConfusionGroup[];
  sourceFiles: string[];
  syncedAt: string;
}

export interface StudyProgress {
  idiomId: string;
  mastery: MasteryLevel;
  reviewCount: number;
  lastReviewedAt: number;
  nextReviewAt: number;
  isBookmarked: boolean;
}

export interface QuestionItem {
  id: string;
  source: 'ai' | 'local';
  stem: string;
  options: Record<AnswerOption, string>;
  answer: AnswerOption;
  contextClues: string[];
  overallAnalysis: string;
  optionAnalyses: Record<AnswerOption, string>;
  relatedIdioms: string[];
  createdAt: number;
}

export interface LocalQuestion extends QuestionItem {
  savedAt: number;
  practiceCount: number;
  wrongCount: number;
  lastPracticedAt?: number;
  fingerprint: string;
}

export interface QuizSession {
  id: string;
  mode: QuizMode;
  totalCount: QuizCount;
  localCount: number;
  aiCount: number;
  targetIdioms: string[];
  questions: QuestionItem[];
  userAnswers: Record<string, AnswerOption>;
  eliminatedOptions: Record<string, string[]>;
  flaggedQuestionIds: string[];
  savedQuestionIds: string[];
  status: 'in_progress' | 'completed';
  startedAt: number;
  completedAt?: number;
  durationSec: number;
}

export interface AppSettings {
  id: 'default';
  localBankRatio: number;
  defaultQuizMode: QuizMode;
  fontSize: 'normal' | 'large';
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmPromptStyle: 'guokao' | 'shengkao' | 'basic';
}
