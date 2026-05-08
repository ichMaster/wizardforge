import {
  createContext,
  useReducer,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  WizardConfig,
  WizardState,
  WizardContextValue,
  FlatStep,
  Artifact,
  JobAction,
} from './types';
import { ExpressionEngine } from './ExpressionEngine';

// ── Actions ──

type Action =
  | { type: 'NEXT_STEP'; nextStepId: string }
  | { type: 'PREV_STEP'; prevStepId: string }
  | { type: 'GO_TO_STEP'; stepId: string }
  | { type: 'SET_CONTEXT'; key: string; value: unknown }
  | { type: 'SET_STEP_VALID'; stepId: string; valid: boolean }
  | { type: 'ADD_ERROR'; stepId: string; field: string; message: string }
  | { type: 'CLEAR_ERRORS'; stepId: string }
  | { type: 'ADD_ARTIFACT'; artifact: Artifact }
  | { type: 'REMOVE_ARTIFACT'; id: string }
  | JobAction;

// ── Reducer ──

function wizardReducer(state: WizardState, action: Action): WizardState {
  const now = new Date().toISOString();
  switch (action.type) {
    case 'NEXT_STEP':
      return {
        ...state,
        currentStepId: action.nextStepId,
        stepHistory: [...state.stepHistory, state.currentStepId],
        completedSteps: state.completedSteps.includes(state.currentStepId)
          ? state.completedSteps
          : [...state.completedSteps, state.currentStepId],
        errors: { ...state.errors, [state.currentStepId]: [] },
        lastModifiedAt: now,
      };

    case 'PREV_STEP':
      return {
        ...state,
        currentStepId: action.prevStepId,
        stepHistory: state.stepHistory.slice(0, -1),
        lastModifiedAt: now,
      };

    case 'GO_TO_STEP':
      return {
        ...state,
        currentStepId: action.stepId,
        stepHistory: [...state.stepHistory, state.currentStepId],
        lastModifiedAt: now,
      };

    case 'SET_CONTEXT':
      return {
        ...state,
        context: { ...state.context, [action.key]: action.value },
        lastModifiedAt: now,
      };

    case 'SET_STEP_VALID':
      return {
        ...state,
        stepValidity: { ...state.stepValidity, [action.stepId]: action.valid },
      };

    case 'ADD_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.stepId]: [
            ...(state.errors[action.stepId] ?? []),
            { field: action.field, message: action.message },
          ],
        },
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: { ...state.errors, [action.stepId]: [] },
      };

    case 'ADD_ARTIFACT':
      return {
        ...state,
        artifacts: [...state.artifacts, action.artifact],
        lastModifiedAt: now,
      };

    case 'REMOVE_ARTIFACT':
      return {
        ...state,
        artifacts: state.artifacts.filter((a) => a.id !== action.id),
        lastModifiedAt: now,
      };

    case 'JOB_START':
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.stepId]: {
            jobId: action.jobId,
            status: 'submitting',
            progress: 0,
            retryCount: 0,
            startedAt: now,
          },
        },
        lastModifiedAt: now,
      };

    case 'JOB_PROGRESS': {
      const existing = state.activeJobs[action.stepId];
      if (!existing) return state;
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.stepId]: {
            ...existing,
            status: 'running',
            progress: action.progress,
            message: action.message,
            currentFile: action.currentFile,
            phase: action.phase,
          },
        },
        lastModifiedAt: now,
      };
    }

    case 'JOB_COMPLETE': {
      const existing = state.activeJobs[action.stepId];
      if (!existing) return state;
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.stepId]: {
            ...existing,
            status: 'completed',
            progress: 100,
            result: action.result,
            completedAt: now,
          },
        },
        lastModifiedAt: now,
      };
    }

    case 'JOB_FAIL': {
      const existing = state.activeJobs[action.stepId];
      if (!existing) return state;
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.stepId]: {
            ...existing,
            status: 'failed',
            error: action.error,
            completedAt: now,
          },
        },
        lastModifiedAt: now,
      };
    }

    case 'JOB_RESET':
      return {
        ...state,
        activeJobs: {
          ...state.activeJobs,
          [action.stepId]: {
            jobId: null,
            status: 'idle',
            progress: 0,
            retryCount: (state.activeJobs[action.stepId]?.retryCount ?? 0) + 1,
          },
        },
        lastModifiedAt: now,
      };

    default:
      return state;
  }
}

// ── Helpers ──

