# Step Types Reference

Detailed configuration for every built-in step type.

## Upload Step

Drag-and-drop file upload with validation.

```yaml
type: "upload"
config:
  multiple: boolean        # Allow multiple files. Default: true.
  accept: string[]         # Accepted file extensions. E.g., [".csv", ".xlsx", ".json"].
  maxFiles: number         # Maximum number of files. Default: unlimited.
  maxSizeMB: number        # Maximum file size in MB. Default: unlimited.
  dropzoneText: string     # Custom dropzone label. Default: "Drag files here or click to browse".
  showFileList: boolean    # Show uploaded files list. Default: true.
```

**Context writes:**
- `uploadedFiles` — array of `{ id, name, size, mimeType }` objects

**Validation:**
- Uses `validation` array with rule `minFiles` to enforce minimum file count
- If `required: true` on the step, minimum defaults to 1
- Step is valid when uploaded file count >= minimum

**Example:**

```yaml
upload_files:
  type: "upload"
  title: "Upload Your Files"
  subtitle: "Select the files you want to convert"
  required: true
  config:
    multiple: true
    accept: [".csv", ".xlsx", ".json", ".xml"]
    maxFiles: 20
    maxSizeMB: 100
    dropzoneText: "Drag your data files here or click to browse"
    showFileList: true
  validation:
    - rule: "minFiles"
      value: 1
      message: "Please upload at least one file"
```

---

## Form Step

Dynamic form with multiple field types and optional section grouping.

```yaml
type: "form"
config:
  fields: FieldConfig[]      # Flat list of fields (use this OR sections, not both).
  sections: SectionConfig[]  # Grouped fields with section headings.
```

### Section Config

```yaml
sections:
  - title: string            # Section heading text.
    fields: FieldConfig[]    # Fields within this section.
```

### Field Config

Every field has these common properties:

```yaml
fields:
  - id: string              # Required. Context key for this field's value.
    type: string             # Required. Field type (see below).
    label: string            # Required. Display label.
    description: string      # Optional. Helper text below the label.
    placeholder: string      # Optional. Input placeholder text.
    required: boolean        # Optional. Field must be filled. Default: false.
    default: any             # Optional. Default value if context key is undefined.
    condition: string        # Optional. {{...}} expression — hide field if false.
```

### Field Types

#### text

Single-line text input.

```yaml
- id: "name"
  type: "text"
  label: "Your Name"
  placeholder: "Enter your name"
  required: true
```

#### textarea

Multi-line text input.

```yaml
- id: "notes"
  type: "textarea"
  label: "Additional Notes"
  placeholder: "Any special instructions..."
```

#### number

Numeric input with optional min/max/step.

```yaml
- id: "batchSize"
  type: "number"
  label: "Batch Size"
  min: 1
  max: 1000
  step: 10
  default: 100
```

#### date

Date picker input.

```yaml
- id: "startDate"
  type: "date"
  label: "Start Date"
  default: "2025-01-01"
```

#### select

Dropdown select. Options can be simple strings or value/label objects.

```yaml
# Simple string options
- id: "encoding"
  type: "select"
  label: "Text Encoding"
  options: ["UTF-8", "ASCII", "ISO-8859-1"]
  default: "UTF-8"

# Value/label options
- id: "dateFormat"
  type: "select"
  label: "Date Format"
  options:
    - value: "YYYY-MM-DD"
      label: "YYYY-MM-DD (ISO 8601)"
    - value: "MM/DD/YYYY"
      label: "MM/DD/YYYY (US)"
  default: "YYYY-MM-DD"
```

#### radio

Radio button group.

```yaml
- id: "mode"
  type: "radio"
  label: "Conversion Mode"
  options:
    - value: "strict"
      label: "Strict"
    - value: "lenient"
      label: "Lenient"
  default: "strict"
```

#### radio-cards

Card-based radio selection — each option is a visual card with label and description.

```yaml
- id: "outputFormat"
  type: "radio-cards"
  label: "Target Format"
  required: true
  options:
    - value: "csv"
      label: "CSV"
      description: "Comma-separated values. Universal, widely supported."
    - value: "json"
      label: "JSON"
      description: "JavaScript Object Notation. Great for APIs."
    - value: "parquet"
      label: "Parquet"
      description: "Columnar storage. Best for analytics."
```

#### toggle

On/off switch.

```yaml
- id: "prettyPrint"
  type: "toggle"
  label: "Pretty-print output"
  default: true
```

#### checkbox

Single checkbox.

