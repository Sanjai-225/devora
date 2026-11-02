'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Paintbrush,
  Terminal,
  Plug,
  Settings,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Create Website', href: '/create-website', icon: PlusCircle, badge: 'NEW' },
  { label: 'My Projects', href: '/projects', icon: FolderKanban },
  { label: 'Design Studio', href: '/design-studio', icon: Paintbrush },
  { label: 'Workspace', href: '/workspace', icon: Terminal },
  { label: 'Integrations', href: '/integrations', icon: Plug },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen bg-surface-1 border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-border">
        <span className="text-lg font-semibold text-text-primary tracking-tight">
          <span className="text-cyan">D</span>evora
        </span>
        <span className="text-[10px] font-mono bg-surface-3 text-cyan px-1.5 py-0.5 rounded border border-cyan/30">
          v1.0
        </span>
      </div>

      {/* Agent status */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
          <span className="text-xs text-text-secondary">Gemini</span>
          <span className="ml-auto text-[10px] font-mono text-emerald">ONLINE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-medium text-text-muted uppercase tracking-widest">
          Platform Suite
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
                ${isActive
                  ? 'bg-cyan/10 text-cyan border-l-2 border-cyan -ml-[2px] pl-[14px]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }
              `}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-cyan text-canvas px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-medium text-text-secondary">
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">Dev User</p>
            <p className="text-xs text-text-muted truncate">dev@devora.local</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

