import type { ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'border-primary bg-primary text-surface',
  secondary: 'border-subtle bg-subtle text-text-primary',
  outline: 'border-border-subtle bg-surface text-text-primary hover:border-primary hover:text-primary',
  soft: 'border-primary-soft bg-primary-soft text-primary',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants };

export function Button({ type = 'button', variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
