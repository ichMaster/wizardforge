# WizardForge: Universal Config-Driven Wizard Framework

## Specification v1.0

---

## 1. Vision and Problem Statement

### Problem

Code conversion and data modernization workflows (SAS-to-Python, DB2-to-PostgreSQL, Oracle-to-AlloyDB, Snowflake-to-Databricks, etc.) all follow a similar multi-step pattern: upload source artifacts, configure conversion parameters, run backend transformations, review results, download outputs. Yet each engagement requires custom UI development for what is structurally the same flow with different parameters.

### Vision

**WizardForge** is a config-driven wizard engine where the entire wizard -- its steps, validations, transitions, backend integrations, and UI hints -- is defined in a JSON/YAML configuration file. A single React component consumes the config and renders a fully functional multi-step wizard. New conversion workflows are created by writing a new config, not new code.

### Design Principles

1. **Config over code** -- A new wizard type should require zero React component authoring for standard step types.
2. **Plugin architecture** -- Custom step types can be registered for cases the built-in types don't cover.
3. **Backend-agnostic** -- The framework doesn't own the backend. It calls endpoints defined in config and handles async job patterns.
4. **State is first-class** -- All wizard state lives in a single, serializable store (pause/resume, undo, debug).
5. **Composable** -- Steps can be grouped into phases. Phases can be conditional. Steps can be reused across wizards.

---

## 2. Core Domain Model

### 2.1 Terminology

| Term | Definition |
|------|-----------|
| **Wizard** | A complete multi-step workflow defined by a single config file. |
| **Phase** | A logical grouping of steps (e.g., "Input", "Configuration", "Execution", "Output"). Phases are visual/organizational -- they don't affect execution. |
| **Step** | A single screen/stage in the wizard. Has a type, config, validations, and transition rules. |
| **Step Type** | A registered handler (React component + logic) that knows how to render and process a specific kind of step. |
| **Context** | The accumulated state across all steps -- form values, uploaded files, job results, user decisions. |
| **Transition** | The rule governing which step comes next. Can be linear (next in array) or conditional (based on context). |
| **Job** | An async backend operation triggered by a step (e.g., file parsing, code conversion). |
| **Artifact** | Any file produced or consumed during the wizard (uploaded source, converted output, log, report). |

### 2.2 Entity Relationships

```
Wizard 1---* Phase 1---* Step
Step 1---1 StepType (from registry)
Step 1---* Validation
Step 1---0..1 Transition (override, else linear)
Step 0..* --- 0..* Job (backend calls)
Wizard 1---1 Context (state store)
Context 1---* Artifact
```

---

## 3. Configuration Schema

### 3.1 Top-Level Wizard Config

```yaml
wizard:
  id: "sas-to-python-v2"
  version: "2.0.0"
  title: "SAS to Python Conversion"
  description: "Upload SAS programs, configure target environment, convert, review, download"

  settings:
    allowBackNavigation: true        # Can user go back?
    allowStepJump: false             # Can user click on any step in nav?
    persistState: true               # Save state to localStorage/backend on each step?
    persistKey: "wizard-{{id}}-{{sessionId}}"
    showProgressBar: true
    progressStyle: "steps"           # "steps" | "bar" | "fraction" | "none"
    theme: "default"                 # Theme key or inline overrides
    locale: "en"

  # Global variables available to all steps via {{variable}} interpolation
  variables:
    supportedSourceFormats: [".sas", ".sas7bdat", ".egp"]
    supportedTargetPlatforms: ["pandas", "pyspark", "polars"]
    maxUploadSizeMB: 500
    apiBaseUrl: "{{env.API_BASE_URL}}"

  phases:
    - id: "input"
      title: "Source Input"
      steps: [upload_source, source_analysis]

    - id: "configuration"
      title: "Conversion Settings"
      steps: [select_target, configure_options, review_config]

    - id: "execution"
      title: "Conversion"
      steps: [run_conversion, conversion_progress]

    - id: "output"
      title: "Results"
      steps: [review_results, download_output]
```

### 3.2 Step Definition Schema

Each step has a type and type-specific config:

