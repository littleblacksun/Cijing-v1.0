import { ChevronRight, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { db } from '@/db/database';
import { contentInset, dangerInk, fixedFooter, formatTime, quizPath, successInk, usePracticeQuery, useQuizSession, wrongQuestions } from '@/hooks/usePracticeData';
import { markUnfamiliar, resolveIdioms, saveQuestionsToBank } from '@/services/quizEngine';
import type { StoredQuizSession } from '@/services/quizEngine';
import { useAppStore } from '@/stores/useAppStore';

export function QuizResultPage() {
  const { sessionId } = useParams();
  const { data: run, loading, failed } = useQuizSession(sessionId);
  if (!run) return <div className={`pt-safe ${contentInset}`}><EmptyState title={loading ? '正在读取练习报告…' : failed ? '练习报告读取失败' : '未找到这份试卷'} action={<Link to="/practice" className="text-primary">返回刷题</Link>} /></div>;
  if (run.status === 'in_progress') return <Navigate replace to={quizPath(run.id)} />;
  return <CompletedResult run={run} />;
}

function CompletedResult({ run }: { run: StoredQuizSession }) {
  const [marking, setMarking] = useState(false);
  const [saving, setSaving] = useState(false);
  const showToast = useAppStore((state) => state.showToast);
  const total = run.questions.length;
  const wrong = wrongQuestions(run);
  const correct = total - wrong.length;
  const accuracy = Math.round(correct / total * 100);
  const old = run.localCount;
  const elapsed = formatTime(run.durationSec);
  const weak = [...new Set(wrong.flatMap((item) => item.relatedIdioms))];
  const { data: weakData } = usePracticeQuery(useCallback(() => db.transaction('r', db.idioms, db.studyProgress, async () => {
    const idioms = await resolveIdioms([...new Set(wrongQuestions(run).flatMap(({ relatedIdioms }) => relatedIdioms))]);
    const ids = [...new Set(Array.from(idioms.values(), ({ id }) => id))];
    const progress = await db.studyProgress.bulkGet(ids);
    return { idioms, canMark: ids.length > 0, marked: progress.every((item) => item?.mastery === 0 && item.reviewCount > 0) };
  }), [run]));
  const labels = [...new Set(weak.map((word) => weakData?.idioms.get(word)?.word ?? word))];
  const review = quizPath(run.id, '/review');

  async function mark() {
    setMarking(true);
    try {
      const count = await markUnfamiliar(weak);
      showToast({ message: count ? `已将 ${count} 个成语标为陌生` : '相关成语已标为陌生', tone: 'success' });
    } catch { showToast({ message: '学习进度保存失败，请重试', tone: 'danger' }); }
    finally { setMarking(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const { added, skipped } = await saveQuestionsToBank(run.questions);
      showToast({ message: `已收入 ${added} 题，跳过 ${skipped} 道重复题`, tone: 'success' });
    } catch { showToast({ message: '入库失败，请重试', tone: 'danger' }); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={`pt-safe shrink-0 ${contentInset}`}>
        <div className="grid min-h-[58px] grid-cols-[40px_1fr_40px] items-center">
          <Link to={run.origin === 'bank' ? '/bank' : '/practice'} aria-label="关闭练习报告" className="grid size-9 place-items-center"><X size={22} strokeWidth={1.8} aria-hidden="true" /></Link>
          <h1 className="text-center text-xl font-bold">练习报告</h1>
        </div>
      </header>
      <div className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4 ${contentInset}`}>
        <Card className="!px-3 !pb-5 !pt-4">
          <div className="relative mx-auto grid size-[min(46vw,181px)] place-items-center min-[460px]:size-[181px]">
            <svg viewBox="0 0 180 180" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
              <circle cx="90" cy="90" r="81" stroke="var(--border-subtle)" strokeWidth="15" fill="none" />
              {accuracy > 0 && <circle cx="90" cy="90" r="81" stroke="var(--color-primary)" strokeWidth="15" fill="none" strokeLinecap="round" pathLength="100" strokeDasharray={`${accuracy} 100`} />}
            </svg>
            <div className="relative text-center"><p className="text-[clamp(30px,11vw,44px)] font-bold leading-none tabular-nums">{accuracy}%</p><p className="mt-1.5 text-[13px] text-text-secondary">答对 {correct} / {total} 题</p></div>
          </div>
          <dl className="mt-5 grid grid-cols-3 divide-x divide-border-subtle text-center">
            {[['总用时', elapsed], ['AI新题', run.aiCount], ['本地旧题', old]].map(([label, value]) => <div key={label} className="grid gap-1"><dt className="text-sm text-text-secondary">{label}</dt><dd className="text-[23px] font-bold leading-tight tabular-nums">{value}</dd></div>)}
          </dl>
        </Card>
        <Card className="!p-3.5">
          <h2 className="text-xl font-bold">答题分布</h2>
          <div className="mt-3.5 grid grid-cols-5 justify-items-center gap-y-3.5">
            {run.questions.map((item, index) => {
              const answered = run.userAnswers[item.id];
              const right = answered === item.answer;
              const label = !answered ? '未答' : right ? '答对' : '答错';
              const color = !answered ? 'bg-subtle text-text-secondary' : right ? `bg-success-soft ${successInk}` : `bg-danger-soft ${dangerInk}`;
              return <Link key={item.id} to={`${review}?question=${index + 1}`} aria-label={`第 ${index + 1} 题，${label}`} className={`relative grid size-11 place-items-center rounded-full text-xl font-bold tabular-nums ${color}`}>{index + 1}{item.source === 'local' && <span aria-label="本地旧题" className="absolute -right-0.5 top-0 size-2.5 rounded-full border border-surface bg-warning" />}</Link>;
            })}
          </div>
        </Card>
        <Card className="!p-3.5">
          <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">本卷薄弱成语</h2>{weakData?.canMark && <button type="button" disabled={marking || weakData.marked} className="inline-flex items-center gap-0.5 text-xs font-medium text-text-secondary" onClick={mark}>{weakData.marked ? '已标为陌生' : '标为陌生'}<ChevronRight size={14} aria-hidden="true" /></button>}</div>
          {labels.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{labels.map((word) => <span key={word} className={`rounded-lg bg-danger-soft px-3 py-1.5 text-sm font-semibold ${dangerInk}`}>{word}</span>)}</div> : <p className="mt-2 text-sm text-text-secondary">{wrong.length ? '本卷错题暂无相关成语' : '本卷全部答对'}</p>}
        </Card>
      </div>
      <footer className={fixedFooter}>
        <Button variant="outline" className="!px-2 !text-primary" disabled={saving} onClick={save}>全部收入题库</Button>
        <Link to={review} className="flex min-h-11 items-center justify-center rounded-control bg-primary px-2 text-sm font-semibold text-surface">查看解析复盘</Link>
      </footer>
    </div>
  );
}
