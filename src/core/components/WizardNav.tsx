import { useMemo } from 'react';
import { useWizard } from '../hooks/useWizard';

interface PhaseInfo {
  id: string;
  title: string;
  stepIds: string[];
  status: 'completed' | 'active' | 'upcoming';
}

export function WizardNav() {
  const { config, state, steps, currentStepIndex, goToStep } = useWizard();

  const settings = config.wizard.settings;
  if (settings?.showProgressBar === false || settings?.progressStyle === 'none') {
    return null;
  }

  const phases: PhaseInfo[] = useMemo(() => {
    return config.wizard.phases.map((phase) => {
      const allCompleted = phase.steps.every((s) =>
        state.completedSteps.includes(s),
      );
      const hasCurrent = phase.steps.includes(state.currentStepId);
      return {
        id: phase.id,
        title: phase.title,
        stepIds: phase.steps,
        status: allCompleted ? 'completed' : hasCurrent ? 'active' : 'upcoming',
      };
    });
  }, [config.wizard.phases, state.completedSteps, state.currentStepId]);

  const allowJump = settings?.allowStepJump === true;

  return (
    <nav className="wf-nav" aria-label="Wizard progress">
      <ol className="wf-nav-phases">
        {phases.map((phase, i) => (
          <li key={phase.id} className="wf-nav-phase-wrapper">
            {i > 0 && (
              <div
                className={`wf-nav-connector ${
                  phase.status === 'completed' || phase.status === 'active'
                    ? 'wf-nav-connector--done'
                    : ''
                }`}
              />
            )}
            <button
              className={`wf-nav-phase wf-nav-phase--${phase.status}`}
              disabled={!allowJump && phase.status === 'upcoming'}
              onClick={() => {
                if (allowJump || phase.status !== 'upcoming') {
                  const targetId = phase.stepIds[0];
                  if (targetId) goToStep(targetId);
                }
              }}
              aria-current={phase.status === 'active' ? 'step' : undefined}
            >
              <span className="wf-nav-indicator">
                {phase.status === 'completed' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </span>
              <span className="wf-nav-label">{phase.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="wf-nav-progress-text">
        Step {currentStepIndex + 1} of {steps.length}
      </div>
    </nav>
  );
}
