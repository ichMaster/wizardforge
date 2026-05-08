# Configuration Reference

Complete YAML/JSON schema for WizardForge wizard configs.

## Top-Level Structure

```yaml
wizard:
  id: string              # Required. Unique wizard identifier.
  version: string         # Optional. Semantic version (e.g., "1.0.0").
  title: string           # Required. Display title.
  description: string     # Optional. Subtitle/description.
  settings: Settings      # Optional. Behavioral settings.
  variables: object       # Optional. Global constants accessible as {{variables.key}}.
  auth: AuthConfig        # Optional. Authentication for API calls.
  theme: ThemeConfig      # Optional. Visual customization.
  phases: Phase[]         # Required. Ordered list of phases.

steps:
  step_id: StepConfig     # Required. Map of step ID → step configuration.
```

## Settings

```yaml
settings:
  allowBackNavigation: boolean   # Allow "Back" button. Default: true.
  allowStepJump: boolean         # Allow clicking nav to jump to steps. Default: false.
  persistState: boolean          # Persist state to localStorage. Default: false. (Planned)
  persistKey: string             # Storage key for persistence. (Planned)
  showProgressBar: boolean       # Show step counter. Default: true.
  progressStyle: string          # "steps" | "bar" | "fraction" | "none". Default: "steps".
  retryPolicy: RetryPolicy       # Global retry policy for backend calls.
```

### RetryPolicy

```yaml
retryPolicy:
  maxRetries: number             # Max retry attempts. Default: 3.
  backoffMs: number[]            # Backoff delays per attempt. Default: [1000, 3000, 10000].
  retryableStatusCodes: number[] # HTTP codes to retry. Default: [408, 429, 500, 502, 503, 504].
```

## Variables

Global constants accessible in any expression as `{{variables.key}}`:

```yaml
variables:
  apiBaseUrl: "https://api.example.com"
  maxUploadSizeMB: 100
  supportedFormats: [".csv", ".json", ".xml"]
```

Variables are resolved once at wizard load time. Use them for API URLs, limits, format lists, and other config-level constants.

## Authentication

Configures automatic auth header injection on all backend API calls:

```yaml
auth:
  type: string            # Required. "bearer" | "cookie" | "api-key".
  tokenSource: string     # Where to read the token. "localStorage" | "sessionStorage" | "cookie".
  tokenKey: string        # Key name in the chosen storage.
  headerName: string      # HTTP header name. Default: "Authorization" (bearer) or "X-API-Key" (api-key).
  headerPrefix: string    # Prefix before token value. Default: "Bearer". Only for bearer type.
```

**Examples:**

```yaml
# Bearer token from localStorage
auth:
  type: "bearer"
  tokenSource: "localStorage"
  tokenKey: "auth_token"

# API key
auth:
  type: "api-key"
  tokenSource: "localStorage"
  tokenKey: "api_key"
  headerName: "X-API-Key"

# Cookie-based (credentials sent automatically)
auth:
  type: "cookie"
```

## Theme

See [Theming Reference](theming.md) for full details.

```yaml
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
  spacing: "comfortable"        # "compact" | "comfortable" | "spacious"
```

## Phases

Phases group steps into logical sections displayed in the navigation bar:

```yaml
phases:
  - id: string            # Required. Unique phase identifier.
    title: string          # Required. Display label in navigation.
    steps: string[]        # Required. Ordered list of step IDs.
```

- Phases render in array order in the navigation bar.
- Steps within a phase execute in array order.
- Each step ID must exist in the top-level `steps` map.

**Example:**

```yaml
phases:
  - id: "input"
    title: "Upload"
    steps: [upload_files]

  - id: "configure"
    title: "Settings"
    steps: [select_format, configure_options]

  - id: "process"
    title: "Convert"
    steps: [run_conversion]

  - id: "output"
    title: "Download"
    steps: [download_results]
```

## Steps

Each step is keyed by a unique ID and defines one screen of the wizard:

```yaml
steps:
  step_id:
    type: string           # Required. Step type: "upload", "form", "info", "review", "job", "download".
    title: string          # Required. Step heading.
    subtitle: string       # Optional. Subheading below title.
    required: boolean      # Optional. Marks step as required. Default: false.
    condition: string      # Optional. {{...}} expression — skip step if false. (Planned)
    config: object         # Optional. Type-specific configuration. See Step Types Reference.
    validation: Rule[]     # Optional. Step-level validation rules.
    transition: Transition # Optional. Conditional navigation rules. (Planned)
```

### Validation Rules

```yaml
validation:
  - rule: string           # Rule name (e.g., "minFiles", "maxFiles").
    value: any             # Rule parameter.
    message: string        # Error message if validation fails.
```

Currently implemented rules:

| Rule | Value | Used By |
|------|-------|---------|
| `minFiles` | number | `upload` step — minimum files required |

### Transitions (Planned — Phase 3)

```yaml
transition:
  rules:
    - condition: "{{context.type == 'code'}}"
      goto: "upload_code"
    - condition: "{{context.type == 'data'}}"
      goto: "upload_data"
  default: "upload_code"
```

## Complete Example

```yaml
wizard:
  id: "file-converter"
  version: "1.0.0"
  title: "File Format Converter"
  description: "Upload files, choose an output format, and convert them"

  settings:
    allowBackNavigation: true
    showProgressBar: true
    progressStyle: "steps"
    retryPolicy:
      maxRetries: 3
      backoffMs: [1000, 3000, 10000]

  variables:
    apiBaseUrl: "https://api.example.com"
    maxUploadSizeMB: 100

  auth:
    type: "bearer"
    tokenSource: "localStorage"
    tokenKey: "auth_token"

  theme:
    colors:
      primary: "#2563eb"
    borderRadius: "8px"

  phases:
    - id: "input"
      title: "Upload"
      steps: [upload_files]
    - id: "configure"
      title: "Settings"
      steps: [select_format]
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
      multiple: true
      accept: [".csv", ".json"]
      maxSizeMB: 100

  select_format:
    type: "form"
    title: "Output Format"
    config:
      fields:
        - id: "outputFormat"
          type: "radio-cards"
          label: "Target Format"
          required: true
          options:
            - value: "csv"
              label: "CSV"
              description: "Comma-separated values"
            - value: "json"
              label: "JSON"
              description: "JavaScript Object Notation"

  run_conversion:
    type: "job"
    title: "Converting..."
    config:
      endpoint: "{{variables.apiBaseUrl}}/convert"
      resultKey: "conversionResult"
      autoAdvance: true
      mock:
        enabled: true
        latencyMs: 3000
        progressSteps:
          - { at: 0, message: "Starting..." }
          - { at: 50, message: "Converting..." }
          - { at: 100, message: "Done!" }
        result: { filesConverted: 3 }

  download_results:
    type: "download"
    title: "Download"
    config:
      completionMessage: "Your files are ready!"
      sources:
        - id: "output"
          label: "Converted Files"
          endpoint: "/api/download/output"
          format: "zip"
          primary: true
```