```yaml
steps:
  upload_source:
    type: "upload"
    title: "Upload Source Files"
    subtitle: "Upload your SAS programs and data files"
    required: true

    config:
      multiple: true
      accept: "{{variables.supportedSourceFormats}}"
      maxFiles: 100
      maxSizeMB: "{{variables.maxUploadSizeMB}}"
      dropzoneText: "Drag SAS files here or click to browse"
      showFileList: true
      allowReorder: false

      # Optional: trigger backend analysis on upload
      onUpload:
        endpoint: "{{variables.apiBaseUrl}}/analyze"
        method: "POST"
        bodyMapping:
          files: "{{context.uploadedFiles}}"
        resultKey: "sourceAnalysis"

    validation:
      - rule: "minFiles"
        value: 1
        message: "Upload at least one source file"
      - rule: "allFilesValid"
        message: "Some files have unsupported formats"

  source_analysis:
    type: "info"
    title: "Source Analysis"
    subtitle: "Review what we found in your source files"
    condition: "{{context.sourceAnalysis != null}}"

    config:
      layout: "summary-cards"
      cards:
        - title: "Files Analyzed"
          value: "{{context.sourceAnalysis.fileCount}}"
          icon: "file"
        - title: "Total LOC"
          value: "{{context.sourceAnalysis.totalLOC}}"
          icon: "code"
        - title: "Complexity Score"
          value: "{{context.sourceAnalysis.complexityScore}}"
          icon: "gauge"
        - title: "Estimated Duration"
          value: "{{context.sourceAnalysis.estimatedDuration}}"
          icon: "clock"

  select_target:
    type: "form"
    title: "Select Target Platform"

    config:
      fields:
        - id: "targetPlatform"
          type: "radio-cards"
          label: "Target Python Framework"
          options:
            - value: "pandas"
              label: "Pandas"
              description: "Standard data analysis. Best for smaller datasets."
              icon: "pandas-logo"
            - value: "pyspark"
              label: "PySpark"
              description: "Distributed processing. Best for large-scale data."
              icon: "spark-logo"
            - value: "polars"
              label: "Polars"
              description: "Modern DataFrame library. Fast, memory-efficient."
              icon: "polars-logo"
          required: true

        - id: "pythonVersion"
          type: "select"
          label: "Python Version"
          options: ["3.9", "3.10", "3.11", "3.12"]
          default: "3.11"

  configure_options:
    type: "form"
    title: "Conversion Options"

    config:
      layout: "sections"
      sections:
        - title: "Code Style"
          fields:
            - id: "namingConvention"
              type: "select"
              label: "Naming Convention"
              options:
                - { value: "snake_case", label: "snake_case (PEP 8)" }
                - { value: "preserve", label: "Preserve original names" }
              default: "snake_case"

            - id: "addTypeHints"
              type: "toggle"
              label: "Add type hints"
              default: true

            - id: "addDocstrings"
              type: "toggle"
              label: "Generate docstrings"
              default: true

        - title: "Data Handling"
          fields:
            - id: "dateFormat"
              type: "text"
              label: "Default date format"
              default: "%Y-%m-%d"
              placeholder: "strftime format string"

            - id: "nullHandling"
              type: "select"
              label: "NULL handling strategy"
              options:
                - { value: "pandas_na", label: "pd.NA (recommended)" }
                - { value: "numpy_nan", label: "np.nan (legacy)" }
                - { value: "none", label: "Python None" }
              default: "pandas_na"
              condition: "{{context.targetPlatform == 'pandas'}}"

  review_config:
    type: "review"
    title: "Review Configuration"
    subtitle: "Confirm your settings before conversion"

    config:
      sections:
        - title: "Source"
          fields:
            - label: "Files"
              value: "{{context.uploadedFiles.length}} files ({{context.sourceAnalysis.totalLOC}} LOC)"
            - label: "Complexity"
              value: "{{context.sourceAnalysis.complexityScore}}"
        - title: "Target"
          fields:
            - label: "Platform"
              value: "{{context.targetPlatform}}"
            - label: "Python"
              value: "{{context.pythonVersion}}"
        - title: "Options"
          source: "context.configureOptions"
          display: "key-value-auto"

  run_conversion:
    type: "job"
    title: "Converting..."

    config:
      endpoint: "{{variables.apiBaseUrl}}/convert"
      method: "POST"
      bodyMapping:
        files: "{{context.uploadedFiles}}"
        target: "{{context.targetPlatform}}"
        pythonVersion: "{{context.pythonVersion}}"
        options:
          naming: "{{context.namingConvention}}"
          typeHints: "{{context.addTypeHints}}"
          docstrings: "{{context.addDocstrings}}"
          dateFormat: "{{context.dateFormat}}"
          nullHandling: "{{context.nullHandling}}"

      # Job lifecycle
      async: true
      pollingEndpoint: "{{variables.apiBaseUrl}}/jobs/{{context.jobId}}/status"
      pollingIntervalMs: 2000
      timeoutMs: 600000                # 10 minutes
      resultKey: "conversionResult"

      # Progress display
      progressSource: "polling"        # "polling" | "websocket" | "sse"
      progressMapping:
        percent: "progress.percent"
        currentFile: "progress.currentFile"
        message: "progress.message"
        phase: "progress.phase"

      # Error handling
      onError:
        retryable: true
        maxRetries: 2
        fallbackStep: "configure_options"

      autoAdvance: true                # Move to next step when job completes

  review_results:
    type: "diff-review"
    title: "Review Conversion Results"

    config:
      sourceLabel: "SAS (Original)"
      targetLabel: "Python (Converted)"
      source: "{{context.conversionResult.files}}"
      diffMode: "side-by-side"         # "side-by-side" | "inline" | "unified"
      syntaxHighlight: true
      allowEdit: true                  # Can user edit converted code?
      editResultKey: "editedFiles"     # Where to store edits

      fileNavigation: true             # Show file tree on the left
      showStats:
        linesConverted: true
        conversionConfidence: true
        warnings: true

      actions:
        - id: "accept-all"
          label: "Accept All"
          style: "primary"
        - id: "accept-file"
          label: "Accept File"
          scope: "per-file"
        - id: "reject-file"
          label: "Reject & Reconvert"
          scope: "per-file"
          triggerJob:
            endpoint: "{{variables.apiBaseUrl}}/reconvert"
            bodyMapping:
              file: "{{currentFile}}"
              feedback: "{{currentFile.userNotes}}"

  download_output:
    type: "download"
    title: "Download Converted Files"

    config:
      sources:
        - id: "converted-code"
          label: "Converted Python Code"
          description: "All converted .py files"
          endpoint: "{{variables.apiBaseUrl}}/download/{{context.conversionResult.jobId}}/code"
          format: "zip"
          icon: "code"
          primary: true

        - id: "conversion-report"
          label: "Conversion Report"
          description: "Detailed mapping and confidence report"
          endpoint: "{{variables.apiBaseUrl}}/download/{{context.conversionResult.jobId}}/report"
          format: "pdf"
          icon: "document"

        - id: "test-suite"
          label: "Generated Test Suite"
          description: "pytest tests for validating converted code"
          endpoint: "{{variables.apiBaseUrl}}/download/{{context.conversionResult.jobId}}/tests"
          format: "zip"
          icon: "test"
          condition: "{{context.addDocstrings == true}}"

      showSummary: true
      summaryFields:
        - label: "Files Converted"
          value: "{{context.conversionResult.stats.filesConverted}}"
        - label: "Success Rate"
          value: "{{context.conversionResult.stats.successRate}}%"
        - label: "Warnings"
          value: "{{context.conversionResult.stats.warnings}}"

      completionMessage: "Conversion complete. Your files are ready for download."
      completionActions:
        - label: "Start New Conversion"
          action: "restart"
        - label: "View History"
          action: "navigate"
          url: "/conversion-history"
```

