import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 rounded-3xl space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-6 rounded-3xl space-y-4 animate-pulse">
      <Skeleton className="h-5 w-1/4" />
      <Skeleton className="h-3 w-1/3" />
      <div className="h-60 w-full flex items-end gap-2 pt-4">
        <Skeleton className="h-1/3 flex-1" />
        <Skeleton className="h-2/3 flex-1" />
        <Skeleton className="h-1/2 flex-1" />
        <Skeleton className="h-4/5 flex-1" />
        <Skeleton className="h-3/5 flex-1" />
        <Skeleton className="h-5/6 flex-1" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4 flex-1">
            <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
