# Backend Integration

How WizardForge connects to backend APIs for async job processing, authentication, retry logic, and mock development mode.

## Overview

The backend integration layer consists of:

- **BackendService** — fetch wrapper that injects auth headers and retries transient failures
- **JobRunner** — manages the full job lifecycle: submit → poll → complete/fail, with mock mode
- **JobStep** — React component that renders progress bar, status messages, and error/retry UI

## Job Step Lifecycle

When a user reaches a `job` step, the following sequence occurs:

```
1. SUBMIT      POST to endpoint with bodyMapping → receive { jobId }
2. POLL        GET pollingEndpoint every pollingIntervalMs
3. PROGRESS    Extract percent/message/currentFile via progressMapping → update UI
4. COMPLETE    status == "completed" → store result in context[resultKey]
5. ADVANCE     If autoAdvance: true → navigate to next step after 600ms
```

On failure:
```
FAIL → Show error message
     → If retryable && retryCount < maxRetries → show Retry button
     → If fallbackStep defined → show "Go Back" button
```

## Configuration

Full job step config:

```yaml
run_conversion:
  type: "job"
  title: "Converting Your Code"
  subtitle: "This may take a few minutes"
  config:
    # ── Endpoint ──
    endpoint: "{{variables.apiBaseUrl}}/convert"
    method: "POST"                    # POST | PUT | PATCH. Default: POST.
    bodyMapping:
      files: "{{context.uploadedFiles}}"
      target: "{{context.targetPlatform}}"
      options:
        naming: "{{context.namingConvention}}"
        typeHints: "{{context.addTypeHints}}"

    # ── Polling ──
    async: true                       # Enable polling. Default: true.
    pollingEndpoint: "{{variables.apiBaseUrl}}/jobs/{{context.jobId}}/status"
    pollingIntervalMs: 2000           # Poll interval in ms. Default: 2000.
    timeoutMs: 600000                 # Job timeout in ms. Default: 600000 (10 min).

    # ── Result ──
    resultKey: "conversionResult"     # Context key for result. Required for downstream steps.
    autoAdvance: true                 # Auto-navigate to next step. Default: false.

    # ── Progress Display ──
    progressMapping:
      percent: "progress.percent"
      message: "progress.message"
      currentFile: "progress.currentFile"
      phase: "progress.phase"

    # ── Error Handling ──
    onError:
      retryable: true                 # Allow retry on failure.
      maxRetries: 2                   # Max retry attempts.
      fallbackStep: "configure_options"  # Step to go back to on unrecoverable failure.

    # ── Mock Mode ──
    mock:
      enabled: true
      latencyMs: 4000
      progressSteps:
        - { at: 0, message: "Starting..." }
        - { at: 50, message: "Processing..." }
        - { at: 100, message: "Complete!" }
      result:
        filesConverted: 12
        successRate: 95.5
```

## Body Mapping

The `bodyMapping` object maps context values to the request body. All string values support `{{...}}` expressions. Nested objects are recursively resolved.

```yaml
bodyMapping:
  files: "{{context.uploadedFiles}}"    # Resolves to array
  target: "{{context.targetPlatform}}"  # Resolves to string
  pythonVersion: "{{context.pythonVersion}}"
  options:
    naming: "{{context.namingConvention}}"
    typeHints: "{{context.addTypeHints}}"  # Resolves to boolean
```

Produces a JSON request body:

```json
{
  "files": [{"name": "data.csv", "size": 1024}],
  "target": "pandas",
  "pythonVersion": "3.11",
  "options": {
    "naming": "snake_case",
    "typeHints": true
  }
}
```

## Progress Mapping

The `progressMapping` object defines JSON paths to extract from the polling response:

```yaml
progressMapping:
  percent: "progress.percent"           # Number 0-100 → progress bar
  message: "progress.message"           # String → status text
  currentFile: "progress.currentFile"   # String → file being processed
  phase: "progress.phase"               # String → phase indicator
```

Given a polling response:

```json
{
  "status": "running",
  "progress": {
    "percent": 45,
    "message": "Converting PROC SQL blocks",
    "currentFile": "main.sas",
    "phase": "transformation"
  }
}
```

The UI displays:
- Progress bar at 45%
- Spinner with "Converting PROC SQL blocks"
- Current file: `main.sas`
- Phase: transformation

## Backend API Contract

### Job Submission

```
POST /api/convert
Content-Type: application/json
Authorization: Bearer <token>

{
  "files": [...],
  "target": "pandas",
  "options": {...}
}

→ 200 OK
{
  "jobId": "job-abc-123",
  "status": "pending"
}
```

The response **must** include a `jobId` field. It is automatically stored in `context.jobId` for use in the polling endpoint URL.

### Status Polling

```
GET /api/jobs/job-abc-123/status
Authorization: Bearer <token>

→ 200 OK
{
  "status": "running",         // "pending" | "running" | "completed" | "failed" | "cancelled"
  "progress": {
    "percent": 45,
    "message": "Converting...",
    "currentFile": "data.csv",
    "phase": "transform"
  }
}
```

**Terminal statuses:**
- `completed` — job succeeded. Result is extracted from the response.
- `failed` — job failed. Error extracted from `error` or `message` field.
- `cancelled` — job was cancelled. Treated as failure.

### Job Result

On `completed` status, the result is extracted from the polling response using these fields (in priority order):

