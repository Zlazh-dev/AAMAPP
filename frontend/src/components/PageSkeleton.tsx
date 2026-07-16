import React from 'react';

/**
 * PageSkeleton — fallback Suspense standar (§12.15b).
 * Skeleton sederhana: header bar + content blocks.
 */
export function PageSkeleton() {
  return (
    <div className="w-full mx-auto p-4 md:p-6 max-w-[1024px]">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-20 rounded bg-aam-border animate-pulse" />
        <div className="h-6 flex-1 rounded bg-aam-border animate-pulse" />
        <div className="h-9 w-9 rounded-md bg-aam-border animate-pulse" />
      </div>

      {/* Card skeleton */}
      <div className="rounded-md border border-aam-border bg-white p-5 space-y-4">
        <div className="h-5 w-40 rounded bg-aam-border animate-pulse" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-aam-border animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-aam-border animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-aam-border animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-md bg-aam-border animate-pulse" />
      </div>
    </div>
  );
}