---

## 4. Built-in Step Types

### 4.1 Step Type Registry

The framework ships with these built-in step types. Each type is a React component + a validation/processing handler.

| Type | Purpose | Key Features |
|------|---------|--------------|
| `upload` | File upload with validation | Drag-drop, multi-file, format filtering, size limits, preview, optional on-upload backend call |
| `form` | Structured data input | Field types, sections, conditional fields, inline validation, defaults |
| `info` | Read-only information display | Cards, tables, markdown, dynamic values from context |
| `review` | Summary of collected data | Auto-generated from context, editable fields, confirmation checkbox |
| `job` | Async backend operation | Trigger, poll/SSE/WS progress, timeout, retry, error handling |
| `diff-review` | Side-by-side code comparison | Syntax highlighting, per-file accept/reject, inline editing, reconversion |
| `download` | File download options | Multiple artifacts, conditional availability, zip bundling |
| `selection` | Card-based single/multi choice | Icons, descriptions, grouping, search/filter |
| `confirmation` | Final confirmation gate | Checkbox, terms acceptance, summary |
| `redirect` | External redirect | Open URL, pass context params |
| `custom` | User-registered component | Arbitrary React component with full context access |

### 4.2 Form Field Types

The `form` step type supports these field types:

| Field Type | Renders As |
|------------|-----------|
| `text` | Single-line text input |
| `textarea` | Multi-line text input |
| `number` | Numeric input with min/max/step |
| `select` | Dropdown |
| `multi-select` | Multi-select dropdown or chips |
| `radio` | Radio button group |
| `radio-cards` | Card-based radio (icon + label + description) |
| `checkbox` | Single checkbox (boolean) |
| `toggle` | Toggle switch (boolean) |
| `date` | Date picker |
| `file` | Inline file picker (for single supplementary files) |
| `code` | Code editor (Monaco-based) with language selection |
| `key-value` | Dynamic key-value pair list |
| `json` | JSON editor with validation |

