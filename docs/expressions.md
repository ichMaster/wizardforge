# Expression Engine

The `{{...}}` template syntax used throughout WizardForge configurations.

## Overview

Expressions let you reference dynamic values anywhere in your wizard config — step titles, field conditions, API endpoints, review displays, and more. They are evaluated at runtime against the current wizard state.

## Syntax

### Variable Lookup

Access values from context, variables, or environment:

```yaml
# Context — data collected from user input
value: "{{context.outputFormat}}"
value: "{{context.uploadedFiles.length}}"

# Variables — constants defined in wizard config
endpoint: "{{variables.apiBaseUrl}}/convert"

# Environment — browser environment
enabled: "{{env.NODE_ENV}}"
```

### Nested Access

Dot notation for deep property access:

```yaml
value: "{{context.conversionResult.stats.filesConverted}}"
value: "{{context.options.naming}}"
```

### String Interpolation

Mix expressions with static text:

```yaml
message: "Converting {{context.uploadedFiles.length}} files to {{context.outputFormat}}"
subtitle: "Step {{currentStep}} of {{totalSteps}}"
```

When a template contains `{{...}}` mixed with other text, expressions are resolved and interpolated as strings.

### Standalone Expressions

When the entire value is a single `{{...}}` expression, it returns the raw resolved type (number, boolean, array, object), not a string:

```yaml
# Returns boolean true/false, not string "true"/"false"
enabled: "{{context.prettyPrint}}"

# Returns number, not string
max: "{{variables.maxUploadSizeMB}}"

# Returns array
files: "{{context.uploadedFiles}}"
```

## Comparisons

```yaml
# Equality
condition: "{{context.platform == 'pandas'}}"
condition: "{{context.fileCount == 0}}"

# Inequality
condition: "{{context.platform != 'pyspark'}}"

# Numeric comparisons
condition: "{{context.fileCount > 10}}"
condition: "{{context.fileCount >= 5}}"
condition: "{{context.size < 100}}"
condition: "{{context.size <= 50}}"
```

Comparisons return `true` or `false`.

## Supported Value Types

Within expressions, the right-hand side of comparisons can be:

| Type | Syntax | Example |
|------|--------|---------|
| String | Single or double quotes | `'pandas'`, `"csv"` |
| Number | Digits, optional decimal | `10`, `3.14` |
| Boolean | `true` or `false` | `true` |
| Null | `null` | `null` |
| Undefined | `undefined` | `undefined` |

## Namespaces

### `context.*`

User-collected data. Each form field writes to `context[field.id]`. Upload steps write `context.uploadedFiles`. Job steps write `context[resultKey]`.

```yaml
value: "{{context.outputFormat}}"          # Form field value
value: "{{context.uploadedFiles.length}}"  # Number of uploaded files
value: "{{context.conversionResult}}"      # Job result object
```

### `variables.*`

Constants defined in the wizard config's `variables` block:

```yaml
# In wizard config
variables:
  apiBaseUrl: "https://api.example.com"
  maxUploadSizeMB: 100

# In step config
endpoint: "{{variables.apiBaseUrl}}/convert"
maxSizeMB: "{{variables.maxUploadSizeMB}}"
```

### `env.*`

Environment variables. Useful for conditional logic based on environment:

```yaml
enabled: "{{env.NODE_ENV == 'development'}}"
```

## Where Expressions Are Used

| Location | Example |
|----------|---------|
| Step title/subtitle | `title: "Converting {{context.fileName}}"` |
| Form field condition | `condition: "{{context.platform == 'pyspark'}}"` |
| Form field default | `default: "{{variables.defaultEncoding}}"` |
| Review field value | `value: "{{context.outputFormat}}"` |
| Info card value | `value: "{{context.uploadedFiles.length}}"` |
| Info text | `text: "Welcome, {{context.userName}}!"` |
| Job endpoint | `endpoint: "{{variables.apiBaseUrl}}/convert"` |
| Job polling URL | `pollingEndpoint: "{{variables.apiBaseUrl}}/jobs/{{context.jobId}}/status"` |
| Job body mapping | `files: "{{context.uploadedFiles}}"` |
| Mock enabled | `enabled: "{{env.NODE_ENV == 'development'}}"` |
| Download endpoint | `endpoint: "/api/download/{{context.jobId}}/output"` |
| Download condition | `condition: "{{context.conversionResult.warnings > 0}}"` |
| Completion message | `completionMessage: "Converted {{context.conversionResult.filesConverted}} files!"` |

## Null Handling

When a referenced value is `null` or `undefined`:

- **Standalone expression:** returns `null` or `undefined`
- **String interpolation:** renders as empty string `""`
- **Comparison:** `{{context.value != null}}` evaluates correctly
- **Review/Info display:** shown as `—` (dash)

## Limitations

The expression engine deliberately does NOT support:

- Function calls (`{{Math.round(value)}}`)
- Arbitrary JavaScript (`{{value ? 'a' : 'b'}}`)
- Logical operators (`&&`, `||`, `!`)
- Arithmetic (`+`, `-`, `*`, `/`)
- Import statements
- Template literals

This is a security-conscious design decision. Wizard configs may come from external sources, so the expression engine only supports safe, declarative lookups and comparisons.
