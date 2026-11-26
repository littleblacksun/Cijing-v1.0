import { FileText, Plug, Search, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { contentInset, dangerInk, quizPath, searchText, successInk, useLocalBank, usePracticeSettings, useResolvedIdioms } from '@/hooks/usePracticeData';
import { createLocalReviewSession, removeQuestionFromBank } from '@/services/quizEngine';
import type { LocalQuestion } from '@/types/domain';
import { useAppStore } from '@/stores/useAppStore';
import { OptionRows, QuestionAnalysis, QuestionStem, RelatedWords } from './QuizPlayPage';

const pageSize = 8;
type BankFilter = 'all' | 'wrong' | 'recent' | 'oldest';

export function LocalBankPage() {
  const navigate = useNavigate();
  const { data: bank = [], loading, failed } = useLocalBank();
  const { data: settings } = usePracticeSettings();
  const { data: terms } = useResolvedIdioms([...new Set(bank.flatMap(({ relatedIdioms }) => relatedIdioms))]);
  const ratio = settings?.localBankRatio ?? 0.2;
  const [starting, setStarting] = useState(false);
  const showToast = useAppStore((state) => state.showToast);
  const [filter, setFilter] = useState<BankFilter>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(pageSize);
  const [preview, setPreview] = useState<LocalQuestion>();
  const [open, setOpen] = useState(false);
  const wrong = bank.filter((item) => item.wrongCount > 0).length;
  const filters: { key: BankFilter; label: string }[] = [
    { key: 'all', label: `全部 ${bank.length}` }, { key: 'wrong', label: `仅错题 ${wrong}` },
    { key: 'recent', label: '最近入库' }, { key: 'oldest', label: '最久未练' },
  ];
  const term = searchText(query);
  const visible = bank.filter((entry) => (filter !== 'wrong' || entry.wrongCount > 0)
    && (!term || [entry.stem, ...entry.relatedIdioms.map((word) => terms?.get(word)?.word ?? word)].some((text) => searchText(text).includes(term))));
  if (filter === 'recent') visible.sort((a, b) => b.savedAt - a.savedAt);
  if (filter === 'oldest') visible.sort((a, b) => (a.lastPracticedAt ?? 0) - (b.lastPracticedAt ?? 0));

  async function startLocal() {
    setStarting(true);
    try {
      const { id, fallback } = await createLocalReviewSession(true);
      if (fallback) showToast({ message: '暂无错题，已开始本地收藏题复习' });
      navigate(quizPath(id));
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : '启动专项复习失败', tone: 'danger' });
      setStarting(false);
    }
  }

  async function remove(id: string) {
    try {
      await removeQuestionFromBank(id);
      showToast({ message: '已从本地题库移除' });
    } catch { showToast({ message: '移除失败，请重试', tone: 'danger' }); }
  }

  return (
    <div className={`pt-safe pb-4 ${contentInset}`}>
      <header className="flex min-h-[69px] items-center justify-between gap-2 px-1.5">
        <h1 className="text-[27px] font-bold leading-tight">本地题库</h1>
        <div className="flex items-center gap-2 text-text-secondary">
          <Link to="/settings/api" aria-label="LLM API 配置" className="grid size-10 place-items-center"><Plug size={23} strokeWidth={1.7} aria-hidden="true" /></Link>
          <Link to="/settings" aria-label="偏好设置" className="grid size-9 place-items-center"><Settings size={23} strokeWidth={1.7} aria-hidden="true" /></Link>
        </div>
      </header>
      <Card className="relative !p-3 before:absolute before:left-0 before:top-4 before:h-[66px] before:w-1 before:rounded-r-full before:bg-primary before:opacity-60">
        <dl className="my-2 grid grid-cols-3 divide-x divide-border-subtle text-center">
          {[{ label: '总收藏', value: bank.length, unit: '题' }, { label: '错题', value: wrong, unit: '题' }, { label: '混抽权重', value: `${Math.round(ratio * 100)}%`, unit: '' }].map(({ label, value, unit }) => <div key={label} className="grid gap-1"><dt className="text-sm text-text-secondary">{label}</dt><dd className="text-[25px] font-bold leading-tight tabular-nums">{value}<span className="text-sm">{unit}</span></dd></div>)}
        </dl>
        <Button variant="soft" className="mt-2.5 w-full !text-base" disabled={!bank.length || starting} onClick={startLocal}>发起本地错题专项复习</Button>
      </Card>
      <label className="mt-3.5 flex h-11 items-center gap-2.5 rounded-card border border-border-subtle bg-surface px-3.5 text-text-secondary focus-within:border-primary">
        <Search size={20} strokeWidth={1.7} aria-hidden="true" /><input type="search" aria-label="搜索题干或成语" placeholder="搜索题干或成语" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(pageSize); }} className="h-full min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none" />
      </label>
      <div role="group" aria-label="题库筛选" className="my-3.5 grid grid-cols-4 gap-1.5 min-[365px]:gap-2">
        {filters.map(({ key, label }) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setLimit(pageSize); }} className={`min-h-9 rounded-full border px-0.5 text-[11px] font-semibold min-[365px]:text-[13px] ${filter === key ? 'border-primary bg-primary text-surface' : 'border-border-subtle bg-surface text-text-secondary'}`}>{label}</button>)}
      </div>
      <div className="grid grid-cols-1 gap-3.5">
        {visible.length === 0 && (loading || failed || bank.length > 0
          ? <EmptyState title={loading ? '正在读取本地题库…' : failed ? '本地题库读取失败' : '暂无符合条件的收藏'} />
          : <EmptyState title="本地题库暂无收藏" description="答题后可收藏题目，供之后混抽和专项复习使用。" action={<Link to="/practice" className="font-semibold text-primary">前往 AI 智能刷题</Link>} />)}
        {visible.slice(0, limit).map((question) => (
          <Card key={question.id} className="!px-3 !pb-0 !pt-3">
            <p className="line-clamp-2 px-0.5 text-[16px] font-semibold leading-[1.65]"><QuestionStem question={question} /></p>
            <div className="my-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">{question.relatedIdioms.map((word) => <span key={word} className="rounded-lg bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary">{terms?.get(word)?.word ?? word}</span>)}</div>
              <span className="ml-auto rounded-full bg-subtle px-2.5 py-1 text-text-secondary">错 {question.wrongCount} / 练 {question.practiceCount}</span>
            </div>
            <div className="grid grid-cols-2 items-center border-t border-border-subtle">
              <button type="button" className="inline-flex min-h-11 items-center justify-center gap-1.5 border-r border-border-subtle text-sm font-medium text-text-secondary" onClick={() => { setPreview(question); setOpen(true); }}><FileText size={17} strokeWidth={1.75} aria-hidden="true" />查看解析</button>
              <button type="button" aria-label={`移除 ${question.relatedIdioms.map((word) => terms?.get(word)?.word ?? word).join('、')} 题目`} className={`inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium ${dangerInk}`} onClick={() => remove(question.id)}><Trash2 size={17} strokeWidth={1.75} aria-hidden="true" />移除</button>
            </div>
          </Card>
        ))}
      </div>
      {visible.length > limit && <Button variant="outline" className="mt-3 w-full" onClick={() => setLimit((value) => value + pageSize)}>加载更多</Button>}
      {preview && <BottomSheet open={open} title="题目解析" onClose={() => setOpen(false)}>
        <div className="grid gap-3 pb-1"><p className="text-base font-semibold leading-relaxed"><QuestionStem question={preview} highlight /></p><OptionRows question={preview} reveal compact /><p className={`font-semibold ${successInk}`}>正确答案 {preview.answer}</p><QuestionAnalysis question={preview} boxed /><RelatedWords question={preview} /></div>
      </BottomSheet>}
    </div>
  );
}
