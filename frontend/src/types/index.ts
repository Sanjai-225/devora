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

export interface PageDefinition {
  name: string;
  route: string;
  description: string;
  components: string[];
  is_authenticated: boolean;
}

export interface FeatureDefinition {
  name: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have' | string;
  requires_backend: boolean;
}

export interface TechnologyStack {
  framework: string;
  styling: string;
  backend: string;
  database: string;
  auth_methods: string[];
  additional_libraries: string[];
  language: string;
}

export interface DesignPreferences {
  color_scheme?: string | null;
  style?: string | null;
  has_logo: boolean;
  reference_sites: string[];
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  why: string;
  options: string[];
  default?: string | null;
}

export interface StructuredRequirements {
  project_name: string;
  project_type: string;
  summary: string;
  pages: PageDefinition[];
  features: FeatureDefinition[];
  technology_stack: TechnologyStack;
  design_preferences: DesignPreferences;
  complexity: 'simple' | 'moderate' | 'complex' | string;
  has_sample_data: boolean;
  target_audience?: string | null;
  assumptions_made: string[];
}

export interface ConversationMessage {
  id: string;
  project_id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  stage: string;
  metadata?: Record<string, unknown> | null;
}

export interface AgentStateResponse {
  project_id: string;
  status: ProjectStatus;
  current_stage: string;
  requirements?: StructuredRequirements | null;
  clarification_questions: ClarificationQuestion[];
  confirmed_stack?: Record<string, unknown> | null;
  design_choice: DesignChoice;
  should_wait_for_user: boolean;
  wait_reason?: string | null;
  latest_response?: string | null;
  messages: ConversationMessage[];
  events: Record<string, unknown>[];
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
  requirements?: StructuredRequirements | null;
  clarification_questions?: ClarificationQuestion[] | null;
  confirmed_stack?: Record<string, string> | null;
  plan_approved: boolean;
  github_repo?: string | null;
  deployment_url?: string | null;
  deployment_provider?: string | null;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  text_secondary: string;
}

export interface TypographySpec {
  heading_font: string;
  body_font: string;
  mono_font: string;
  scale: string;
}

export interface DesignSpecification {
  color_palette: ColorPalette;
  typography: TypographySpec;
  spacing_scale: string;
  border_radius: string;
  component_style: string;
  layout_pattern: string;
  dark_mode: boolean;
  pages_designed: string[];
  navigation_style: string;
}

export interface DesignVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_tag: string;
  label: string;
  prompt: string;
  summary_of_changes: string;
  design_spec: DesignSpecification;
  prototype_code: string;
  approved: boolean;
  created_at: string;
}

export interface DesignVersionListResponse {
  versions: DesignVersion[];
  active_version_id?: string | null;
  approved_version_id?: string | null;
}

export interface ConfigurationVariable {
  key: string;
  description: string;
  category: string;
  scope: 'server_only' | 'client_public';
  required: boolean;
  default_value?: string | null;
  placeholder?: string | null;
  encryption: string;
  environments: string[];
  is_configured: boolean;
  masked_value?: string | null;
}

export interface SecretFile {
  filename: string;
  mount_path: string;
  description: string;
  required: boolean;
  max_size_kb: number;
  uploaded: boolean;
  size_bytes?: number | null;
}

export interface ConfigurationState {
  project_id: string;
  project_type: string;
  environment: 'development' | 'staging' | 'production' | string;
  requires_credentials: boolean;
  requires_database_url: boolean;
  database_engine: string;
  masked_database_uri: string;
  ssl_mode: string;
  connection_pooling: boolean;
  variables: ConfigurationVariable[];
  secret_files: SecretFile[];
  guardrails: {
    auto_generate_env_example: boolean;
    zod_env_validation: boolean;
    secret_redaction_in_logs: boolean;
    prevent_client_secret_leaks: boolean;
    [key: string]: boolean;
  };
  security_score: number;
  summary_note: string;
  updated_at: string;
}

export interface DatabaseTestResult {
  reachable: boolean;
  engine: string;
  latency_ms: number;
  tls_version: string;
  pool_mode: string;
  message: string;
}

export interface ImplementationPlanStep {
  id: string;
  step_number: number;
  title: string;
  phase: string;
  description: string;
  files_to_create: string[];
  dependencies: string[];
  verification_command: string;
  estimated_seconds: number;
  status: 'pending' | 'ready' | 'completed';
}

