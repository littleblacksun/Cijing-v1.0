import { BookOpen, Layers, Library, SquarePen, X } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import type { AppSettings, ConfusionGroup, Idiom } from '@/types/domain';

export interface AppSnapshot {
  idiomCount: number;
  confusionCount: number;
  settings: AppSettings | null;
  firstIdiom: Idiom | undefined;
  firstGroup: ConfusionGroup | undefined;
}

export type AppData =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | ({ status: 'ready' } & AppSnapshot);

const tabs = [
  { to: '/', label: '学习', icon: BookOpen },
  { to: '/library', label: '词库', icon: Library },
  { to: '/practice', label: '刷题', icon: SquarePen },
  { to: '/bank', label: '题库', icon: Layers },
];

const toastColors = {
  neutral: 'bg-surface',
  success: 'bg-success-soft',
  danger: 'bg-danger-soft',
};

export function AppShell({ data }: { data: AppData }) {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/';
  const showTabs = tabs.some(({ to }) => to === path);
  const toast = useAppStore((state) => state.toast);
  const dismissToast = useAppStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, 2600);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  return (
    <div className="relative mx-auto flex h-screen w-full max-w-[430px] flex-col bg-page supports-[height:100dvh]:h-dvh
      [--learning-gutter:max(10px,env(safe-area-inset-left),env(safe-area-inset-right))]
      [--learning-success-ink:color-mix(in_srgb,var(--color-success)_62%,var(--text-primary))]
      [--learning-warning-ink:color-mix(in_srgb,var(--color-warning)_59%,var(--text-primary))]
      [--learning-danger-ink:color-mix(in_srgb,var(--color-danger)_78%,var(--text-primary))]">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" key={pathname}>
        <Outlet context={data} />
      </main>

      {toast && (
        <aside className="px-safe pointer-events-none absolute inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30" aria-label="通知">
          <div className={`pointer-events-auto flex items-center justify-between gap-2 rounded-control border border-border-subtle pl-4 shadow-card ${toastColors[toast.tone ?? 'neutral']}`}>
            <p className="text-sm" role="status">{toast.message}</p>
            <button type="button" aria-label="关闭通知" onClick={dismissToast} className="grid size-11 shrink-0 place-items-center rounded-control">
              <X aria-hidden="true" size={18} strokeWidth={1.75} />
            </button>
          </div>
        </aside>
      )}

      {showTabs && (
        <nav aria-label="底部导航" className="pb-safe grid shrink-0 grid-cols-4 border-t border-border-subtle bg-surface px-[var(--learning-gutter)] pt-1.5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `group flex min-h-12 flex-col items-center justify-center gap-0.5 text-[13px] leading-4 ${isActive ? 'font-semibold text-primary' : 'font-medium text-text-secondary'}`
              }
            >
              <Icon aria-hidden="true" size={24} strokeWidth={1.75} className="text-text-muted group-aria-[current=page]:text-primary" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
