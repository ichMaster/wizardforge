# Getting Started

## Installation

```bash
git clone <repo-url>
cd wizardforge
npm install
```

## Running the Dev Server

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173) with the demo file-converter wizard.

## Creating Your First Wizard

A wizard is defined entirely in a YAML config file. No React code required.

### 1. Create a config file

Create `src/wizards/my-wizard.yaml`:

```yaml
wizard:
  id: "my-wizard"
  title: "My First Wizard"
  description: "A simple two-step wizard"

  phases:
    - id: "input"
      title: "Input"
      steps: [get_name]
    - id: "done"
      title: "Done"
      steps: [show_greeting]

steps:
  get_name:
    type: "form"
    title: "What's your name?"
    config:
      fields:
        - id: "userName"
          type: "text"
          label: "Your Name"
          required: true
          placeholder: "Enter your name"

  show_greeting:
    type: "info"
    title: "Hello!"
    config:
      text: "Welcome, {{context.userName}}!"
```

### 2. Load the config in your app

Edit `src/App.tsx` to load your config:

```tsx
import configYaml from './wizards/my-wizard.yaml?raw';
```

The `?raw` suffix is a Vite import that loads the file as a string. The `loadConfigFromYaml()` function parses it into a typed `WizardConfig` object.

### 3. That's it

The wizard renders automatically — form fields, navigation, validation, and the expression `{{context.userName}}` resolves to whatever the user typed.

## Config File Structure

Every wizard config has two top-level keys:

```yaml
wizard:           # Wizard metadata, settings, phases
  id: "..."
  title: "..."
  phases: [...]

steps:            # Step definitions, keyed by ID
  step_id:
    type: "..."
    title: "..."
    config: {...}
```

**Phases** group steps into logical sections shown in the navigation bar. **Steps** define what each screen does — upload files, fill out forms, run backend jobs, display results, etc.

See [Configuration Reference](configuration-reference.md) for the complete schema.

## Available Step Types

| Type | Purpose |
|------|---------|
| `upload` | File upload with drag-and-drop |
| `form` | Dynamic form fields (text, select, radio, toggle, etc.) |
| `info` | Read-only display (cards, text) |
| `review` | Summary of collected data |
| `job` | Async backend job with progress tracking |
| `download` | Download links for generated artifacts |

See [Step Types Reference](step-types.md) for full configuration options.

## Key Concepts

### Context

Every wizard maintains a **context** — a key-value store that accumulates data as the user progresses through steps. Form fields write to context using their `id` as the key. Other steps can read context values using `{{context.fieldId}}` expressions.

### Expressions

The `{{...}}` template syntax lets you reference context values, wizard variables, and environment variables anywhere in your config:

```yaml
value: "{{context.outputFormat}}"
condition: "{{context.fileCount > 0}}"
endpoint: "{{variables.apiBaseUrl}}/convert"
```

See [Expression Engine](expressions.md) for the full syntax.

### Phases vs Steps

- **Phases** are visual groupings shown in the navigation bar (Upload, Settings, Review, etc.)
- **Steps** are individual screens within phases
- A phase can contain one or more steps
- Navigation is linear: phases and steps execute in array order

## Project Structure

```
src/
  core/                    — Framework engine
    types.ts               — TypeScript interfaces
    ExpressionEngine.ts    — {{...}} template evaluator
    ConfigLoader.ts        — YAML parser + validation
    WizardProvider.tsx      — React context + state management
    components/            — Shell UI components
    steps/                 — Built-in step type components
    services/              — Backend service + job runner
  wizards/                 — Your YAML wizard configs go here
  styles/wizard.css        — All styles (customizable via CSS vars)
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Type-check + production build to `dist/` |
| `npx tsc --noEmit` | Type-check only |

## Next Steps

- [Configuration Reference](configuration-reference.md) — full YAML schema
- [Step Types Reference](step-types.md) — detailed step type docs
- [Backend Integration](backend-integration.md) — job steps, auth, retry, mock mode
- [Expression Engine](expressions.md) — template syntax
- [Theming](theming.md) — colors, fonts, spacing
- [Plugin Guide](plugins.md) — building custom step types
