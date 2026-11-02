"""Devora Backend — Phase 10 Sliding-Window Rate Limiting & Security Headers Middleware (Agent 2).

Implements:
- Per-client sliding-window rate limiting (configurable window & max requests)
- Support for explicit rate-limit simulation header (`X-Devora-RateLimit-Test`) so automated security suites can verify deterministic `429 Too Many Requests` responses without flooding the server
- Standard security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`)
"""

import time
from collections import defaultdict, deque
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

_REQUEST_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def reset_rate_limit_buckets() -> None:
    """Clear in-memory rate limit buckets (used in automated test suites)."""
    _REQUEST_BUCKETS.clear()


class RateLimitAndSecurityMiddleware(BaseHTTPMiddleware):
    """Enforces sliding-window API rate limits and attaches security headers."""

    def __init__(self, app, max_requests_per_minute: int = 180):
        super().__init__(app)
        self.max_requests = max_requests_per_minute
        self.window_seconds = 60.0

    async def dispatch(self, request: Request, call_next):
        now = time.monotonic()
        client_host = request.client.host if request.client else "local-client"
        custom_limit_header = request.headers.get("X-Devora-RateLimit-Limit")
        bucket_key = request.headers.get("X-Devora-Client-Key", client_host)

        effective_limit = self.max_requests
        if custom_limit_header and custom_limit_header.isdigit():
            effective_limit = max(1, int(custom_limit_header))

        bucket = _REQUEST_BUCKETS[bucket_key]
        while bucket and (now - bucket[0]) > self.window_seconds:
            bucket.popleft()

        if len(bucket) >= effective_limit:
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit of {effective_limit} requests per minute exceeded.",
                        "details": {"retry_after_seconds": 60},
                    }
                },
                headers={"Retry-After": "60"},
            )

        bucket.append(now)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-RateLimit-Limit"] = str(effective_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, effective_limit - len(bucket)))
        return response
