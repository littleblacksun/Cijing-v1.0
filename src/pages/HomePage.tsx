import { ChevronRight, Flame, Scale, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { groupBadge, readDailyConfusionCandidates, useLearningQuery } from '@/data/uiMockLearning';
import { dailyGoal, getHomeStats, pickDailyConfusionGroups } from '@/services/learningService';

const shortcuts = [
  { title: '易混词对比', description: '高频近义辨析', to: '/library?tab=confusion', icon: Scale, color: 'bg-primary-soft text-primary' },
  { title: 'AI 智能组卷', description: '自选成语出题', to: '/practice', icon: Sparkles, color: 'bg-accent-soft text-accent' },
];

export function HomePage() {
  const { data: stats, loading, failed, retry } = useLearningQuery(getHomeStats, true);
  const { data: groups } = useLearningQuery(readDailyConfusionCandidates);
  const reviewed = stats?.todayReviewed ?? 0;
  const goal = stats?.dailyGoal ?? dailyGoal;
  const progress = Math.min(1, reviewed / goal);
  const metrics = [
    { label: '待复习', value: stats?.dueReviewCount ?? 0 },
    { label: '已掌握', value: stats?.masteredCount ?? 0 },
    { label: '本地题库', value: stats?.localQuestionCount ?? 0 },
  ];

  return (
    <div className="pt-safe pb-safe px-[var(--learning-gutter)]">
      <header className="flex items-center justify-between gap-2 px-1.5 pb-5 pt-[18px]">
        <div>
          <h1 className="text-2xl font-bold leading-tight">词境</h1>
          <p className="mt-1 text-[15px] text-text-secondary">逻辑填空专项训练</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1.5 text-[13px] font-semibold text-[color:var(--learning-warning-ink)]">
          <Flame size={18} strokeWidth={2} className="text-warning" aria-hidden="true" /> 已坚持 {stats?.streak ?? 0} 天
        </span>
      </header>

      <Card className="!px-2.5 !pb-4 !pt-2.5">
        <div className="flex items-center gap-2 pb-5 pt-2.5 min-[360px]:gap-3">
          <div className="relative ml-1 grid size-[clamp(72px,28vw,112px)] shrink-0 place-items-center">
            <svg viewBox="0 0 112 112" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
              <circle cx="56" cy="56" r="50" stroke="var(--border-subtle)" strokeWidth="10" fill="none" />
              {progress > 0 && <circle cx="56" cy="56" r="50" stroke="var(--color-primary)" strokeWidth="10" fill="none" strokeLinecap="round" pathLength="100" strokeDasharray={`${progress * 100} 100`} />}
            </svg>
            <div className="relative text-center">
              <p className="text-[clamp(18px,6vw,25px)] font-bold leading-tight tabular-nums">{reviewed}/{goal}</p>
              <p className="mt-0.5 text-xs text-text-secondary min-[360px]:text-sm">今日目标</p>
            </div>
          </div>
          <dl className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-border-subtle border-l border-border-subtle text-center">
            {metrics.map(({ label, value }) => (
              <div key={label} className="grid gap-1 px-0.5">
                <dt className="text-[11px] leading-4 text-text-secondary min-[360px]:text-[14px]">{label}</dt>
                <dd className="text-[26px] font-bold leading-tight tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {stats?.nextReviewIdiomId ? (
          <Link to={`/library/idiom/${encodeURIComponent(stats.nextReviewIdiomId)}?mode=review`} className="flex min-h-12 items-center justify-center rounded-control bg-primary text-lg font-semibold text-surface">
            开始今日复习
          </Link>
        ) : (
          <button type="button" disabled={!retry} onClick={retry} className="min-h-12 w-full rounded-control bg-primary text-base font-semibold text-surface disabled:opacity-60">
            {failed ? (retry ? '词库加载失败，点击重试' : '词库加载失败') : loading ? '正在加载词库…' : '暂无复习词条'}
          </button>
        )}
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {shortcuts.map(({ title, description, to, icon: Icon, color }) => (
          <Link key={to} to={to} className="flex min-h-[80px] min-w-0 items-center gap-1.5 rounded-card border border-border-subtle bg-surface px-2 shadow-card min-[365px]:px-2.5">
            <span className={`grid size-8 shrink-0 place-items-center rounded-control min-[365px]:size-[42px] ${color}`}>
              <Icon size={23} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block whitespace-nowrap text-[13px] font-bold leading-tight min-[365px]:text-[15px]">{title}</span>
              <span className="mt-1 block text-[11px] leading-4 text-text-secondary min-[365px]:text-[13px]">{description}</span>
            </span>
            <ChevronRight size={13} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <section className="mt-6" aria-labelledby="daily-groups">
        <h2 id="daily-groups" className="mb-3 px-0.5 text-xl font-bold">每日一辨</h2>
        <div className="grid gap-3.5">
          {groups && pickDailyConfusionGroups(groups, 2).map((group, index) => (
            <Link key={group.id} to={`/library/confusion/${encodeURIComponent(group.id)}`} className="flex min-h-[78px] items-center justify-between gap-2 rounded-card border border-border-subtle bg-surface px-3 py-2.5 shadow-card">
              <span>
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${index === 0 ? 'bg-success-soft text-[color:var(--learning-success-ink)]' : 'bg-primary-soft text-primary'}`}>
                  {groupBadge(group)}
                </span>
                <span className="mt-1.5 block text-[17px] font-bold leading-tight">{group.title}</span>
              </span>
              <ChevronRight size={17} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
