# Database Schema — Devora (Cloud Firestore)

## Collections

### `users`

Document ID: Firebase Auth UID

```typescript
interface UserDocument {
  uid: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'individual' | 'team';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: {
    preferredLLM: string;         // 'gemini' | 'openai' | etc.
    defaultFramework: string;     // 'nextjs' | 'vite-react' | etc.
    defaultStyling: string;       // 'tailwind' | 'css-modules' | etc.
  };
  usage: {
    projectCount: number;
    totalGenerations: number;
    lastActiveAt: Timestamp;
  };
}
```

### `projects`

Document ID: Auto-generated

```typescript
interface ProjectDocument {
  id: string;
  userId: string;                 // Owner's UID
  name: string;
  slug: string;                   // URL-safe project identifier
  status: ProjectStatus;
  description?: string;           // Original user request
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Requirements
  requirements?: StructuredRequirements;
  confirmedStack?: TechnologyStack;

  // Design
  designChoice: 'design_first' | 'direct_code' | 'pending';
  approvedDesignVersion?: string;

  // Configuration
  configurationStatus: 'pending' | 'partial' | 'complete';

  // Implementation
  implementationPlan?: ImplementationPlan;
  planApproved: boolean;

  // Workspace
  workspaceId?: string;
  workspacePath?: string;

  // Preview
  previewUrl?: string;
  previewStatus: 'stopped' | 'starting' | 'running' | 'error';
  previewPort?: number;

  // Build & Test
  lastBuildResult?: BuildResult;
  lastTestResult?: TestResult;

  // Deployment
  deploymentProvider?: string;
  deploymentUrl?: string;
  deploymentStatus?: string;

  // GitHub
  githubRepo?: string;
  lastCommitSha?: string;

  // Agent
  agentThreadId?: string;
  currentAgentStage?: string;
}

type ProjectStatus =
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
```

### `projects/{projectId}/conversations`

Subcollection for agent chat messages.

```typescript
interface ConversationMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Timestamp;
  stage?: string;                 // LangGraph stage that produced this
  metadata?: {
    toolCalls?: ToolCallRecord[];
    filesChanged?: string[];
    errorCount?: number;
  };
}
```

### `projects/{projectId}/designVersions`

Subcollection for design iterations.

```typescript
interface DesignVersion {
  id: string;
  version: string;               // 'v1.0', 'v1.1', etc.
  label?: string;                 // 'Initial Prototype', 'Dark Theme', etc.
  designSpec: DesignSpecification;
  prototypeCode: string;          // Sandpack-compatible code
  createdAt: Timestamp;
  createdBy: 'agent' | 'user_request';
  approved: boolean;
  approvedAt?: Timestamp;
}
```

### `projects/{projectId}/configEntries`

Subcollection for project-specific configuration.

```typescript
interface ConfigEntry {
  id: string;
  key: string;                    // e.g., 'DATABASE_URL'
  category: string;               // 'database' | 'auth' | 'payment' | 'ai' | etc.
  scope: 'server' | 'client' | 'build';
  isSecret: boolean;
  hasValue: boolean;              // true if a value has been set (value NOT stored here if secret)
  displayValue?: string;          // masked or non-secret value for UI
  description?: string;
  required: boolean;
}
```

> [!IMPORTANT]
> Secret values are NOT stored in Firestore. They are stored server-side in an encrypted secrets store and referenced by key. Only `hasValue` and `displayValue` (masked) are in Firestore.

### `projects/{projectId}/fileSnapshots`

Subcollection for tracking project file state.

```typescript
interface FileSnapshot {
  id: string;
  path: string;                   // relative path within project
  hash: string;                   // content hash for change detection
  size: number;
  lastModified: Timestamp;
  generatedBy: 'agent' | 'user' | 'template';
}
```

### `integrations`

Document ID: `{userId}_{provider}`

```typescript
interface IntegrationDocument {
  id: string;
  userId: string;
  provider: 'github' | 'vercel' | 'render';
  status: 'connected' | 'disconnected' | 'expired';
  connectedAt: Timestamp;
  // Tokens stored server-side, NOT in Firestore
  tokenRef?: string;              // Reference to server-side token store
  metadata?: {
    username?: string;
    email?: string;
    avatarUrl?: string;
  };
}
```

## Firestore Security Rules (Summary)

```
users/{userId}:
  read/write: request.auth.uid == userId

projects/{projectId}:
  read/write: request.auth.uid == resource.data.userId

projects/{projectId}/conversations/{messageId}:
  read: request.auth.uid == get(/projects/$(projectId)).data.userId
  write: backend only (admin SDK)

projects/{projectId}/designVersions/{versionId}:
  read: request.auth.uid == get(/projects/$(projectId)).data.userId
  write: backend only (admin SDK)

integrations/{integrationId}:
  read/write: request.auth.uid == resource.data.userId
```

## Indexes

| Collection | Fields | Type |
|-----------|--------|------|
| projects | userId, updatedAt | Composite (desc) |
| projects | userId, status | Composite |
| projects | userId, createdAt | Composite (desc) |
| conversations | timestamp | Single (asc) |

