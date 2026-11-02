/**
 * API client for communicating with the Devora backend.
 */

import type {
  AgentStateResponse,
  ConfigurationState,
  ConversationMessage,
  DatabaseTestResult,
  DesignVersion,
  DesignVersionListResponse,
  ImplementationPlan,
  Project,
  ProjectListResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = body.error || body.detail || {};
    throw new ApiError(
      res.status,
      error.code || 'UNKNOWN_ERROR',
      error.message || `Request failed with status ${res.status}`,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getWebSocketUrl(projectId: string, token?: string | null): string {
  const wsBase = API_BASE.replace(/^http/, 'ws');
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${wsBase}/projects/${projectId}/agent/ws${qs}`;
}

export const api = {
  // Health
  health: () => request<{ status: string; version: string }>('/health'),

  // Auth
  verify: (token: string) =>
    request<{ uid: string; email: string }>('/auth/verify', {}, token),

  // Users
  getProfile: (token: string) =>
    request<Record<string, unknown>>('/users/me', {}, token),
  updateProfile: (token: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/users/me', { method: 'PUT', body: JSON.stringify(data) }, token),

  // Projects
  listProjects: (token: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<ProjectListResponse>(
      `/projects${qs}`, {}, token,
    );
  },
  createProject: (token: string, data: { name: string; description: string }) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }, token),
  getProject: (token: string, id: string) =>
    request<Project>(`/projects/${id}`, {}, token),
  updateProject: (token: string, id: string, data: Record<string, unknown>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteProject: (token: string, id: string) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }, token),

  // Agent & Requirement Analysis (Phase 2)
  startAgent: (token: string, projectId: string, message?: string) =>
    request<AgentStateResponse>(
      `/projects/${projectId}/agent/start`,
      { method: 'POST', body: JSON.stringify(message ? { message } : {}) },
      token,
    ),
  sendAgentMessage: (
    token: string,
    projectId: string,
    payload: {
      type: 'user_message' | 'clarification_response' | 'user_approval';
      content?: string;
      answers?: Record<string, string>;
      approved?: boolean;
      stage?: string;
      choice?: string;
    },
  ) =>
    request<AgentStateResponse>(
      `/projects/${projectId}/agent/message`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),
  getAgentState: (token: string, projectId: string) =>
    request<AgentStateResponse>(`/projects/${projectId}/agent/state`, {}, token),

  // Conversations
  getConversations: (token: string, projectId: string, limit = 100) =>
    request<{ messages: ConversationMessage[]; total: number }>(
      `/projects/${projectId}/conversations?limit=${limit}`,
      {},
      token,
    ),

  // Optional Design System (Phase 3)
  setDesignChoice: (
    token: string,
    projectId: string,
    choice: 'design_first' | 'direct_code',
  ) =>
    request<{
      project_id: string;
      design_choice: 'design_first' | 'direct_code';
      status: string;
      current_stage: string;
      next_route: string;
      message: string;
    }>(
      `/projects/${projectId}/design/choice`,
      { method: 'POST', body: JSON.stringify({ choice }) },
      token,
    ),
  generateDesign: (token: string, projectId: string) =>
    request<DesignVersion>(
      `/projects/${projectId}/design/generate`,
      { method: 'POST' },
      token,
    ),
  modifyDesign: (
    token: string,
    projectId: string,
    prompt: string,
    tokenOverrides?: Record<string, unknown>,
  ) =>
    request<DesignVersion>(
      `/projects/${projectId}/design/modify`,
      {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          token_overrides: tokenOverrides,
        }),
      },
      token,
    ),
  listDesignVersions: (token: string, projectId: string) =>
    request<DesignVersionListResponse>(
      `/projects/${projectId}/design/versions`,
      {},
      token,
    ),
  getDesignVersion: (token: string, projectId: string, versionId: string) =>
    request<DesignVersion>(
      `/projects/${projectId}/design/versions/${versionId}`,
      {},
      token,
    ),
  approveDesignVersion: (token: string, projectId: string, versionId: string) =>
    request<DesignVersion>(
      `/projects/${projectId}/design/versions/${versionId}/approve`,
      { method: 'POST' },
      token,
    ),
  restoreDesignVersion: (token: string, projectId: string, versionId: string) =>
    request<DesignVersion>(
      `/projects/${projectId}/design/versions/${versionId}/restore`,
      { method: 'POST' },
      token,
    ),

  // Configuration & Implementation Planning (Phase 4)
  getConfiguration: (token: string, projectId: string) =>
    request<ConfigurationState>(
      `/projects/${projectId}/configuration`,
      {},
      token,
    ),
  saveConfiguration: (
    token: string,
    projectId: string,
    payload: {
      environment?: 'development' | 'staging' | 'production';
      values: Record<string, string>;
      database_engine?: string;
      database_uri?: string;
      ssl_mode?: string;
      connection_pooling?: boolean;
      guardrails?: Record<string, boolean>;
    },
  ) =>
    request<ConfigurationState>(
      `/projects/${projectId}/configuration`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),
  testDatabaseConnection: (
    token: string,
    projectId: string,
    payload: {
      engine: string;
      connection_uri: string;
      ssl_mode?: string;
      connection_pooling?: boolean;
    },
  ) =>
    request<DatabaseTestResult>(
      `/projects/${projectId}/configuration/test-db`,
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),
  getPlan: (token: string, projectId: string) =>
    request<ImplementationPlan>(
      `/projects/${projectId}/plan`,
      {},
      token,
    ),
  generatePlan: (token: string, projectId: string) =>
    request<ImplementationPlan>(
      `/projects/${projectId}/plan/generate`,
      { method: 'POST' },
      token,
    ),
  approvePlan: (token: string, projectId: string) =>
    request<ImplementationPlan>(
      `/projects/${projectId}/plan/approve`,
      { method: 'POST' },
      token,
    ),

  // Workspace & Execution (Phase 5)
  getWorkspace: (token: string, projectId: string) =>
    request<import('@/types').WorkspaceStatus>(
      `/projects/${projectId}/workspace`,
      {},
      token,
    ),
  createWorkspace: (token: string, projectId: string, autoStart = true) =>
    request<import('@/types').WorkspaceStatus>(
      `/projects/${projectId}/workspace?auto_start=${autoStart}`,
      { method: 'POST' },
      token,
    ),
  startWorkspace: (token: string, projectId: string) =>
    request<import('@/types').WorkspaceStatus>(
      `/projects/${projectId}/workspace/start`,
      { method: 'POST' },
      token,
    ),
  stopWorkspace: (token: string, projectId: string) =>
    request<import('@/types').WorkspaceStatus>(
      `/projects/${projectId}/workspace/stop`,
      { method: 'POST' },
      token,
    ),
  restartWorkspace: (token: string, projectId: string) =>
    request<import('@/types').WorkspaceStatus>(
      `/projects/${projectId}/workspace/restart`,
      { method: 'POST' },
      token,
    ),
  readWorkspaceFile: (token: string, projectId: string, path: string) =>
    request<import('@/types').WorkspaceFileContent>(
      `/projects/${projectId}/workspace/files/content?path=${encodeURIComponent(path)}`,
      {},
      token,
    ),
  writeWorkspaceFile: (token: string, projectId: string, path: string, content: string) =>
    request<import('@/types').WorkspaceFileEntry>(
      `/projects/${projectId}/workspace/files/content`,
      { method: 'PUT', body: JSON.stringify({ path, content }) },
      token,
    ),
  executeWorkspaceCommand: (
    token: string,
    projectId: string,
    command: string,
    timeoutSeconds = 30,
  ) =>
    request<import('@/types').WorkspaceCommandResult>(
      `/projects/${projectId}/workspace/exec`,
      {
        method: 'POST',
        body: JSON.stringify({ command, timeout_seconds: timeoutSeconds }),
      },
      token,
    ),

  // Code Generation, Incremental Surgical Editing & Git Checkpoints (Phase 6)
  generateWorkspaceCode: (
    token: string,
    projectId: string,
    templateType = 'portfolio',
  ) =>
    request<import('@/types').CodeGenerationResult>(
      `/projects/${projectId}/workspace/generate`,
      {
        method: 'POST',
        body: JSON.stringify({ template_type: templateType }),
      },
      token,
    ),
  editWorkspaceCode: (
    token: string,
    projectId: string,
    prompt: string,
    targetFiles?: string[],
  ) =>
    request<import('@/types').IncrementalEditResult>(
      `/projects/${projectId}/workspace/edit`,
      {
        method: 'POST',
        body: JSON.stringify({ prompt, target_files: targetFiles }),
      },
      token,
    ),
  searchWorkspaceFiles: (
    token: string,
    projectId: string,
    query: string,
    pattern = '*',
  ) =>
    request<import('@/types').WorkspaceSearchMatch[]>(
      `/projects/${projectId}/workspace/search?q=${encodeURIComponent(query)}&pattern=${encodeURIComponent(pattern)}`,
      {},
      token,
    ),
  listWorkspaceCheckpoints: (token: string, projectId: string) =>
    request<import('@/types').GitCheckpointRecord[]>(
      `/projects/${projectId}/workspace/checkpoints`,
      {},
      token,
    ),
  createWorkspaceCheckpoint: (
    token: string,
    projectId: string,
    message: string,
    tag = 'manual',
  ) =>
    request<import('@/types').GitCheckpointRecord>(
      `/projects/${projectId}/workspace/checkpoints`,
      {
        method: 'POST',
        body: JSON.stringify({ message, tag }),
      },
      token,
    ),
  restoreWorkspaceCheckpoint: (
    token: string,
    projectId: string,
    commitSha: string,
  ) =>
    request<import('@/types').GitCheckpointRecord>(
      `/projects/${projectId}/workspace/checkpoints/${encodeURIComponent(commitSha)}/restore`,
      { method: 'POST' },
      token,
    ),
  confirmWorkspaceDeployment: (
    token: string,
    projectId: string,
    payload: {
      user_confirmed: boolean;
      target_branch?: 'testing' | 'main';
      frontend_provider?: string;
      backend_provider?: string;
    },
  ) =>
    request<import('@/types').DeploymentConfirmationResult>(
      `/projects/${projectId}/workspace/deploy-confirm`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),

  // Testing, Verification & Bounded Auto-Repair (Phase 7)
  verifyWorkspace: (
    token: string,
    projectId: string,
    autoRepair = false,
  ) =>
    request<import('@/types').VerificationReport>(
      `/projects/${projectId}/workspace/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ auto_repair: autoRepair }),
      },
      token,
    ),
  repairWorkspace: (
    token: string,
    projectId: string,
    maxAttempts = 3,
  ) =>
    request<import('@/types').VerificationReport>(
      `/projects/${projectId}/workspace/repair`,
      {
        method: 'POST',
        body: JSON.stringify({ max_attempts: maxAttempts }),
      },
      token,
    ),

  // Download & Project Management (Phase 8)
  getWorkspaceExportMetadata: (token: string, projectId: string) =>
    request<import('@/types').ProjectExportMetadata>(
      `/projects/${projectId}/workspace/export/metadata`,
      {},
      token,
    ),
  downloadWorkspaceZip: async (token: string, projectId: string): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/workspace/export`,
      { headers },
    );
    if (!response.ok) {
      throw new ApiError(response.status, 'EXPORT_FAILED', 'Failed to export ZIP archive');
    }
    return response.blob();
  },

  // GitHub Integrations & Cloud Deployment (Phase 9)
  listIntegrations: (token: string) =>
    request<import('@/types').IntegrationStatus[]>('/integrations', {}, token),

  getGitHubOAuthUrl: (token: string, redirectUri?: string) =>
    request<import('@/types').GitHubOAuthUrlResponse>(
      `/integrations/github/oauth-url${redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''}`,
      {},
      token,
    ),

  connectIntegration: (
    token: string,
    payload: {
      provider: 'github' | 'vercel' | 'render';
      account_handle: string;
      token_or_code: string;
    },
  ) =>
    request<import('@/types').IntegrationStatus>(
      '/integrations/connect',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),

  disconnectIntegration: (token: string, provider: 'github' | 'vercel' | 'render') =>
    request<import('@/types').IntegrationStatus>(
      `/integrations/${provider}`,
      { method: 'DELETE' },
      token,
    ),

  pushToGitHub: (
    token: string,
    projectId: string,
    payload: {
      repo_name: string;
      branch?: string;
      commit_message?: string;
      create_if_missing?: boolean;
    },
  ) =>
    request<import('@/types').GitHubRepoPushResult>(
      `/projects/${projectId}/github/push`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),

  triggerCloudDeployment: (
    token: string,
    projectId: string,
    payload: {
      provider: 'vercel' | 'render';
      user_confirmed: boolean;
      target_branch: 'testing' | 'main';
      environment?: 'preview' | 'production';
    },
  ) =>
    request<import('@/types').CloudDeploymentRecord>(
      `/projects/${projectId}/deploy`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),

  listProjectDeployments: (token: string, projectId: string) =>
    request<import('@/types').CloudDeploymentRecord[]>(
      `/projects/${projectId}/deployments`,
      {},
      token,
    ),
};

export { ApiError };




