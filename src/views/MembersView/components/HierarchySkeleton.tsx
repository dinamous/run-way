import React from 'react';

const CardSkeleton: React.FC = () => (
  <div className="w-72 rounded-xl border border-border bg-card shadow-sm p-5 flex flex-col items-center gap-3 animate-pulse">
    <div className="h-14 w-14 rounded-full bg-muted" />
    <div className="w-full space-y-2 flex flex-col items-center">
      <div className="h-3 w-28 rounded bg-muted" />
      <div className="h-3 w-36 rounded bg-muted" />
      <div className="h-3 w-24 rounded bg-muted" />
    </div>
    <div className="flex gap-2">
      <div className="h-4 w-12 rounded-full bg-muted" />
      <div className="h-4 w-16 rounded-full bg-muted" />
    </div>
  </div>
);

const HierarchySkeleton: React.FC = () => (
  <div className="flex flex-col items-center gap-12 min-w-max mx-auto py-4">
    <div className="flex justify-center gap-8">
      <CardSkeleton />
    </div>
    <div className="flex justify-center gap-8">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

export default HierarchySkeleton;
