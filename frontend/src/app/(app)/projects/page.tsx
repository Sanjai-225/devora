'use client';

/**
 * My Projects listing page.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusChip } from '@/components/ui/status-chip';
import type { Project, ProjectStatus } from '@/types';
import { Plus, Search, ExternalLink, MoreHorizontal, Trash2, FolderOpen } from 'lucide-react';

// Same mock data — will come from API later
const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001', user_id: 'dev-user-001', name: 'Supastack AI', status: 'ready',
    description: 'Full-stack AI analytics dashboard', created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-11-01T09:00:00Z', design_choice: 'design_first',
    preview_url: 'https://supastack-ai.devora.app', preview_status: 'running',
    workspace_id: 'ws-001', current_agent_stage: null, confirmed_stack: { framework: 'Next.js 14', styling: 'Tailwind', backend: 'Supabase' },
    plan_approved: true, github_repo: null, deployment_url: null, deployment_provider: null,
  },
  {
    id: 'proj-002', user_id: 'dev-user-001', name: 'PulseMetrics Cloud', status: 'building',
    description: 'Real-time analytics ingestion pipeline', created_at: '2026-10-25T14:00:00Z',
    updated_at: '2026-11-01T07:00:00Z', design_choice: 'direct_code',
    preview_url: null, preview_status: 'stopped', workspace_id: 'ws-002',
    current_agent_stage: 'code_generation', confirmed_stack: { framework: 'React', styling: 'Tailwind', backend: 'PostgreSQL' },
    plan_approved: true, github_repo: null, deployment_url: null, deployment_provider: null,
  },
  {
    id: 'proj-003', user_id: 'dev-user-001', name: 'FinEdge Billing Portal', status: 'testing',
    description: 'Billing and subscription management with Stripe', created_at: '2026-10-15T08:00:00Z',
    updated_at: '2026-10-31T15:00:00Z', design_choice: 'design_first',
    preview_url: null, preview_status: 'stopped', workspace_id: 'ws-003',
    current_agent_stage: 'testing', confirmed_stack: { framework: 'Next.js', backend: 'Stripe', db: 'Prisma' },
    plan_approved: true, github_repo: null, deployment_url: null, deployment_provider: null,
  },
  {
    id: 'proj-004', user_id: 'dev-user-001', name: 'CraftUI Component Lib', status: 'draft',
    description: 'React component library with Tailwind CSS tokens', created_at: '2026-10-28T12:00:00Z',
    updated_at: '2026-10-28T12:00:00Z', design_choice: 'pending',
    preview_url: null, preview_status: 'stopped', workspace_id: null,
    current_agent_stage: null, confirmed_stack: null,
    plan_approved: false, github_repo: null, deployment_url: null, deployment_provider: null,
  },
];

function timeAgo(dateStr: string, now: number): string {
  const diff = now - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const filtered = MOCK_PROJECTS.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Projects</h1>
          <p className="text-sm text-text-secondary mt-1">{MOCK_PROJECTS.length} projects total</p>
        </div>
        <Link href="/create-website">
          <Button variant="primary" icon={<Plus size={16} />}>New Project</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-[4px] px-3 h-9 w-72">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            placeholder="Search projects..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 bg-surface-2 border border-border rounded-[4px] text-sm text-text-primary outline-none focus:border-cyan appearance-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="building">Building</option>
          <option value="testing">Testing</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {filtered.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card hoverable>
              <CardContent className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-sm font-semibold text-text-secondary shrink-0">
                  {project.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-text-primary">{project.name}</h3>
                    <StatusChip status={project.status} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{project.description}</p>
                </div>
                {project.confirmed_stack && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {Object.values(project.confirmed_stack).slice(0, 3).map((tech) => (
                      <span key={tech} className="text-[10px] font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-xs text-text-muted shrink-0 w-20 text-right">
                  {timeAgo(project.updated_at, now)}
                </span>
                {project.preview_url && (
                  <ExternalLink size={14} className="text-text-muted shrink-0" />
                )}
                <button
                  className="text-text-muted hover:text-text-primary p-1 shrink-0"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal size={16} />
                </button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen size={40} className="text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No projects found</h3>
          <p className="text-sm text-text-secondary">
            {search ? 'Try a different search term.' : 'Create your first project to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}
