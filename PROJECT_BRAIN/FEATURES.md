# Features — Devora

## F1: Authentication

| ID | Feature | Priority |
|----|---------|----------|
| F1.1 | Email/password registration | P0 |
| F1.2 | Email/password login | P0 |
| F1.3 | Google OAuth login | P0 |
| F1.4 | GitHub OAuth login | P1 |
| F1.5 | Password reset | P0 |
| F1.6 | Logout | P0 |
| F1.7 | Auth state persistence | P0 |
| F1.8 | Protected routes | P0 |

## F2: Dashboard

| ID | Feature | Priority |
|----|---------|----------|
| F2.1 | Welcome header with user name | P0 |
| F2.2 | Active project count | P0 |
| F2.3 | Recent projects grid | P0 |
| F2.4 | Project status badges | P0 |
| F2.5 | Quick "Create Website" button | P0 |
| F2.6 | Project search and filter | P1 |
| F2.7 | Agent activity feed | P1 |
| F2.8 | System status indicators | P2 |

## F3: Project Creation

| ID | Feature | Priority |
|----|---------|----------|
| F3.1 | Project name input | P0 |
| F3.2 | Natural-language requirements textarea | P0 |
| F3.3 | Technology stack selection grid | P0 |
| F3.4 | Template suggestions | P2 |
| F3.5 | Project creation → requirement analysis trigger | P0 |

## F4: Requirement Analysis

| ID | Feature | Priority |
|----|---------|----------|
| F4.1 | NL → structured requirements extraction | P0 |
| F4.2 | Purpose/audience identification | P0 |
| F4.3 | Pages and routes extraction | P0 |
| F4.4 | Feature identification | P0 |
| F4.5 | Technology stack inference | P0 |
| F4.6 | Missing information detection | P0 |
| F4.7 | Complexity rating | P1 |
| F4.8 | Structured spec display | P0 |
| F4.9 | Agent clarification questions | P0 |
| F4.10 | User answers → spec refinement | P0 |

## F5: Workflow Decision

| ID | Feature | Priority |
|----|---------|----------|
| F5.1 | "Design Studio First" option | P0 |
| F5.2 | "Direct Code Synthesis" option | P0 |
| F5.3 | Feature comparison display | P0 |
| F5.4 | Non-destructive switching later | P1 |

## F6: Design Studio

| ID | Feature | Priority |
|----|---------|----------|
| F6.1 | Gemini design specification generation | P0 |
| F6.2 | Frontend prototype code generation | P0 |
| F6.3 | Sandpack live preview | P0 |
| F6.4 | Desktop/Tablet/Mobile viewport switching | P0 |
| F6.5 | Design chat — natural-language modifications | P0 |
| F6.6 | Section-level editing | P1 |
| F6.7 | Design version history | P0 |
| F6.8 | Version comparison and restore | P1 |
| F6.9 | Design approval action | P0 |
| F6.10 | Design tokens panel (colors, fonts) | P1 |
| F6.11 | Component inspector | P2 |
| F6.12 | Stitch provider adapter (optional) | P2 |

## F7: Dynamic Configuration

| ID | Feature | Priority |
|----|---------|----------|
| F7.1 | Dynamic config form from requirements | P0 |
| F7.2 | API key input with masking | P0 |
| F7.3 | Database connection config | P1 |
| F7.4 | Auth provider config | P1 |
| F7.5 | Environment variable management | P0 |
| F7.6 | Config validation | P0 |
| F7.7 | Secure server-side secret storage | P0 |
| F7.8 | .env.example generation | P0 |

## F8: Implementation Planning

| ID | Feature | Priority |
|----|---------|----------|
| F8.1 | Page/component plan generation | P0 |
| F8.2 | Backend route plan | P0 |
| F8.3 | Database schema plan | P0 |
| F8.4 | Dependency list | P0 |
| F8.5 | Plan display to user | P0 |
| F8.6 | Plan modification requests | P0 |
| F8.7 | User approval gate | P0 |

## F9: Code Generation & Workspace

| ID | Feature | Priority |
|----|---------|----------|
| F9.1 | Isolated workspace creation | P0 |
| F9.2 | Project scaffolding | P0 |
| F9.3 | Page/component generation | P0 |
| F9.4 | Backend endpoint generation | P1 |
| F9.5 | Database model generation | P1 |
| F9.6 | Dependency installation | P0 |
| F9.7 | Incremental file editing | P0 |
| F9.8 | Git checkpoint creation | P0 |
| F9.9 | Build verification | P0 |
| F9.10 | Error detection and repair loop | P0 |

## F10: Live Preview

| ID | Feature | Priority |
|----|---------|----------|
| F10.1 | Per-project preview URL | P0 |
| F10.2 | Preview start/stop/restart | P0 |
| F10.3 | Embedded iframe preview in workspace | P0 |
| F10.4 | Desktop/tablet/mobile preview | P0 |
| F10.5 | Auto-refresh on changes | P1 |
| F10.6 | Build/runtime error display | P0 |

## F11: Testing & Verification

| ID | Feature | Priority |
|----|---------|----------|
| F11.1 | Automated build check | P0 |
| F11.2 | Playwright route verification | P1 |
| F11.3 | Console error inspection | P1 |
| F11.4 | Screenshot capture | P2 |
| F11.5 | Test results display | P0 |
| F11.6 | Bounded error repair loop | P0 |

## F12: Export & Download

| ID | Feature | Priority |
|----|---------|----------|
| F12.1 | ZIP archive creation | P0 |
| F12.2 | Secret exclusion from ZIP | P0 |
| F12.3 | .env.example inclusion | P0 |
| F12.4 | README with run instructions | P0 |
| F12.5 | ZIP download from dashboard | P0 |

## F13: GitHub Integration

| ID | Feature | Priority |
|----|---------|----------|
| F13.1 | GitHub OAuth connection | P1 |
| F13.2 | Repository selection/creation | P1 |
| F13.3 | Push to repository | P1 |
| F13.4 | Commit history view | P2 |

## F14: Deployment

| ID | Feature | Priority |
|----|---------|----------|
| F14.1 | Vercel deployment adapter | P2 |
| F14.2 | Render deployment adapter | P2 |
| F14.3 | Deployment plan display and approval | P2 |
| F14.4 | Deployment status tracking | P2 |

## F15: Settings

| ID | Feature | Priority |
|----|---------|----------|
| F15.1 | User profile management | P0 |
| F15.2 | AI provider selection | P1 |
| F15.3 | API key vault | P1 |
| F15.4 | Project defaults | P2 |
| F15.5 | Connected accounts | P1 |

## Priority Key

- **P0** — Required for MVP
- **P1** — Important, implement in early phases
- **P2** — Enhancement, implement when core is stable