```yaml
- id: "acceptTerms"
  type: "checkbox"
  label: "I accept the terms and conditions"
  required: true
```

**Context writes:**
- Each field writes its value to `context[field.id]`

**Validation:**
- All visible required fields must have a non-empty value
- Fields hidden by `condition` are excluded from validation
- Step is valid when all required visible fields are filled

**Example with sections:**

```yaml
configure_options:
  type: "form"
  title: "Conversion Options"
  config:
    sections:
      - title: "General"
        fields:
          - id: "encoding"
            type: "select"
            label: "Text Encoding"
            options: ["UTF-8", "ASCII", "ISO-8859-1"]
            default: "UTF-8"

          - id: "headerRow"
            type: "toggle"
            label: "First row contains headers"
            default: true

      - title: "Formatting"
        fields:
          - id: "dateFormat"
            type: "select"
            label: "Date Format"
            options:
              - value: "YYYY-MM-DD"
                label: "YYYY-MM-DD (ISO)"
              - value: "MM/DD/YYYY"
                label: "MM/DD/YYYY (US)"
            default: "YYYY-MM-DD"

          - id: "prettyPrint"
            type: "toggle"
            label: "Pretty-print output"
            default: true
```

### Conditional Fields

Fields can be shown/hidden based on context values:

```yaml
fields:
  - id: "platform"
    type: "radio-cards"
    label: "Target Platform"
    required: true
    options:
      - value: "pandas"
        label: "Pandas"
      - value: "pyspark"
        label: "PySpark"

  - id: "sparkVersion"
    type: "select"
    label: "Spark Version"
    condition: "{{context.platform == 'pyspark'}}"
    options: ["3.4", "3.5", "4.0"]
```

The `sparkVersion` field only appears when `platform` is set to `pyspark`.

---

## Info Step

Read-only display step for showing information, statistics, or instructions.

```yaml
type: "info"
config:
  cards: CardConfig[]     # Display as info cards (use cards OR text).
  text: string            # Display as paragraph text (supports {{...}} expressions).
```

### Card Config

```yaml
cards:
  - title: string          # Card title/label.
    value: string          # Display value. Supports {{...}} expressions.
    icon: string           # Icon name (see available icons below).
```

**Available icons:** `file`, `code`, `gauge`, `clock`, `check`, `warning`, `info`, `table`, `server`, `bolt`, `document`, `download`

**Context writes:** None — info steps are read-only.

**Validation:** Always valid.

**Example:**

```yaml
analysis_results:
  type: "info"
  title: "Analysis Results"
  config:
    cards:
      - title: "Files Analyzed"
        value: "{{context.uploadedFiles.length}}"
        icon: "file"
      - title: "Total Lines"
        value: "{{context.analysisResult.totalLines}}"
        icon: "code"
      - title: "Complexity"
        value: "{{context.analysisResult.complexity}}"
        icon: "gauge"
```

---

## Review Step

Summary/confirmation screen showing all collected data before proceeding.

```yaml
type: "review"
config:
  sections: ReviewSection[]
```

### Review Section

Each section can use explicit fields or auto-generate from a context object:

```yaml
sections:
  # Explicit label-value fields
  - title: string
    fields:
      - label: string      # Display label.
        value: string      # {{...}} expression to resolve.

  # Auto-generate from context object
  - title: string
    source: string         # Context key pointing to an object. Keys become labels.
```

**Fallback:** If no `sections` are configured, the review step auto-generates a summary from all non-object context entries.

**Context writes:** None — review steps are read-only.

**Validation:** Always valid.

**Example:**

```yaml
review_settings:
  type: "review"
  title: "Review Your Settings"
  subtitle: "Confirm everything looks correct"
  config:
    sections:
      - title: "Source Files"
        fields:
          - label: "Files to convert"
            value: "{{context.uploadedFiles.length}} file(s)"

      - title: "Output"
        fields:
          - label: "Target format"
            value: "{{context.outputFormat}}"
          - label: "Encoding"
            value: "{{context.encoding}}"

      - title: "Options"
        fields:
          - label: "Header row"
            value: "{{context.headerRow}}"
          - label: "Pretty print"
            value: "{{context.prettyPrint}}"
```

---

## Job Step

Async backend job with progress tracking, retry, and mock mode. See [Backend Integration](backend-integration.md) for the complete guide.

