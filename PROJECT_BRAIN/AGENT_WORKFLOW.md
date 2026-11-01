# Agent Workflow — Devora (LangGraph)

## Workflow Graph

```
                    ┌──────────────────┐
                    │   START          │
                    │   (user_request) │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  1. REQUIREMENT  │
                    │     ANALYSIS     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
               ┌────│  2. CLARIFY      │◄──────┐
               │    │     NEEDED?      │       │
               │    └────────┬─────────┘       │
               │yes          │no               │
        ┌──────▼──────┐      │          ┌──────┴──────┐
        │ 3. ASK      │      │          │ 4. PROCESS  │
        │ QUESTIONS   │──────┼─────────►│ ANSWERS     │
        └─────────────┘      │          └─────────────┘
             (wait)          │
                    ┌────────▼─────────┐
                    │  5. CONFIRM      │
                    │     STACK        │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  6. DESIGN       │
                    │     CHOICE       │
                    └───┬──────────┬───┘
                        │          │
              design_yes│          │design_no
                        │          │
           ┌────────────▼──┐       │
           │ 7. GENERATE   │       │
           │    DESIGN     │       │
           │    SPEC       │       │
           └────────┬──────┘       │
                    │              │
           ┌────────▼──────┐       │
           │ 8. GENERATE   │       │
           │    PROTOTYPE  │       │
           └────────┬──────┘       │
                    │              │
           ┌────────▼──────┐       │
           │ 9. PREVIEW    │       │
           │    DESIGN     │◄──┐   │
           └────────┬──────┘   │   │
                    │          │   │
           ┌────────▼──────┐   │   │
           │ 10. DESIGN    │   │   │
           │   REVISION?   │───┘   │
           └────────┬──────┘revise │
                    │approve       │
           ┌────────▼──────┐       │
           │ 11. DESIGN    │       │
           │   APPROVED    │       │
           └────────┬──────┘       │
                    │              │
                    └──────┬───────┘
                           │
                  ┌────────▼─────────┐
                  │ 12. RESOLVE      │
                  │     CONFIG       │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ 13. GENERATE     │
                  │     PLAN         │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ 14. AWAIT        │
                  │     APPROVAL     │ (human-in-the-loop)
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ 15. CREATE       │
                  │     WORKSPACE    │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ 16. GENERATE     │
                  │     CODE         │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ 17. INSTALL      │
                  │     DEPS         │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │ 18. BUILD &      │
                  │     START        │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
              ┌───│ 19. TEST &       │◄──┐
              │   │     VERIFY       │   │
              │   └────────┬─────────┘   │
              │            │             │
              │   ┌────────▼─────────┐   │
              │   │ 20. ERRORS?      │   │
              │   └───┬──────────┬───┘   │
              │       │yes       │no     │
              │  ┌────▼────┐     │       │
              │  │21.REPAIR│─────┼───────┘
              │  └─────────┘     │  (max 3 attempts)
              │  (exceed limit)  │
              │       │         │
              │  ┌────▼────┐   ┌▼────────────┐
              └─►│ FAILED  │   │ 22. COMPLETE│
                 │ (report)│   │   (report)  │
                 └─────────┘   └─────────────┘
```

## Agent State Model

```python
from typing import TypedDict, Optional, Literal
from pydantic import BaseModel

class AgentState(TypedDict):
    # Identity
    user_id: str
    project_id: str
    thread_id: str

    # Input
    user_request: str
    user_messages: list[dict]          # conversation history

    # Requirements
    requirements: Optional[dict]        # StructuredRequirements
    clarification_questions: list[dict]
    clarification_answers: list[dict]
    confirmed_stack: Optional[dict]     # TechnologyStack

    # Design
    design_choice: Literal['design_first', 'direct_code', 'pending']
    design_specification: Optional[dict]
    design_versions: list[dict]
    approved_design_version: Optional[str]
    design_prototype_code: Optional[str]

    # Configuration
    configuration_requirements: list[dict]
    configuration_references: dict      # key -> secret_ref mapping

    # Planning
    implementation_plan: Optional[dict]
    plan_approved: bool

    # Workspace
    workspace_id: Optional[str]
    workspace_path: Optional[str]

    # Code Generation
    project_files: dict                 # path -> hash tracking
    current_operation: Optional[str]
    tool_results: list[dict]

    # Build & Test
    build_results: Optional[dict]
    test_results: Optional[dict]
    error_history: list[dict]
    repair_attempts: int

    # Preview
    preview_url: Optional[str]
    preview_status: str

    # Output
    current_stage: str
    agent_messages: list[dict]          # messages to send to user
    final_response: Optional[str]
```

## Human-in-the-Loop Breakpoints

The following stages require explicit user input before continuing:

| Stage | Wait For | Reason |
|-------|----------|--------|
| Clarification | User answers | Need missing information |
| Design Choice | User selection | Workflow branching |
| Design Revision | User feedback or approval | Iterative design |
| Plan Approval | User confirmation | Before code generation |
| Configuration | User-provided credentials | Can't infer secrets |

## Tool Registry

The agent has access to these tools, all validated and permission-checked:

### Workspace Tools
- `create_workspace(project_id)` → workspace_id
- `list_files(workspace_id, path?)` → file listing
- `read_file(workspace_id, path)` → file content
- `write_file(workspace_id, path, content)` → success
- `delete_file(workspace_id, path)` → success
- `search_files(workspace_id, pattern)` → matches

### Execution Tools
- `run_command(workspace_id, command, timeout?)` → stdout, stderr, exit_code
- `install_dependencies(workspace_id)` → result
- `build_project(workspace_id)` → result
- `start_project(workspace_id)` → preview_url
- `stop_project(workspace_id)` → success
- `get_logs(workspace_id, lines?)` → log content

### Testing Tools
- `run_tests(workspace_id)` → test results
- `check_build(workspace_id)` → build status
- `inspect_errors(workspace_id)` → error analysis

### Git Tools
- `git_init(workspace_id)` → success
- `git_commit(workspace_id, message)` → commit_sha
- `git_log(workspace_id)` → commit history
- `git_restore(workspace_id, commit_sha)` → success

## Checkpointer Strategy

**Decision: SQLite-based checkpointer**

See `DECISIONS.md` D003 for rationale.

```python
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

checkpointer = AsyncSqliteSaver.from_conn_string("checkpoints/agent.db")
```

Benefits:
- Officially supported by LangGraph
- No additional infrastructure
- File-based, easy to back up
- Sufficient for MVP scale
- Can migrate to PostgreSQL later if needed

## Error Repair Loop

```
max_repair_attempts = 3
current_attempt = 0

while errors and current_attempt < max_repair_attempts:
    analyze_error(error)
    identify_fix(error, affected_files)
    apply_fix(workspace, files)
    rebuild_and_test(workspace)
    current_attempt += 1

if still_errors:
    report_failure(errors, completed_work, remaining_issues)
```