---

## 5. Architecture

### 5.1 Component Hierarchy

```
<WizardProvider config={config}>          -- context provider, state store
  <WizardShell>                           -- layout wrapper
    <WizardNav />                         -- phase/step navigation, progress
    <WizardContent>                       -- step content area
      <StepRenderer step={currentStep} /> -- resolves type -> component
    </WizardContent>
    <WizardFooter />                      -- back/next/submit buttons
  </WizardShell>
</WizardProvider>
```

### 5.2 State Architecture

All wizard state lives in a single serializable store:

```typescript
interface WizardState {
  // Navigation
  currentStepId: string;
  stepHistory: string[];              // for back navigation
  completedSteps: Set<string>;
  skippedSteps: Set<string>;

  // Data
  context: Record<string, any>;       // accumulated form values, results
  artifacts: Artifact[];              // uploaded/generated files
  errors: Record<string, StepError>;  // per-step errors

  // Jobs
  activeJobs: Record<string, JobState>;

  // Meta
  startedAt: string;
  lastModifiedAt: string;
  wizardId: string;
  sessionId: string;
}

interface Artifact {
  id: string;
  name: string;
  type: "uploaded" | "generated";
  mimeType: string;
  size: number;
  stepId: string;                     // which step produced it
  url?: string;                       // download URL if available
  metadata?: Record<string, any>;
}

interface JobState {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;                   // 0-100
  message?: string;
  result?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
}
```

### 5.3 State Machine

Step transitions follow a finite state machine pattern:

```
                  [validation passes]
IDLE  -->  VALIDATING  -->  TRANSITIONING  -->  NEXT_STEP (IDLE)
                |                                    |
                v                                    v
          VALIDATION_FAILED                    JOB_RUNNING
                                                    |
                                               [poll/ws]
                                                    |
                                          JOB_COMPLETED / JOB_FAILED
```

Transition rules:

1. User clicks "Next" -> step validation runs
2. If validation passes -> check for `onLeave` hooks (can trigger backend call)
3. Resolve next step: check `transition` override on current step, else next in array
4. Evaluate `condition` on target step -- if false, skip to next eligible step
5. Fire `onEnter` hook on new step (can trigger data loading)
6. Render new step

### 5.4 Expression Engine

Config values wrapped in `{{...}}` are evaluated at runtime against the wizard context.

**Supported expressions:**

| Pattern | Example | Purpose |
|---------|---------|---------|
| Variable lookup | `{{context.targetPlatform}}` | Read from context |
| Comparison | `{{context.fileCount > 10}}` | Conditional logic |
| Equality | `{{context.targetPlatform == 'pandas'}}` | Field matching |
| Null check | `{{context.sourceAnalysis != null}}` | Presence check |
| Nested access | `{{context.result.stats.count}}` | Deep property access |
| Array length | `{{context.uploadedFiles.length}}` | Collection size |
| Template string | `"{{context.count}} files"` | String interpolation |
| Env variables | `{{env.API_BASE_URL}}` | Environment config |
| Wizard variables | `{{variables.maxUploadSizeMB}}` | Config-level constants |

