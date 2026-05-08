# WizardForge

A config-driven wizard engine for code conversion and data modernization workflows. Write a YAML config, get a fully functional multi-step wizard — no React component authoring required.

![WizardForge Screenshot](docs/wizard-screenshot.png)

## Quick Start

```bash
npm install
npm run dev      # http://localhost:5173
```

## How It Works

Define wizard steps in YAML — upload, forms, jobs, review, download — and WizardForge renders the full UI with navigation, validation, progress tracking, and backend integration.

```yaml
wizard:
  id: "my-converter"
  title: "File Converter"
  phases:
    - id: "input"
      title: "Upload"
      steps: [upload_files]
    - id: "process"
      title: "Convert"
      steps: [run_conversion]
    - id: "output"
      title: "Download"
      steps: [download_results]

steps:
  upload_files:
    type: "upload"
    title: "Upload Your Files"
    config:
      accept: [".csv", ".json", ".xml"]
      multiple: true

  run_conversion:
    type: "job"
    title: "Converting..."
    config:
      endpoint: "/api/convert"
      pollingEndpoint: "/api/jobs/{{context.jobId}}/status"
      resultKey: "conversionResult"
      autoAdvance: true
      mock:
        enabled: true
        latencyMs: 3000
        progressSteps:
          - { at: 0, message: "Starting..." }
          - { at: 50, message: "Processing..." }
          - { at: 100, message: "Done!" }

  download_results:
    type: "download"
    title: "Download Results"
    config:
      sources:
        - id: "output"
          label: "Converted Files"
          endpoint: "/api/download/output"
          format: "zip"
```

## Frontend

### Architecture

```
<WizardProvider config={config}>    — React context + useReducer state store
  <WizardShell>                     — layout wrapper, applies theme CSS vars
    <WizardNav />                   — phase indicators with progress
    <StepRenderer />                — resolves step type → component via registry
    <WizardFooter />                — back/next buttons, hides during active jobs
  </WizardShell>
</WizardProvider>
```

### Built-in Step Types

| Type | Component | Description |
|------|-----------|-------------|
| `upload` | UploadStep | Drag-and-drop file upload with validation |
| `form` | FormStep | Dynamic fields: text, select, radio-cards, toggle, checkbox |
| `info` | InfoStep | Read-only display with cards and text |
| `review` | ReviewStep | Summary table of collected context data |
| `job` | JobStep | Async backend job with progress bar, polling, retry |
| `download` | DownloadStep | Download cards with format badges |

### Expression Engine

All `{{...}}` expressions in config are evaluated at runtime:

```yaml
value: "{{context.outputFormat}}"           # variable lookup
condition: "{{context.files.length > 0}}"   # comparison
message: "Converting {{context.fileName}}"  # string interpolation
```

Supports `context.*`, `variables.*`, `env.*` namespaces, nested access, comparisons (`==`, `!=`, `>`, `<`, `>=`, `<=`), and null checks.

### Theming

All styles use `wf-*` class prefix and CSS custom properties:

```yaml
theme:
  colors:
    primary: "#2563eb"
    success: "#16a34a"
    error: "#dc2626"
    background: "#ffffff"
    surface: "#f8fafc"
    text: "#1e293b"
  borderRadius: "8px"
  fontFamily: "Inter, system-ui, sans-serif"
```

### Plugin System

Register custom step types without modifying the core:

```typescript
import { StepTypeRegistry } from './core';

StepTypeRegistry.register({
  type: 'my-custom-step',
  component: MyCustomComponent, // receives StepProps
  validate: (config, context) => ({ valid: true }),
});
```

## Backend Integration

### Job Step Lifecycle

The `job` step type handles async backend operations:

1. **Submit** — POSTs to `endpoint` with `bodyMapping` (expressions resolved from context)
2. **Poll** — GETs `pollingEndpoint` every `pollingIntervalMs` until status is `completed` or `failed`
3. **Progress** — extracts `percent`, `message`, `currentFile`, `phase` via `progressMapping`
4. **Complete** — stores result in `context[resultKey]`, optionally auto-advances to next step
5. **Fail** — shows error with retry button (if `onError.retryable`) or fallback navigation

