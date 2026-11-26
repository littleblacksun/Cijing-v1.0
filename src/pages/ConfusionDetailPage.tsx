import { ArrowLeft, Check, X } from 'lucide-react';
import { Fragment, useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QuickDrillModal } from '@/components/confusion/QuickDrillModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { readConfusionDetail, sentimentLabels, useLearningQuery } from '@/data/uiMockLearning';
import { useAppStore } from '@/stores/useAppStore';
import type { ConfusionGroup } from '@/types/domain';

const dimensions = [
  { label: '核心侧重', value: (word: ConfusionGroup['words'][number]) => word.focus },
  { label: '感情色彩', value: (word: ConfusionGroup['words'][number]) => sentimentLabels[word.sentiment] },
  { label: '适用对象', value: (word: ConfusionGroup['words'][number]) => word.applicable },
  { label: '避坑提醒', value: (word: ConfusionGroup['words'][number]) => word.pitfall },
];

function GroupDetail({ group, groupIds }: { group: ConfusionGroup; groupIds: string[] }) {
  const navigate = useNavigate();
  const [drillOpen, setDrillOpen] = useState(false);
  const setSelectedWordIds = useAppStore((state) => state.setSelectedWordIds);
  const showToast = useAppStore((state) => state.showToast);
  const drills = group.quickDrills;
  const scrollTable = group.words.length > 2;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="pt-safe shrink-0 px-[var(--learning-gutter)]">
        <div className="flex min-h-[59px] items-center gap-2">
          <Link to="/library?tab=confusion" aria-label="返回易混组" className="-ml-1 grid size-10 shrink-0 place-items-center rounded-control hover:bg-subtle">
            <ArrowLeft size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 flex-1 text-xl font-bold">易混辨析</h1>
          <button type="button" disabled={groupIds.length === 0} className="min-h-11 shrink-0 px-0.5 text-sm font-semibold text-primary disabled:opacity-50" onClick={() => {
            setSelectedWordIds(groupIds);
            navigate('/practice');
          }}>
            用本组出题
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-[var(--learning-gutter)] pb-3 [scrollbar-width:none]">
        <section aria-label={group.title} className="rounded-card bg-gradient-to-br from-primary-soft to-accent-soft px-3 py-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 min-[360px]:gap-x-3.5">
            {group.words.map(({ word, diffChars }, index) => (
              <Fragment key={word}>
                {index > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-2 border-x border-border-subtle px-2 font-bold text-primary" aria-hidden="true">
                    <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-[11px] ring-1 ring-border-subtle">VS</span>
                  </span>
                )}
                <p className="text-[clamp(19px,6.6vw,28px)] font-bold leading-tight tracking-tight">
                  {Array.from(word, (char, index) => diffChars.includes(char)
                    ? <span key={index} className="mx-0.5 inline-flex rounded-lg bg-primary px-1 text-surface">{char}</span>
                    : char)}
                </p>
              </Fragment>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-text-secondary">{group.summary}</p>
        </section>

        <Card className="!p-3">
          <h2 className="mb-2.5 text-[18px] font-bold">核心差异对照表</h2>
          <div tabIndex={scrollTable ? 0 : undefined} aria-label={scrollTable ? '横向浏览核心差异对照表' : undefined} className="overflow-x-auto overscroll-x-contain scroll-smooth rounded-control border border-border-subtle motion-reduce:scroll-auto">
            <table className="w-full table-fixed border-collapse text-[13px] leading-[1.45]" style={scrollTable ? { minWidth: 82 + group.words.length * 115 } : undefined}>
              <colgroup>
                <col className="w-[23%]" />
                {group.words.map(({ word }) => <col key={word} />)}
              </colgroup>
              <thead>
                <tr className="bg-subtle">
                  <th scope="col" className="sticky left-0 z-10 bg-subtle px-1 py-2 text-[12px] font-semibold text-text-secondary">对照维度</th>
                  {group.words.map(({ word }) => <th key={word} scope="col" className="border-l border-border-subtle px-1 py-2.5 text-[14px] font-bold">{word}</th>)}
                </tr>
              </thead>
              <tbody>
                {dimensions.map(({ label, value }) => (
                  <tr key={label} className="border-t border-border-subtle">
                    <th scope="row" className="sticky left-0 z-10 bg-subtle px-1 py-1.5 font-semibold text-text-secondary">{label}</th>
                    {group.words.map((word) => <td key={word.word} className="border-l border-border-subtle px-2 py-1.5 align-middle">{value(word)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="!p-3">
          <h2 className="mb-1 text-[18px] font-bold">同境换词对照</h2>
          <ol className="divide-y divide-border-subtle">
            {group.contrastExamples.map(({ context, correctWord, wrongWord, clue }, index) => (
              <li key={index} className="flex gap-2 py-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-soft text-[13px] font-bold text-primary" aria-hidden="true">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-relaxed">{context.replaceAll('____', correctWord)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-success-soft px-2 py-1 text-[12px] font-semibold text-[color:var(--learning-success-ink)]"><Check size={15} strokeWidth={2} aria-hidden="true" /> 宜选：{correctWord}</span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-danger-soft px-2 py-1 text-[12px] font-semibold text-[color:var(--learning-danger-ink)]"><X size={15} strokeWidth={2} aria-hidden="true" /> 误选：{wrongWord}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-text-secondary">提示：{clue}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <footer className="pb-safe grid shrink-0 grid-cols-2 gap-2.5 border-t border-border-subtle bg-surface px-[var(--learning-gutter)] pt-2.5">
        <Button variant="outline" className="!border-primary !px-2 !text-primary" disabled={groupIds.length === 0} onClick={() => {
          const selected = new Set(useAppStore.getState().selectedWordIds);
          const additions = groupIds.filter((id) => !selected.has(id));
          setSelectedWordIds([...selected, ...additions]);
          showToast({ message: additions.length ? `已加入 ${additions.length} 个词到出题词单` : `本组 ${groupIds.length} 个词已在出题词单`, tone: 'success' });
        }}>
          加入出题词单
        </Button>
        <Button className="!px-2" disabled={drills.length === 0} onClick={() => setDrillOpen(true)}>{drills.length > 0 ? `闪电微测（${drills.length}题）` : '本组暂无微测题'}</Button>
      </footer>

      {drillOpen && <QuickDrillModal group={group} onClose={() => setDrillOpen(false)} />}
    </div>
  );
}

export function ConfusionDetailPage() {
  const { id } = useParams();
  const read = useCallback(() => readConfusionDetail(id), [id]);
  const { data, loading, failed, retry } = useLearningQuery(read);

  if (!data) return (
    <div className="pt-safe px-[var(--learning-gutter)]">
      <Link to="/library?tab=confusion" className="inline-flex min-h-12 items-center gap-2 text-primary"><ArrowLeft size={20} aria-hidden="true" /> 返回易混组</Link>
      <EmptyState title={loading ? '正在加载易混组…' : failed ? '词库加载失败' : '未找到这个易混组'} action={retry && <Button onClick={retry}>重试</Button>} />
    </div>
  );

  return <GroupDetail key={data.group.id} {...data} />;
}
