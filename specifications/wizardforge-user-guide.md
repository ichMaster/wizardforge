# WizardForge: How to Build a Wizard

## A Practical Guide for Config Authors

---

## What Is WizardForge?

WizardForge is a tool that lets you create multi-step wizards by writing a configuration file. You describe what steps you want, what data to collect, and what backend to call -- and the framework builds the working UI for you.

No React coding required for standard wizards. You write YAML (or JSON), and the wizard appears.

---

## Your First Wizard in 5 Minutes

Every wizard is a single YAML file. Here is the simplest possible wizard -- it uploads a file and lets the user download a result:

```yaml
wizard:
  id: "my-first-wizard"
  title: "File Converter"

  phases:
    - id: "input"
      title: "Upload"
      steps: [upload_file]

    - id: "output"
      title: "Download"
      steps: [download_file]

steps:
  upload_file:
    type: "upload"
    title: "Upload Your File"
    config:
      multiple: false
      accept: [".csv", ".xlsx"]
      dropzoneText: "Drop your file here"

  download_file:
    type: "download"
    title: "Download Result"
    config:
      sources:
        - id: "result"
          label: "Converted File"
          endpoint: "/api/download/{{context.jobId}}"
          format: "csv"
```

That is it. Two phases, two steps, a working wizard.

---

## How a Wizard Config Is Organized

Every config file has three main sections:

```yaml
wizard:         # General settings (title, behavior, theme)
  ...

phases:         # Groups of steps shown in the navigation bar
  ...

steps:          # The actual screens the user sees
  ...
```

Think of it like a book: the **wizard** is the cover, **phases** are chapters, and **steps** are pages.

---

## Phases: Organizing Steps into Groups

Phases are visual groupings. They appear in the navigation bar at the top so the user can see where they are in the overall process.

```yaml
phases:
  - id: "input"
    title: "Source Input"
    steps: [upload_files, review_upload]

  - id: "settings"
    title: "Configuration"
    steps: [choose_target, set_options]

  - id: "run"
    title: "Conversion"
    steps: [convert, show_progress]

  - id: "results"
    title: "Results"
    steps: [review_output, download]
```

The user sees: `[Source Input] -> [Configuration] -> [Conversion] -> [Results]`

Each phase lists the step IDs it contains. The order matters -- steps run top to bottom, phases run left to right.

---

## Steps: What the User Actually Sees

Each step is one screen. You give it a **type** (what kind of screen it is) and a **config** (what to show on that screen).

Here are the step types you can use:

### 1. Upload Step

Lets the user upload files.

```yaml
upload_source:
  type: "upload"
  title: "Upload Source Files"
  config:
    multiple: true                    # allow many files
    accept: [".sas", ".sql", ".py"]   # allowed formats
    maxFiles: 50                      # limit
    maxSizeMB: 200                    # per file
    dropzoneText: "Drag files here or click to browse"
    showFileList: true                # show uploaded files below
```

**What happens:** Uploaded files are stored in `context.uploadedFiles` automatically. Later steps can use them.

### 2. Form Step

Collects information from the user through input fields.

```yaml
choose_options:
  type: "form"
  title: "Conversion Settings"
  config:
    fields:
      - id: "targetLanguage"
        type: "select"
        label: "Convert to"
        options: ["Python", "Java", "Go"]
        required: true

      - id: "keepComments"
        type: "toggle"
        label: "Preserve original comments"
        default: true

      - id: "outputStyle"
        type: "radio"
        label: "Code style"
        options:
          - { value: "clean", label: "Clean (reformatted)" }
          - { value: "literal", label: "Literal (line-by-line)" }
        default: "clean"
```

**Available field types:**

| Type | What it looks like |
|------|-------------------|
| `text` | Single line text box |
| `textarea` | Multi-line text box |
| `number` | Number input with optional min/max |
| `select` | Dropdown menu |
| `multi-select` | Dropdown where you can pick several |
| `radio` | Radio buttons (pick one) |
| `radio-cards` | Big cards with icons and descriptions (pick one) |
| `checkbox` | Single checkbox (yes/no) |
| `toggle` | On/off switch |
| `date` | Date picker |
| `code` | Code editor with syntax highlighting |

