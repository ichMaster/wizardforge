# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WizardForge is a config-driven wizard engine for code conversion and data modernization workflows (SAS-to-Python, DB2-to-PostgreSQL, Snowflake-to-Databricks, etc.). A single React component consumes a YAML/JSON config and renders a fully functional multi-step wizard. New conversion workflows are created by writing a config file, not new code.

**Current state:** Phase 1 (MVP) + Phase 2 (Backend Integration) implemented. Specifications in `specifications/` remain the source of truth for the full vision.

## Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Type-check + production build (outputs to dist/)
npx tsc --noEmit # Type-check only
```

## Architecture

**Component hierarchy:**
```
<WizardProvider config={config}>   — context provider + state store (React context + useReducer)
  <WizardShell>                    — layout wrapper, applies theme CSS vars
    <WizardNav />                  — phase/step navigation with progress indicators
    <StepRenderer />               — resolves step type → component via StepTypeRegistry
    <WizardFooter />               — back/next buttons, validates before advancing
  </WizardShell>
</WizardProvider>
```

**Source layout:**
```
src/
  core/                          — framework engine (importable as ./core)
    types.ts                     — all TypeScript interfaces (WizardConfig, WizardState, StepProps, JobState, etc.)
    ExpressionEngine.ts          — {{...}} template evaluator (comparisons, nested access, interpolation)
    ConfigLoader.ts              — YAML → WizardConfig parser with validation
    WizardProvider.tsx           — React context + reducer (single serializable state store)
    hooks/useWizard.ts           — consumer hook for wizard context
    registry/StepTypeRegistry.ts — singleton plugin registry (type string → component)
    components/                  — shell components (WizardShell, WizardNav, WizardFooter, StepRenderer)
    steps/                       — built-in step types (UploadStep, FormStep, InfoStep, ReviewStep, DownloadStep, JobStep)
    services/
      BackendService.ts          — fetch wrapper with auth header injection, retry + exponential backoff
      JobRunner.ts               — job submission, polling loop, mock mode simulation
    index.ts                     — public API + registerBuiltInSteps()
  wizards/                       — YAML wizard configs (loaded via ?raw Vite import)
  styles/wizard.css              — all styles, uses .wf-* prefix, CSS vars for theming
  App.tsx                        — demo app that loads file-converter.yaml
  main.tsx                       — entry point, calls registerBuiltInSteps() before render
specifications/                  — full spec docs (framework spec + user guide)
```

## Key Design Decisions

- **Config over code:** standard wizards require zero React component authoring. All behavior is declared in YAML/JSON.
- **Expression engine** uses `{{...}}` template syntax — supports variable lookup, comparisons, null checks, nested access, array length, string interpolation. Deliberately does NOT support arbitrary JS, function calls, or imports.
- **Plugin system:** custom step types are registered via `StepTypePlugin` interface (component + validate + onEnter/onLeave hooks) in the singleton `StepTypeRegistry`.
- **State is a single serializable store** (`WizardState` in WizardProvider) managed via `useReducer`. All step data accumulates in `state.context` keyed by field IDs.
- **CSS class prefix:** all classes use `wf-*` to avoid conflicts with host apps. Theme colors are injected as CSS custom properties (`--wf-primary`, etc.).

## Built-in Step Types

| Type | Component | What it does |
|------|-----------|-------------|
| `upload` | UploadStep | Drag-drop file upload, stores artifacts |
| `form` | FormStep | Dynamic fields (text, select, radio-cards, toggle, etc.) |
| `info` | InfoStep | Read-only cards/text display |
| `review` | ReviewStep | Summary of collected context data |
| `download` | DownloadStep | Download cards with links |
| `job` | JobStep | Async backend job with progress polling, retry, mock mode |

## Backend Integration (Phase 2)

- **BackendService** handles all API calls — auto-injects auth headers (bearer/cookie/api-key from wizard config), retries transient failures with exponential backoff.
- **JobRunner** manages the full job lifecycle: submit → poll → complete/fail. Supports mock mode for development (configurable via `mock.enabled` in step config).
- **Job step config** declares `endpoint`, `bodyMapping` (with `{{...}}` expression resolution), `pollingEndpoint`, `pollingIntervalMs`, `timeoutMs`, `resultKey`, `progressMapping`, `onError` (retryable + fallbackStep), `autoAdvance`, and `mock`.
- Job state is tracked in `WizardState.activeJobs` keyed by step ID. Footer navigation hides during active jobs.
- **RetryPolicy** is configurable globally (`wizard.settings.retryPolicy`) and per-step (`config.onError`).

## Implementation Status

1. **Phase 1 (MVP)** — done: WizardProvider, expression engine, StepRenderer, built-in types (form/info/upload/download/review), linear nav, config validation, theming
2. **Phase 2 (Backend Integration)** — done: `job` step type with polling, async progress, error handling + retry, auth header injection, mock backend mode
3. **Phase 3 (Advanced Features)** — not started: conditional transitions + skip logic, `diff-review` step, state persistence + resume, `selection`/`confirmation` steps, custom step plugin API
4. **Phase 4 (Polish)** — not started: responsive layouts, a11y audit, CLI tooling, docs site
