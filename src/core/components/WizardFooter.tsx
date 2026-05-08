import { useWizard } from '../hooks/useWizard';

export function WizardFooter() {
  const {
    isFirstStep,
    isLastStep,
    canGoBack,
    nextStep,
    prevStep,
    state,
  } = useWizard();

  const isCurrentStepValid = state.stepValidity[state.currentStepId] !== false;

  return (
    <footer className="wf-footer">
      <div className="wf-footer-left">
        {canGoBack && (
          <button className="wf-btn wf-btn--secondary" onClick={prevStep}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        )}
      </div>
      <div className="wf-footer-right">
        <button
          className="wf-btn wf-btn--primary"
          onClick={nextStep}
          disabled={!isCurrentStepValid}
        >
          {isLastStep ? 'Finish' : 'Next'}
          {!isLastStep && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </div>
    </footer>
  );
}
