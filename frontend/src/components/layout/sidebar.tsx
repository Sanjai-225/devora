'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Paintbrush,
  Terminal,
  Plug,
  Settings,
  Sparkles,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, isDeveloper, switchRole } = useAuth();

  const userNavItems = [
    { label: 'User Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Create / Auto-Build', href: '/create-website', icon: Sparkles, badge: 'AUTO' },
    { label: 'My Websites', href: '/projects', icon: FolderKanban },
    { label: 'Design Studio', href: '/design-studio', icon: Paintbrush },
    { label: 'Live Workspace & Edit', href: '/workspace', icon: Terminal },
    { label: 'Profile & Settings', href: '/settings', icon: Settings },
  ];

  const developerNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Create Website', href: '/create-website', icon: PlusCircle, badge: 'NEW' },
    { label: 'My Projects', href: '/projects', icon: FolderKanban },
    { label: 'Design Studio', href: '/design-studio', icon: Paintbrush },
    { label: 'Workspace', href: '/workspace', icon: Terminal },
    { label: 'Integrations', href: '/integrations', icon: Plug, badge: 'DEV' },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const navItems = isDeveloper ? developerNavItems : userNavItems;

  return (
    <aside className="w-64 h-screen bg-surface-1 border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-border">
        <span className="text-lg font-semibold text-text-primary tracking-tight">
          <span className="text-cyan">D</span>evora
        </span>
        <span
          className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded border ${
            isDeveloper
              ? 'bg-emerald-muted text-emerald border-emerald-border'
              : 'bg-cyan/15 text-cyan border-cyan/30'
          }`}
        >
          {isDeveloper ? 'DEV MODE' : 'USER MODE'}
        </span>
      </div>

      {/* Role Switcher Pill (Easy testing between User and Developer roles) */}
      <div className="px-3 py-3 border-b border-border space-y-2">
        <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider px-1 flex items-center justify-between">
          <span>Active RBAC Role</span>
          <Link href="/sign-in" className="text-cyan hover:underline">
            Switch Login
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-2 border border-border">
          <button
            type="button"
            onClick={() => switchRole('user')}
            className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
              !isDeveloper
                ? 'bg-cyan text-canvas font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles size={11} />
            <span>User</span>
          </button>
          <button
            type="button"
            onClick={() => switchRole('developer')}
            className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
              isDeveloper
                ? 'bg-emerald text-canvas font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShieldCheck size={11} />
            <span>Developer</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-medium text-text-muted uppercase tracking-widest">
          {isDeveloper ? 'Developer Engineering Suite' : 'Guided Website Creator'}
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-cyan/10 text-cyan border-l-2 border-cyan -ml-[2px] pl-[14px]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }
              `}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-cyan text-canvas px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Active Profile Footer */}
      <div className="px-4 py-3 border-t border-border bg-surface-2/40 space-y-2">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
              isDeveloper
                ? 'bg-emerald/15 border-emerald/40 text-emerald'
                : 'bg-cyan/15 border-cyan/40 text-cyan'
            }`}
          >
            {isDeveloper ? 'SG' : 'AR'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">
              {user?.display_name || (isDeveloper ? 'Sanjay G (Developer)' : 'Alex Rivera (User)')}
            </p>
            <p className="text-[11px] font-mono text-text-muted truncate">
              {user?.email || (isDeveloper ? 'sanjay22522g@gmail.com' : 'creator@devora.app')}
            </p>
          </div>
          <Link
            href="/sign-in"
            className="p-1.5 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary"
            title="Sign in / Switch account"
          >
            <LogOut size={14} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
