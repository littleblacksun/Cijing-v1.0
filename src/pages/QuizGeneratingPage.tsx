import { BookOpen, Check, Circle, FileText, LoaderCircle, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import type { AppData } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { db } from '@/db/database';
import { contentInset, modeLabels, parseCount, quizPath, shuffled, successInk, usePracticeQuery } from '@/hooks/usePracticeData';
import { createQuizSession } from '@/services/quizEngine';
import { useAppStore } from '@/stores/useAppStore';

async function readTips() {
  const idioms = await db.idioms.where('frequency').aboveOrEqual(4).filter(({ commonMistake }) => Boolean(commonMistake.trim())).toArray();
  return shuffled(idioms).slice(0, 5);
}

export function QuizGeneratingPage() {
  const [params] = useSearchParams();
  const { state } = useLocation();
  const appData = useOutletContext<AppData>();
  const navigate = useNavigate();
  const [wordIds] = useState<string[]>(() => state?.wordIds ?? useAppStore.getState().selectedWordIds);
  const count = parseCount(params.get('count'));
  const requestedMode = params.get('mode');
  const defaultMode = useAppStore((store) => store.settings?.defaultQuizMode);
  const mode = requestedMode === 'exam' || requestedMode === 'instant' ? requestedMode : defaultMode ?? 'instant';
  const [attempt, setAttempt] = useState(0);
  const [local, setLocal] = useState<{ count: number; ratio: number }>();
  const [generated, setGenerated] = useState(0);
  const [assembling, setAssembling] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController>();
  const { data: tips } = usePracticeQuery(readTips);
  const [tipIndex, setTipIndex] = useState(0);
  const ready = appData.status === 'ready';
  const needed = count - (local?.count ?? 0);
  const progress = assembling ? 100 : local ? (needed === 0 ? 90 : 25 + Math.round(65 * generated / needed)) : 0;

  useEffect(() => {
    const timer = window.setInterval(() => setTipIndex((index) => index + 1), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    request.current = controller;
    // StrictMode's initial cleanup clears this scheduled start before any request is sent.
    const start = window.setTimeout(() => {
      void createQuizSession({
        wordIds, count, mode, signal: controller.signal,
        onLocalPicked: (count, ratio) => setLocal({ count, ratio }),
        onProgress: ({ generated }) => setGenerated(generated),
        onAssembling: () => setAssembling(true),
      }).then((id) => {
        if (!controller.signal.aborted) navigate(quizPath(id), { replace: true });
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '组卷失败，请重试');
      });
    }, 0);
    return () => {
      window.clearTimeout(start);
      controller.abort();
    };
  }, [attempt, count, mode, navigate, ready, wordIds]);

  function retry() {
    setLocal(undefined);
    setGenerated(0);
    setAssembling(false);
    setError('');
    setAttempt((value) => value + 1);
  }

  const issue = error || (appData.status === 'error' ? '本地数据库载入失败' : '');
  const tip = tips?.length ? tips[tipIndex % tips.length] : undefined;
  return (
    <div className={`pt-safe pb-safe flex min-h-full flex-col ${contentInset}`}>
      <header className="flex min-h-[77px] items-center px-1.5"><p className="text-[28px] font-bold">词境</p></header>
      <Card className="!px-4 !pb-6 !pt-6">
        <div className="relative mx-auto grid size-[110px] place-items-center rounded-full bg-primary-soft text-primary">
          <FileText size={55} strokeWidth={1.55} aria-hidden="true" /><Sparkles size={26} className="absolute bottom-5 right-5 bg-primary-soft" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-center text-[clamp(20px,6.25vw,26px)] font-bold leading-tight">{issue ? '试卷生成失败' : '正在生成逻辑填空试卷'}</h1>
        <p className="mt-1.5 text-center text-base text-text-secondary">{count} 题 · {modeLabels[mode]}</p>
        <div className="mt-6 flex items-center gap-3 text-base font-semibold text-primary">
          <div role="progressbar" aria-label="组卷进度" aria-valuenow={progress} className="h-4 flex-1 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-primary transition-[width] duration-100 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
          <span className="min-w-9 text-right tabular-nums">{progress}%</span>
        </div>
        <ol className="mt-6 grid gap-5 border-t border-border-subtle pt-5 text-[14px] font-medium min-[360px]:text-base">
          <li className="flex items-center gap-3"><span className={`grid size-6 shrink-0 place-items-center rounded-full ${local ? 'bg-success text-surface' : 'text-text-muted'}`}>{local ? <Check size={16} aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}</span>{local ? `已抽取本地题库 ${local.count} 题（目标权重 ${Math.round(local.ratio * 100)}%）` : '抽取本地题库'}</li>
          <li className="flex items-center gap-3">{local && generated >= needed ? <Check size={24} className={`shrink-0 ${successInk}`} aria-hidden="true" /> : local && !issue ? <LoaderCircle size={25} strokeWidth={3} className="shrink-0 text-primary motion-safe:animate-spin" aria-hidden="true" /> : <Circle size={25} className="shrink-0 text-text-muted" aria-hidden="true" />}<span>LLM 生成 AI 新题{local && `（${generated}/${needed}）`}</span></li>
          <li className={`flex items-center gap-3 ${assembling ? '' : 'text-text-secondary'}`}>{assembling ? <Check size={24} className={`shrink-0 ${successInk}`} aria-hidden="true" /> : <Circle size={25} className="shrink-0 text-text-muted" aria-hidden="true" />}校验题干与逐项解析结构</li>
        </ol>
        {issue && <div className="mt-5 space-y-3 rounded-control bg-danger-soft px-3 py-3">
          <p role="alert" className="break-words text-sm text-text-primary">{issue}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button className="!px-1.5" onClick={appData.status === 'error' ? appData.retry : retry}>重新生成</Button>
            <Link className="grid min-h-11 place-items-center rounded-control border border-border-subtle text-sm font-semibold text-primary" to="/settings/api" state={{ source: 'practice', wordIds, count, modeOverride: mode }}>检查 API 配置</Link>
          </div>
        </div>}
      </Card>
      {tip && <aside className="mt-5 flex min-h-[90px] items-center gap-3 rounded-control bg-primary-soft p-4">
        <BookOpen size={27} strokeWidth={1.65} className="shrink-0 text-accent" aria-hidden="true" />
        <div className="border-l border-border-subtle pl-3 text-sm leading-relaxed"><p className="font-bold text-primary">等待顺手记一词：</p><p className="font-medium min-[360px]:text-base">{tip.word} · {tip.commonMistake}</p></div>
      </aside>}
      <div className="mx-auto mt-auto grid w-4/5 gap-2.5 pb-5 pt-8">
        <button type="button" onClick={() => {
          request.current?.abort();
          navigate('/practice', { replace: true });
        }} className="flex min-h-11 items-center justify-center rounded-control border border-border-subtle text-base font-semibold text-text-secondary">取消生成</button>
      </div>
    </div>
  );
}
