# Codalyzer Backend API v2.0.0

## Overview
Codalyzer is an AI-powered code complexity analysis API that leverages Google's Gemini model to provide detailed algorithmic complexity analysis, optimization suggestions, and security insights.

**Base URL:** `http://localhost:8080`

**API Version:** 2.0.0  
**Model:** gemini-2.5-flash-lite  
**Authentication:** None (IP-based rate limiting available)

---

## Global Features

### Rate Limiting
- **Per-IP (Daily):** 20 requests/day (default)
- **Global (Daily):** 1,000 requests/day (default)
- **Timezone:** UTC (configurable via `RATE_LIMIT_TIMEZONE`)
- **Rate limit headers included in all responses:**
  - `X-RateLimit-Limit`: Daily limit per IP
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset timestamp (ISO 8601)
  - `X-RateLimit-Global-Limit`: Global daily limit
  - `X-RateLimit-Global-Remaining`: Global requests remaining
  - `Retry-After`: Seconds to wait before retrying (on 429)

### CORS
- Enabled for all origins (configurable)
- Credentials allowed
- All HTTP methods supported
- Custom headers exposed: rate limit headers + `Retry-After`

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Request Size Limits
- Max body size: 1 MB (default)

---

## Endpoints

### 1. Root

**GET** `/`

Returns basic API information.

