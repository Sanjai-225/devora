'use client';

/**
 * App layout — sidebar + top bar + content area.
 * Matches the Stitch dashboard/workspace layout pattern.
 */

import { Suspense, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Suspense fallback={<aside className="w-60 h-screen bg-surface-1 border-r border-border shrink-0" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="p-6 text-xs font-mono text-text-muted">Loading workspace...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