1. `response.result`
2. `response.data`
3. The entire response object

The result is stored in `context[resultKey]` and available to downstream steps.

### Error Response

```json
{
  "status": "failed",
  "error": "Conversion failed: unsupported PROC type",
  "message": "Human-readable error description"
}
```

## Authentication

Configure auth once at the wizard level — all API calls (submission, polling) automatically include auth headers.

### Bearer Token

```yaml
wizard:
  auth:
    type: "bearer"
    tokenSource: "localStorage"
    tokenKey: "auth_token"
    headerName: "Authorization"      # Default
    headerPrefix: "Bearer"           # Default
```

All requests include: `Authorization: Bearer <token_from_localStorage>`

### API Key

```yaml
wizard:
  auth:
    type: "api-key"
    tokenSource: "localStorage"
    tokenKey: "api_key"
    headerName: "X-API-Key"
```

All requests include: `X-API-Key: <key_from_localStorage>`

### Cookie-Based

```yaml
wizard:
  auth:
    type: "cookie"
```

Cookies are sent automatically by the browser. No header injection needed.

### Token Sources

| Source | Reads from |
|--------|------------|
| `localStorage` | `localStorage.getItem(tokenKey)` |
| `sessionStorage` | `sessionStorage.getItem(tokenKey)` |
| `cookie` | Cookie with name matching `tokenKey` |

## Retry Policy

### Global Retry

Set a default retry policy for all backend calls:

```yaml
wizard:
  settings:
    retryPolicy:
      maxRetries: 3
      backoffMs: [1000, 3000, 10000]
      retryableStatusCodes: [408, 429, 500, 502, 503, 504]
```

**Behavior:**
- On a retryable HTTP status code, the request is retried up to `maxRetries` times
- Each retry waits the corresponding `backoffMs` delay (exponential backoff)
- Non-retryable status codes (400, 401, 403, 404) fail immediately
- Network errors (offline, DNS failure) are also retried

### Per-Step Retry

The `onError` block on a job step controls user-facing retry:

```yaml
config:
  onError:
    retryable: true              # Show "Retry" button on failure
    maxRetries: 2                # Max retries the user can trigger
    fallbackStep: "configure_options"  # "Go Back" button target
```

This is separate from the BackendService retry — it controls what happens after all network-level retries are exhausted and the job itself fails.

**Retry flow:**
1. Job fails → error state shown
2. If `retryable` and retries remaining → "Retry (N left)" button
3. User clicks Retry → job state resets to `idle` → job re-submits
4. If retries exhausted or not retryable → only "Go Back" button (if `fallbackStep` set)

## Mock Backend Mode

Develop and demo wizards without a real backend. Mock mode simulates the entire job lifecycle locally.

### Configuration

```yaml
config:
  mock:
    enabled: true               # Boolean or {{...}} expression.
    latencyMs: 4000             # Total simulated duration in ms.
    progressSteps:              # Simulated progress checkpoints.
      - at: 0                   # Percentage (0-100).
        message: "Starting..."  # Status message at this point.
      - at: 30
        message: "Parsing data..."
      - at: 60
        message: "Converting..."
      - at: 90
        message: "Validating..."
      - at: 100
        message: "Complete!"
    result:                     # Mock result stored in context[resultKey].
      filesConverted: 12
      successRate: 95.5
```

### How It Works

1. `enabled` is evaluated — if `true`, real API calls are skipped entirely
2. A mock job ID is generated
3. Progress steps fire at proportional intervals based on `latencyMs`:
   - Step at 30% fires at `0.3 * 4000 = 1200ms`
   - Step at 60% fires at `0.6 * 4000 = 2400ms`
4. At 100%, the `result` object is stored in `context[resultKey]`
5. If `autoAdvance: true`, the wizard navigates to the next step

### Conditional Mock Mode

Enable mock mode only in development:

```yaml
mock:
  enabled: "{{env.NODE_ENV == 'development'}}"
```

Or always enable it for demo purposes:

```yaml
mock:
  enabled: true
```

## Job UI States

The JobStep component renders different UI based on job status:

| Status | UI |
|--------|-----|
| `idle` | Job starts automatically |
| `submitting` / `pending` / `running` | Progress bar + spinner + status message |
| `completed` | Green checkmark + success message |
| `failed` / `timeout` | Red X + error message + Retry/Go Back buttons |

During active jobs:
- Footer navigation (Back/Next) buttons are hidden
- Progress bar animates smoothly with CSS transitions
- Status message updates in real-time from polling

## Timeout

If a job exceeds `timeoutMs` without reaching `completed` or `failed`:

```yaml
timeoutMs: 300000  # 5 minutes
```

The job is automatically marked as failed with the message "Job timed out". Retry logic applies normally.

## Using Job Results in Downstream Steps

Store job results with `resultKey` and reference them in later steps:

```yaml
# Job step
run_conversion:
  type: "job"
  config:
    resultKey: "conversionResult"
    # ...

# Review step using the result
conversion_summary:
  type: "review"
  config:
    sections:
      - title: "Conversion Results"
        fields:
          - label: "Files converted"
            value: "{{context.conversionResult.filesConverted}}"
          - label: "Success rate"
            value: "{{context.conversionResult.successRate}}%"

# Download step using the result
download:
  type: "download"
  config:
    showSummary: true
    summaryFields:
      - label: "Files"
        value: "{{context.conversionResult.filesConverted}}"
```
