'use client';

import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TopBar() {
  return (
    <header className="h-14 bg-surface-1/75 backdrop-blur-sm border-b border-border flex items-center px-4 gap-4 sticky top-0 z-40">
      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-[4px] px-3 h-8 w-72">
        <Search size={14} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Quick Jump..."
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
        />
        <kbd className="text-[10px] font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded shrink-0">
          ⌘K
        </kbd>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald" />
        <span className="text-text-secondary">Gemini Active</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <nav className="flex items-center gap-3">
        <button className="text-text-secondary hover:text-text-primary transition-colors text-sm">
          Docs
        </button>
        <button className="relative text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan rounded-full border-2 border-surface-1" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-medium text-text-secondary cursor-pointer hover:border-border-hover transition-colors">
          D
        </div>
      </nav>
    </header>
  );
}