**Not supported (by design):** arbitrary JavaScript, function calls, imports. The expression language is deliberately limited for security and portability. Complex logic belongs in custom step types or backend endpoints.

---

## 6. Plugin System

### 6.1 Registering Custom Step Types

```typescript
interface StepTypePlugin {
  type: string;                                     // unique identifier
  component: React.ComponentType<StepProps>;         // React component
  validate?: (config: any, context: WizardContext) => ValidationResult;
  onEnter?: (config: any, context: WizardContext) => Promise<void>;
  onLeave?: (config: any, context: WizardContext) => Promise<void>;
  configSchema?: JSONSchema;                         // for config validation
}

// Registration
wizardRegistry.register({
  type: "custom-mapping-editor",
  component: MappingEditorStep,
  validate: (config, ctx) => {
    const mappings = ctx.get("columnMappings");
    if (!mappings || mappings.length === 0) {
      return { valid: false, errors: ["At least one mapping is required"] };
    }
    return { valid: true };
  },
});
```

### 6.2 Step Props Contract

Every step component (built-in or custom) receives:

```typescript
interface StepProps {
  // Step metadata
  stepId: string;
  stepConfig: any;                    // the `config` block from YAML
  isActive: boolean;

  // Navigation
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: string) => void;

  // Context (state)
  context: WizardContext;             // read/write access to wizard state
  setContext: (key: string, value: any) => void;
  getContext: (key: string) => any;

  // Artifacts
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => void;

  // Jobs
  submitJob: (endpoint: string, payload: any) => Promise<JobHandle>;
  getJobStatus: (jobId: string) => JobState;

  // Validation
  setStepValid: (valid: boolean) => void;
  addError: (field: string, message: string) => void;
  clearErrors: () => void;

  // UI
  resolveExpression: (expr: string) => any;   // evaluate {{...}} expressions
}
```

### 6.3 Hooks / Lifecycle Events

```typescript
interface WizardHooks {
  onWizardStart?: (config: WizardConfig) => void;
  onWizardComplete?: (context: WizardContext) => void;
  onWizardCancel?: (context: WizardContext) => void;
  onStepEnter?: (stepId: string, context: WizardContext) => void;
  onStepLeave?: (stepId: string, context: WizardContext) => void;
  onStepValidationFail?: (stepId: string, errors: string[]) => void;
  onJobStart?: (jobId: string, stepId: string) => void;
  onJobComplete?: (jobId: string, result: any) => void;
  onJobFail?: (jobId: string, error: string) => void;
  onContextChange?: (key: string, value: any, context: WizardContext) => void;
  onError?: (error: WizardError) => void;
}
```

---

## 7. Backend Integration Contract

### 7.1 API Patterns

The framework expects backend endpoints to follow these conventions:

**Synchronous operations** (upload, analyze):

```
POST /api/analyze
Request:  { files: File[], options: {...} }
Response: { status: "ok", data: {...} }
Error:    { status: "error", code: "INVALID_FORMAT", message: "..." }
```

**Async job operations** (conversion):

```
POST /api/convert
Request:  { files: [...], target: "pandas", options: {...} }
Response: { jobId: "job-abc-123", status: "pending" }

GET /api/jobs/{jobId}/status
Response: {
  jobId: "job-abc-123",
  status: "running",           // "pending" | "running" | "completed" | "failed" | "cancelled"
  progress: {
    percent: 45,
    currentFile: "main.sas",
    message: "Converting PROC SQL blocks",
    phase: "transformation"
  }
}

GET /api/jobs/{jobId}/result
Response: {
  jobId: "job-abc-123",
  files: [
    {
      name: "main.py",
      sourceFile: "main.sas",
      content: "...",
      confidence: 0.92,
      warnings: [...]
    }
  ],
  stats: { filesConverted: 12, successRate: 95.5, warnings: 3 }
}
```

**Download:**

```
GET /api/download/{jobId}/code     -> application/zip
GET /api/download/{jobId}/report   -> application/pdf
GET /api/download/{jobId}/tests    -> application/zip
```

