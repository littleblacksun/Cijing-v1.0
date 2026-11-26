import { ArrowLeft, Check, Dices, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { contentInset, masteryDots, masteryLabels, searchText, shuffled, usePracticeWords } from '@/hooks/usePracticeData';
import { useAppStore } from '@/stores/useAppStore';

const pageSize = 30;
const filters = ['全部', '陌生', '模糊', '国考高频'] as const;

export function WordPickerPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { data: words = [], loading, failed } = usePracticeWords();
  const [limit, setLimit] = useState(pageSize);
  const [selected, setSelected] = useState(() => new Set(useAppStore.getState().selectedWordIds));
  const [filter, setFilter] = useState<(typeof filters)[number]>('全部');
  const [query, setQuery] = useState('');
  const term = searchText(query);
  const visible = words.filter((entry) => {
    if (term && ![entry.word, entry.pinyin, entry.meaning].some((value) => searchText(value).includes(term))) return false;
    if (filter === '全部') return true;
    if (filter === '国考高频') return entry.frequent;
    return masteryLabels[entry.mastery] === filter;
  });

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={`pt-safe shrink-0 ${contentInset}`}>
        <div className="grid min-h-[64px] grid-cols-[44px_1fr_44px] items-center">
          <Link to="/practice" state={state} aria-label="返回刷题" className="grid size-10 place-items-center"><ArrowLeft size={22} strokeWidth={1.8} aria-hidden="true" /></Link>
          <h1 className="text-center text-[19px] font-bold">选择出题成语</h1>
          <button type="button" className="min-h-11 text-sm text-text-secondary" onClick={() => setSelected(new Set())}>清空</button>
        </div>
        <label className="flex h-10 items-center gap-2.5 rounded-control bg-subtle px-3.5 text-text-secondary focus-within:ring-1 focus-within:ring-primary">
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          <input type="search" aria-label="搜索成语、拼音或释义" placeholder="搜索成语、拼音或释义" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(pageSize); }} className="h-full min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none" />
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto py-3.5 [scrollbar-width:none]">
          {filters.map((item) => <button key={item} type="button" aria-pressed={item === filter} onClick={() => { setFilter(item); setLimit(pageSize); }} className={`shrink-0 rounded-full px-2 py-1.5 text-xs font-semibold min-[365px]:px-3 ${item === filter ? 'bg-primary text-surface' : 'bg-subtle text-text-secondary'}`}>{item}</button>)}
          <button type="button" onClick={() => { setSelected(new Set(shuffled(words).slice(0, 10).map(({ id }) => id))); setQuery(''); setFilter('全部'); setLimit(pageSize); }} className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary"><Dices size={17} strokeWidth={1.7} aria-hidden="true" />随机挑10词</button>
        </div>
      </header>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 pt-1 ${contentInset}`}>
        {visible.length === 0 && <EmptyState title={loading ? '正在读取成语…' : failed ? '词库读取失败' : '没有符合条件的成语'} />}
        <div className="grid grid-cols-2 gap-2">
          {visible.slice(0, limit).map((item) => {
            const checked = selected.has(item.id);
            return (
              <button key={item.id} type="button" role="checkbox" aria-checked={checked} aria-label={item.word} onClick={() => toggle(item.id)} className={`flex min-h-[68px] min-w-0 items-start justify-between gap-1.5 rounded-control border px-3 py-2 text-left shadow-card ${checked ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface'}`}>
                <span className="min-w-0"><span className="block break-words text-[17px] font-bold leading-6 min-[365px]:text-[19px]">{item.word}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary"><span className={`size-2 rounded-full ${masteryDots[item.mastery]}`} />{masteryLabels[item.mastery]}</span></span>
                <span className={`mt-1 grid size-[18px] shrink-0 place-items-center rounded-[5px] border ${checked ? 'border-primary bg-primary text-surface' : 'border-text-muted bg-surface'}`} aria-hidden="true">{checked && <Check size={14} strokeWidth={2.5} />}</span>
              </button>
            );
          })}
        </div>
        {limit < visible.length && <Button variant="outline" className="mt-3 w-full" onClick={() => setLimit((value) => value + pageSize)}>加载更多</Button>}
      </div>
      <footer className={`pb-safe flex shrink-0 items-center justify-between gap-2 border-t border-border-subtle bg-surface pt-2.5 ${contentInset}`}>
        <p className="pl-1.5 text-base font-semibold" role="status">已选 {selected.size} 个成语</p>
        <Button className="!min-w-[118px] !rounded-control !text-base" onClick={() => {
          useAppStore.getState().setSelectedWordIds([...selected]);
          navigate('/practice', { state });
        }}>确认使用</Button>
      </footer>
    </div>
  );
}
