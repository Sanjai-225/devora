'use client';

import Link from 'next/link';
import { Search, Sparkles, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function TopBar() {
  const { user, isDeveloper, switchRole } = useAuth();

  return (
    <header className="h-14 bg-surface-1/85 backdrop-blur-sm border-b border-border flex items-center px-4 gap-4 sticky top-0 z-40">
      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-[4px] px-3 h-8 w-64">
        <Search size={14} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder={isDeveloper ? 'Quick Jump projects, branches...' : 'Search your websites...'}
          className="bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none w-full"
        />
      </div>

      {/* Role & Engine Status */}
      <div className="hidden md:flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald" />
        <span className="text-text-secondary">
          {isDeveloper
            ? 'Developer Console (sanjay22522g@gmail.com)'
            : 'Guided Creator Mode • Auto-Build Active'}
        </span>
      </div>

      <div className="flex-1" />

      {/* Right side controls */}
      <nav className="flex items-center gap-2.5">
        {!isDeveloper && (
          <Link
            href="/create-website"
            className="h-8 px-3 rounded-md bg-cyan text-canvas font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Sparkles size={13} />
            <span>⚡ Auto Build Website</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => switchRole(isDeveloper ? 'user' : 'developer')}
          className="h-8 px-2.5 rounded-md bg-surface-2 hover:bg-surface-3 border border-border text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          title="Switch between User Mode and Developer Mode"
        >
          {isDeveloper ? (
            <>
              <Sparkles size={13} className="text-cyan" />
              <span>Switch to User View</span>
            </>
          ) : (
            <>
              <ShieldCheck size={13} className="text-emerald" />
              <span>Switch to Dev View</span>
            </>
          )}
        </button>

        <Link
          href="/sign-in"
          className="h-8 px-2.5 rounded-md bg-surface-2 hover:bg-surface-3 border border-border text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
        >
          <LogIn size={13} />
          <span className="hidden sm:inline">Login / Accounts</span>
        </Link>

        <Link
          href="/settings"
          className="px-2.5 h-8 rounded-md bg-surface-3 border border-border flex items-center gap-2 text-xs font-medium text-text-primary hover:border-border-hover transition-colors"
        >
          <span
            className={`w-2 h-2 rounded-full ${isDeveloper ? 'bg-emerald' : 'bg-cyan'}`}
          />
          <span className="truncate max-w-[130px]">
            {user?.display_name?.split(' ')[0] || (isDeveloper ? 'Sanjay' : 'Alex')}
          </span>
        </Link>
      </nav>
    </header>
  );
}
