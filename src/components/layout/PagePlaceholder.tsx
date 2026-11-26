import { ChevronRight, Database } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag } from '@/components/ui/Tag';
import type { AppData } from './AppShell';
import { TopBar } from './TopBar';

interface PagePlaceholderProps {
  number: `UI-${string}`;
  title: string;
  backTo?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

const countFormat = new Intl.NumberFormat('zh-CN');
const percentFormat = new Intl.NumberFormat('zh-CN', { style: 'percent' });

export function PagePlaceholder({ number, title, backTo, actions, children }: PagePlaceholderProps) {
  const { pathname } = useLocation();
  const data = useOutletContext<AppData>();
  const ratio = useAppStore((state) => state.settings?.localBankRatio);

  return (
    <>
      <TopBar title={title} backTo={backTo} actions={actions} />
      <div className="px-safe pb-safe grid content-start gap-4 pt-4">
        <div className="flex min-w-0 items-start gap-3 py-1">
          <span className="shrink-0"><Tag tone="primary">{number}</Tag></span>
          <code className="min-w-0 break-all pt-1 text-xs text-text-secondary">{pathname}</code>
        </div>

        <Card aria-busy={data.status === 'loading'}>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Database aria-hidden="true" size={17} strokeWidth={1.75} className="text-primary" />
            本地语库
          </h2>
          {data.status === 'ready' && (
            <dl className="mt-4 grid grid-cols-3 divide-x divide-border-subtle text-center">
              <div className="grid gap-1 px-1">
                <dt className="text-xs text-text-secondary">成语</dt>
                <dd className="order-first text-xl font-bold tabular-nums">{countFormat.format(data.idiomCount)}</dd>
              </div>
              <div className="grid gap-1 px-1">
                <dt className="text-xs text-text-secondary">易混词组</dt>
                <dd className="order-first text-xl font-bold tabular-nums">{countFormat.format(data.confusionCount)}</dd>
              </div>
              <div className="grid gap-1 px-1">
                <dt className="text-xs text-text-secondary">本地抽题权重</dt>
                <dd className="order-first text-xl font-bold tabular-nums">{ratio === undefined ? '—' : percentFormat.format(ratio)}</dd>
              </div>
            </dl>
          )}
          {data.status === 'loading' && <p role="status" className="mt-4 text-sm text-text-secondary">正在载入语库…</p>}
          {data.status === 'error' && (
            <EmptyState title="语库载入失败" action={<Button variant="outline" onClick={data.retry}>重试</Button>} />
          )}
        </Card>

        {children && <div className="grid gap-2">{children}</div>}
      </div>
    </>
  );
}

export function PageLink({ to, children, detail }: { to: string; children: ReactNode; detail?: string }) {
  return (
    <Link to={to} className="flex min-h-12 items-center justify-between gap-3 rounded-control border border-border-subtle bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary motion-reduce:transition-none">
      <span className="min-w-0">
        {children}
        {detail && <span className="mt-1 block text-xs font-normal leading-relaxed text-text-secondary">{detail}</span>}
      </span>
      <ChevronRight aria-hidden="true" size={17} strokeWidth={1.75} className="shrink-0 text-text-muted" />
    </Link>
  );
}
