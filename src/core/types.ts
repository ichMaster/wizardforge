import type { ComponentType } from 'react';

// ── Configuration types (parsed from YAML/JSON) ──

export interface WizardConfig {
  wizard: {
    id: string;
    version?: string;
    title: string;
    description?: string;
    settings?: WizardSettings;
    variables?: Record<string, unknown>;
    auth?: AuthConfig;
    theme?: ThemeConfig;
    phases: PhaseConfig[];
  };
  steps: Record<string, StepConfig>;
}

export interface WizardSettings {
  allowBackNavigation?: boolean;
  allowStepJump?: boolean;
  persistState?: boolean;
  persistKey?: string;
  showProgressBar?: boolean;
  progressStyle?: 'steps' | 'bar' | 'fraction' | 'none';
  retryPolicy?: RetryPolicy;
}

export interface PhaseConfig {
  id: string;
  title: string;
  steps: string[];
}

export interface StepConfig {
  type: string;
  title: string;
  subtitle?: string;
  required?: boolean;
  condition?: string;
  config?: Record<string, unknown>;
  validation?: ValidationRule[];
  transition?: TransitionConfig;
}

export interface ValidationRule {
  rule: string;
  value?: unknown;
  message: string;
}

export interface TransitionConfig {
  rules?: { condition: string; goto: string }[];
  default?: string;
}

export interface AuthConfig {
  type: 'bearer' | 'cookie' | 'api-key' | 'custom';
  tokenSource?: string;
  tokenKey?: string;
  headerName?: string;
  headerPrefix?: string;
}

export interface ThemeConfig {
  colors?: {
    primary?: string;
    primaryHover?: string;
    success?: string;
    warning?: string;
    error?: string;
    background?: string;
    surface?: string;
    text?: string;
    textSecondary?: string;
    border?: string;
  };
  borderRadius?: string;
  fontFamily?: string;
  spacing?: 'compact' | 'comfortable' | 'spacious';
}

// ── Job configuration (within step config) ──

export interface JobConfig {
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  bodyMapping?: Record<string, unknown>;
  async?: boolean;
  pollingEndpoint?: string;
  pollingIntervalMs?: number;
  timeoutMs?: number;
  resultKey?: string;
  progressSource?: 'polling';
  progressMapping?: {
    percent?: string;
    currentFile?: string;
    message?: string;
    phase?: string;
  };
  onError?: {
    retryable?: boolean;
    maxRetries?: number;
    fallbackStep?: string;
  };
  autoAdvance?: boolean;
  mock?: MockConfig;
}

export interface MockConfig {
  enabled: string | boolean;
  latencyMs?: number;
  progressSteps?: { at: number; message: string }[];
  result?: unknown;
}

export interface RetryPolicy {
  maxRetries?: number;
  backoffMs?: number[];
  retryableStatusCodes?: number[];
}

// ── Job runtime state ──

export type JobStatus = 'idle' | 'submitting' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface JobState {
  jobId: string | null;
  status: JobStatus;
  progress: number;
  message?: string;
  currentFile?: string;
  phase?: string;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

// ── Runtime state ──

export interface WizardState {
  currentStepId: string;
  stepHistory: string[];
  completedSteps: string[];
  skippedSteps: string[];
  context: Record<string, unknown>;
  artifacts: Artifact[];
  errors: Record<string, StepError[]>;
  stepValidity: Record<string, boolean>;
  activeJobs: Record<string, JobState>;
  startedAt: string;
  lastModifiedAt: string;
  wizardId: string;
  sessionId: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'uploaded' | 'generated';
  mimeType: string;
  size: number;
  stepId: string;
  url?: string;
  file?: File;
  metadata?: Record<string, unknown>;
}

export interface StepError {
  field?: string;
  message: string;
}

// ── Flattened step (resolved from phases) ──

export interface FlatStep {
  id: string;
  config: StepConfig;
  phaseId: string;
  phaseTitle: string;
  indexInPhase: number;
}

// ── Step component contract ──

export interface StepProps {
  stepId: string;
  stepConfig: StepConfig;
  isActive: boolean;
  context: Record<string, unknown>;
  setContext: (key: string, value: unknown) => void;
  getContext: (key: string) => unknown;
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => void;
  removeArtifact: (id: string) => void;
  setStepValid: (valid: boolean) => void;
  addError: (field: string, message: string) => void;
  clearErrors: () => void;
  resolveExpression: (expr: string) => unknown;
}

// ── Plugin system ──

export interface StepTypePlugin {
  type: string;
  component: ComponentType<StepProps>;
  validate?: (config: Record<string, unknown>, context: Record<string, unknown>) => ValidationResult;
  onEnter?: (config: Record<string, unknown>, context: Record<string, unknown>) => Promise<void>;
  onLeave?: (config: Record<string, unknown>, context: Record<string, unknown>) => Promise<void>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// ── Wizard context value (provided to consumers) ──

export interface WizardContextValue {
  config: WizardConfig;
  steps: FlatStep[];
  state: WizardState;

  currentStep: FlatStep;
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoBack: boolean;

  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepId: string) => void;

  setContext: (key: string, value: unknown) => void;
  getContext: (key: string) => unknown;

  addArtifact: (artifact: Artifact) => void;
  removeArtifact: (id: string) => void;

  setStepValid: (valid: boolean) => void;
  addError: (field: string, message: string) => void;
  clearErrors: () => void;

  resolveExpression: (expr: string) => unknown;

  dispatchJobAction: (action: JobAction) => void;
}

export type JobAction =
  | { type: 'JOB_START'; stepId: string; jobId: string }
  | { type: 'JOB_PROGRESS'; stepId: string; progress: number; message?: string; currentFile?: string; phase?: string }
  | { type: 'JOB_COMPLETE'; stepId: string; result: unknown }
  | { type: 'JOB_FAIL'; stepId: string; error: string }
  | { type: 'JOB_RESET'; stepId: string };
