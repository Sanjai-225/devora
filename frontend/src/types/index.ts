/**
 * Shared types for Devora frontend.
 */

export type ProjectStatus =
  | 'draft'
  | 'analyzing'
  | 'clarifying'
  | 'designing'
  | 'awaiting_design_approval'
  | 'configuring'
  | 'planning'
  | 'awaiting_plan_approval'
  | 'building'
  | 'testing'
  | 'repairing'
  | 'ready'
  | 'failed'
  | 'archived';

export type DesignChoice = 'design_first' | 'direct_code' | 'pending';
export type PreviewStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface User {
  uid: string;
  email: string;
  display_name: string;
  photo_url?: string | null;
  role: string;
  created_at?: string | null;
  settings: {
    preferredLLM: string;
    defaultFramework: string;
    defaultStyling: string;
  };
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  description?: string | null;
  created_at: string;
  updated_at: string;
  design_choice: DesignChoice;
  preview_url?: string | null;
  preview_status: PreviewStatus;
  workspace_id?: string | null;
  current_agent_stage?: string | null;
  confirmed_stack?: Record<string, string> | null;
  plan_approved: boolean;
  github_repo?: string | null;
  deployment_url?: string | null;
  deployment_provider?: string | null;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  has_more: boolean;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  analyzing: 'Analyzing',
  clarifying: 'Clarifying',
  designing: 'Designing',
  awaiting_design_approval: 'Awaiting Approval',
  configuring: 'Configuring',
  planning: 'Planning',
  awaiting_plan_approval: 'Awaiting Approval',
  building: 'Building',
  testing: 'Testing',
  repairing: 'Repairing',
  ready: 'Ready',
  failed: 'Failed',
  archived: 'Archived',
};

export const STATUS_COLORS: Record<ProjectStatus, { text: string; bg: string; border: string; dot: string }> = {
  draft: { text: 'text-text-muted', bg: 'bg-surface-3', border: 'border-border', dot: 'bg-text-muted' },
  analyzing: { text: 'text-cyan', bg: 'bg-cyan-muted', border: 'border-cyan-border', dot: 'bg-cyan' },
  clarifying: { text: 'text-cyan', bg: 'bg-cyan-muted', border: 'border-cyan-border', dot: 'bg-cyan' },
  designing: { text: 'text-indigo', bg: 'bg-indigo/10', border: 'border-indigo/25', dot: 'bg-indigo' },
  awaiting_design_approval: { text: 'text-amber', bg: 'bg-amber-muted', border: 'border-amber-border', dot: 'bg-amber' },
  configuring: { text: 'text-cyan', bg: 'bg-cyan-muted', border: 'border-cyan-border', dot: 'bg-cyan' },
  planning: { text: 'text-cyan', bg: 'bg-cyan-muted', border: 'border-cyan-border', dot: 'bg-cyan' },
  awaiting_plan_approval: { text: 'text-amber', bg: 'bg-amber-muted', border: 'border-amber-border', dot: 'bg-amber' },
  building: { text: 'text-cyan', bg: 'bg-cyan-muted', border: 'border-cyan-border', dot: 'bg-cyan' },
  testing: { text: 'text-cyan', bg: 'bg-cyan-muted', border: 'border-cyan-border', dot: 'bg-cyan' },
  repairing: { text: 'text-amber', bg: 'bg-amber-muted', border: 'border-amber-border', dot: 'bg-amber' },
  ready: { text: 'text-emerald', bg: 'bg-emerald-muted', border: 'border-emerald-border', dot: 'bg-emerald' },
  failed: { text: 'text-red', bg: 'bg-red-muted', border: 'border-red-border', dot: 'bg-red' },
  archived: { text: 'text-text-muted', bg: 'bg-surface-3', border: 'border-border', dot: 'bg-text-muted' },
};