function flattenSteps(config: WizardConfig): FlatStep[] {
  const result: FlatStep[] = [];
  for (const phase of config.wizard.phases) {
    phase.steps.forEach((stepId, index) => {
      const stepConfig = config.steps[stepId];
      if (!stepConfig) return;
      result.push({
        id: stepId,
        config: stepConfig,
        phaseId: phase.id,
        phaseTitle: phase.title,
        indexInPhase: index,
      });
    });
  }
  return result;
}

function generateSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialState(config: WizardConfig, steps: FlatStep[]): WizardState {
  const now = new Date().toISOString();
  return {
    currentStepId: steps[0]?.id ?? '',
    stepHistory: [],
    completedSteps: [],
    skippedSteps: [],
    context: {},
    artifacts: [],
    errors: {},
    stepValidity: {},
    activeJobs: {},
    startedAt: now,
    lastModifiedAt: now,
    wizardId: config.wizard.id,
    sessionId: generateSessionId(),
  };
}

// ── Context ──

export const WizardContext = createContext<WizardContextValue | null>(null);

// ── Provider ──

interface WizardProviderProps {
  config: WizardConfig;
  children: ReactNode;
}

export function WizardProvider({ config, children }: WizardProviderProps) {
  const steps = useMemo(() => flattenSteps(config), [config]);

  const [state, dispatch] = useReducer(
    wizardReducer,
    { config, steps },
    ({ config, steps }) => createInitialState(config, steps),
  );

  const expressionEngine = useMemo(
    () =>
      new ExpressionEngine(
        (config.wizard.variables as Record<string, unknown>) ?? {},
        {},
      ),
    [config],
  );

  const currentStepIndex = steps.findIndex((s) => s.id === state.currentStepId);
  const currentStep = steps[currentStepIndex]!;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const canGoBack =
    (config.wizard.settings?.allowBackNavigation !== false) && !isFirstStep;

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      dispatch({ type: 'NEXT_STEP', nextStepId: steps[currentStepIndex + 1]!.id });
    }
  }, [currentStepIndex, steps]);

  const prevStep = useCallback(() => {
    const prevId = state.stepHistory[state.stepHistory.length - 1];
    if (prevId) {
      dispatch({ type: 'PREV_STEP', prevStepId: prevId });
    }
  }, [state.stepHistory]);

  const goToStep = useCallback((stepId: string) => {
    dispatch({ type: 'GO_TO_STEP', stepId });
  }, []);

  const setContext = useCallback((key: string, value: unknown) => {
    dispatch({ type: 'SET_CONTEXT', key, value });
  }, []);

  const getContext = useCallback(
    (key: string) => state.context[key],
    [state.context],
  );

  const addArtifact = useCallback((artifact: Artifact) => {
    dispatch({ type: 'ADD_ARTIFACT', artifact });
  }, []);

  const removeArtifact = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ARTIFACT', id });
  }, []);

  const setStepValid = useCallback(
    (valid: boolean) => {
      dispatch({ type: 'SET_STEP_VALID', stepId: state.currentStepId, valid });
    },
    [state.currentStepId],
  );

  const addError = useCallback(
    (field: string, message: string) => {
      dispatch({ type: 'ADD_ERROR', stepId: state.currentStepId, field, message });
    },
    [state.currentStepId],
  );

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS', stepId: state.currentStepId });
  }, [state.currentStepId]);

  const dispatchJobAction = useCallback((action: JobAction) => {
    dispatch(action);
  }, []);

  const resolveExpression = useCallback(
    (expr: string) => expressionEngine.resolve(expr, state.context as Record<string, unknown>),
    [expressionEngine, state.context],
  );

  const value: WizardContextValue = useMemo(
    () => ({
      config,
      steps,
      state,
      currentStep,
      currentStepIndex,
      totalSteps: steps.length,
      isFirstStep,
      isLastStep,
      canGoBack,
      nextStep,
      prevStep,
      goToStep,
      setContext,
      getContext,
      addArtifact,
      removeArtifact,
      setStepValid,
      addError,
      clearErrors,
      resolveExpression,
      dispatchJobAction,
    }),
    [
      config, steps, state, currentStep, currentStepIndex,
      isFirstStep, isLastStep, canGoBack,
      nextStep, prevStep, goToStep,
      setContext, getContext,
      addArtifact, removeArtifact,
      setStepValid, addError, clearErrors,
      resolveExpression, dispatchJobAction,
    ],
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}
