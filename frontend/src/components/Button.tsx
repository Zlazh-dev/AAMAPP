import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-aam-green text-white hover:bg-aam-green-dark disabled:bg-gray-300',
  secondary:
    'bg-white text-aam-text border border-aam-border hover:bg-gray-50 disabled:opacity-50',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300',
  ghost:
    'bg-transparent text-aam-text-muted hover:bg-gray-100 disabled:opacity-50',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-2 gap-1 min-h-[44px]',
  md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
  lg: 'text-base px-6 py-3 gap-2 min-h-[48px]',
};

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      disabled,
      className = '',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={rest.type ?? 'button'}
        {...rest}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-aam-green/30 focus:ring-offset-1',
          variants[variant],
          sizes[size],
          className,
        ].join(' ')}
      >
        {loading ? (
          <span className="material-symbols-outlined animate-spin text-current">
            progress_activity
          </span>
        ) : icon ? (
          <span className="material-symbols-outlined text-current" style={{ fontSize: '1.125rem' }}>
            {icon}
          </span>
        ) : null}
        {children}
      </button>
    );
  },
);
