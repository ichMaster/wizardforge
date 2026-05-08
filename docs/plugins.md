# Plugin Guide

Build custom step types and register them with the WizardForge engine.

## Overview

WizardForge uses a plugin registry to map step type strings (from YAML config) to React components. The six built-in types (`upload`, `form`, `info`, `review`, `download`, `job`) are registered at startup. You can add your own.

## Registering a Custom Step Type

### 1. Create the component

Your component receives `StepProps` — the standard interface that gives you access to context, validation, artifacts, and expressions:

```tsx
import type { StepProps } from './core/types';

function MappingEditorStep({
  stepId,
  stepConfig,
  context,
  setContext,
  setStepValid,
  resolveExpression,
}: StepProps) {
  const config = stepConfig.config as {
    sourceSchema: string;
    targetSchema: string;
  };

  const sourceSchema = resolveExpression(config.sourceSchema);
  const targetSchema = resolveExpression(config.targetSchema);

  // Your custom UI...
  return (
    <div className="wf-step-body">
      <div className="wf-step-header">
        <h2 className="wf-step-title">{stepConfig.title}</h2>
      </div>
      {/* Custom content */}
    </div>
  );
}
```

### 2. Register it

```tsx
import { StepTypeRegistry } from './core';

StepTypeRegistry.register({
  type: 'mapping-editor',
  component: MappingEditorStep,
});
```

Register before the app renders — typically in `main.tsx` alongside `registerBuiltInSteps()`:

```tsx
import { registerBuiltInSteps, StepTypeRegistry } from './core';
import { MappingEditorStep } from './custom/MappingEditorStep';

registerBuiltInSteps();
StepTypeRegistry.register({
  type: 'mapping-editor',
  component: MappingEditorStep,
});
```

### 3. Use it in config

```yaml
steps:
  map_columns:
    type: "mapping-editor"
    title: "Map Source to Target Columns"
    config:
      sourceSchema: "{{context.analysisResult.schema}}"
      targetSchema: "{{variables.targetSchema}}"
```

## StepProps Interface

Every step component receives these props:

```typescript
interface StepProps {
  stepId: string;                    // Unique step identifier
  stepConfig: StepConfig;            // Full step config from YAML
  isActive: boolean;                 // Whether this step is currently displayed

  // Context (shared state)
  context: Record<string, unknown>;  // All accumulated wizard data
  setContext: (key: string, value: unknown) => void;  // Write to context
  getContext: (key: string) => unknown;               // Read from context

  // Artifacts (files)
  artifacts: Artifact[];             // All artifacts across steps
  addArtifact: (artifact: Artifact) => void;
  removeArtifact: (id: string) => void;

  // Validation
  setStepValid: (valid: boolean) => void;    // Control Next button enabled state
  addError: (field: string, message: string) => void;
  clearErrors: () => void;

  // Expressions
  resolveExpression: (expr: string) => unknown;  // Evaluate {{...}} templates
}
```

### Key Methods

#### `setContext(key, value)`

Write data to the shared context. This is how your step communicates results to downstream steps:

```tsx
// Store a simple value
setContext('mappingResult', mappings);

// Store a complex object
setContext('analysis', {
  schema: columns,
  rowCount: 1500,
  warnings: [],
});
```

#### `setStepValid(valid)`

Controls whether the "Next" button is enabled. Call this whenever your step's validity changes:

```tsx
useEffect(() => {
  const isComplete = mappings.length > 0 && mappings.every(m => m.target);
  setStepValid(isComplete);
}, [mappings, setStepValid]);
```

#### `resolveExpression(expr)`

Evaluate `{{...}}` template strings against the current context:

```tsx
const endpoint = resolveExpression(config.endpoint) as string;
const schema = resolveExpression(config.sourceSchema) as Record<string, unknown>;
```

### Reading Step Config

Your step's YAML `config` block is available as `stepConfig.config`:

```yaml
# YAML
steps:
  my_step:
    type: "my-custom"
    title: "Custom Step"
    config:
      apiUrl: "{{variables.apiBaseUrl}}/analyze"
      maxItems: 50
      showPreview: true
```

