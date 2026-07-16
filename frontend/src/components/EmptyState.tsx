import React from 'react';

interface EmptyStateProps {
  icon: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <span
        className="material-symbols-outlined text-gray-300"
        style={{ fontSize: '3rem' }}
      >
        {icon}
      </span>
      <p className="mt-3 text-sm text-aam-text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