```yaml
type: "job"
config:
  # Endpoint
  endpoint: string         # Required. API URL (supports {{...}}). Where to submit the job.
  method: string           # HTTP method. "POST" | "PUT" | "PATCH". Default: "POST".
  bodyMapping: object      # Request body template. Values support {{...}} expressions.

  # Polling
  async: boolean           # Enable polling mode. Default: true.
  pollingEndpoint: string  # Status polling URL (supports {{...}}, typically includes {{context.jobId}}).
  pollingIntervalMs: number # Poll interval in ms. Default: 2000.
  timeoutMs: number        # Job timeout in ms. Default: 600000 (10 min).

  # Result
  resultKey: string        # Context key to store the job result.
  autoAdvance: boolean     # Auto-navigate to next step on completion. Default: false.

  # Progress display
  progressMapping:
    percent: string        # JSON path to progress percentage (0-100).
    message: string        # JSON path to status message.
    currentFile: string    # JSON path to current file being processed.
    phase: string          # JSON path to current processing phase.

  # Error handling
  onError:
    retryable: boolean     # Show retry button on failure.
    maxRetries: number     # Max retry attempts. Default: 0.
    fallbackStep: string   # Step ID to navigate to on unrecoverable failure.

  # Mock mode
  mock:
    enabled: boolean | string  # Enable mock mode. Supports {{...}} expressions.
    latencyMs: number          # Simulated duration in ms.
    progressSteps:             # Simulated progress checkpoints.
      - at: number             # Percentage (0-100).
        message: string        # Status message at this point.
    result: object             # Mock result object.
```

**Context writes:**
- `config.resultKey` — stores the job result object on completion

**Validation:**
- Step is valid only when job status is `completed`

**Example:**

```yaml
run_conversion:
  type: "job"
  title: "Converting Your Files"
  subtitle: "This may take a few minutes"
  config:
    endpoint: "{{variables.apiBaseUrl}}/convert"
    method: "POST"
    bodyMapping:
      files: "{{context.uploadedFiles}}"
      format: "{{context.outputFormat}}"
      options:
        encoding: "{{context.encoding}}"
        prettyPrint: "{{context.prettyPrint}}"
    async: true
    pollingEndpoint: "{{variables.apiBaseUrl}}/jobs/{{context.jobId}}/status"
    pollingIntervalMs: 2000
    timeoutMs: 300000
    resultKey: "conversionResult"
    progressMapping:
      percent: "progress.percent"
      message: "progress.message"
      currentFile: "progress.currentFile"
    onError:
      retryable: true
      maxRetries: 2
      fallbackStep: "configure_options"
    autoAdvance: true
    mock:
      enabled: true
      latencyMs: 4000
      progressSteps:
        - { at: 0, message: "Preparing files..." }
        - { at: 25, message: "Reading source data..." }
        - { at: 50, message: "Converting..." }
        - { at: 75, message: "Validating output..." }
        - { at: 100, message: "Complete!" }
      result:
        filesConverted: 3
        totalRows: 15420
```

---

## Download Step

Presents downloadable artifacts with optional summary statistics.

```yaml
type: "download"
config:
  completionMessage: string       # Success message. Supports {{...}}.
  showSummary: boolean            # Show summary statistics section. Default: false.
  summaryFields: SummaryField[]   # Summary label-value pairs.
  sources: DownloadSource[]       # Downloadable resources.
```

### Summary Field

```yaml
summaryFields:
  - label: string                 # Display label.
    value: string                 # {{...}} expression for the value.
```

### Download Source

```yaml
sources:
  - id: string                   # Required. Unique source identifier.
    label: string                # Required. Download button label.
    description: string          # Optional. Description text.
    endpoint: string             # Required. Download URL. Supports {{...}}.
    format: string               # File format for icon. "zip" | "pdf" | "csv" | other.
    primary: boolean             # Highlight as primary download. Default: false.
    condition: string            # Optional. {{...}} expression — hide if false.
```

**Context writes:** None — download steps are read-only.

**Validation:** Always valid.

**Example:**

```yaml
download_results:
  type: "download"
  title: "Download Converted Files"
  config:
    completionMessage: "Your files have been converted successfully!"
    showSummary: true
    summaryFields:
      - label: "Files converted"
        value: "{{context.conversionResult.filesConverted}}"
      - label: "Total rows"
        value: "{{context.conversionResult.totalRows}}"
    sources:
      - id: "converted"
        label: "Converted Files"
        description: "All files converted to the selected format"
        endpoint: "/api/download/converted"
        format: "zip"
        primary: true

      - id: "report"
        label: "Conversion Report"
        description: "Summary with any warnings"
        endpoint: "/api/download/report"
        format: "pdf"
```