**What happens:** Each field value is stored in the context using the field's `id`. So `targetLanguage` becomes `context.targetLanguage`.

### 3. Info Step

Shows read-only information to the user. No inputs, just display.

```yaml
analysis_summary:
  type: "info"
  title: "Source Analysis Results"
  config:
    layout: "summary-cards"
    cards:
      - title: "Files Found"
        value: "{{context.analysisResult.fileCount}}"
      - title: "Total Lines"
        value: "{{context.analysisResult.totalLines}}"
      - title: "Estimated Time"
        value: "{{context.analysisResult.estimatedMinutes}} minutes"
```

### 4. Review Step

Shows a summary of everything the user has entered so far, so they can confirm before proceeding.

```yaml
confirm_settings:
  type: "review"
  title: "Review Your Settings"
  subtitle: "Please confirm everything looks correct"
  config:
    sections:
      - title: "Source Files"
        fields:
          - label: "Files uploaded"
            value: "{{context.uploadedFiles.length}} files"

      - title: "Target"
        fields:
          - label: "Language"
            value: "{{context.targetLanguage}}"
          - label: "Style"
            value: "{{context.outputStyle}}"
```

### 5. Job Step

Triggers a backend operation and shows progress while it runs.

```yaml
run_conversion:
  type: "job"
  title: "Converting Your Code..."
  config:
    endpoint: "/api/convert"
    method: "POST"
    bodyMapping:
      files: "{{context.uploadedFiles}}"
      target: "{{context.targetLanguage}}"
      style: "{{context.outputStyle}}"

    async: true
    pollingEndpoint: "/api/jobs/{{context.jobId}}/status"
    pollingIntervalMs: 2000
    timeoutMs: 300000
    resultKey: "conversionResult"

    autoAdvance: true
```

**What happens:** The framework sends the request, then polls the backend for progress. It shows a progress bar and status messages. When the job finishes, it stores the result in `context.conversionResult` and moves to the next step.

### 6. Diff-Review Step

Shows source and converted code side by side. The user can accept, reject, or edit each file.

```yaml
review_code:
  type: "diff-review"
  title: "Review Converted Code"
  config:
    sourceLabel: "Original (SAS)"
    targetLabel: "Converted (Python)"
    source: "{{context.conversionResult.files}}"
    diffMode: "side-by-side"
    syntaxHighlight: true
    allowEdit: true
```

### 7. Download Step

Lets the user download the results.

```yaml
get_results:
  type: "download"
  title: "Download Your Files"
  config:
    sources:
      - id: "code"
        label: "Converted Code"
        description: "All converted files in a ZIP archive"
        endpoint: "/api/download/{{context.conversionResult.jobId}}/code"
        format: "zip"
        primary: true

      - id: "report"
        label: "Conversion Report"
        description: "Summary of what was converted and any warnings"
        endpoint: "/api/download/{{context.conversionResult.jobId}}/report"
        format: "pdf"

    completionMessage: "All done! Your files are ready."
```

### 8. Selection Step

Shows a set of options as cards for the user to choose from.

```yaml
pick_platform:
  type: "selection"
  title: "Choose Target Platform"
  config:
    options:
      - value: "pandas"
        label: "Pandas"
        description: "Best for smaller datasets and quick analysis"
        icon: "table"

      - value: "pyspark"
        label: "PySpark"
        description: "Best for large-scale distributed processing"
        icon: "server"

      - value: "polars"
        label: "Polars"
        description: "Modern, fast, memory-efficient"
        icon: "bolt"
```

---

## Using Dynamic Values: The `{{...}}` Syntax

Anywhere in your config, you can use `{{...}}` to insert dynamic values. These are evaluated at runtime.

**Read a value the user entered earlier:**
```yaml
value: "{{context.targetLanguage}}"
```

**Read a value returned by the backend:**
```yaml
value: "{{context.conversionResult.stats.filesConverted}} files converted"
```

**Use a wizard-level variable:**
```yaml
endpoint: "{{variables.apiBaseUrl}}/convert"
```

**Use an environment variable:**
```yaml
endpoint: "{{env.API_URL}}/convert"
```