```tsx
// Component
const config = stepConfig.config as {
  apiUrl: string;
  maxItems: number;
  showPreview: boolean;
};

const apiUrl = resolveExpression(config.apiUrl) as string;
// config.maxItems → 50
// config.showPreview → true
```

## StepTypePlugin Interface

The full plugin interface supports optional lifecycle hooks:

```typescript
interface StepTypePlugin {
  type: string;                          // Unique type identifier
  component: ComponentType<StepProps>;   // React component

  // Optional: validate step config at load time
  validate?: (
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ) => ValidationResult;

  // Optional: called when step becomes active (planned)
  onEnter?: (
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ) => Promise<void>;

  // Optional: called when leaving the step (planned)
  onLeave?: (
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ) => Promise<void>;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
```

**Note:** `onEnter` and `onLeave` hooks are defined in the type system but not yet called by the framework (planned for Phase 3).

## Registry API

```typescript
// Register a step type
StepTypeRegistry.register(plugin: StepTypePlugin): void

// Unregister a step type
StepTypeRegistry.unregister(type: string): void

// Check if a type is registered
StepTypeRegistry.has(type: string): boolean

// Get a registered plugin
StepTypeRegistry.get(type: string): StepTypePlugin | undefined

// Get all registered plugins
StepTypeRegistry.getAll(): Map<string, StepTypePlugin>
```

## Accessing the Wizard Context

For advanced use cases, your component can access the full wizard context via the `useWizard` hook:

```tsx
import { useWizard } from './core/hooks/useWizard';

function MyCustomStep(props: StepProps) {
  const wizard = useWizard();

  // Full access to:
  wizard.config;           // WizardConfig
  wizard.state;            // WizardState (context, activeJobs, artifacts, etc.)
  wizard.steps;            // FlatStep[] (all steps)
  wizard.currentStep;      // Current FlatStep
  wizard.nextStep();       // Navigate forward
  wizard.prevStep();       // Navigate back
  wizard.goToStep(id);     // Jump to specific step
  wizard.dispatchJobAction(action);  // Dispatch job state changes
}
```

## Styling Custom Steps

Follow the `wf-*` naming convention for your CSS classes:

```css
.wf-mapping-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.wf-mapping-editor-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--wf-surface);
  border: 1px solid var(--wf-border);
  border-radius: var(--wf-radius);
}
```

Use the CSS custom properties (`--wf-primary`, `--wf-border`, etc.) so your step inherits the wizard's theme.

## Example: Code Editor Step

A custom step that displays a code editor:

```tsx
import { useEffect, useState } from 'react';
import type { StepProps } from './core/types';

export function CodeEditorStep({
  stepConfig,
  context,
  setContext,
  setStepValid,
  resolveExpression,
}: StepProps) {
  const config = stepConfig.config as {
    language: string;
    sourceKey: string;
    resultKey: string;
  };

  const sourceCode = resolveExpression(config.sourceKey) as string ?? '';
  const [code, setCode] = useState(sourceCode);

  useEffect(() => {
    setContext(config.resultKey, code);
    setStepValid(code.trim().length > 0);
  }, [code, config.resultKey, setContext, setStepValid]);

  return (
    <div className="wf-step-body">
      <div className="wf-step-header">
        <h2 className="wf-step-title">{stepConfig.title}</h2>
        {stepConfig.subtitle && <p className="wf-step-subtitle">{stepConfig.subtitle}</p>}
      </div>
      <textarea
        className="wf-form-textarea"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={20}
        style={{ fontFamily: 'monospace' }}
      />
    </div>
  );
}
```

Register and use:

```tsx
StepTypeRegistry.register({ type: 'code-editor', component: CodeEditorStep });
```

```yaml
steps:
  edit_code:
    type: "code-editor"
    title: "Edit Generated Code"
    config:
      language: "python"
      sourceKey: "{{context.conversionResult.code}}"
      resultKey: "editedCode"
```
