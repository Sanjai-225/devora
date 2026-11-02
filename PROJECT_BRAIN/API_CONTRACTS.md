# API Contracts — Devora Backend

Base URL: `/api/v1`

All authenticated endpoints require: `Authorization: Bearer <firebase_id_token>`

## Authentication

### POST `/api/v1/auth/verify`
Verify Firebase token and return user info.

**Request:** None (token in header)

**Response:**
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "photoURL": "string | null"
}
```

## Users

### GET `/api/v1/users/me`
Get current user profile.

### PUT `/api/v1/users/me`
Update current user profile.

**Body:**
```json
{
  "displayName": "string",
  "settings": {
    "preferredLLM": "gemini",
    "defaultFramework": "nextjs",
    "defaultStyling": "tailwind"
  }
}
```

## Projects

### GET `/api/v1/projects`
List current user's projects.

**Query params:** `status`, `sort`, `limit`, `offset`

**Response:**
```json
{
  "projects": [ProjectSummary],
  "total": 42,
  "hasMore": true
}
```

### POST `/api/v1/projects`
Create a new project.

**Body:**
```json
{
  "name": "string",
  "description": "string (natural language requirements)"
}
```

**Response:** `ProjectDocument`

### GET `/api/v1/projects/{projectId}`
Get project details.

### PUT `/api/v1/projects/{projectId}`
Update project metadata.

### DELETE `/api/v1/projects/{projectId}`
Delete project and associated workspace.

## Agent

### POST `/api/v1/projects/{projectId}/agent/start`
Start agent processing for a project.

**Body:**
```json
{
  "message": "string (optional additional instructions)"
}
```

### WebSocket `/api/v1/projects/{projectId}/agent/ws`
Real-time agent communication.

**Client → Server messages:**
```json
{
  "type": "user_message",
  "content": "string"
}
```
```json
{
  "type": "user_approval",
  "approved": true,
  "stage": "design | plan | deploy"
}
```
```json
{
  "type": "clarification_response",
  "answers": { "question_id": "answer" }
}
```

**Server → Client messages:**
```json
{
  "type": "agent_message",
  "content": "string",
  "stage": "string"
}
```
```json
{
  "type": "stage_update",
  "stage": "string",
  "progress": "string"
}
```
```json
{
  "type": "tool_result",
  "tool": "string",
  "result": {}
}
```
```json
{
  "type": "clarification_request",
  "questions": [{ "id": "string", "text": "string", "options": [] }]
}
```
```json
{
  "type": "approval_request",
  "stage": "string",
  "data": {}
}
```
```json
{
  "type": "error",
  "message": "string",
  "recoverable": true
}
```
```json
{
  "type": "complete",
  "summary": "string",
  "previewUrl": "string | null"
}
```

## Conversations

### GET `/api/v1/projects/{projectId}/conversations`
Get conversation history for a project.

**Query params:** `limit`, `before` (cursor)

## Design

### GET `/api/v1/projects/{projectId}/design/versions`
List design versions.

### GET `/api/v1/projects/{projectId}/design/versions/{versionId}`
Get specific design version with prototype code.

### POST `/api/v1/projects/{projectId}/design/versions/{versionId}/approve`
Approve a design version.

## Configuration

### GET `/api/v1/projects/{projectId}/config`
Get project configuration requirements and status.

### PUT `/api/v1/projects/{projectId}/config`
Set configuration values (secrets sent to server, stored securely).

**Body:**
```json
{
  "entries": [
    { "key": "DATABASE_URL", "value": "postgres://...", "isSecret": true }
  ]
}
```

## Workspace

### POST `/api/v1/projects/{projectId}/workspace/start`
Start the project preview server.

### POST `/api/v1/projects/{projectId}/workspace/stop`
Stop the project preview server.

### POST `/api/v1/projects/{projectId}/workspace/restart`
Restart the project preview server.

### GET `/api/v1/projects/{projectId}/workspace/status`
Get workspace status and preview URL.

### GET `/api/v1/projects/{projectId}/workspace/logs`
Get workspace logs.

**Query params:** `lines` (default 100)

## Files

### GET `/api/v1/projects/{projectId}/files`
List project files.

**Query params:** `path` (subdirectory)

### GET `/api/v1/projects/{projectId}/files/{path}`
Read a specific file.

### GET `/api/v1/projects/{projectId}/files/changes`
Get list of recently changed files.

## Export (Phase 8 — Agent 2)

### GET `/api/v1/projects/{projectId}/workspace/export/metadata`
Inspect the secret-safe ZIP export manifest (included files, excluded secrets, `.env.example`, `README.md`, and active Git checkpoint SHA).

**Response:** `ProjectExportMetadataResponse`

### GET `/api/v1/projects/{projectId}/workspace/export`
Generate and download a secret-safe, standalone ZIP archive of the project (`application/zip` attachment). Excludes `.env`, `.env.local`, `.git/`, `node_modules/`, and private keys while automatically generating `.env.example` and `README.md`.

**Response:** Binary ZIP file stream (`application/zip`)

## Integrations & Cloud Deployment (Phase 9 — Agent 2)

### GET `/api/v1/integrations`
List user's third-party integrations (`github`, `vercel`, `render`) with masked token previews.

### GET `/api/v1/integrations/github/oauth-url`
Construct a direct GitHub OAuth authorization URL (`https://github.com/login/oauth/authorize`) for popup-based connection.

### POST `/api/v1/integrations/connect`
Connect or rotate a GitHub, Vercel, or Render credential (stored in server-side vault, masked in responses).

### DELETE `/api/v1/integrations/{provider}`
Disconnect an integration (`github | vercel | render`).

### POST `/api/v1/projects/{projectId}/github/push`
Push verified, secret-safe workspace files and Git checkpoint to a GitHub repository branch.

### POST `/api/v1/projects/{projectId}/workspace/verify`
Run build check (`check_build`), Playwright smoke suite (`run_tests`), and console/runtime error analysis (`inspect_errors`), with optional bounded auto-repair.

**Body:**
```json
{
  "auto_repair": false
}
```

### POST `/api/v1/projects/{projectId}/workspace/repair`
Trigger the bounded surgical self-repair loop (strictly capped at max 3 attempts) and create a Git checkpoint for repaired files.

**Body:**
```json
{
  "max_attempts": 3
}
```

## Deployment

### POST `/api/v1/projects/{projectId}/deploy`
Trigger a user-confirmed deployment (`user_confirmed: true`) to Vercel Hobby Free or Render Free Web Service (`$0.00/month`).

**Body:**
```json
{
  "provider": "vercel | render",
  "user_confirmed": true,
  "target_branch": "testing | main",
  "environment": "preview | production"
}
```

### GET `/api/v1/projects/{projectId}/deployments`
List deployment status history for a project.

## Error Response Format

All errors follow:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found",
    "details": {}
  }
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (not owner) |
| 404 | Not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Internal server error |

