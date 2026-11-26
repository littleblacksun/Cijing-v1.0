import { ArrowRight, Check, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { groupBadge, libraryFilters, masteryFor, masteryStyles, sentimentLabels, useLearningVocabulary } from '@/data/uiMockLearning';
import type { IdiomQueueState, LibraryView } from '@/data/uiMockLearning';
import { useAppStore } from '@/stores/useAppStore';
import type { Idiom, MasteryLevel } from '@/types/domain';

const pageSize = 20;
const itemClass = 'flex min-h-[108px] w-full min-w-0 items-center gap-3 rounded-card border border-border-subtle bg-surface px-3 py-3 text-left shadow-card';

function searchKey(text: string) {
  return text.normalize('NFD').replace(/\p{M}|\s/gu, '').toLowerCase();
}

function IdiomSummary({ idiom, mastery }: { idiom: Idiom; mastery: MasteryLevel }) {
  const status = masteryStyles[mastery];
  return (
    <span className="block min-w-0 flex-1">
      <span className="flex items-start justify-between gap-2">
        <span className="text-xl font-bold leading-tight">{idiom.word}</span>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold leading-4 ${status.color}`}>{status.label}</span>
      </span>
      <span className="mt-1 block truncate text-[14px] leading-5 text-text-secondary">{idiom.coreMeaning}</span>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        {[sentimentLabels[idiom.sentiment], ...idiom.tags.filter((tag) => tag !== '国考高频' && tag !== '省考高频').slice(0, 1)].map((tag) => (
          <span key={tag} className="rounded-lg bg-subtle px-2 py-0.5 text-xs leading-4 text-text-secondary">{tag}</span>
        ))}
      </span>
    </span>
  );
}

export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const restoredView = useLocation().state as LibraryView | null;
  const navigate = useNavigate();
  const { idioms, groups, progress, loading, failed, retry } = useLearningVocabulary();
  const [multi, setMulti] = useState(false);
  const [query, setQuery] = useState(restoredView?.query ?? '');
  const [filter, setFilter] = useState<LibraryView['filter']>(restoredView?.filter ?? '全部');
  const [limit, setLimit] = useState(restoredView?.limit ?? pageSize);
  const [selected, setSelected] = useState(() => new Set(useAppStore.getState().selectedWordIds));
  const setSelectedWordIds = useAppStore((state) => state.setSelectedWordIds);
  const scroll = useRef<HTMLDivElement>(null);
  const confusion = params.get('tab') === 'confusion';
  const choosing = multi && !confusion;
  const term = searchKey(query);

  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [confusion, term, filter]);

  const matchingIdioms = useMemo(() => idioms.filter((idiom) => {
    const matchesTerm = !term || [idiom.word, idiom.pinyin, idiom.coreMeaning].some((value) => searchKey(value).includes(term));
    if (!matchesTerm) return false;
    if (filter === '全部') return true;
    const mastery = masteryStyles.findIndex(({ label }) => label === filter);
    return mastery < 0 ? idiom.tags.includes(filter) : masteryFor(idiom, progress) === mastery;
  }), [idioms, progress, term, filter]);
  const matchingGroups = groups.filter((group) => !term || [group.title, group.summary, group.category, ...group.words.map(({ word }) => word)]
    .some((text) => searchKey(text).includes(term)));
  const queueState: IdiomQueueState = { queueIds: matchingIdioms.map(({ id }) => id), libraryView: { query, filter, limit } };
  const idiomIds = new Set(idioms.map(({ id }) => id));
  const selectedIds = [...selected].filter((id) => idiomIds.has(id));

  function switchTab(showGroups: boolean) {
    if (showGroups === confusion) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (showGroups) next.set('tab', 'confusion');
      else next.delete('tab');
      return next;
    }, { replace: true });
    setLimit(pageSize);
    setQuery('');
    if (showGroups) setMulti(false);
  }

  function changeQuery(next: string) {
    setLimit(pageSize);
    setQuery(next);
  }

  function toggleWord(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const empty = confusion ? matchingGroups.length === 0 : matchingIdioms.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="pt-safe shrink-0 px-[var(--learning-gutter)]">
        <h1 className="sr-only">词库</h1>
        <div className="relative grid min-h-[72px] grid-cols-[1fr_minmax(0,210px)_1fr] items-center gap-1 max-[350px]:grid-cols-[1fr_minmax(0,155px)_1fr]">
          <div role="group" aria-label="词库视图" className="col-start-2 grid grid-cols-2 rounded-full bg-subtle p-0.5">
            {(['成语库', '易混组'] as const).map((label, index) => {
              const groupTab = index === 1;
              const active = groupTab === confusion;
              return (
                <button key={label} type="button" aria-pressed={active} onClick={() => switchTab(groupTab)} className={`rounded-full px-1 py-2 text-[14px] font-semibold leading-5 ${active ? 'bg-surface shadow-card' : 'text-text-secondary'}`}>
                  {label}
                </button>
              );
            })}
          </div>
          <button type="button" className="absolute right-0 min-h-11 px-1 text-[13px] font-semibold text-primary min-[365px]:text-sm" onClick={() => {
            if (confusion) switchTab(false);
            setMulti(!choosing);
          }}>
            {choosing ? '完成' : '多选出题'}
          </button>
        </div>

        <div className="flex h-10 items-center gap-2.5 rounded-control bg-subtle px-3.5 text-text-secondary focus-within:ring-1 focus-within:ring-primary">
          <Search size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
            type="search"
            aria-label={confusion ? '搜索易混组' : '搜索成语、拼音或释义'}
            placeholder={confusion ? '搜索易混组或核心区别' : '搜索成语、拼音或释义'}
            value={query}
            onChange={(event) => changeQuery(event.currentTarget.value)}
          />
          {query && <button type="button" aria-label="清空搜索" className="grid size-8 shrink-0 place-items-center" onClick={() => changeQuery('')}><X size={16} aria-hidden="true" /></button>}
        </div>

        {!confusion && (
          <div role="group" aria-label="成语筛选" className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1 pt-3.5 [scrollbar-width:none]">
            {libraryFilters.map((name) => (
              <button key={name} type="button" aria-pressed={filter === name} onClick={() => { setLimit(pageSize); setFilter(name); }} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[13px] leading-[18px] min-[385px]:px-3 ${filter === name ? 'bg-primary font-semibold text-surface' : 'bg-subtle font-medium text-text-secondary'}`}>
                {name}
              </button>
            ))}
          </div>
        )}
      </header>

      <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-[var(--learning-gutter)] pb-4 pt-4 [scrollbar-width:none]">
        {loading && <p role="status" className="py-6 text-center text-sm text-text-secondary">正在加载词库…</p>}
        {failed && <EmptyState title="词库加载失败" action={retry && <Button onClick={retry}>重试</Button>} />}
        {!loading && !failed && empty && <EmptyState title={term || filter !== '全部' ? '没有符合条件的词条' : '暂无词条'} />}
        <div className="grid grid-cols-1 gap-3.5">
          {!confusion && matchingIdioms.slice(0, limit).map((idiom) => {
            const checked = selected.has(idiom.id);
            const summary = <IdiomSummary idiom={idiom} mastery={masteryFor(idiom, progress)} />;
            if (choosing) return (
              <button key={idiom.id} type="button" role="checkbox" aria-checked={checked} aria-label={idiom.word} onClick={() => toggleWord(idiom.id)} className={itemClass}>
                <span className={`grid size-5 shrink-0 place-items-center rounded-md border ${checked ? 'border-primary bg-primary text-surface' : 'border-text-muted'}`} aria-hidden="true">
                  {checked && <Check size={15} strokeWidth={2.5} />}
                </span>
                {summary}
              </button>
            );
            return <Link key={idiom.id} to={`/library/idiom/${encodeURIComponent(idiom.id)}`} state={queueState} className={itemClass}>{summary}</Link>;
          })}

          {confusion && matchingGroups.slice(0, limit).map((group) => (
            <Link key={group.id} to={`/library/confusion/${encodeURIComponent(group.id)}`} className={itemClass}>
              <span className="min-w-0 flex-1">
                <span className="inline-flex rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{groupBadge(group)}</span>
                <span className="mt-1.5 block text-[17px] font-bold leading-tight">{group.title}</span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-text-secondary">{group.summary}</span>
              </span>
              <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
        {limit < (confusion ? matchingGroups.length : matchingIdioms.length) && (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setLimit((count) => count + pageSize)}>加载更多</Button>
        )}
      </div>

      {choosing && selectedIds.length > 0 && (
        <div className="shrink-0 px-[var(--learning-gutter)] pb-2.5 pt-1.5">
          <div className="flex min-h-[50px] items-center justify-between gap-2 rounded-control bg-primary px-2.5 py-2 text-surface shadow-card min-[360px]:pl-4">
            <p role="status" className="text-sm font-semibold">已选 {selectedIds.length} 个成语</p>
            <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-[14px] font-semibold text-primary focus-visible:outline-surface" onClick={() => {
              setSelectedWordIds(selectedIds);
              navigate('/practice');
            }}>
              去 AI 出题 <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
