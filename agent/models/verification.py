"""Devora Agent — Phase 7 Testing, Verification & Bounded Auto-Repair Models.

Defines data contracts for:
- `BuildCheckResult`: TypeScript/JSX/JSON structural & syntax verification result
- `ConsoleErrorEntry`: Runtime or syntax error extracted from build/test/runtime logs
- `PlaywrightSmokeSuiteResult` & `PlaywrightTestCaseResult`: Smoke & E2E verification results
- `ErrorAnalysisResult`: Root-cause diagnosis and surgical repair recommendation
- `RepairAttemptRecord`: Record of a single surgical repair iteration
- `VerificationReport`: Comprehensive verification & bounded repair loop report (max 3 attempts)
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class BuildCheckResult(BaseModel):
    """Result of running workspace build & syntax verification (`check_build`)."""

    project_id: str
    passed: bool
    exit_code: int = 0
    checked_files_count: int = 0
    broken_files: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    checked_at: str


class ConsoleErrorEntry(BaseModel):
    """Single build, console, or runtime error inspected from workspace files/logs."""

    id: str
    source: Literal["build", "console", "runtime", "test"] = "build"
    severity: Literal["error", "warning"] = "error"
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    message: str
    suggestion: str = ""


class PlaywrightTestCaseResult(BaseModel):
    """Individual smoke/E2E test assertion result."""

    test_id: str
    name: str
    route_or_target: str
    status: Literal["passed", "failed", "skipped"] = "passed"
    duration_ms: int = 12
    assertion_summary: str = ""
    error_message: Optional[str] = None


class PlaywrightSmokeSuiteResult(BaseModel):
    """Result of running the automated Playwright/smoke test runner (`run_tests`)."""

    project_id: str
    passed: bool
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    duration_ms: int = 0
    test_cases: list[PlaywrightTestCaseResult] = Field(default_factory=list)
    executed_at: str


class ErrorAnalysisResult(BaseModel):
    """Root-cause analysis produced by `analyze_errors`."""

    project_id: str
    has_errors: bool
    error_count: int = 0
    affected_files: list[str] = Field(default_factory=list)
    root_cause_summary: str = ""
    recommended_fixes: list[str] = Field(default_factory=list)
    console_errors: list[ConsoleErrorEntry] = Field(default_factory=list)
    analyzed_at: str


class RepairAttemptRecord(BaseModel):
    """Record of one bounded repair iteration (attempt 1..3)."""

    attempt_number: int = Field(..., ge=1, le=3)
    files_repaired: list[str] = Field(default_factory=list)
    fix_description: str
    build_passed_after: bool = False
    tests_passed_after: bool = False
    remaining_errors_count: int = 0
    checkpoint_sha: Optional[str] = None
    repaired_at: str


class VerificationReport(BaseModel):
    """Complete Phase 7 verification & bounded repair report for a project workspace."""

    report_id: str
    project_id: str
    overall_status: Literal["passed", "repaired", "failed"] = "passed"
    build_check: BuildCheckResult
    test_suite: PlaywrightSmokeSuiteResult
    error_analysis: ErrorAnalysisResult
    repair_attempts: int = 0
    max_repair_attempts: int = 3
    repair_history: list[RepairAttemptRecord] = Field(default_factory=list)
    latest_checkpoint_sha: Optional[str] = None
    summary: str
    verified_at: str
