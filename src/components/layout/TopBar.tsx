import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface TopBarProps {
  title: string;
  backTo?: string;
  actions?: ReactNode;
}

export function TopBar({ title, backTo, actions }: TopBarProps) {
  return (
    <header className="px-safe pt-safe border-b border-border-subtle bg-surface">
      <div className="flex min-h-14 items-center gap-2">
        {backTo && (
          <Link to={backTo} aria-label="返回" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-control text-text-secondary hover:bg-subtle">
            <ArrowLeft aria-hidden="true" size={22} strokeWidth={1.75} />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 text-lg font-bold leading-snug">{title}</h1>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