export interface ImplementationPlan {
  id: string;
  project_id: string;
  project_name: string;
  architecture_summary: string;
  estimated_files_count: number;
  estimated_duration_seconds: number;
  environment_keys_configured: string[];
  steps: ImplementationPlanStep[];
  test_strategy: string[];
  security_checks: string[];
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFileEntry {
  path: string;
  name: string;
  is_dir: boolean;
  size_bytes: number;
  language: string;
  git_status: 'clean' | 'modified' | 'added' | 'untracked';
  updated_at: string;
}

export interface WorkspaceLogEntry {
  id: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  tag: string;
  message: string;
}

export interface WorkspaceFileContent {
  project_id: string;
  path: string;
  language: string;
  size_bytes: number;
  content: string;
}

export interface WorkspaceCommandResult {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timed_out: boolean;
  executed_at: string;
}

export interface WorkspaceStatus {
  workspace_id: string;
  project_id: string;
  project_name: string;
  workspace_path: string;
  status: PreviewStatus;
  pid?: number | null;
  allocated_port?: number | null;
  preview_url?: string | null;
  hosting_tier: string;
  files_count: number;
  cpu_percent: number;
  memory_mb: number;
  last_command?: string | null;
  files: WorkspaceFileEntry[];
  logs: WorkspaceLogEntry[];
  created_at: string;
  updated_at: string;
}

export interface GeneratedFileDiff {
  path: string;
  change_type: 'created' | 'modified' | 'deleted';
  language: string;
  added_lines: number;
  removed_lines: number;
  unified_diff: string;
  summary: string;
}

export interface GitCheckpointRecord {
  checkpoint_id: string;
  project_id: string;
  commit_sha: string;
  short_sha: string;
  message: string;
  tag: string;
  author: string;
  files_changed: number;
  created_at: string;
}

export interface WorkspaceSearchMatch {
  path: string;
  line_number: number;
  line_content: string;
  language: string;
}

export interface CodeGenerationResult {
  project_id: string;
  project_name: string;
  template_type: string;
  files_created: string[];
  file_diffs: GeneratedFileDiff[];
  dependencies_installed: string[];
  build_passed: boolean;
  build_output: string;
  checkpoint?: GitCheckpointRecord | null;
  summary: string;
  generated_at: string;
}

export interface IncrementalEditResult {
  project_id: string;
  prompt: string;
  files_modified: string[];
  files_untouched_count: number;
  file_diffs: GeneratedFileDiff[];
  build_passed: boolean;
  checkpoint?: GitCheckpointRecord | null;
  summary: string;
  edited_at: string;
}

export interface DeploymentConfirmationResult {
  project_id: string;
  user_confirmed: boolean;
  ready_for_deploy: boolean;
  target_branch: string;
  frontend_provider: string;
  backend_provider: string;
  database_provider: string;
  estimated_monthly_cost_usd: number;
  latest_checkpoint_sha: string;
  verification_checklist: string[];
  confirmed_at: string;
}

export interface BuildCheckResult {
  project_id: string;
  passed: boolean;
  exit_code: number;
  checked_files_count: number;
  broken_files: string[];
  errors: string[];
  stdout: string;
  stderr: string;
  duration_ms: number;
  checked_at: string;
}

export interface ConsoleErrorEntry {
  id: string;
  source: 'build' | 'console' | 'runtime' | 'test';
  severity: 'error' | 'warning';
  file_path?: string | null;
  line_number?: number | null;
  message: string;
  suggestion: string;
}

export interface PlaywrightTestCaseResult {
  test_id: string;
  name: string;
  route_or_target: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  assertion_summary: string;
  error_message?: string | null;
}

export interface PlaywrightSmokeSuiteResult {
  project_id: string;
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration_ms: number;
  test_cases: PlaywrightTestCaseResult[];
  executed_at: string;
}

export interface ErrorAnalysisResult {
  project_id: string;
  has_errors: boolean;
  error_count: number;
  affected_files: string[];
  root_cause_summary: string;
  recommended_fixes: string[];
  console_errors: ConsoleErrorEntry[];
  analyzed_at: string;
}

export interface RepairAttemptRecord {
  attempt_number: number;
  files_repaired: string[];
  fix_description: string;
  build_passed_after: boolean;
  tests_passed_after: boolean;
  remaining_errors_count: number;
  checkpoint_sha?: string | null;
  repaired_at: string;
}

export interface VerificationReport {
  report_id: string;
  project_id: string;
  overall_status: 'passed' | 'repaired' | 'failed';
  build_check: BuildCheckResult;
  test_suite: PlaywrightSmokeSuiteResult;
  error_analysis: ErrorAnalysisResult;
  repair_attempts: number;
  max_repair_attempts: number;
  repair_history: RepairAttemptRecord[];
  latest_checkpoint_sha?: string | null;
  summary: string;
  verified_at: string;
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