**Check a condition:**
```yaml
condition: "{{context.targetPlatform == 'pyspark'}}"
```

The rule is simple: whatever the user enters gets stored under its field `id` in `context`, and whatever the backend returns gets stored under the step's `resultKey` in `context`. You can read any of these values anywhere using `{{context.something}}`.

---

## Making Steps Conditional

Sometimes a step should only appear if the user made a certain choice. Use the `condition` field:

```yaml
configure_spark:
  type: "form"
  title: "Spark Settings"
  condition: "{{context.targetPlatform == 'pyspark'}}"
  config:
    fields:
      - id: "clusterSize"
        type: "select"
        label: "Cluster Size"
        options: ["small", "medium", "large"]
```

This step only appears if the user selected "pyspark" in an earlier step. Otherwise it is silently skipped.

You can also make individual **fields** conditional within a form:

```yaml
fields:
  - id: "sparkMaster"
    type: "text"
    label: "Spark Master URL"
    condition: "{{context.targetPlatform == 'pyspark'}}"
```

---

## Adding Validation

You can require fields and add validation rules:

**On a form field:**
```yaml
fields:
  - id: "email"
    type: "text"
    label: "Email"
    required: true                     # must not be empty

  - id: "maxRetries"
    type: "number"
    label: "Max Retries"
    min: 1
    max: 10
    default: 3
```

**On a step (custom rules):**
```yaml
upload_source:
  type: "upload"
  title: "Upload Files"
  validation:
    - rule: "minFiles"
      value: 1
      message: "Please upload at least one file"
    - rule: "maxFiles"
      value: 50
      message: "Maximum 50 files allowed"
```

The wizard will not let the user proceed to the next step until validation passes.

---

## Branching: Going to Different Steps Based on User Input

By default, steps run in order. But you can send the user to different steps based on their choices:

```yaml
choose_workflow:
  type: "selection"
  title: "What would you like to do?"
  config:
    options:
      - { value: "convert", label: "Convert Code" }
      - { value: "assess", label: "Assessment Only" }
      - { value: "migrate_data", label: "Migrate Data" }

  transition:
    rules:
      - condition: "{{context.workflow == 'convert'}}"
        goto: "upload_code"
      - condition: "{{context.workflow == 'assess'}}"
        goto: "upload_for_assessment"
      - condition: "{{context.workflow == 'migrate_data'}}"
        goto: "upload_data"
    default: "upload_code"
```

---

## Connecting to Your Backend

### Telling the wizard where your API lives

Set the base URL as a variable:

```yaml
wizard:
  variables:
    apiBaseUrl: "https://api.myapp.com/v1"
```

Then use it in step configs:

```yaml
config:
  endpoint: "{{variables.apiBaseUrl}}/convert"
```

For different environments (dev, staging, prod), use environment variables:

```yaml
wizard:
  variables:
    apiBaseUrl: "{{env.API_BASE_URL}}"
```

### What your backend needs to provide

The wizard calls your API. Your API needs to respond in a specific format.

**For synchronous calls** (upload analysis, metadata fetch):
```json
{
  "status": "ok",
  "data": { "fileCount": 12, "totalLines": 45000 }
}
```

**For async jobs** (conversions that take time):

Start the job:
```json
POST /api/convert  ->  { "jobId": "abc-123", "status": "pending" }
```

Check progress (the wizard polls this automatically):
```json
GET /api/jobs/abc-123/status  ->  {
  "status": "running",
  "progress": { "percent": 45, "message": "Converting file 3 of 12..." }
}
```

Get the result (when status is "completed"):
```json
GET /api/jobs/abc-123/result  ->  {
  "files": [...],
  "stats": { "filesConverted": 12, "successRate": 95.5 }
}
```

**For downloads:**
```
GET /api/download/abc-123/code  ->  (binary ZIP file)
```

### Authentication

If your API requires a token:

```yaml
wizard:
  auth:
    type: "bearer"
    tokenSource: "localStorage"
    tokenKey: "auth_token"
```

The wizard will automatically attach `Authorization: Bearer <token>` to every API call.

---

## Wizard Settings: Controlling Behavior

