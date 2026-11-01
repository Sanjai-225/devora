'use client';

/**
 * Top-level /configuration route wrapper (with Suspense boundary).
 */

import { Suspense } from 'react';
import ProjectConfigurationPage from '../projects/[id]/configuration/page';

export default function TopLevelConfigurationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 font-mono text-xs text-cyan">
          Loading Environment Vault &amp; Implementation Plan...
        </div>
      }
    >
      <ProjectConfigurationPage />
    </Suspense>
  );
}
