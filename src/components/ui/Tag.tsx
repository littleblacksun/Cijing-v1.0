import type { ReactNode } from 'react';

const tones = {
  primary: 'bg-primary-soft text-primary before:bg-primary',
  accent: 'bg-accent-soft text-text-primary before:bg-accent',
  success: 'bg-success-soft text-text-primary before:bg-success',
  danger: 'bg-danger-soft text-text-primary before:bg-danger',
  warning: 'bg-warning-soft text-text-primary before:bg-warning',
  neutral: 'bg-subtle text-text-secondary before:bg-text-muted',
};

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium before:size-1.5 before:rounded-full ${tones[tone]}`}>
      {children}
    </span>
  );
}