```yaml
wizard:
  settings:
    allowBackNavigation: true      # can the user click "Back"?
    allowStepJump: false           # can the user click on any step in the nav?
    persistState: true             # save progress so user can resume later?
    showProgressBar: true          # show the phase/step navigation?
    progressStyle: "steps"         # "steps" = numbered circles, "bar" = progress bar
```

---

## Theming: Changing Colors and Style

```yaml
wizard:
  theme:
    colors:
      primary: "#2563eb"           # buttons, active step indicator
      success: "#16a34a"           # completed steps, success messages
      error: "#dc2626"             # validation errors
      background: "#ffffff"        # page background
      text: "#1e293b"              # main text color
    borderRadius: "8px"            # rounded corners
    spacing: "comfortable"         # "compact", "comfortable", or "spacious"
```

---

## Testing Your Wizard Without a Backend

You can add mock responses to job steps so the wizard works without a real backend:

```yaml
run_conversion:
  type: "job"
  config:
    endpoint: "/api/convert"
    mock:
      enabled: true
      latencyMs: 3000              # simulate 3 seconds of processing
      progressSteps:
        - { at: 0, message: "Starting..." }
        - { at: 50, message: "Halfway there..." }
        - { at: 100, message: "Done!" }
      result:
        filesConverted: 5
        successRate: 100
```

When mock is enabled, the wizard skips the real API call and simulates the job locally.

---

## Complete Example: SAS to Python Converter

Here is a full wizard config for a realistic code conversion workflow:

```yaml
wizard:
  id: "sas-to-python"
  title: "SAS to Python Converter"
  description: "Convert your SAS programs to Python"

  variables:
    apiBaseUrl: "{{env.API_BASE_URL}}"

  settings:
    allowBackNavigation: true
    persistState: true
    showProgressBar: true
    progressStyle: "steps"

  phases:
    - id: "input"
      title: "Upload"
      steps: [upload_sas]

    - id: "configure"
      title: "Settings"
      steps: [pick_framework, set_options]

    - id: "convert"
      title: "Convert"
      steps: [run_conversion]

    - id: "results"
      title: "Results"
      steps: [review_code, download_output]

steps:
  upload_sas:
    type: "upload"
    title: "Upload SAS Files"
    subtitle: "Select your .sas programs"
    config:
      multiple: true
      accept: [".sas"]
      maxFiles: 100
      maxSizeMB: 500
      dropzoneText: "Drop .sas files here"
      showFileList: true
    validation:
      - rule: "minFiles"
        value: 1
        message: "Upload at least one SAS file"

  pick_framework:
    type: "selection"
    title: "Choose Python Framework"
    config:
      options:
        - value: "pandas"
          label: "Pandas"
          description: "Standard data analysis library"
        - value: "pyspark"
          label: "PySpark"
          description: "Apache Spark for big data"
        - value: "polars"
          label: "Polars"
          description: "Fast modern DataFrame library"

  set_options:
    type: "form"
    title: "Conversion Options"
    config:
      fields:
        - id: "pythonVersion"
          type: "select"
          label: "Python Version"
          options: ["3.9", "3.10", "3.11", "3.12"]
          default: "3.11"

        - id: "addTypeHints"
          type: "toggle"
          label: "Add type hints"
          default: true

        - id: "addDocstrings"
          type: "toggle"
          label: "Generate docstrings"
          default: true

        - id: "namingStyle"
          type: "radio"
          label: "Variable naming"
          options:
            - { value: "snake_case", label: "snake_case (PEP 8)" }
            - { value: "preserve", label: "Keep original names" }
          default: "snake_case"

  run_conversion:
    type: "job"
    title: "Converting Your Code..."
    config:
      endpoint: "{{variables.apiBaseUrl}}/convert"
      method: "POST"
      bodyMapping:
        files: "{{context.uploadedFiles}}"
        framework: "{{context.selectedOption}}"
        pythonVersion: "{{context.pythonVersion}}"
        typeHints: "{{context.addTypeHints}}"
        docstrings: "{{context.addDocstrings}}"
        naming: "{{context.namingStyle}}"

      async: true
      pollingEndpoint: "{{variables.apiBaseUrl}}/jobs/{{context.jobId}}/status"
      pollingIntervalMs: 2000
      timeoutMs: 600000
      resultKey: "conversionResult"
      autoAdvance: true

  review_code:
    type: "diff-review"
    title: "Review Converted Code"
    config:
      sourceLabel: "SAS (Original)"
      targetLabel: "Python (Converted)"
      source: "{{context.conversionResult.files}}"
      diffMode: "side-by-side"
      syntaxHighlight: true
      allowEdit: true

  download_output:
    type: "download"
    title: "Download Results"
    config:
      sources:
        - id: "code"
          label: "Python Code"
          endpoint: "{{variables.apiBaseUrl}}/download/{{context.conversionResult.jobId}}/code"
          format: "zip"
          primary: true

        - id: "report"
          label: "Conversion Report"
          endpoint: "{{variables.apiBaseUrl}}/download/{{context.conversionResult.jobId}}/report"
          format: "pdf"

      completionMessage: "Your SAS code has been converted to Python."
      completionActions:
        - label: "Convert More Files"
          action: "restart"
```

