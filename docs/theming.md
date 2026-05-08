# Theming

Customize the visual appearance of WizardForge wizards using the theme configuration and CSS custom properties.

## Theme Configuration

Define colors, typography, and spacing in your wizard config:

```yaml
wizard:
  theme:
    colors:
      primary: "#2563eb"          # Main action color (buttons, active indicators)
      primaryHover: "#1d4ed8"     # Primary color on hover
      success: "#16a34a"          # Success states (completed steps, job done)
      warning: "#d97706"          # Warning states
      error: "#dc2626"            # Error states (validation, job failure)
      background: "#ffffff"       # Card/container background
      surface: "#f8fafc"          # Page background, nav background
      text: "#1e293b"             # Primary text color
      textSecondary: "#64748b"    # Secondary/muted text
      border: "#e2e8f0"           # Borders, dividers, inactive elements
    borderRadius: "8px"           # Corner radius for cards, buttons, inputs
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    spacing: "comfortable"        # "compact" | "comfortable" | "spacious"
```

All fields are optional. Omitted values use the defaults shown above.

## CSS Custom Properties

Theme colors are mapped to CSS custom properties. You can override them directly in CSS without using the YAML config:

| Property | Default | Used For |
|----------|---------|----------|
| `--wf-primary` | `#2563eb` | Buttons, active step indicator, focus rings, selected cards |
| `--wf-primary-hover` | `#1d4ed8` | Button hover state |
| `--wf-success` | `#16a34a` | Completed steps, job success icon, done progress bar |
| `--wf-warning` | `#d97706` | Warning indicators |
| `--wf-error` | `#dc2626` | Error messages, required field marker, failed job icon |
| `--wf-background` | `#ffffff` | Wizard container, input backgrounds |
| `--wf-surface` | `#f8fafc` | Page background, nav bar, footer, dropzone |
| `--wf-text` | `#1e293b` | Headings, labels, primary text |
| `--wf-text-secondary` | `#64748b` | Subtitles, descriptions, hints, muted text |
| `--wf-border` | `#e2e8f0` | Borders, dividers, inactive toggles, progress track |
| `--wf-radius` | `8px` | Border radius for all rounded elements |
| `--wf-font` | `Inter, system-ui, ...` | Font family for all text |

## CSS Override Example

Override properties in your own stylesheet:

```css
:root {
  --wf-primary: #7c3aed;
  --wf-primary-hover: #6d28d9;
  --wf-success: #059669;
  --wf-radius: 12px;
  --wf-font: 'Poppins', sans-serif;
}
```

## Dark Theme Example

```yaml
theme:
  colors:
    primary: "#818cf8"
    primaryHover: "#6366f1"
    success: "#34d399"
    warning: "#fbbf24"
    error: "#f87171"
    background: "#1e1e2e"
    surface: "#181825"
    text: "#cdd6f4"
    textSecondary: "#a6adc8"
    border: "#313244"
```

Or in CSS:

```css
:root {
  --wf-primary: #818cf8;
  --wf-primary-hover: #6366f1;
  --wf-success: #34d399;
  --wf-warning: #fbbf24;
  --wf-error: #f87171;
  --wf-background: #1e1e2e;
  --wf-surface: #181825;
  --wf-text: #cdd6f4;
  --wf-text-secondary: #a6adc8;
  --wf-border: #313244;
}
```

## Class Naming Convention

All WizardForge CSS classes use the `wf-*` prefix to avoid conflicts with host application styles:

| Class Pattern | Element |
|---------------|---------|
| `.wf-wizard` | Root wizard container |
| `.wf-nav` | Navigation bar |
| `.wf-nav-phase` | Phase indicator button |
| `.wf-nav-phase--active` | Currently active phase |
| `.wf-nav-phase--completed` | Completed phase |
| `.wf-content` | Step content area |
| `.wf-footer` | Footer with navigation buttons |
| `.wf-btn` | Base button |
| `.wf-btn--primary` | Primary action button |
| `.wf-btn--secondary` | Secondary/back button |
| `.wf-form-*` | Form elements (input, select, radio, toggle) |
| `.wf-upload-*` | Upload step elements |
| `.wf-review-*` | Review step elements |
| `.wf-download-*` | Download step elements |
| `.wf-info-*` | Info step elements |
| `.wf-job-*` | Job step elements (progress, status, error) |

## Component Styling Details

### Progress Bar (Job Step)

```css
.wf-job-progress-track {
  /* Background track */
  height: 10px;
  background: var(--wf-border);
  border-radius: 5px;
}

.wf-job-progress-bar {
  /* Filled portion */
  background: var(--wf-primary);
  transition: width 0.4s ease;
}

.wf-job-progress-bar--done {
  /* Turns green on completion */
  background: var(--wf-success);
}
```

### Navigation Indicators

```css
.wf-nav-phase--active .wf-nav-indicator {
  background: var(--wf-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

.wf-nav-phase--completed .wf-nav-indicator {
  background: var(--wf-success);
}
```

### Selected Radio Card

```css
.wf-form-radio-option--selected {
  border-color: var(--wf-primary);
  box-shadow: 0 0 0 1px var(--wf-primary);
}
```

## Spacing

The `spacing` setting (planned) will control padding and gaps:

| Value | Description |
|-------|-------------|
| `compact` | Reduced padding and gaps — more content per screen |
| `comfortable` | Default balanced spacing |
| `spacious` | Increased padding and gaps — more breathing room |

## Animations

WizardForge includes subtle animations:

- **Step transitions:** `wf-fade-in` — 250ms fade + slide up on step change
- **Spinner:** `wf-spin` — 800ms continuous rotation on job step
- **Progress bar:** CSS transition — 400ms smooth width change

To disable animations:

```css
.wf-step-body { animation: none; }
.wf-job-spinner { animation: none; }
.wf-job-progress-bar { transition: none; }
```