```yaml
config:
  endpoint: "{{variables.apiBaseUrl}}/convert"
  method: "POST"
  bodyMapping:
    files: "{{context.uploadedFiles}}"
    target: "{{context.targetFormat}}"
  async: true
  pollingEndpoint: "{{variables.apiBaseUrl}}/jobs/{{context.jobId}}/status"
  pollingIntervalMs: 2000
  timeoutMs: 600000
  resultKey: "conversionResult"
  progressMapping:
    percent: "progress.percent"
    message: "progress.message"
  onError:
    retryable: true
    maxRetries: 2
    fallbackStep: "configure_options"
  autoAdvance: true
```

### Authentication

Configure once at the wizard level — all API calls get auth headers injected automatically:

```yaml
wizard:
  auth:
    type: "bearer"              # bearer | cookie | api-key
    tokenSource: "localStorage"
    tokenKey: "auth_token"
    headerName: "Authorization"
    headerPrefix: "Bearer"
```

### Retry Policy

Global retry with exponential backoff, overridable per step:

```yaml
wizard:
  settings:
    retryPolicy:
      maxRetries: 3
      backoffMs: [1000, 3000, 10000]
      retryableStatusCodes: [408, 429, 500, 502, 503, 504]
```

### Mock Backend

Develop without a real backend — mock mode simulates job progress locally:

```yaml
mock:
  enabled: true
  latencyMs: 4000
  progressSteps:
    - { at: 0, message: "Preparing files..." }
    - { at: 35, message: "Parsing data..." }
    - { at: 70, message: "Converting..." }
    - { at: 100, message: "Complete!" }
  result:
    filesConverted: 12
    successRate: 95.5
```

### Backend API Contract

**Job submission:**
```
POST /api/convert → { jobId: "abc-123", status: "pending" }
```

**Status polling:**
```
GET /api/jobs/abc-123/status → {
  status: "running",
  progress: { percent: 45, message: "Converting...", currentFile: "data.csv" }
}
```

**Terminal states:** `completed`, `failed`, `cancelled`

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Type-check + production build
npx tsc --noEmit # Type-check only
```

## Project Structure

```
src/
  core/
    types.ts                — TypeScript interfaces
    ExpressionEngine.ts     — {{...}} template evaluator
    ConfigLoader.ts         — YAML parser + validation
    WizardProvider.tsx       — React context + reducer
    hooks/useWizard.ts      — consumer hook
    registry/               — plugin registry
    components/             — shell components (Nav, Footer, StepRenderer)
    steps/                  — built-in step types
    services/
      BackendService.ts     — fetch wrapper with auth + retry
      JobRunner.ts          — polling loop + mock mode
  wizards/                  — YAML wizard configs
  styles/wizard.css         — all styles (wf-* prefix, CSS vars)
```

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, first wizard, key concepts |
| [Configuration Reference](docs/configuration-reference.md) | Complete YAML schema — settings, auth, variables, phases, steps |
| [Step Types Reference](docs/step-types.md) | All built-in step types with every config option |
| [Backend Integration](docs/backend-integration.md) | Job lifecycle, polling, auth, retry, mock mode, API contracts |
| [Expression Engine](docs/expressions.md) | `{{...}}` template syntax, namespaces, comparisons |
| [Theming](docs/theming.md) | Colors, CSS custom properties, dark mode, class naming |
| [Plugin Guide](docs/plugins.md) | Building and registering custom step types |

## Roadmap

- [x] **Phase 1** — Core engine, built-in steps, linear navigation, theming
- [x] **Phase 2** — Job step, polling, auth injection, retry, mock mode
- [ ] **Phase 3** — Conditional transitions, diff-review step, state persistence, plugin API
- [ ] **Phase 4** — Responsive layouts, a11y, CLI tooling, docs site