**Response (200):**
```json
{
  "name": "Codalyzer API",
  "version": "2.0.0",
  "status": "ok"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | API name |
| `version` | string | API version |
| `status` | enum | `ok` if Gemini available, `unavailable` otherwise |

---

### 2. Health Check

**GET** `/api/v1/health`

Check API health and Gemini provider status.

**Response (200):**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "model": "gemini-2.5-flash-lite",
  "timestamp": "2026-02-12T18:45:30.943015+00:00"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | `ok` (provider ready) or `degraded` (provider unavailable) |
| `version` | string | API version |
| `model` | string | Active Gemini model name |
| `timestamp` | string | Server timestamp (ISO 8601) |

---

### 3. Initialize / Rate Limit Status

**GET** `/api/v1/initialize`

Get rate limit information and remaining quota for the calling client.

**Response (200):**
```json
{
  "success": true,
  "user_requests_remaining": 18,
  "user_requests_limit": 20,
  "global_requests_remaining": 950,
  "global_requests_limit": 1000,
  "reset_at": "2026-02-13T00:00:00+00:00"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` |
| `user_requests_remaining` | int | Requests left for this IP today |
| `user_requests_limit` | int | Per-IP daily quota |
| `global_requests_remaining` | int | Global requests left today |
| `global_requests_limit` | int | Global daily quota |
| `reset_at` | string | UTC timestamp when limits reset (ISO 8601) |

---

### 4. Analyze Code

**POST** `/api/v1/analyze`

Perform AI-powered code complexity analysis. Rate-limited to POST requests only.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "code": "def add(a, b):\n    return a + b",
  "filename": "add.py",
  "language": "python"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `code` | string | Yes | 1–50,000 chars | Source code to analyze |
| `filename` | string | No | Max 255 chars | Default: `untitled` |
| `language` | string | No | See table below | Default: `auto` |

**Supported Languages:**
- `auto` (auto-detect)
- `javascript`, `typescript`
- `python`, `cpp`, `c`
- `java`, `go`, `rust`, `ruby`, `php`

#### Response

**Success (200):**
```json
{
  "success": true,
  "result": {
    "summary": "Adds two numbers together.",
    "fileName": "add.py",
    "language": "python",
    "timeComplexity": {
      "best": {
        "notation": "O(1)",
        "description": "Constant time.",
        "rating": "Good"
      },
      "average": {
        "notation": "O(1)",
        "description": "Constant time.",
        "rating": "Good"
      },
      "worst": {
        "notation": "O(1)",
        "description": "Constant time.",
        "rating": "Good"
      }
    },
    "spaceComplexity": {
      "notation": "O(1)",
      "description": "Minimal stack space.",
      "rating": "Good"
    },
    "issues": [
      {
        "id": "MISSING_TYPE_HINTS",
        "type": "Style",
        "title": "Missing Type Hints",
        "description": "Function lacks type annotations for parameters and return value.",
        "code_snippet": "def add(a, b):\n    return a + b",
        "fix_type": "code",
        "fix": "def add(a: int, b: int) -> int:\n    return a + b"
      }
    ],
    "sourceCode": "def add(a, b):\n    return a + b",
    "timestamp": "Feb 12, 12:15 AM"
  },
  "model": "gemini-2.5-flash-lite"
}
```

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` on success |
| `result` | object | Analysis result object |
| `model` | string | Gemini model used |

**Analysis Result Object:**

| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | Concise summary of what the code does |
| `fileName` | string | Detected/suggested filename with extension |
| `language` | string | Detected programming language |
| `timeComplexity` | object | Time complexity (best, average, worst) |
| `spaceComplexity` | object | Space complexity analysis |
| `issues` | array | List of identified issues/opportunities |
| `sourceCode` | string | Original source code submitted |
| `timestamp` | string | Analysis timestamp |

**Complexity Metric Object:**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `notation` | string | - | Big-O notation (e.g., `O(n)`, `O(log n)`) |
| `description` | string | - | Brief explanation |
| `rating` | enum | `Good`, `Fair`, `Poor` | Relative to the algorithm being implemented |

**Issue Object:**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `id` | string | - | Unique issue identifier |
| `type` | enum | `Optimization`, `Bug`, `Critical`, `Security`, `Style` | Issue category |
| `title` | string | - | Brief title |
| `description` | string | - | Detailed overview |
| `code_snippet` | string | - | Problematic code snippet related to the issue |
| `fix_type` | enum | `code`, `no-code` | Type of fix provided |
| `fix` | string | - | Code snippet or plain text explanation |

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid code content (e.g., repeated DoS patterns) | `{"success": false, "error": "Invalid code content"}` |
| 413 | Request body exceeds 1 MB | `{"success": false, "error": "request_too_large", ...}` |
| 422 | Validation error (e.g., empty code, missing required field) | `{"success": false, "error": "Invalid request format"}` |
| 429 | Rate limit exceeded | See [Rate Limiting](#rate-limiting) |
| 500 | Internal server error or JSON parsing failure | `{"success": false, "error": "Internal server error"}` |
| 503 | Gemini provider unavailable | `{"success": false, "error": "Gemini provider unavailable — check API key"}` |

---

### 5. Create Share Link

**POST** `/api/v1/share`

Save analysis result to Redis and get a shareable link ID.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:** Analysis result object (typically from `/api/v1/analyze`)
```json
{
  "summary": "Adds two numbers.",
  "fileName": "add.py",
  "language": "python",
  "timeComplexity": { ... },
  "spaceComplexity": { ... },
  "issues": [],
  "sourceCode": "def add(a, b):\n    return a + b",
  "timestamp": "Feb 12, 12:15 AM"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "share_id": "AbCdEfGhIjK_lMnOpQr1Sw",
  "expires_in": 604800
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Always `true` on success |
| `share_id` | string | URL-safe token for retrieving the result |
| `expires_in` | int | Seconds until expiration (default: 7 days = 604800) |

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 503 | Redis not configured | `{"success": false, "error": "Sharing unavailable (Redis not configured)"}` |
| 500 | Redis write failure | `{"success": false, "error": "Failed to create share link"}` |

---

### 6. Retrieve Shared Result

**GET** `/api/v1/share/{share_id}`

Retrieve a previously shared analysis result by its share ID.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `share_id` | string | URL-safe share token (max 64 chars, ASCII only) |

#### Response

**Success (200):**
```json
{
  "success": true,
  "result": {
    "summary": "Adds two numbers.",
    "fileName": "add.py",
    "language": "python",
    "timeComplexity": { ... },
    "spaceComplexity": { ... },
    "issues": [],
    "sourceCode": "def add(a, b):\n    return a + b",
    "timestamp": "Feb 12, 12:15 AM"
  }
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Invalid share ID format | `{"success": false, "error": "Invalid share ID"}` |
| 404 | Share not found or expired | `{"success": false, "error": "Share not found or expired"}` |
| 503 | Redis not configured | `{"success": false, "error": "Sharing unavailable"}` |
| 500 | Redis read failure | `{"success": false, "error": "Failed to retrieve share"}` |

---

### 7. Analyze (Backward Compatibility)

**POST** `/analyze`

Legacy endpoint for backward compatibility with v1 frontend. Identical to `/api/v1/analyze` but mounted at root.

**Deprecated:** Use `/api/v1/analyze` instead.

---

## Environment Variables

Configure server behavior via `.env` file or environment variables:

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `HOST` | `0.0.0.0` | string | Server binding address |
| `PORT` | `8080` | int | Server port |
| `DEBUG` | `False` | bool | Enable debug mode and docs endpoints |
| `LOG_LEVEL` | `INFO` | enum | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `GEMINI_API_KEY` | `` | string | Google Gemini API key (required) |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | string | Gemini model name |
| `MAX_TOKENS` | `4096` | int | Max output tokens per Gemini response |
| `TEMPERATURE` | `0.3` | float | Gemini temperature (0–2, lower = more deterministic) |
| `ALLOWED_ORIGINS` | `*` | string | Comma-separated CORS origins |
| `UPSTASH_REDIS_URL` | `` | string | Redis connection URL (optional; required for sharing) |
| `UPSTASH_REDIS_TOKEN` | `` | string | Redis auth token |
| `DAILY_RATE_LIMIT` | `20` | int | Per-IP request quota (requests/day) |
| `GLOBAL_RATE_LIMIT` | `1000` | int | Global request quota (requests/day) |
| `RATE_LIMIT_TIMEZONE` | `UTC` | string | Timezone for daily limits (zoneinfo format) |
| `MAX_REQUEST_SIZE` | `1048576` | int | Max request body size in bytes (1 MB default) |
| `MAX_CODE_LENGTH` | `50000` | int | Max code length in characters |
| `SHARE_TTL_SECONDS` | `604800` | int | Share link expiration time (seconds; 7 days default) |

---

## Example Usage

### Analyze a Python function

```bash
curl -X POST http://localhost:8080/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)",
    "filename": "factorial.py",
    "language": "python"
  }'
```

### Check rate limits

```bash
curl http://localhost:8080/api/v1/initialize
```

### Create a shareable link

```bash
curl -X POST http://localhost:8080/api/v1/share \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Factorial calculator",
    "fileName": "factorial.py",
    "language": "python",
    "timeComplexity": { ... },
    "spaceComplexity": { ... },
    "issues": [],
    "sourceCode": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)",
    "timestamp": "Feb 12, 12:15 AM"
  }'
```

### Retrieve a shared result

```bash
curl http://localhost:8080/api/v1/share/AbCdEfGhIjK_lMnOpQr1Sw
```

---

## Complexity Rating Guide

Ratings are **relative to the algorithm being implemented**, not absolute:

- **Good:** Optimal or near-optimal for the algorithm. (e.g., O(n log n) for merge sort, O(1) for lookups)
- **Fair:** Acceptable but with room for improvement. (e.g., O(n²) for small datasets, O(n) for hash table insertion)
- **Poor:** Suboptimal or concerning. (e.g., O(n²) for large-scale sorts, O(2^n) for naive recursive algorithms)

Example:
- O(n²) → **Good** if implementing Bubble Sort (optimal for that algorithm)
- O(n²) → **Poor** if implementing Merge Sort (suboptimal for that algorithm)

---

## Common Issues

| Type | Description |
|------|-------------|
| `Optimization` | Performance improvement opportunity |
| `Bug` | Logical error or runtime issue |
| `Critical` | Severe performance or correctness problem |
| `Security` | Potential security vulnerability |
| `Style` | Code quality or best practice suggestion |

---

## FAQ

**Q: How do I enable Redis for sharing?**  
Set `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` environment variables.

**Q: Can I disable rate limiting?**  
Rate limiting only activates if both `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are set. Otherwise, all requests are allowed.

**Q: How long do shared links last?**  
Default: 7 days. Configure via `SHARE_TTL_SECONDS`.

**Q: What happens if Gemini API is down?**  
The server returns a 503 status with message "Gemini provider unavailable."

**Q: Can I use this with the frontend?**  
Yes. Point the frontend to `http://localhost:8080` and use the endpoints documented above.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Feb 2026 | Monolithic server, unified schemas, algorithm-relative grading, issue code_snippet + fix_type fields |
| 1.0.0 | — | Original modular architecture |