### 7.2 Authentication

The wizard config declares how auth is passed:

```yaml
wizard:
  auth:
    type: "bearer"                    # "bearer" | "cookie" | "api-key" | "custom"
    tokenSource: "localStorage"       # "localStorage" | "sessionStorage" | "cookie" | "callback"
    tokenKey: "auth_token"            # key in storage, or cookie name
    headerName: "Authorization"       # default: "Authorization"
    headerPrefix: "Bearer"            # default: "Bearer"
```

### 7.3 Error Contract

All backend errors should follow:

```json
{
  "status": "error",
  "code": "CONVERSION_FAILED",
  "message": "Human-readable description",
  "details": {
    "file": "proc_mixed.sas",
    "line": 47,
    "reason": "Unsupported PROC type: PROC IML"
  },
  "retryable": true
}
```

---

## 8. Transition Logic

### 8.1 Linear (Default)

Steps execute in array order within each phase. Phases execute in array order.

### 8.2 Conditional Transitions

```yaml
steps:
  select_conversion_type:
    type: "selection"
    title: "What do you want to convert?"
    config:
      options:
        - { value: "code", label: "Source Code" }
        - { value: "data", label: "Data Files" }
        - { value: "both", label: "Code + Data" }

    transition:
      rules:
        - condition: "{{context.conversionType == 'code'}}"
          goto: "upload_code"
        - condition: "{{context.conversionType == 'data'}}"
          goto: "upload_data"
        - condition: "{{context.conversionType == 'both'}}"
          goto: "upload_code"        # code first, then data step appears later
      default: "upload_code"
```

### 8.3 Step Conditions (Skip Logic)

Any step can have a `condition`. If it evaluates to false, the step is skipped:

```yaml
steps:
  configure_spark_options:
    type: "form"
    condition: "{{context.targetPlatform == 'pyspark'}}"
    title: "Spark Configuration"
    config:
      fields:
        - id: "sparkMaster"
          type: "text"
          label: "Spark Master URL"
```

### 8.4 Loops / Reconversion

For iterative workflows (convert -> review -> fix -> reconvert), steps can reference earlier steps:

```yaml
steps:
  review_results:
    type: "diff-review"
    config:
      actions:
        - id: "reconvert"
          label: "Reconvert Selected Files"
          goto: "run_conversion"          # loop back
          contextOverride:
            files: "{{context.selectedFiles}}"
            isReconversion: true
```

---

## 9. UI/UX Requirements

### 9.1 Navigation Component

The wizard navigation should display:

- Phase labels (collapsible sections or a horizontal track)
- Step indicators within each phase (numbered circles, checkmarks for completed, current highlight)
- Step titles visible on hover/click
- Disabled state for future steps (unless `allowStepJump: true`)
- Warning/error badges on steps that have validation issues

### 9.2 Step Layout

Each step renders within a consistent frame:

```
+----------------------------------------------------+
|  [Phase: Input]  [Config]  [Execution]  [Output]   |  <- Phase Nav
+----------------------------------------------------+
|  Step Title                              Step 2/8   |  <- Header
|  Step subtitle or description                       |
+----------------------------------------------------+
|                                                     |
|              Step Content Area                      |  <- Rendered by StepType
|              (type-specific UI)                     |
|                                                     |
+----------------------------------------------------+
|  [Back]                              [Next/Submit]  |  <- Footer
+----------------------------------------------------+
```

### 9.3 Responsive Behavior

- Desktop: side-by-side layouts for diff-review, multi-column forms
- Tablet: stacked layouts, collapsible nav
- Mobile: single-column, bottom sheet navigation

### 9.4 Accessibility

- All steps keyboard-navigable
- ARIA labels on progress indicators
- Focus management on step transitions
- Screen reader announcements for step changes and job progress
- Error messages linked to fields via aria-describedby

### 9.5 Theming

```yaml
wizard:
  theme:
    colors:
      primary: "#2563eb"
      primaryHover: "#1d4ed8"
      success: "#16a34a"
      warning: "#d97706"
      error: "#dc2626"
      background: "#ffffff"
      surface: "#f8fafc"
      text: "#1e293b"
      textSecondary: "#64748b"
      border: "#e2e8f0"
    borderRadius: "8px"
    fontFamily: "Inter, system-ui, sans-serif"
    spacing: "comfortable"           # "compact" | "comfortable" | "spacious"
```