---

## Quick Reference: Checklist for Building a New Wizard

1. **Pick an ID** -- a short unique name like `"db2-to-postgres"`.
2. **List your phases** -- what are the big stages? Usually: Input, Configure, Run, Results.
3. **List your steps** -- what screens does the user see? Give each one an ID.
4. **Assign step types** -- is it an upload, a form, a job, a download? Pick from the built-in types.
5. **Write the config for each step** -- what fields, what options, what endpoints?
6. **Add conditions** -- should any steps be skipped based on earlier choices?
7. **Add validation** -- what is required? What are the limits?
8. **Set your variables** -- API base URL, file size limits, format lists.
9. **Test with mocks** -- add mock responses to job steps so you can test without a backend.
10. **Connect the real backend** -- swap mock mode off, point to real endpoints.

---

## Common Patterns

### Pattern: Upload then Analyze then Configure

```
upload -> [backend analyzes files] -> show analysis -> configure based on analysis -> convert
```

Trigger analysis on upload:
```yaml
upload_files:
  type: "upload"
  config:
    onUpload:
      endpoint: "/api/analyze"
      method: "POST"
      bodyMapping:
        files: "{{context.uploadedFiles}}"
      resultKey: "analysisResult"
```

Then use the analysis in later steps:
```yaml
show_analysis:
  type: "info"
  config:
    cards:
      - title: "Complexity"
        value: "{{context.analysisResult.complexity}}"
```

### Pattern: Conditional Steps Based on Source Type

```yaml
configure_spark:
  type: "form"
  condition: "{{context.targetPlatform == 'pyspark'}}"
  title: "Spark-Specific Settings"
  config:
    fields:
      - id: "clusterSize"
        type: "select"
        label: "Cluster Size"
        options: ["small", "medium", "large"]
```

### Pattern: Loop Back for Reconversion

```yaml
review_results:
  type: "diff-review"
  config:
    actions:
      - id: "reconvert"
        label: "Reconvert Selected"
        goto: "run_conversion"
```

### Pattern: Multiple Download Options

```yaml
download:
  type: "download"
  config:
    sources:
      - id: "code"
        label: "Code"
        format: "zip"
        primary: true
        endpoint: "/api/download/code"

      - id: "report"
        label: "Report"
        format: "pdf"
        endpoint: "/api/download/report"

      - id: "tests"
        label: "Test Suite"
        format: "zip"
        endpoint: "/api/download/tests"
        condition: "{{context.generateTests == true}}"
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Step does not appear | `condition` evaluates to false | Check the `{{...}}` expression and the value in context |
| "Next" button is disabled | Validation is failing | Check `required` fields and `validation` rules |
| Backend call fails | Wrong endpoint or missing auth | Check `apiBaseUrl`, `endpoint`, and `auth` config |
| Progress bar stuck | Polling endpoint not returning updates | Check `pollingEndpoint` and backend response format |
| Values from earlier steps are empty | Wrong context key | The key is the field `id`, e.g. `{{context.targetLanguage}}` |
| Step shows old data after going back | State not clearing on re-entry | This is by design -- user edits are preserved |
