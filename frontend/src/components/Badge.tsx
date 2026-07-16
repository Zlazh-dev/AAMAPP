import React from 'react';

type BadgeVariant =
  | 'green'
  | 'yellow'
  | 'red'
  | 'gray'
  | 'blue'
  | 'purple';

const variants: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = 'gray', className = '', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

// Role label helper
export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Admin',
    guru: 'Guru',
    kurikulum: 'Kurikulum',
    kesiswaan: 'Kesiswaan',
    tu: 'TU',
    kepsek: 'Kepsek',
  };
  return labels[role] || role;
}

export function roleVariant(role: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    admin: 'red',
    guru: 'blue',
    kurikulum: 'purple',
    kesiswaan: 'yellow',
    tu: 'gray',
    kepsek: 'green',
  };
  return map[role] || 'gray';
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
      return 'green';
    case 'pending':
      return 'yellow';
    default:
      return 'gray';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}
