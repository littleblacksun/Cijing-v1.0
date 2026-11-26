import { Check, Circle, FileText, History, Plus, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Card } from '@/components/ui/Card';
import { contentInset, counts, formatTime, modeLabels, pickStrategyWords, quizPath, successInk, useBankCount, usePracticeSettings, useQuizHistory, useResolvedIdioms } from '@/hooks/usePracticeData';
import type { PracticeApiReturn, PracticeDraft, Strategy } from '@/hooks/usePracticeData';
import { configFromSettings, isLlmConfigured } from '@/services/llmClient';
import { calcLocalQuota } from '@/services/quizEngine';
import type { QuizCount } from '@/types/domain';
import { useAppStore } from '@/stores/useAppStore';

const strategies: Strategy[] = ['手动自选', '陌生词优先', '易混组', '随机'];
const modes = [
  { id: 'instant', title: '即时解析', detail: '每题立刻出解析', icon: Zap },
  { id: 'exam', title: '交卷解析', detail: '全部答完统一复盘', icon: FileText },
] as const;

export function PracticeSetupPage() {
  const navigate = useNavigate();
  const draft = useLocation().state as PracticeDraft | null;
  const [count, setCount] = useState<QuizCount>(draft?.count ?? 15);
  const [modeOverride, setModeOverride] = useState(draft?.modeOverride);
  const [strategy, setStrategy] = useState<Strategy>('手动自选');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const request = useRef(0);
  const ids = useAppStore((state) => state.selectedWordIds);
  const setSelected = useAppStore((state) => state.setSelectedWordIds);
  const showToast = useAppStore((state) => state.showToast);
  const { data: settings } = usePracticeSettings();
  const { data: bankCount } = useBankCount();
  const { data: history, loading: historyLoading } = useQuizHistory();
  const { data: words } = useResolvedIdioms(ids);
  const configured = isLlmConfigured(configFromSettings(settings));
  const mode = modeOverride ?? settings?.defaultQuizMode ?? 'instant';
  const ratio = settings?.localBankRatio ?? 0.2;
  const quota = calcLocalQuota(count, ratio);
  const local = Math.min(quota, bankCount ?? 0);
  const percentage = Math.round(ratio * 100);
  const apiReturn: PracticeApiReturn = { source: 'practice', wordIds: ids, count, modeOverride };
  useEffect(() => () => { request.current += 1; }, []);

  async function selectStrategy(next: Strategy) {
    const ticket = ++request.current;
    setStrategy(next);
    setSelecting(next !== '手动自选');
    if (next === '手动自选') return;
    try {
      const candidates = await pickStrategyWords(next);
      if (request.current !== ticket) return;
      setSelected(candidates);
      if (!candidates.length) showToast({ message: '暂无符合该策略的成语' });
    } catch {
      if (request.current === ticket) showToast({ message: '选词失败，请重试', tone: 'danger' });
    } finally {
      if (request.current === ticket) setSelecting(false);
    }
  }

  function generate() {
    if (count > local && !configured) {
      showToast({ message: '生成 AI 新题前，请先配置 LLM API', tone: 'danger' });
      navigate('/settings/api', { state: apiReturn });
      return;
    }
    navigate(`/practice/generating?mode=${mode}&count=${count}`, { state: { wordIds: ids } });
  }

  return (
    <div className={`pt-safe pb-5 ${contentInset}`}>
      <header className="flex min-h-[75px] items-center justify-between gap-2 px-1.5">
        <h1 className="text-[clamp(20px,6.1vw,26px)] font-bold leading-tight">AI 智能刷题</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/settings/api" state={apiReturn} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${configured ? `bg-success-soft ${successInk}` : 'bg-subtle text-text-secondary'}`}>
            <span className={`size-2 rounded-full ${configured ? 'bg-success' : 'bg-text-muted'}`} aria-hidden="true" />{configured ? 'API 已就绪' : 'API 未配置'}
          </Link>
          <button type="button" aria-label="历史记录" className="grid size-9 place-items-center text-text-secondary" onClick={() => setHistoryOpen(true)}><History size={23} strokeWidth={1.75} aria-hidden="true" /></button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3.5">
        <Card className="!px-2.5 !py-3.5 min-[360px]:!px-3">
          <h2 className="text-lg font-bold">1. 选择考察成语</h2>
          <div role="group" aria-label="选词策略" className="mt-3 grid grid-cols-[1.1fr_1.25fr_0.85fr_0.72fr] gap-1.5 min-[370px]:gap-2">
            {strategies.map((item) => (
              <button key={item} type="button" aria-pressed={strategy === item} className={`min-h-9 rounded-control px-0.5 text-[clamp(11px,3.6vw,14px)] font-semibold ${strategy === item ? 'bg-primary text-surface' : 'bg-subtle text-text-secondary'}`} onClick={() => selectStrategy(item)}>{item}</button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ids.slice(0, 8).map((id) => {
              const name = words?.get(id)?.word ?? id;
              return <button key={id} type="button" aria-label={`移除 ${name}`} disabled={selecting} onClick={() => { setSelected(ids.filter((item) => item !== id)); setStrategy('手动自选'); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-[14px] font-semibold text-primary">{name}<X size={13} strokeWidth={1.75} aria-hidden="true" /></button>;
            })}
            {ids.length > 8 && <span className="rounded-lg bg-subtle px-2.5 py-1.5 text-xs text-text-secondary">另有 {ids.length - 8} 词</span>}
            <Link to="/practice/picker" state={{ count, modeOverride }} className="inline-flex min-h-8 items-center gap-1 rounded-control border border-border-subtle px-2.5 text-[14px] font-semibold text-primary"><Plus size={16} aria-hidden="true" />添加成语</Link>
          </div>
        </Card>

        <Card className="!px-2.5 !py-3.5 min-[360px]:!px-3">
          <h2 className="text-lg font-bold">2. 题目数量</h2>
          <div role="group" aria-label="题目数量" className="mt-3 grid grid-cols-4 gap-2">
            {counts.map((value) => (
              <button key={value} type="button" aria-pressed={value === count} onClick={() => setCount(value)} className={`min-h-9 rounded-control border text-sm font-semibold ${value === count ? 'border-primary bg-primary text-surface' : 'border-border-subtle bg-page text-text-secondary'}`}>{value}题</button>
            ))}
          </div>
          <div aria-hidden="true" className="mt-4 h-[15px] overflow-hidden rounded-full bg-primary"><div className="h-full bg-warning transition-[width] motion-reduce:transition-none" style={{ width: `${local / count * 100}%` }} /></div>
          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] leading-4 min-[360px]:text-xs">
            <p aria-live="polite" className="text-text-secondary">题源分配：本地题库 {local} 题{local < quota ? `（目标 ${quota} 题，余量由 AI 补足）` : ` (${percentage}%)`} + AI 新题 {count - local} 题</p>
            <Link to="/settings" className="shrink-0 font-semibold text-primary">调整比例</Link>
          </div>
        </Card>

        <Card className="!px-2.5 !py-3.5 min-[360px]:!px-3">
          <h2 className="text-lg font-bold">3. 答题模式</h2>
          <div role="group" aria-label="答题模式" className="mt-3 grid grid-cols-2 gap-2">
            {modes.map(({ id, title, detail, icon: Icon }) => {
              const active = id === mode;
              return (
                <button key={id} type="button" aria-pressed={active} onClick={() => setModeOverride(id)} className={`relative flex min-h-[74px] min-w-0 items-center gap-2 rounded-control border px-2 py-2 pr-4 text-left ${active ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface'}`}>
                  <Icon size={25} strokeWidth={1.65} className={`shrink-0 ${active ? 'text-primary' : 'text-text-secondary'}`} aria-hidden="true" />
                  <span className="min-w-0"><span className="block text-sm font-bold">{title}</span><span className="mt-0.5 block text-[11px] text-text-secondary min-[365px]:text-xs">{detail}</span></span>
                  {active ? <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-primary text-surface"><Check size={11} strokeWidth={2.5} aria-hidden="true" /></span> : <Circle size={16} strokeWidth={1.5} className="absolute right-2 top-2 text-text-muted" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {ids.length > 0 ? (
        <button type="button" disabled={!settings || bankCount === undefined || selecting} onClick={generate} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-control bg-primary text-lg font-bold text-surface disabled:opacity-60">生成 {count} 道习题</button>
      ) : <button type="button" disabled className="mt-5 min-h-12 w-full rounded-control bg-primary text-base font-semibold text-surface opacity-60">请先选择考察成语</button>}
      <BottomSheet open={historyOpen} title="历史记录" onClose={() => setHistoryOpen(false)}>
        {historyLoading && <p className="pb-3 text-sm text-text-secondary">正在读取历史记录…</p>}
        {!historyLoading && !history?.finished.length && <p className="pb-3 text-sm text-text-secondary">暂无历史记录</p>}
        <ul className="divide-y divide-border-subtle">
          {history?.active.map((session) => (
            <li key={session.id}><Link to={quizPath(session.id)} className="flex min-h-12 items-center justify-between gap-2 text-sm font-semibold text-primary"><span>继续答题 · {session.questions.length} 题</span><span>{modeLabels[session.mode]}</span></Link></li>
          ))}
          {history?.finished.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <Link to={quizPath(session.id, '/result')} className="min-w-0 flex-1 font-semibold">
                <span className="block">{new Date(session.completedAt ?? session.startedAt).toLocaleString('zh-CN', { hour12: false })}</span>
                <span className="text-xs font-medium text-text-secondary">{session.questions.length} 题 · {modeLabels[session.mode]} · {formatTime(session.durationSec)}</span>
              </Link>
              <Link to={quizPath(session.id, '/review')} className="inline-flex min-h-10 shrink-0 items-center font-semibold text-primary">复盘</Link>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
