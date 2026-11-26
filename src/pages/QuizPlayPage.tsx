import { ArrowLeft, Ban, Check, Clock3, Flag, Grid2X2, Layers, Search, Star, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnswerSheetModal } from '@/components/quiz/AnswerSheetModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { contentInset, dangerInk, fixedFooter, formatTime, letters, quizPath, successInk, usePracticeQuery, usePracticeSettings, useQuizSession, useResolvedIdioms, warningInk } from '@/hooks/usePracticeData';
import { findBankQuestion, finishQuizSession, removeQuestionFromBank, saveQuestionsToBank, updateQuizSession } from '@/services/quizEngine';
import type { QuizAction } from '@/services/quizEngine';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/stores/useAppStore';
import type { AnswerOption, QuestionItem } from '@/types/domain';

const inactiveOption = 'border-border-subtle bg-surface';
const correctOption = 'border-success bg-success-soft';
const wrongOption = 'border-danger bg-danger-soft';
const chosenOption = 'border-primary bg-primary-soft';

export function QuestionStem({ question, highlight = false }: { question: QuestionItem; highlight?: boolean }) {
  const clues = highlight ? question.contextClues.filter(Boolean).sort((a, b) => b.length - a.length) : [];
  const escaped = clues.map((clue) => clue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = question.stem.split(new RegExp(`(____${escaped.length ? `|${escaped.join('|')}` : ''})`, 'gu'));
  return <>{parts.map((part, index) => {
    if (part === '____') return <span key={index} role="img" aria-label="填空" className="mx-0.5 inline-block h-[0.8em] w-10 border-b-2 border-primary align-baseline" />;
    return clues.includes(part) ? <mark key={index} className="rounded-sm bg-[color-mix(in_srgb,var(--color-primary)_15%,var(--bg-surface))] px-0.5 text-text-primary">{part}</mark> : part;
  })}</>;
}

interface OptionRowsProps {
  question: QuestionItem;
  chosen?: AnswerOption;
  reveal: boolean;
  compact?: boolean;
  eliminated?: AnswerOption[];
  onChoose?: (option: AnswerOption) => void;
  onEliminate?: (option: AnswerOption) => void;
}

export function OptionRows({ question, chosen, reveal, compact = false, eliminated = [], onChoose, onEliminate }: OptionRowsProps) {
  return (
    <div className={`grid grid-cols-1 ${compact ? 'gap-1.5' : 'gap-2'}`} aria-label="答题选项">
      {letters.map((letter) => {
        const selected = chosen === letter;
        const correct = reveal && question.answer === letter;
        const wrong = reveal && selected && !correct;
        const crossed = eliminated.includes(letter);
        const boxColor = correct ? correctOption : wrong ? wrongOption : selected ? chosenOption : inactiveOption;
        const letterColor = correct ? `border-success ${successInk}` : wrong ? `border-danger ${dangerInk}` : selected ? 'border-primary text-primary' : 'border-border-subtle text-text-secondary';
        const parts = (
          <>
            <span className={`grid size-[25px] shrink-0 place-items-center rounded-full border text-sm font-semibold ${letterColor}`} aria-hidden="true">{letter}</span>
            <span className={`min-w-0 flex-1 border-l border-border-subtle pl-3 text-[15px] font-medium leading-snug ${crossed ? 'text-text-muted line-through' : ''}`}>{question.options[letter]}</span>
          </>
        );
        const row = `flex min-w-0 flex-1 items-center gap-3 px-3 py-1.5 text-left ${compact ? 'min-h-[39px]' : 'min-h-[47px]'}`;
        return (
          <div key={letter} className={`flex min-w-0 items-center overflow-hidden rounded-control border ${boxColor}`}>
            {onChoose ? (
              <button type="button" aria-label={`${letter}. ${question.options[letter]}`} aria-pressed={selected} disabled={reveal || crossed} onClick={() => onChoose(letter)} className={row}>{parts}</button>
            ) : <div className={row}><span className="sr-only">{letter}：</span>{parts}</div>}
            {correct || wrong ? (
              <span className={`mr-3 grid size-6 shrink-0 place-items-center rounded-full border ${letterColor}`}>
                <span className="sr-only">{correct ? '正确选项' : '错误选项'}</span>
                {correct ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <X size={16} strokeWidth={2} aria-hidden="true" />}
              </span>
            ) : onEliminate && (!reveal || crossed) && (
              <button type="button" aria-label={crossed ? `恢复选项 ${letter}` : `排除选项 ${letter}`} aria-pressed={crossed} onClick={() => onEliminate(letter)} disabled={reveal || selected} className="grid h-11 w-10 shrink-0 place-items-center text-text-muted"><Ban size={19} strokeWidth={1.6} aria-hidden="true" /></button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SaveQuestion({ question, outline = false }: { question: QuestionItem; outline?: boolean }) {
  const { data: saved, loading } = usePracticeQuery(useCallback(() => findBankQuestion(question), [question]));
  const showToast = useAppStore((state) => state.showToast);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      if (saved) {
        await removeQuestionFromBank(saved.id);
        showToast({ message: '已从本地题库移除' });
      } else {
        const { added } = await saveQuestionsToBank([question]);
        showToast({ message: added ? '已收入本地题库' : '题目已在本地题库', tone: 'success' });
      }
    } catch {
      showToast({ message: '题库更新失败，请重试', tone: 'danger' });
    } finally { setSaving(false); }
  }
  return (
    <button type="button" aria-pressed={Boolean(saved)} disabled={loading || saving} onClick={toggle} className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold min-[365px]:text-xs ${outline && !saved ? 'border-primary text-primary' : `border-transparent bg-warning-soft ${warningInk}`}`}>
      {outline && !saved ? <span className="text-sm" aria-hidden="true">+</span> : <Star size={14} strokeWidth={1.7} className={saved ? 'fill-current' : ''} aria-hidden="true" />}{saved ? '已入题库' : '收入本地题库'}
      {saved && outline && <span aria-hidden="true" className="flex h-3.5 w-6 items-center justify-end rounded-full bg-warning px-0.5"><span className="size-2.5 rounded-full bg-surface" /></span>}
    </button>
  );
}

export function QuestionAnalysis({ question, chosen, boxed = false }: { question: QuestionItem; chosen?: AnswerOption; boxed?: boolean }) {
  const ordered = boxed ? [question.answer, ...letters.filter((item) => item !== question.answer)] : letters;
  return (
    <div className={boxed ? 'rounded-control bg-page px-2.5 py-2' : ''}>
      {boxed && <h3 className="mb-1 flex items-center gap-2 text-sm font-bold before:h-3.5 before:w-0.5 before:rounded-full before:bg-primary">解析</h3>}
      {question.overallAnalysis && <p className="pb-1.5 text-[13px] leading-relaxed text-text-secondary">{question.overallAnalysis}</p>}
      <ul className="divide-y divide-border-subtle">
        {ordered.map((item) => {
          const color = item === question.answer ? `bg-success-soft ${successInk}` : item === chosen ? `bg-danger-soft ${dangerInk}` : 'bg-subtle text-text-secondary';
          return <li key={item} className="flex items-start gap-2 py-1.5 text-[12px] leading-snug text-text-secondary min-[370px]:text-[13px]"><span className={`grid size-5 shrink-0 place-items-center rounded-full font-semibold ${color}`}>{item}</span><span>{!boxed && <span className="mr-1 text-text-muted" aria-hidden="true">•</span>}{question.optionAnalyses[item]}</span></li>;
        })}
      </ul>
    </div>
  );
}

export function RelatedWords({ question }: { question: QuestionItem }) {
  const navigate = useNavigate();
  const showToast = useAppStore((state) => state.showToast);
  const { data: idioms } = useResolvedIdioms(question.relatedIdioms);
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]"><Layers size={18} strokeWidth={1.75} className="shrink-0 text-primary" aria-hidden="true" /><p className="shrink-0 font-bold">相关成语</p>
      {question.relatedIdioms.map((word) => <button key={word} type="button" className="rounded-lg bg-primary-soft px-2.5 py-1 font-medium text-primary" onClick={() => {
        const entry = idioms?.get(word);
        if (entry) navigate(`/library/idiom/${encodeURIComponent(entry.id)}`);
        else showToast({ message: `词库暂无「${word}」` });
      }}>{idioms?.get(word)?.word ?? word}</button>)}
    </div>
  );
}

export function QuizPlayPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { data: run, loading, failed } = useQuizSession(sessionId);
  const { data: settings } = usePracticeSettings();
  const showToast = useAppStore((state) => state.showToast);
  const large = settings?.fontSize === 'large';
  const [sheet, setSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now);
  const scroll = useRef<HTMLDivElement>(null);
  const index = run?.currentQuestionIndex ?? 0;
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [index]);

  const question = run?.questions[index];
  if (!run || !question || !sessionId) {
    return <div className={`pt-safe ${contentInset}`}><EmptyState title={loading ? '正在载入试卷…' : failed ? '试卷读取失败' : '未找到这份试卷'} action={<Link to="/practice" className="text-primary">返回刷题</Link>} /></div>;
  }
  if (run.status === 'completed') return <Navigate replace to={quizPath(sessionId, '/result')} />;
  const chosen = run.userAnswers[question.id];
  const examine = run.mode === 'exam';
  const reveal = Boolean(chosen) && !examine;
  const current = index + 1;
  const total = run.questions.length;
  const eliminated = (run.eliminatedOptions[question.id] ?? []).filter((option): option is AnswerOption => letters.some((letter) => letter === option));
  const flagged = run.flaggedQuestionIds.includes(question.id);
  const seconds = Math.max(0, Math.floor((now - run.startedAt) / 1000));

  const id = run.id;
  function update(action: QuizAction) {
    void updateQuizSession(id, action).catch(() => showToast({ message: '答题记录保存失败，请重试', tone: 'danger' }));
  }

  function jump(index: number) {
    update({ type: 'jump', index });
    setSheet(false);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSheet(false);
    try {
      await finishQuizSession(id);
      navigate(quizPath(id, '/result'), { replace: true });
    } catch {
      setSubmitting(false);
      showToast({ message: '交卷失败，请重试', tone: 'danger' });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={`pt-safe shrink-0 ${contentInset}`}>
        <div className="grid min-h-[50px] grid-cols-[32px_minmax(0,1fr)_auto] items-center min-[365px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link to={run.origin === 'bank' ? '/bank' : '/practice'} className="grid size-8 place-items-center" aria-label="退出答题"><ArrowLeft size={20} strokeWidth={1.7} aria-hidden="true" /></Link>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm text-text-secondary"><span className="text-nowrap tabular-nums" aria-label={`第 ${current} 题，共 ${total} 题`}>{current} / {total}</span><span className={`rounded-full px-1.5 py-1 text-[10px] font-semibold leading-none ${question.source === 'ai' ? 'bg-primary-soft text-primary' : `bg-warning-soft ${warningInk}`}`}>{question.source === 'ai' ? 'AI新题' : '本地旧题'}</span></div>
          <div className="flex items-center gap-1 justify-self-end">
            <span className="flex items-center gap-1 text-[13px] font-medium tabular-nums" aria-label={`用时 ${formatTime(seconds)}`}><Clock3 size={15} strokeWidth={1.8} aria-hidden="true" />{formatTime(seconds)}</span>
            {examine && <button type="button" aria-label={flagged ? '取消标记本题' : '标记本题'} aria-pressed={flagged} className={`grid size-8 place-items-center ${flagged ? warningInk : 'text-text-secondary'}`} onClick={() => update({ type: 'flag', id: question.id })}><Flag size={17} strokeWidth={1.75} className={flagged ? 'fill-current' : ''} aria-hidden="true" /></button>}
            <button type="button" aria-label="打开答题卡" className="grid size-8 place-items-center" onClick={() => setSheet(true)}><Grid2X2 size={19} strokeWidth={1.75} aria-hidden="true" /></button>
          </div>
        </div>
        <div aria-hidden="true" className="mx-0.5 h-[3px] overflow-hidden rounded-full bg-border-subtle"><div className="h-full rounded-full bg-primary" style={{ width: `${current / total * 100}%` }} /></div>
      </header>

      <div ref={scroll} className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-3 [scrollbar-width:none] ${contentInset}`}>
        <h1 className="sr-only">逻辑填空答题</h1>
        <Card className="!px-4 !py-3"><p className={`${large ? 'text-[19px]' : 'text-[16px]'} font-medium leading-[1.75]`}><QuestionStem question={question} highlight={reveal} /></p></Card>
        <OptionRows question={question} chosen={chosen} reveal={reveal} eliminated={eliminated}
          onChoose={submitting ? undefined : (answer) => update({ type: 'answer', id: question.id, answer })}
          onEliminate={examine && !submitting ? (answer) => update({ type: 'eliminate', id: question.id, answer }) : undefined} />
        <div className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${reveal ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            {reveal && (
              <Card className="!p-3.5" aria-label="即时解析">
                <div className="flex items-center justify-between gap-2"><h2 className="text-[18px] font-bold">正确答案 <span className={successInk}>{question.answer}</span></h2><SaveQuestion question={question} /></div>
                <div className="my-3 flex flex-wrap items-center gap-2 border-b border-border-subtle pb-2.5 text-[13px]"><Search size={18} strokeWidth={1.75} className="text-primary" aria-hidden="true" /><h3 className="font-bold">语境线索</h3>{question.contextClues.map((clue) => <span key={clue} className="rounded-md bg-primary-soft px-2.5 py-0.5 font-medium text-primary">{clue}</span>)}</div>
                <QuestionAnalysis question={question} chosen={chosen} />
                <div className="mt-2 border-t border-border-subtle pt-2.5"><RelatedWords question={question} /></div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <footer className={fixedFooter}>
        <Button variant="outline" className="!text-primary" disabled={index === 0 || submitting} onClick={() => jump(index - 1)}>上一题</Button>
        <Button disabled={submitting} onClick={() => current === total ? submit() : jump(index + 1)}>{current < total ? '下一题' : examine ? '交卷看解析' : '查看报告'}</Button>
      </footer>
      <AnswerSheetModal open={sheet} run={run} index={index} onClose={() => setSheet(false)} onPick={jump} onSubmit={submit} />
    </div>
  );
}
