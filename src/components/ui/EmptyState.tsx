import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 py-5 text-center">
      <span className="grid size-11 place-items-center rounded-control bg-subtle text-text-secondary">
        <Inbox aria-hidden="true" size={22} strokeWidth={1.75} />
      </span>
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm leading-relaxed text-text-secondary">{description}</p>}
      {action}
    </div>
  );
}
