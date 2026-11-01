'use client';

/**
 * Dashboard page — matches the Stitch devora_dashboard design.
 * Shows welcome header, stats cards, project grid, and agent activity.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import type { Project, ProjectStatus } from '@/types';
import {
  Plus,
  FolderUp,
  CloudUpload,
  Zap,
  Activity,
  Search,
  Grid3X3,
  List,
  ExternalLink,
} from 'lucide-react';

// Mock data for dev mode
const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    user_id: 'dev-user-001',
    name: 'Supastack AI',
    status: 'ready',
    description: 'Full-stack AI analytics dashboard with Supabase backend',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-11-01T09:00:00Z',
    design_choice: 'design_first',
    preview_url: 'https://supastack-ai.devora.app',
    preview_status: 'running',
    workspace_id: 'ws-001',
    current_agent_stage: null,
    confirmed_stack: { framework: 'Next.js 14', styling: 'Tailwind', backend: 'Supabase' },
    plan_approved: true,
    github_repo: null,
    deployment_url: null,
    deployment_provider: null,
  },
  {
    id: 'proj-002',
    user_id: 'dev-user-001',
    name: 'PulseMetrics Cloud',
    status: 'building',
    description: 'Real-time analytics ingestion pipeline dashboard',
    created_at: '2026-10-25T14:00:00Z',
    updated_at: '2026-11-01T07:00:00Z',
    design_choice: 'direct_code',
    preview_url: null,
    preview_status: 'stopped',
    workspace_id: 'ws-002',
    current_agent_stage: 'code_generation',
    confirmed_stack: { framework: 'React', styling: 'Tailwind', backend: 'PostgreSQL' },
    plan_approved: true,
    github_repo: null,
    deployment_url: null,
    deployment_provider: null,
  },
  {
    id: 'proj-003',
    user_id: 'dev-user-001',
    name: 'FinEdge Billing Portal',
    status: 'testing',
    description: 'Billing and subscription management portal with Stripe integration',
    created_at: '2026-10-15T08:00:00Z',
    updated_at: '2026-10-31T15:00:00Z',
    design_choice: 'design_first',
    preview_url: null,
    preview_status: 'stopped',
    workspace_id: 'ws-003',
    current_agent_stage: 'testing',
    confirmed_stack: { framework: 'Next.js', backend: 'Stripe', db: 'Prisma' },
    plan_approved: true,
    github_repo: null,
    deployment_url: null,
    deployment_provider: null,
  },
  {
    id: 'proj-004',
    user_id: 'dev-user-001',
    name: 'CraftUI Component Lib',
    status: 'draft',
    description: 'React component library with Tailwind CSS tokens',
    created_at: '2026-10-28T12:00:00Z',
    updated_at: '2026-10-28T12:00:00Z',
    design_choice: 'pending',
    preview_url: null,
    preview_status: 'stopped',
    workspace_id: null,
    current_agent_stage: null,
    confirmed_stack: null,
    plan_approved: false,
    github_repo: null,
    deployment_url: null,
    deployment_provider: null,
  },
];

const STATS = [
  { label: 'Active Projects', value: '4', sub: '+2 this week', icon: FolderUp, color: 'text-cyan' },
  { label: 'Edge Preview Uptime', value: '99.98%', sub: 'Global SLA', icon: CloudUpload, color: 'text-emerald' },
  { label: 'Deploys (7d)', value: '12', sub: '100% automated', icon: Zap, color: 'text-emerald' },
  { label: 'Agent Tasks', value: '3', sub: 'Active Synth', icon: Activity, color: 'text-cyan' },
];

const TABS = ['All', 'Building', 'Ready', 'Failed'] as const;

function timeAgo(dateStr: string, now: number): string {
  const diff = now - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [filter, setFilter] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const filtered = MOCK_PROJECTS.filter((p) => {
    if (activeTab !== 'All') {
      const tabMap: Record<string, ProjectStatus[]> = {
        Building: ['building', 'analyzing', 'designing', 'configuring', 'planning', 'testing', 'repairing'],
        Ready: ['ready'],
        Failed: ['failed'],
      };
      if (!tabMap[activeTab]?.includes(p.status)) return false;
    }
    if (filter && !p.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      {/* Welcome */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back, Dev</h1>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-emerald-muted text-emerald border border-emerald-border px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
              Devora Engine v0.1 • All Systems Operational
            </span>
          </div>
          <p className="text-text-secondary text-sm">
            Orchestrating AI-powered website development agents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={<FolderUp size={16} />}>
            Import Git Repo
          </Button>
          <Link href="/create-website">
            <Button variant="primary" icon={<Plus size={16} />}>
              Create Website
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-secondary mb-2">{stat.label}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.color}`}>{stat.sub}</p>
                </div>
                <Icon size={20} className="text-text-muted" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Project list header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-[4px] px-3 h-8 w-64">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            placeholder="Filter projects, tags, branches..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="flex items-center bg-surface-2 border border-border rounded-[4px] overflow-hidden">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 h-8 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
              {tab === 'All' && ` (${MOCK_PROJECTS.length})`}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 bg-surface-2 border border-border rounded-[4px] overflow-hidden">
          <button className="p-1.5 text-text-primary bg-surface-3">
            <Grid3X3 size={14} />
          </button>
          <button className="p-1.5 text-text-muted hover:text-text-primary">
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card hoverable className="h-full">
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-sm font-semibold text-text-secondary">
                      {project.name[0]}
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary">{project.name}</h3>
                      {project.preview_url && (
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          {project.preview_url.replace('https://', '')}
                          <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusChip status={project.status} />
                </div>

                {project.confirmed_stack && (
                  <div className="flex items-center gap-2 mb-3">
                    {Object.values(project.confirmed_stack).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-mono text-text-muted bg-surface-3 px-1.5 py-0.5 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Updated {timeAgo(project.updated_at, now)}</span>
                  {project.current_agent_stage && (
                    <span className="text-cyan font-mono text-[10px]">
                      Stage: {project.current_agent_stage}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
            <FolderUp size={24} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-1">No projects found</h3>
          <p className="text-sm text-text-secondary mb-4">
            {filter ? 'Try a different search term.' : 'Create your first website to get started.'}
          </p>
          {!filter && (
            <Link href="/create-website">
              <Button variant="primary" icon={<Plus size={16} />}>
                Create Website
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