---

## 10. State Persistence and Recovery

### 10.1 Auto-Save

When `persistState: true`, the wizard serializes state to `localStorage` (or a backend endpoint) after each step completion:

```typescript
interface PersistedState {
  wizardId: string;
  sessionId: string;
  version: string;
  currentStepId: string;
  context: Record<string, any>;       // excluding File objects
  completedSteps: string[];
  startedAt: string;
  lastSavedAt: string;
  artifactRefs: ArtifactRef[];        // references, not file contents
}
```

### 10.2 Resume Flow

On wizard mount, check for persisted state:

1. If found and version matches -> show "Resume where you left off?" dialog
2. User chooses resume -> hydrate state, navigate to last step
3. User chooses restart -> clear persisted state, start from step 1
4. If version mismatch -> clear state (config has changed, old state may be incompatible)

### 10.3 File Handling

Uploaded files cannot be serialized to localStorage. Options:

- **Upload immediately** to a staging endpoint, store the returned reference
- **Re-request** on resume (show which files need re-upload)
- **IndexedDB** for client-side persistence of small files

---

## 11. Error Handling Strategy

### 11.1 Error Categories

| Category | Example | Handling |
|----------|---------|---------|
| Validation | Missing required field | Inline field error, block navigation |
| Upload | File too large, wrong format | Toast + inline message, allow retry |
| Backend transient | 503, timeout | Auto-retry with backoff, then manual retry button |
| Backend permanent | 400, invalid request | Show error, allow config edit and retry |
| Job failure | Conversion error on specific file | Show per-file errors, allow partial accept + reconvert |
| Network | Offline | Pause polling, show reconnection banner, resume on reconnect |
| State corruption | Invalid persisted state | Clear state, restart wizard with notification |

### 11.2 Retry Policy

```yaml
wizard:
  retryPolicy:
    maxRetries: 3
    backoffMs: [1000, 3000, 10000]    # exponential backoff
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
```

---

## 12. Testing Strategy

### 12.1 Config Validation

A CLI tool validates wizard configs against the JSON schema before deployment:

```bash
wizardforge validate ./wizards/sas-to-python.yaml
```

Checks: required fields, valid step type references, expression syntax, circular transitions, unreachable steps.

### 12.2 Test Layers

| Layer | Tool | What |
|-------|------|------|
| Config schema | JSON Schema / Ajv | Config structure validity |
| Expression engine | Unit tests (Jest) | Expression parsing and evaluation |
| Step components | Component tests (RTL) | Each built-in step type renders and validates correctly |
| Transitions | State machine tests | Step ordering, conditions, loops |
| Integration | Cypress / Playwright | Full wizard flow with mocked backend |
| Backend contract | Contract tests (Pact) | API request/response shape |

### 12.3 Mock Backend

For frontend development and testing, the config can include mock responses:

```yaml
steps:
  run_conversion:
    type: "job"
    config:
      endpoint: "/api/convert"
      mock:
        enabled: "{{env.NODE_ENV == 'development'}}"
        latencyMs: 3000
        progressSteps:
          - { at: 0, message: "Starting conversion..." }
          - { at: 30, message: "Parsing SAS macros..." }
          - { at: 60, message: "Generating Python code..." }
          - { at: 90, message: "Running validation..." }
          - { at: 100, message: "Complete" }
        result:
          filesConverted: 12
          successRate: 95.5
```

---

## 13. Example Configs (Other Wizard Types)

To validate the framework's universality, here are sketches of other wizards that should be expressible with the same config schema:

### 13.1 DB2-to-PostgreSQL Migration Assessment

```yaml
wizard:
  id: "db2-postgres-assessment"
  phases:
    - id: "discovery"
      steps: [upload_ddl, upload_stored_procs, upload_job_definitions]
    - id: "analysis"
      steps: [run_assessment, complexity_report]
    - id: "planning"
      steps: [select_migration_strategy, configure_target_schema, estimate_effort]
    - id: "output"
      steps: [download_assessment_report, download_migration_plan]
```

### 13.2 Snowflake-to-Databricks Conversion

