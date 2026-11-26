import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { contentInset, dangerInk, fixedFooter, quizPath, successInk, useLocalBank, usePracticeSettings, useQuizSession, wrongQuestions } from '@/hooks/usePracticeData';
import { fingerprintOf, saveQuestionsToBank } from '@/services/quizEngine';
import type { StoredQuizSession } from '@/services/quizEngine';
import { useAppStore } from '@/stores/useAppStore';
import { OptionRows, QuestionAnalysis, QuestionStem, RelatedWords, SaveQuestion } from './QuizPlayPage';

export function QuizReviewPage() {
  const { sessionId } = useParams();
  const { data: run, loading, failed } = useQuizSession(sessionId);
  if (!run) return <div className={`pt-safe ${contentInset}`}><EmptyState title={loading ? '正在读取解析…' : failed ? '解析读取失败' : '未找到这份试卷'} action={<Link to="/practice" className="text-primary">返回刷题</Link>} /></div>;
  if (run.status === 'in_progress') return <Navigate replace to={quizPath(run.id)} />;
  return <CompletedReview run={run} />;
}

function CompletedReview({ run }: { run: StoredQuizSession }) {
  const [params] = useSearchParams();
  const { data: bank = [] } = useLocalBank();
  const { data: settings } = usePracticeSettings();
  const [saving, setSaving] = useState(false);
  const large = settings?.fontSize === 'large';
  const showToast = useAppStore((state) => state.showToast);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const wrong = wrongQuestions(run);
  const visible = onlyWrong ? wrong : run.questions;
  const fingerprints = new Set(bank.map(({ fingerprint }) => fingerprint));
  const saved = run.questions.filter((item) => fingerprints.has(fingerprintOf(item))).length;

  async function saveWrong() {
    setSaving(true);
    try {
      const { added, skipped } = await saveQuestionsToBank(wrong);
      showToast({ message: `错题入库新增 ${added} 题，跳过 ${skipped} 道重复题`, tone: 'success' });
    } catch { showToast({ message: '入库失败，请重试', tone: 'danger' }); }
    finally { setSaving(false); }
  }
  const position = Number(params.get('question'));

  useEffect(() => {
    const list = scroll.current;
    if (!list) return;
    list.scrollTop = 0;
    if (!onlyWrong && Number.isInteger(position) && position > 0 && position <= run.questions.length) {
      list.querySelector(`#review-question-${position}`)?.scrollIntoView({ block: 'start' });
    }
  }, [onlyWrong, position, run.questions.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={`pt-safe shrink-0 ${contentInset}`}>
        <div className="grid min-h-[58px] grid-cols-[32px_1fr_auto] items-center gap-1">
          <Link to={quizPath(run.id, '/result')} aria-label="返回练习报告" className="grid size-8 place-items-center"><ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" /></Link>
          <h1 className="sr-only">整卷解析复盘</h1>
          <div role="group" aria-label="复盘筛选" className="mx-auto grid w-full max-w-[184px] grid-cols-2 rounded-full bg-subtle p-0.5 text-[12px] min-[360px]:text-sm">
            <button type="button" aria-pressed={!onlyWrong} onClick={() => setOnlyWrong(false)} className={`rounded-full py-1 ${onlyWrong ? 'text-text-secondary' : 'bg-surface font-semibold text-primary shadow-card'}`}>全部 {run.questions.length}</button>
            <button type="button" aria-pressed={onlyWrong} onClick={() => setOnlyWrong(true)} className={`rounded-full py-1 ${onlyWrong ? 'bg-surface font-semibold text-primary shadow-card' : 'text-text-secondary'}`}>仅错题 {wrong.length}</button>
          </div>
          <button type="button" disabled={saving || wrong.length === 0} onClick={saveWrong} className="min-h-10 whitespace-nowrap px-0.5 text-[12px] font-semibold text-primary disabled:opacity-50 min-[365px]:text-sm">错题全入库</button>
        </div>
      </header>
      <div ref={scroll} className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4 ${contentInset}`}>
        {visible.length === 0 && <EmptyState title="本卷没有错题" />}
        {visible.map((item) => {
          const index = run.questions.indexOf(item) + 1;
          const chosen = run.userAnswers[item.id];
          const right = chosen === item.answer;
          return (
            <Card id={`review-question-${index}`} key={item.id} className="space-y-3 !p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-2"><h2 className="flex shrink-0 items-center gap-2 text-[16px] font-bold before:h-5 before:w-1 before:rounded-full before:bg-primary min-[370px]:text-lg">第 {index} 题</h2><span className={`rounded-full px-1.5 py-1 text-[10px] font-semibold min-[365px]:px-2 min-[365px]:text-[11px] ${right ? `bg-success-soft ${successInk}` : `bg-danger-soft ${dangerInk}`}`}>{right ? `回答正确 · ${item.answer}` : `${chosen ? `你选 ${chosen}` : '未作答'} · 正解 ${item.answer}`}</span></div>
                <SaveQuestion question={item} outline />
              </div>
              <p className={`${large ? 'text-[19px]' : 'text-base'} px-1 leading-[1.7]`}><QuestionStem question={item} highlight /></p>
              <OptionRows question={item} chosen={chosen} reveal compact />
              <QuestionAnalysis question={item} chosen={chosen} boxed />
              <div className="px-1 pb-0.5"><RelatedWords question={item} /></div>
            </Card>
          );
        })}
      </div>
      <footer className={fixedFooter}>
        <p role="status" className="grid min-h-11 place-items-center rounded-control border border-border-subtle text-sm font-medium text-text-secondary"><span>已入库 <strong className="text-base text-primary">{saved}</strong> 题</span></p>
        <Link to={run.origin === 'bank' ? '/bank' : '/practice'} className="flex min-h-11 items-center justify-center rounded-control bg-primary text-sm font-semibold text-surface">完成复盘</Link>
      </footer>
    </div>
  );
}
