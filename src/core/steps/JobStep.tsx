import { useEffect, useRef } from 'react';
import type { StepProps, JobConfig, JobState as JobStateType } from '../types';
import { useWizard } from '../hooks/useWizard';
import { BackendService } from '../services/BackendService';
import { JobRunner } from '../services/JobRunner';

export function JobStep({ stepId, stepConfig, context, setContext, setStepValid }: StepProps) {
  const wizard = useWizard();
  const runnerRef = useRef<JobRunner | null>(null);

  const jobConfig = (stepConfig.config ?? {}) as unknown as JobConfig;
  const jobState: JobStateType = wizard.state.activeJobs[stepId] ?? {
    jobId: null,
    status: 'idle',
    progress: 0,
    retryCount: 0,
  };

  const isActive = jobState.status === 'submitting' || jobState.status === 'running' || jobState.status === 'pending';
  const isDone = jobState.status === 'completed';
  const isFailed = jobState.status === 'failed' || jobState.status === 'timeout';

  useEffect(() => {
    setStepValid(isDone);
  }, [isDone, setStepValid]);

  const doStartJob = () => {
    if (runnerRef.current) {
      runnerRef.current.cancel();
    }

    const backend = new BackendService(
      wizard.config.wizard.auth,
      wizard.config.wizard.settings?.retryPolicy,
    );

    const runner = new JobRunner({
      stepId,
      jobConfig,
      context: { ...context },
      variables: (wizard.config.wizard.variables as Record<string, unknown>) ?? {},
      backend,
      dispatch: wizard.dispatchJobAction,
      onComplete: (result) => {
        if (jobConfig.resultKey) {
          setContext(jobConfig.resultKey, result);
        }
        if (jobConfig.autoAdvance) {
          setTimeout(() => wizard.nextStep(), 600);
        }
      },
      onFail: () => {},
    });

    runnerRef.current = runner;
    runner.start();
  };

  useEffect(() => {
    if (jobState.status === 'idle') {
      doStartJob();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobState.status]);

  useEffect(() => {
    return () => {
      runnerRef.current?.cancel();
    };
  }, []);

  const handleRetry = () => {
    wizard.dispatchJobAction({ type: 'JOB_RESET', stepId });
  };

  const handleGoToFallback = () => {
    const fallback = jobConfig.onError?.fallbackStep;
    if (fallback) {
      wizard.goToStep(fallback);
    }
  };

  const maxRetries = jobConfig.onError?.maxRetries ?? 0;
  const canRetry = isFailed && jobConfig.onError?.retryable && jobState.retryCount < maxRetries;
  const hasFallback = !!jobConfig.onError?.fallbackStep;

  return (
    <div className="wf-step-body">
      <div className="wf-step-header">
        <h2 className="wf-step-title">{stepConfig.title}</h2>
        {stepConfig.subtitle && <p className="wf-step-subtitle">{stepConfig.subtitle}</p>}
      </div>

      <div className="wf-job">
        {/* Progress Bar */}
        {(isActive || isDone) && (
          <div className="wf-job-progress">
            <div className="wf-job-progress-track">
              <div
                className={`wf-job-progress-bar ${isDone ? 'wf-job-progress-bar--done' : ''}`}
                style={{ width: `${jobState.progress}%` }}
              />
            </div>
            <div className="wf-job-progress-label">
              {isDone ? '100' : Math.round(jobState.progress)}%
            </div>
          </div>
        )}

        {/* Status Message */}
        {isActive && (
          <div className="wf-job-status">
            <div className="wf-job-spinner" />
            <div className="wf-job-status-text">
              {jobState.message ?? 'Processing...'}
              {jobState.currentFile && (
                <span className="wf-job-current-file">{jobState.currentFile}</span>
              )}
            </div>
          </div>
        )}

        {/* Completed */}
        {isDone && (
          <div className="wf-job-done">
            <svg className="wf-job-done-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="wf-job-done-text">
              {jobState.message ?? 'Completed successfully'}
            </p>
          </div>
        )}

        {/* Error */}
        {isFailed && (
          <div className="wf-job-error">
            <svg className="wf-job-error-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="wf-job-error-text">{jobState.error ?? 'An error occurred'}</p>
            <div className="wf-job-error-actions">
              {canRetry && (
                <button className="wf-btn wf-btn--primary" onClick={handleRetry}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Retry ({maxRetries - jobState.retryCount} left)
                </button>
              )}
              {hasFallback && (
                <button className="wf-btn wf-btn--secondary" onClick={handleGoToFallback}>
                  Go Back to Settings
                </button>
              )}
            </div>
          </div>
        )}

        {/* Phase indicator */}
        {isActive && jobState.phase && (
          <div className="wf-job-phase">
            Phase: <strong>{jobState.phase}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
