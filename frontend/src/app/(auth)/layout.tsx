/**
 * Auth layout — centered card on dark background.
 * Matches Stitch sign-in/create-account/password-recovery screens.
 */

import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Top bar */}
      <header className="h-12 px-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-text-primary">DEVORA</span>
          <span className="text-[10px] font-mono bg-surface-3 text-text-secondary px-1.5 py-0.5 rounded">
            AUTH
          </span>
          <span className="flex items-center gap-1.5 ml-3">
            <span className="w-2 h-2 rounded-full bg-emerald" />
            <span className="text-[10px] font-mono text-emerald">CORE_SYS_ONLINE</span>
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">TLS_256_ACTIVE</span>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="h-10 px-6 flex items-center justify-between border-t border-border">
        <span className="text-xs text-text-muted">© Devora, Inc.</span>
        <nav className="flex items-center gap-4 text-xs text-text-muted">
          <span className="hover:text-text-secondary cursor-pointer">Terms</span>
          <span className="hover:text-text-secondary cursor-pointer">Privacy</span>
          <span className="hover:text-text-secondary cursor-pointer">Status</span>
          <span className="hover:text-text-secondary cursor-pointer">Contact Support</span>
        </nav>
      </footer>
    </div>
  );
}

