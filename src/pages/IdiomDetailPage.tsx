import { ArrowLeft, BookOpen, Bookmark, BookmarkCheck, BookmarkPlus, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Layers, Scale } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { intensityLabels, masteryStyles, sentimentLabels, useLearningVocabulary } from '@/data/uiMockLearning';
import type { IdiomQueueState } from '@/data/uiMockLearning';
import { findIdiomsByWord, findRelatedConfusionGroups, getDueReviewProgress, recordIdiomMastery, toggleIdiomBookmark } from '@/services/learningService';
import { useAppStore } from '@/stores/useAppStore';
import type { ConfusionGroup, Idiom, MasteryLevel, StudyProgress } from '@/types/domain';

const masteryLevels = [0, 1, 2, 3] as const;
const reviewLabels = ['10 分钟', '1 天', '3 天', '7 天'] as const;
const relatedClass = 'flex min-h-[46px] w-full items-center justify-between gap-2.5 rounded-card border border-border-subtle bg-surface px-3 text-left shadow-card';

function HighlightedClues({ text, clues }: { text: string; clues: string[] }) {
  const highlights = clues.filter(Boolean).sort((a, b) => b.length - a.length);
  if (highlights.length === 0) return text;
  const pattern = highlights.map((clue) => clue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return text.split(new RegExp(`(${pattern})`, 'g')).map((segment, index) => (
    highlights.includes(segment)
      ? <span key={index} className="underline decoration-accent decoration-2 underline-offset-4">{segment}</span>
      : segment
  ));
}

function IdiomWord({ idiom }: { idiom: Idiom }) {
  const { keyChar } = idiom.morphemeHint;
  const position = idiom.word.indexOf(keyChar);
  if (!keyChar || position < 0) return idiom.word;
  return (
    <>
      {idiom.word.slice(0, position)}
      <span className="rounded-lg bg-accent-soft px-1 text-primary">{keyChar}</span>
      {idiom.word.slice(position + keyChar.length)}
    </>
  );
}

interface IdiomCardProps {
  idiom: Idiom;
  queue: IdiomQueueState;
  reviewMode: boolean;
  progress?: StudyProgress;
  related: ConfusionGroup[];
}

function IdiomCard({ idiom, queue, reviewMode, progress, related }: IdiomCardProps) {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [savedQueue] = useState(queue);
  const [saving, setSaving] = useState(false);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [preparingPractice, setPreparingPractice] = useState(false);
  const active = useRef(true);
  const advanceTimer = useRef<number>();
  const inBasket = useAppStore((state) => state.selectedWordIds.includes(idiom.id));
  const toggleSelectedWord = useAppStore((state) => state.toggleSelectedWord);
  const setSelectedWordIds = useAppStore((state) => state.setSelectedWordIds);
  const showToast = useAppStore((state) => state.showToast);
  const mastery = progress?.mastery ?? null;
  const bookmarked = progress?.isBookmarked ?? false;
  const { queueIds, libraryView } = savedQueue;
  const index = queueIds.indexOf(idiom.id);
  const previous = queueIds[index - 1];
  const next = queueIds[index + 1];
  const example = idiom.examples[0];
  const segments = example?.sentence.split(/(____)/u) ?? [];
  const tag = idiom.tags.includes('易望文生义') ? '易望文生义' : idiom.tags[0];
  const frequency = idiom.frequency === 5 ? '超高频' : idiom.frequency === 4 ? '高频' : `${idiom.frequency} 星`;
  const notes = [
    { title: '语素拆解', text: idiom.morphemeHint.explanation, icon: BookOpen, bg: 'bg-accent-soft', ink: 'text-primary' },
    { title: '行测避坑', text: idiom.commonMistake, icon: CircleAlert, bg: 'bg-danger-soft', ink: 'text-danger' },
  ];

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      window.clearTimeout(advanceTimer.current);
    };
  }, []);

  function idiomPath(id: string) {
    return `/library/idiom/${encodeURIComponent(id)}${reviewMode ? '?mode=review' : ''}`;
  }

  async function saveMastery(level: MasteryLevel) {
    setSaving(true);
    try {
      await recordIdiomMastery(idiom.id, level);
      if (!active.current) return;
      const message = `已标为「${masteryStyles[level].label}」，${reviewLabels[level]}后复习`;
      showToast({ message: next ? message : `已完成本轮学习。${message}`, tone: 'success' });
      if (next) {
        advanceTimer.current = window.setTimeout(() => navigate(idiomPath(next), { replace: true, state: savedQueue }), 260);
      } else setSaving(false);
    } catch {
      if (!active.current) return;
      setSaving(false);
      showToast({ message: '掌握度保存失败，请重试', tone: 'danger' });
    }
  }

  async function toggleBookmark() {
    setBookmarkSaving(true);
    try {
      const added = await toggleIdiomBookmark(idiom.id);
      if (active.current) showToast({ message: added ? '已收藏成语' : '已取消收藏', tone: added ? 'success' : 'neutral' });
    } catch {
      if (active.current) showToast({ message: '收藏状态保存失败，请重试', tone: 'danger' });
    } finally {
      if (active.current) setBookmarkSaving(false);
    }
  }

  async function practiceWithRelatedWords() {
    setPreparingPractice(true);
    try {
      const matches = await findIdiomsByWord(idiom.confusableWith);
      if (!active.current) return;
      setSelectedWordIds([idiom.id, ...Array.from(matches.values(), ({ id }) => id)]);
      navigate('/practice');
    } catch {
      if (active.current) {
        setPreparingPractice(false);
        showToast({ message: '出题词单载入失败，请重试', tone: 'danger' });
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="pt-safe shrink-0 px-[var(--learning-gutter)]">
        <div className="grid min-h-[57px] grid-cols-[88px_minmax(0,1fr)_88px] items-center">
          <Link to="/library" state={libraryView} aria-label="返回词库" className="grid size-11 place-items-center rounded-control hover:bg-subtle">
            <ArrowLeft size={21} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <div className="flex items-center justify-center gap-0.5">
            {previous && !saving ? (
              <Link to={idiomPath(previous)} replace state={savedQueue} aria-label="上一词" className="grid h-11 w-6 shrink-0 place-items-center rounded-control text-primary hover:bg-subtle min-[365px]:w-8"><ChevronLeft size={18} aria-hidden="true" /></Link>
            ) : <span className="w-6 shrink-0 min-[365px]:w-8" />}
            <p className="whitespace-nowrap text-center text-sm font-medium tabular-nums text-text-secondary" aria-label={`第 ${index + 1} 个成语，共 ${queueIds.length} 个`}>{index + 1} / {queueIds.length}</p>
            {next && !saving ? (
              <Link to={idiomPath(next)} replace state={savedQueue} aria-label="下一词" className="grid h-11 w-6 shrink-0 place-items-center rounded-control text-primary hover:bg-subtle min-[365px]:w-8"><ChevronRight size={18} aria-hidden="true" /></Link>
            ) : <span className="w-6 shrink-0 min-[365px]:w-8" />}
          </div>
          <div className="flex">
            <button type="button" aria-label={bookmarked ? '取消收藏成语' : '收藏成语'} aria-pressed={bookmarked} disabled={bookmarkSaving} onClick={toggleBookmark} className={`grid size-11 place-items-center rounded-control hover:bg-subtle ${bookmarked ? 'text-primary' : 'text-text-primary'}`}>
              <Bookmark size={20} strokeWidth={1.75} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={inBasket ? '从出题词单移除' : '加入出题词单'}
              aria-pressed={inBasket}
              className={`grid size-11 place-items-center rounded-control hover:bg-subtle ${inBasket ? 'text-primary' : 'text-text-primary'}`}
              onClick={() => {
                toggleSelectedWord(idiom.id);
                showToast({ message: inBasket ? '已移出 AI 出题词单' : '已加入 AI 出题词单', tone: inBasket ? 'neutral' : 'success' });
              }}
            >
              {inBasket ? <BookmarkCheck size={22} strokeWidth={1.75} aria-hidden="true" /> : <BookmarkPlus size={22} strokeWidth={1.75} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-[var(--learning-gutter)] pb-3 [scrollbar-width:none]">
        <Card className="!p-[14px]">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <h1 className="text-[clamp(28px,9vw,36px)] font-bold leading-tight tracking-tight"><IdiomWord idiom={idiom} /></h1>
            {tag && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1.5 text-xs font-semibold text-[color:var(--learning-warning-ink)]">
                <CircleAlert size={15} strokeWidth={1.85} aria-hidden="true" /> {tag}
              </span>
            )}
          </div>
          <p className="mt-1 text-[14px] text-text-secondary">{idiom.pinyin}</p>
          <p className="mt-3 text-[15px] font-medium leading-relaxed">{idiom.coreMeaning}</p>
          <dl className="mt-3.5 grid grid-cols-3 gap-2 min-[370px]:gap-3">
            {[
              { label: '感情', value: sentimentLabels[idiom.sentiment], bg: 'bg-subtle' },
              { label: '轻重', value: intensityLabels[idiom.intensity], bg: 'bg-subtle' },
              { label: '频次', value: frequency, bg: 'bg-primary-soft' },
            ].map(({ label, value, bg }) => (
              <div key={label} className={`rounded-lg px-0.5 py-1.5 text-center text-[11px] leading-5 min-[350px]:text-[13px] ${bg}`}>
                <dt className="inline text-text-secondary">{label}：</dt><dd className="inline font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="grid gap-2.5 !p-2.5">
          {notes.map(({ title, text, icon: Icon, bg, ink }) => (
            <section key={title} className={`flex items-center gap-3 rounded-control p-2.5 ${bg}`}>
              <div className={`grid w-[42px] shrink-0 place-items-center self-stretch border-r border-border-subtle pr-2 ${ink}`}>
                <Icon size={23} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold">{title}</h2>
                <p className="mt-0.5 text-[13px] leading-[1.45] text-text-secondary">{text}</p>
              </div>
            </section>
          ))}
        </Card>

        <Card className="!p-3">
          <h2 className="text-lg font-bold">语境例句 · 点击自测</h2>
          {example && (
            <>
              <p className="mt-2.5 text-[15px] leading-[2]">
                {segments.map((segment, index) => segment === '____' ? (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={revealed}
                    aria-label={revealed ? `隐藏成语 ${idiom.word}` : '点击揭晓成语'}
                    className={`mx-1 inline-flex rounded-lg border border-dashed px-2.5 py-1 align-baseline text-[13px] font-semibold leading-5 text-primary transition-colors motion-reduce:transition-none ${revealed ? 'border-transparent bg-primary-soft' : 'border-primary bg-accent-soft'}`}
                    onClick={() => setRevealed(!revealed)}
                  >
                    {revealed ? idiom.word : '点击揭晓成语'}
                  </button>
                ) : <HighlightedClues key={index} text={segment} clues={example.highlightClues} />)}
              </p>
              {revealed && (
                <div role="status" className="mt-2 flex items-start gap-2.5 rounded-control bg-primary-soft px-2.5 py-2 text-[14px] leading-relaxed">
                  <CircleCheck className="mt-0.5 shrink-0 text-primary" size={18} strokeWidth={1.75} aria-hidden="true" />
                  <p className="border-l border-border-subtle pl-2.5">
                    <strong className="font-bold text-primary">{idiom.word}</strong>
                  </p>
                </div>
              )}
            </>
          )}
          {idiom.collocations.length > 0 && (
            <div className="mt-3 flex items-center gap-2.5 border-t border-border-subtle pt-3">
              <Layers size={20} strokeWidth={1.75} className="shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 border-l border-border-subtle pl-2.5">
                <h3 className="text-[14px] font-bold">常用搭配</h3>
                <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">{idiom.collocations.slice(0, 2).join('、')}</p>
              </div>
            </div>
          )}
        </Card>

        {related.map((group) => (
          <Link key={group.id} to={`/library/confusion/${encodeURIComponent(group.id)}`} className={relatedClass}>
            <Scale size={21} strokeWidth={1.75} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 border-l border-border-subtle pl-3 text-[15px] font-bold">进入易混辨析组：{group.title}</span>
            <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
          </Link>
        ))}
        {related.length === 0 && (
          <button type="button" disabled={preparingPractice} onClick={practiceWithRelatedWords} className={relatedClass}>
            <Scale size={21} strokeWidth={1.75} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 border-l border-border-subtle pl-3 text-[15px] font-bold">用该词及易混词 AI 出题</span>
            <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
          </button>
        )}
      </div>

      <footer className="pb-safe shrink-0 border-t border-border-subtle bg-surface px-[var(--learning-gutter)] pt-2.5">
        <div role="group" aria-label="掌握度" className="grid grid-cols-4 gap-1.5">
          {masteryLevels.map((level) => {
            const { label, color, active } = masteryStyles[level];
            return (
              <button key={level} type="button" disabled={saving} aria-pressed={mastery === level} onClick={() => saveMastery(level)} className={`flex min-h-11 items-center justify-center gap-1 rounded-control border text-[15px] font-bold ${color} ${mastery === level ? active : 'border-transparent'}`}>
                {mastery === level && <CircleCheck size={15} aria-hidden="true" />}{label}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

export function IdiomDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const reviewMode = params.get('mode') === 'review';
  const navigation = useLocation().state as IdiomQueueState | null;
  const { idioms, groups, progress, loading, failed, retry } = useLearningVocabulary();
  const idiom = idioms.find((entry) => entry.id === id);

  if (!idiom) return (
    <div className="pt-safe px-[var(--learning-gutter)]">
      <Link to="/library" className="inline-flex min-h-12 items-center gap-2 text-primary"><ArrowLeft size={20} aria-hidden="true" /> 返回词库</Link>
      <EmptyState title={loading ? '正在加载成语…' : failed ? '词库加载失败' : '未找到这个成语'} action={retry && <Button onClick={retry}>重试</Button>} />
    </div>
  );

  let queueIds = navigation?.queueIds;
  if (!queueIds && reviewMode) {
    const available = new Set(idioms.map((entry) => entry.id));
    queueIds = getDueReviewProgress(progress.values()).map(({ idiomId }) => idiomId).filter((entry) => available.has(entry));
    if (queueIds.length === 0) {
      queueIds = idioms.filter((entry) => !progress.get(entry.id)?.reviewCount)
        .sort((a, b) => b.frequency - a.frequency || indexedDB.cmp(b.id, a.id))
        .map((entry) => entry.id);
    }
  }
  queueIds ??= idioms.map((entry) => entry.id);
  if (!queueIds.includes(idiom.id)) queueIds = [idiom.id, ...queueIds];

  return <IdiomCard key={`${idiom.id}:${reviewMode}`} idiom={idiom} queue={{ queueIds, libraryView: navigation?.libraryView }}
    reviewMode={reviewMode} progress={progress.get(idiom.id)} related={findRelatedConfusionGroups(idiom.word, groups)} />;
}
