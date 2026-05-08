# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WizardForge is a config-driven wizard engine for code conversion and data modernization workflows (SAS-to-Python, DB2-to-PostgreSQL, Snowflake-to-Databricks, etc.). A single React component consumes a YAML/JSON config and renders a fully functional multi-step wizard. New conversion workflows are created by writing a config file, not new code.

**Current state:** specification only — no implementation code exists yet. The two spec documents in `specifications/` are the source of truth:
- `wizard-framework-spec.md` — full technical specification (architecture, schemas, plugin API, state machine, backend contracts)
- `wizardforge-user-guide.md` — practical guide for config authors

## Architecture (from spec)

**Component hierarchy:**
```
<WizardProvider config={config}>   — context provider + state store
  <WizardShell>                    — layout wrapper
    <WizardNav />                  — phase/step navigation, progress
    <WizardContent>
      <StepRenderer step={…} />   — resolves step type → React component
    </WizardContent>
    <WizardFooter />               — back/next/submit buttons
  </WizardShell>
</WizardProvider>
```

**Planned project structure:**
```
packages/
  core/src/          — framework engine (React components, hooks, expression engine, state machine, step registry)
  cli/               — config validation + scaffolding CLI
wizards/             — YAML/JSON config files for specific wizard instances
examples/            — integration examples (Next.js, Vite, migVisor)
```

## Key Design Decisions

- **Config over code:** standard wizards require zero React component authoring. All behavior is declared in YAML/JSON.
- **Expression engine** uses `{{...}}` template syntax — supports variable lookup, comparisons, null checks, nested access, array length, string interpolation. Deliberately does NOT support arbitrary JS, function calls, or imports.
- **Plugin system:** custom step types are registered via `StepTypePlugin` interface (component + validate + onEnter/onLeave hooks).
- **State is a single serializable store** (`WizardState`) — enables pause/resume, undo, debug. Persists to localStorage or backend.
- **Backend-agnostic:** the framework calls endpoints defined in config. Sync ops return `{ status, data }`. Async jobs use a submit → poll → result pattern with `jobId`.

## Built-in Step Types

`upload`, `form`, `info`, `review`, `job`, `diff-review`, `download`, `selection`, `confirmation`, `redirect`, `custom`

## Implementation Phases (from spec)

1. **Foundation (MVP):** WizardProvider, expression engine, StepRenderer, built-in types (form/info/upload/download), linear nav, config validation
2. **Backend Integration:** job step + polling, progress display, error handling + retry, auth, mock mode
3. **Advanced Features:** conditional transitions, diff-review, state persistence, review step, plugin API
4. **Polish:** theming, responsive layouts, a11y audit, CLI tooling, docs site, migVisor integration