```yaml
wizard:
  id: "snowflake-databricks"
  phases:
    - id: "input"
      steps: [connect_snowflake, select_objects, extract_metadata]
    - id: "mapping"
      steps: [review_type_mapping, configure_medallion_layers, map_to_unity_catalog]
    - id: "conversion"
      steps: [run_conversion, review_spark_sql]
    - id: "output"
      steps: [download_notebooks, download_terraform, download_report]
```

### 13.3 Generic File Format Converter (Non-Code)

```yaml
wizard:
  id: "file-converter"
  phases:
    - id: "input"
      steps: [upload_files]
    - id: "configure"
      steps: [select_output_format, configure_options]
    - id: "convert"
      steps: [run_conversion]
    - id: "output"
      steps: [preview_results, download_files]
```

---

## 14. Project Structure (Recommended)

```
wizardforge/
  packages/
    core/                          # Framework engine
      src/
        WizardProvider.tsx         # Context provider + state store
        WizardShell.tsx            # Layout wrapper
        WizardNav.tsx              # Navigation component
        WizardFooter.tsx           # Back/Next/Submit buttons
        StepRenderer.tsx           # Type -> component resolver
        ExpressionEngine.ts        # {{...}} evaluator
        StateMachine.ts            # Transition logic
        ConfigValidator.ts         # Schema validation
        types.ts                   # TypeScript interfaces
        hooks/
          useWizard.ts             # Main hook for step components
          useWizardContext.ts      # Context read/write
          useJob.ts                # Job submission and polling
          useArtifacts.ts          # File management
        registry/
          StepTypeRegistry.ts      # Plugin registration
          built-in/                # Built-in step types
            UploadStep.tsx
            FormStep.tsx
            InfoStep.tsx
            ReviewStep.tsx
            JobStep.tsx
            DiffReviewStep.tsx
            DownloadStep.tsx
            SelectionStep.tsx
            ConfirmationStep.tsx

    cli/                           # Config validation CLI
      validate.ts
      scaffold.ts                  # Generate new wizard config from template

  wizards/                         # Config files
    sas-to-python.yaml
    db2-to-postgres.yaml
    snowflake-to-databricks.yaml

  examples/                        # Example integrations
    with-nextjs/
    with-vite/
    with-migvisor/
```

---

## 15. Open Questions / Decisions Needed

1. **Config format: YAML vs JSON?** YAML is more readable for humans but needs a parser. JSON is native but verbose. Could support both with auto-detection.

2. **Expression engine implementation:** Build a minimal custom parser (safer, smaller) or use something like `jexl` (more powerful, dependency)?

3. **File upload strategy:** Direct-to-backend on drop, or accumulate in browser and send on step leave? Impacts UX for large files.

4. **Real-time progress:** Polling is simplest. SSE is better for progress. WebSocket is best for bidirectional (cancel, pause). Which to start with?

5. **Monorepo or single package?** Monorepo (core + cli + examples) is cleaner but heavier setup. Single package is faster to start.

6. **Diff viewer:** Build on Monaco Editor's diff view, or use a lighter library like `react-diff-viewer`?

7. **Should the wizard support multi-user collaboration?** (e.g., one person uploads, another reviews) This would significantly increase complexity.

8. **Versioning strategy for configs:** When a wizard config changes, how to handle in-progress sessions? Strict version match (discard), or migration functions?

---

## 16. Implementation Phases

### Phase 1: Foundation (MVP)

- WizardProvider + state store
- Expression engine (basic interpolation + comparisons)
- StepRenderer + type registry
- Built-in types: `form`, `info`, `upload`, `download`
- Linear navigation (no conditional transitions)
- Config schema validation
- Single example wizard (simple file converter)

### Phase 2: Backend Integration

- `job` step type with polling
- Async progress display
- Error handling + retry
- Auth header injection
- Mock backend mode

### Phase 3: Advanced Features

- Conditional transitions + skip logic
- `diff-review` step type
- State persistence + resume
- `review` step type (auto-generated summaries)
- Custom step plugin API

### Phase 4: Polish

- Theming system
- Responsive layouts
- Accessibility audit
- CLI for config validation + scaffolding
- Documentation site
- migVisor integration (first production use)
